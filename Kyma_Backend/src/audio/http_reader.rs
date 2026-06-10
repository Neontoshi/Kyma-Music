use crate::user_action;
use crate::user_error;
use std::io::{self, Read, Seek, SeekFrom};
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::Duration;

// ─────────────────────────────────────────────────────────────
// Shared streaming buffer
// ─────────────────────────────────────────────────────────────

struct Inner {
    data: Vec<u8>,
    base_offset: usize,
    total_len: Option<u64>, // filled from GET Content-Length header
    done: bool,
    error: Option<String>,
    abort: bool,
}

#[derive(Clone)]
struct SharedBuf {
    inner: Arc<(Mutex<Inner>, Condvar)>,
}

impl SharedBuf {
    fn new(base_offset: usize) -> Self {
        Self {
            inner: Arc::new((
                Mutex::new(Inner {
                    data: Vec::new(),
                    base_offset,
                    total_len: None,
                    done: false,
                    error: None,
                    abort: false,
                }),
                Condvar::new(),
            )),
        }
    }

    // ── producer ─────────────────────────────────────────────

    fn set_total_len(&self, len: u64) {
        // REMOVED: Internal operation, not needed for user logs
        let (lock, _) = &*self.inner;
        lock.lock().unwrap().total_len = Some(len);
    }

    fn push(&self, chunk: &[u8]) -> bool {
        // REMOVED: Too frequent - called for every network chunk
        let (lock, cvar) = &*self.inner;
        let mut inner = lock.lock().unwrap();
        if inner.abort {
            return false;
        }
        inner.data.extend_from_slice(chunk);
        cvar.notify_all();
        true
    }

    fn finish(&self) {
        user_action!("HTTP", "Download completed");
        let (lock, cvar) = &*self.inner;
        let mut inner = lock.lock().unwrap();
        inner.done = true;
        cvar.notify_all();
    }

    fn fail(&self, e: String) {
        user_error!("HTTP", "Download failed: {}", e);
        let (lock, cvar) = &*self.inner;
        let mut inner = lock.lock().unwrap();
        inner.error = Some(e);
        inner.done = true;
        cvar.notify_all();
    }

    // ── consumer ─────────────────────────────────────────────

    fn abort(&self) {
        // REMOVED: Internal operation
        let (lock, cvar) = &*self.inner;
        let mut inner = lock.lock().unwrap();
        inner.abort = true;
        inner.done = true;
        cvar.notify_all();
    }

    fn is_aborted(&self) -> bool {
        // REMOVED: Called frequently
        let (lock, _) = &*self.inner;
        lock.lock().unwrap().abort
    }

    fn total_len(&self) -> Option<u64> {
        // REMOVED: Called frequently
        let (lock, _) = &*self.inner;
        lock.lock().unwrap().total_len
    }

    fn base_offset(&self) -> usize {
        // REMOVED: Called frequently
        let (lock, _) = &*self.inner;
        lock.lock().unwrap().base_offset
    }

    fn total_downloaded(&self) -> usize {
        // REMOVED: Called frequently
        let (lock, _) = &*self.inner;
        let inner = lock.lock().unwrap();
        inner.base_offset + inner.data.len()
    }

    fn is_done(&self) -> bool {
        // REMOVED: Called frequently
        let (lock, _) = &*self.inner;
        lock.lock().unwrap().done
    }

    fn read_at(&self, abs_pos: usize, buf: &mut [u8]) -> usize {
        // REMOVED: Called for every read
        let (lock, _) = &*self.inner;
        let inner = lock.lock().unwrap();
        let base = inner.base_offset;
        if abs_pos < base {
            return 0;
        }
        let rel = abs_pos - base;
        let available = inner.data.len().saturating_sub(rel);
        if available == 0 {
            return 0;
        }
        let n = buf.len().min(available);
        buf[..n].copy_from_slice(&inner.data[rel..rel + n]);
        n
    }

    fn wait_for_data(&self, abs_pos: usize) -> io::Result<()> {
        // REMOVED: Called frequently during reads
        let (lock, cvar) = &*self.inner;
        let mut inner = lock.lock().unwrap();
        loop {
            if inner.abort {
                return Err(io::Error::new(io::ErrorKind::Interrupted, "aborted"));
            }
            let base = inner.base_offset;
            if abs_pos >= base && inner.data.len() > abs_pos - base {
                return Ok(());
            }
            if inner.done {
                return Ok(());
            }
            if let Some(ref e) = inner.error {
                return Err(io::Error::new(io::ErrorKind::Other, e.clone()));
            }
            inner = cvar.wait(inner).unwrap();
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Download thread — no HEAD, reads Content-Length from GET
// ─────────────────────────────────────────────────────────────

fn spawn_download(
    url: String,
    buf: SharedBuf,
    byte_offset: usize,
    buf_downloaded: Arc<AtomicU64>,
    buf_total: Arc<AtomicU64>,
) {
    // Simplify URL for logging
    let log_url = if url.len() > 80 {
        format!("{}...", &url[..77])
    } else {
        url.clone()
    };

    if byte_offset == 0 {
        user_action!("HTTP", "Starting download: {}", log_url);
    } else {
        user_action!(
            "HTTP",
            "Resuming download at byte {}: {}",
            byte_offset,
            log_url
        );
    }

    thread::spawn(move || {
        let client: reqwest::blocking::Client = match reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(60))
            .tcp_keepalive(Duration::from_secs(10))
            .connection_verbose(false)
            .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .build()
        {
            Ok(c) => c,
            Err(e) => {
                user_error!("HTTP", "Failed to create HTTP client: {}", e);
                buf.fail(e.to_string());
                return;
            }
        };

        let mut req = client.get(&url);
        if byte_offset > 0 {
            req = req.header(reqwest::header::RANGE, format!("bytes={}-", byte_offset));
        }

        let mut resp: reqwest::blocking::Response = match req.send() {
            Ok(r) => r,
            Err(e) => {
                user_error!("HTTP", "Request failed for {}: {}", log_url, e);
                buf.fail(e.to_string());
                return;
            }
        };

        if byte_offset == 0 {
            if let Some(len) = resp
                .headers()
                .get(reqwest::header::CONTENT_LENGTH)
                .and_then(|v: &reqwest::header::HeaderValue| v.to_str().ok())
                .and_then(|s: &str| s.parse::<u64>().ok())
            {
                let size_mb = len as f64 / 1024.0 / 1024.0;
                user_action!("HTTP", "Content length: {:.2} MB", size_mb);
                buf.set_total_len(len);
                buf_total.store(len, Ordering::Relaxed);
            }
        } else {
            if let Some(total) = resp
                .headers()
                .get(reqwest::header::CONTENT_RANGE)
                .and_then(|v: &reqwest::header::HeaderValue| v.to_str().ok())
                .and_then(|s: &str| s.split('/').last())
                .and_then(|s: &str| s.parse::<u64>().ok())
            {
                let size_mb = total as f64 / 1024.0 / 1024.0;
                user_action!("HTTP", "Total size from range: {:.2} MB", size_mb);
                buf.set_total_len(total);
                buf_total.store(total, Ordering::Relaxed);
            }
        }

        let mut chunk = vec![0u8; 256 * 1024];
        let mut downloaded: u64 = 0;
        loop {
            if buf.is_aborted() {
                user_action!("HTTP", "Download aborted");
                return;
            }
            match resp.read(&mut chunk) {
                Ok(0) => break,
                Ok(n) => {
                    if !buf.push(&chunk[..n]) {
                        return;
                    }
                    downloaded += n as u64;
                    buf_downloaded.fetch_add(n as u64, Ordering::Relaxed);
                }
                Err(e) => {
                    user_error!("HTTP", "Read error during download: {}", e);
                    buf.fail(e.to_string());
                    return;
                }
            }
        }

        let size_mb = downloaded as f64 / 1024.0 / 1024.0;
        user_action!("HTTP", "Download completed: {:.2} MB", size_mb);
        buf.finish();
    });
}

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

pub struct HttpReader {
    url: String,
    buf: SharedBuf,
    pos: usize,
    pub seeking_enabled: Arc<AtomicBool>,
    buf_downloaded: Arc<AtomicU64>,
    buf_total: Arc<AtomicU64>,
}

impl HttpReader {
    pub fn new(
        url: &str,
        buf_downloaded: Arc<AtomicU64>,
        buf_total: Arc<AtomicU64>,
    ) -> Result<(Self, Arc<AtomicBool>), String> {
        let log_url = if url.len() > 80 {
            format!("{}...", &url[..77])
        } else {
            url.to_string()
        };
        user_action!("HTTP", "Creating HTTP reader for: {}", log_url);

        let buf = SharedBuf::new(0);
        spawn_download(
            url.to_string(),
            buf.clone(),
            0,
            buf_downloaded.clone(),
            buf_total.clone(),
        );
        let seeking_enabled = Arc::new(AtomicBool::new(false));
        Ok((
            Self {
                url: url.to_string(),
                buf,
                pos: 0,
                seeking_enabled: seeking_enabled.clone(),
                buf_downloaded,
                buf_total,
            },
            seeking_enabled,
        ))
    }

    fn restart_from(&mut self, byte_offset: usize) {
        let size_mb = byte_offset as f64 / 1024.0 / 1024.0;
        user_action!(
            "HTTP",
            "Restarting download from byte offset {:.2} MB",
            size_mb
        );
        self.buf.abort();
        let new_buf = SharedBuf::new(byte_offset);
        spawn_download(
            self.url.clone(),
            new_buf.clone(),
            byte_offset,
            self.buf_downloaded.clone(),
            self.buf_total.clone(),
        );
        self.buf = new_buf;
        self.pos = byte_offset;
    }
}

// ─────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────

impl Read for HttpReader {
    fn read(&mut self, out: &mut [u8]) -> io::Result<usize> {
        match self.buf.wait_for_data(self.pos) {
            Err(e) if e.kind() == io::ErrorKind::Interrupted => return Ok(0),
            Err(e) => return Err(e),
            Ok(_) => {}
        }
        let n = self.buf.read_at(self.pos, out);
        if n > 0 {
            self.pos += n;
            return Ok(n);
        }
        if self.buf.is_done() {
            return Ok(0);
        }
        // No data yet — return WouldBlock so Symphonia retries
        Err(io::Error::new(io::ErrorKind::WouldBlock, "no data yet"))
    }
}

// ─────────────────────────────────────────────────────────────
// Seek
// ─────────────────────────────────────────────────────────────

impl Seek for HttpReader {
    fn seek(&mut self, from: SeekFrom) -> io::Result<u64> {
        let new_pos = match from {
            SeekFrom::Start(p) => p as i64,
            SeekFrom::Current(p) => self.pos as i64 + p,
            SeekFrom::End(p) => {
                let len =
                    self.buf.total_len().ok_or_else(|| {
                        io::Error::new(io::ErrorKind::Unsupported, "unknown length")
                    })? as i64;
                len + p
            }
        };
        let new_pos = new_pos.max(0) as usize;

        let already_buffered =
            new_pos >= self.buf.base_offset() && new_pos < self.buf.total_downloaded();

        if !already_buffered {
            let new_pos_mb = new_pos as f64 / 1024.0 / 1024.0;
            user_action!("HTTP", "Seek to new position: {:.2} MB", new_pos_mb);
            self.restart_from(new_pos);
        } else {
            // REMOVED: Seek within buffer - no log needed
            self.pos = new_pos;
        }

        Ok(self.pos as u64)
    }
}

// ─────────────────────────────────────────────────────────────
// Symphonia
// ─────────────────────────────────────────────────────────────

impl symphonia::core::io::MediaSource for HttpReader {
    fn is_seekable(&self) -> bool {
        self.seeking_enabled.load(Ordering::Relaxed) && self.buf.total_len().is_some()
    }

    fn byte_len(&self) -> Option<u64> {
        self.buf.total_len()
    }
}
