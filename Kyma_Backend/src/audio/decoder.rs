use crate::audio::output::Ring;
use crate::user_action;
use crate::user_error;
use rubato::{
    Resampler, SincFixedIn, SincInterpolationParameters, SincInterpolationType, WindowFunction,
};
use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    Arc, Mutex,
};
use std::time::{Duration, Instant};
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::DecoderOptions;
use symphonia::core::errors::Error as SymphErr;
use symphonia::core::formats::{FormatOptions, SeekMode, SeekTo};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::core::units::Time;

// ── Shared state (engine ↔ decoder ↔ output) ─────────────────────────────────

pub struct DecoderShared {
    pub ring: Arc<Mutex<Ring>>,
    pub paused: Arc<AtomicBool>,
    pub stop: AtomicBool,
    pub shutdown: AtomicBool,
    pub volume: Mutex<f32>,

    pub duration_secs: Mutex<f64>,
    pub seek_to: Mutex<Option<f64>>,
    pub track_generation: AtomicU64,
    pub is_playing: AtomicBool,

    // Network buffering state
    pub is_buffering: AtomicBool,
    pub last_position_before_buffer: Mutex<f64>,

    // Playback timing
    pub playback_start_time: Mutex<Option<Instant>>,
    pub paused_position: Mutex<f64>,
    pub base_position: Mutex<f64>,

    // Stream expiry — set by decoder, polled by engine
    pub stream_expired_at: Mutex<Option<f64>>,

    // Download progress — written by HttpReader, read by engine for buffered bar
    pub buf_downloaded: Arc<AtomicU64>,
    pub buf_total: Arc<AtomicU64>,
}

impl DecoderShared {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            ring: Arc::new(Mutex::new(Ring::new())),
            paused: Arc::new(AtomicBool::new(false)),
            stop: AtomicBool::new(false),
            shutdown: AtomicBool::new(false),
            volume: Mutex::new(0.7),
            duration_secs: Mutex::new(0.0),
            seek_to: Mutex::new(None),
            track_generation: AtomicU64::new(0),
            is_playing: AtomicBool::new(false),
            is_buffering: AtomicBool::new(false),
            last_position_before_buffer: Mutex::new(0.0),
            playback_start_time: Mutex::new(None),
            paused_position: Mutex::new(0.0),
            base_position: Mutex::new(0.0),
            stream_expired_at: Mutex::new(None),
            buf_downloaded: Arc::new(AtomicU64::new(0)),
            buf_total: Arc::new(AtomicU64::new(0)),
        })
    }

    pub fn get_position(&self) -> f64 {
        // REMOVED: No log - called too frequently (every 100ms)
        if self.is_buffering.load(Ordering::Relaxed) {
            if let Some(start) = *self.playback_start_time.lock().unwrap() {
                let elapsed = start.elapsed().as_secs_f64();
                let base = *self.base_position.lock().unwrap();
                return base + elapsed;
            }
        }

        if let Some(start) = *self.playback_start_time.lock().unwrap() {
            let elapsed = start.elapsed().as_secs_f64();
            let base = *self.base_position.lock().unwrap();
            return base + elapsed;
        }

        *self.base_position.lock().unwrap()
    }

    pub fn update_position(&self, _position_secs: f64) {}

    pub fn start_playback(&self) {
        user_action!("PLAYBACK", "Started");
        let mut start_time = self.playback_start_time.lock().unwrap();
        if start_time.is_none() {
            *start_time = Some(Instant::now());
            tracing::info!("[DECODER] Playback started");
        }
    }

    pub fn pause_playback(&self) {
        user_action!("PLAYBACK", "Paused");
        let pos = self.get_position();
        *self.base_position.lock().unwrap() = pos;
        self.paused.store(true, Ordering::SeqCst);
        self.playback_start_time.lock().unwrap().take();
        tracing::info!("[DECODER] paused at {:.2}s", pos);
    }

    pub fn resume_playback(&self) {
        user_action!("PLAYBACK", "Resumed");
        let base = *self.base_position.lock().unwrap();
        *self.playback_start_time.lock().unwrap() = Some(Instant::now());
        self.paused.store(false, Ordering::SeqCst);
        tracing::info!("[DECODER] resumed at {:.2}s", base);
    }

    pub fn start_buffering(&self, current_pos: f64) {
        user_action!("BUFFER", "Started at {:.2}s", current_pos);
        self.is_buffering.store(true, Ordering::SeqCst);
        *self.last_position_before_buffer.lock().unwrap() = current_pos;
        tracing::info!(
            "[DECODER] Buffering started at position {:.2}s",
            current_pos
        );
    }

    pub fn stop_buffering(&self) {
        user_action!("BUFFER", "Stopped");
        self.is_buffering.store(false, Ordering::SeqCst);
        tracing::info!("[DECODER] Buffering ended");
    }

    pub fn is_buffering_now(&self) -> bool {
        // REMOVED: No log - called too frequently
        self.is_buffering.load(Ordering::Relaxed)
    }

    pub fn reset_for_new_track(&self) {
        user_action!("TRACK", "Reset for new track");
        self.paused.store(false, Ordering::SeqCst);
        self.is_buffering.store(false, Ordering::SeqCst);
        *self.base_position.lock().unwrap() = 0.0;
        *self.paused_position.lock().unwrap() = 0.0;
        *self.last_position_before_buffer.lock().unwrap() = 0.0;
        self.seek_to.lock().unwrap().take();
        *self.playback_start_time.lock().unwrap() = None;
        *self.stream_expired_at.lock().unwrap() = None;
        self.buf_downloaded.store(0, Ordering::Relaxed);
        self.buf_total.store(0, Ordering::Relaxed);
        tracing::info!("[DECODER] Full track reset");
    }

    pub fn reset_timing(&self) {
        // REMOVED: No log - internal function
        *self.playback_start_time.lock().unwrap() = None;
        *self.base_position.lock().unwrap() = 0.0;
        *self.paused_position.lock().unwrap() = 0.0;
        self.paused.store(false, Ordering::SeqCst);
        self.is_buffering.store(false, Ordering::Relaxed);
    }
}

// ── Decode entry point ────────────────────────────────────────────────────────

pub fn decode_and_push(
    url: String,
    shared: Arc<DecoderShared>,
    device_sample_rate: u32,
    my_gen: u64,
) {
    user_action!("DECODE", "Started: {}", url);
    shared.reset_for_new_track();
    shared.ring.lock().unwrap().clear();

    let result = decode_inner(&url, &shared, device_sample_rate, my_gen);

    shared.stop_buffering();

    if let Err(e) = result {
        user_error!("DECODE", "Failed: {} - {}", url, e);
        // Check if this is a stream expiry (YouTube CDN URL expired mid-playback)
        if e.contains("end of stream") || e.contains("Persistent network error") {
            if url.contains("googlevideo.com") {
                let pos = shared.get_position();
                user_action!("STREAM", "Expired at {:.2}s for {}", pos, url);
                tracing::warn!("[DECODER] Stream expired at {:.2}s, signalling engine", pos);
                *shared.stream_expired_at.lock().unwrap() = Some(pos);
                // Don't drain the ring — engine will restart the track
                return;
            }
        }
        tracing::error!("[DECODER] Fatal error for {url}: {e}");
    }

    loop {
        if shared.track_generation.load(Ordering::SeqCst) != my_gen
            || shared.stop.load(Ordering::SeqCst)
            || shared.shutdown.load(Ordering::SeqCst)
        {
            return;
        }

        // A seek arrived after decoding finished — restart decode_inner from that position
        if shared.seek_to.lock().unwrap().is_some() {
            user_action!("DECODE", "Restarting decoder after seek");
            tracing::info!("[DECODER] Seek received after track end, restarting decoder");
            shared.is_playing.store(true, Ordering::SeqCst);
            let result = decode_inner(&url, &shared, device_sample_rate, my_gen);
            shared.stop_buffering();
            if let Err(e) = result {
                user_error!("DECODE", "Re-decode error: {}", e);
                tracing::error!("[DECODER] Re-decode error: {e}");
            }
            // After re-decode, go back to draining
            continue;
        }

        if shared.ring.lock().unwrap().available() == 0 {
            break;
        }

        std::thread::sleep(Duration::from_millis(20));
    }

    // Playback REALLY ended
    if shared.track_generation.load(Ordering::SeqCst) == my_gen {
        shared.is_playing.store(false, Ordering::SeqCst);
        shared.reset_timing();
    }
    user_action!("DECODE", "Finished: {}", url);
    tracing::info!("[DECODER] Track finished: {url}");
}

fn decode_inner(
    url: &str,
    shared: &Arc<DecoderShared>,
    device_sample_rate: u32,
    my_gen: u64,
) -> Result<(), String> {
    let t0 = std::time::Instant::now();

    let (mss, seeking_flag) = build_mss(
        url,
        Arc::clone(&shared.buf_downloaded),
        Arc::clone(&shared.buf_total),
    )?;

    tracing::info!("[TIMING] build_mss: {:.2}s", t0.elapsed().as_secs_f64());

    let mut hint = Hint::new();

    if url.contains("googlevideo.com") {
        hint.with_extension("m4a");
        shared.start_buffering(0.0);
    } else if url.starts_with("http") {
        // For other HTTP sources (SoundCloud etc), try to get ext from URL
        if let Some(ext) = url
            .split('?')
            .next()
            .and_then(|u| std::path::Path::new(u).extension())
            .and_then(|e| e.to_str())
        {
            hint.with_extension(ext);
        }
        shared.start_buffering(0.0);
    } else if let Some(ext) = std::path::Path::new(url)
        .extension()
        .and_then(|e| e.to_str())
    {
        hint.with_extension(ext);
    }

    let format_opts = if url.starts_with("http") {
        FormatOptions {
            enable_gapless: false,
            prebuild_seek_index: false,
            seek_index_fill_rate: 0,
            ..Default::default()
        }
    } else {
        FormatOptions {
            enable_gapless: true,
            ..Default::default()
        }
    };

    let mut probed = symphonia::default::get_probe()
        .format(&hint, mss, &format_opts, &MetadataOptions::default())
        .map_err(|e| format!("Probe failed: {e}"))?;
    tracing::info!("[TIMING] probe: {:.2}s", t0.elapsed().as_secs_f64());

    // Enable seeking now that probe is done — prevents isomp4 segment index scan
    if let Some(flag) = seeking_flag {
        flag.store(true, Ordering::Relaxed);
    }

    let track = probed
        .format
        .default_track()
        .ok_or("No default track")?
        .clone();

    let track_id = track.id;
    let codec_params = track.codec_params.clone();
    let source_sample_rate = codec_params.sample_rate.unwrap_or(44100);
    let channels = codec_params.channels.map(|c| c.count()).unwrap_or(2);

    let duration_secs = codec_params
        .time_base
        .zip(codec_params.n_frames)
        .map(|(tb, frames)| frames as f64 * tb.numer as f64 / tb.denom as f64)
        .unwrap_or(0.0);
    *shared.duration_secs.lock().unwrap() = duration_secs;

    shared.stop_buffering();

    let mut decoder = symphonia::default::get_codecs()
        .make(&codec_params, &DecoderOptions::default())
        .map_err(|e| format!("Codec init: {e}"))?;
    tracing::info!("[TIMING] codec init: {:.2}s", t0.elapsed().as_secs_f64());

    let needs_resample = source_sample_rate != device_sample_rate;
    let mut resampler: Option<SincFixedIn<f32>> = if needs_resample {
        let resample_ratio = device_sample_rate as f64 / source_sample_rate as f64;
        let params = SincInterpolationParameters {
            sinc_len: 256,
            f_cutoff: 0.95,
            interpolation: SincInterpolationType::Linear,
            oversampling_factor: 128,
            window: WindowFunction::BlackmanHarris2,
        };
        SincFixedIn::<f32>::new(resample_ratio, 2.0, params, 1024, channels).ok()
    } else {
        None
    };

    let mut sample_buf: Option<SampleBuffer<f32>> = None;
    let mut consecutive_errors = 0;
    let mut was_buffering = false;
    let mut first_sample_processed = false;

    loop {
        if shared.stop.load(Ordering::SeqCst)
            || shared.shutdown.load(Ordering::SeqCst)
            || shared.track_generation.load(Ordering::SeqCst) != my_gen
        {
            return Ok(());
        }

        // Handle seek
        {
            let mut seek_lock = shared.seek_to.lock().unwrap();
            if let Some(target) = seek_lock.take() {
                user_action!("SEEK", "Seeking to {:.2}s", target);
                *shared.base_position.lock().unwrap() = target;
                *shared.playback_start_time.lock().unwrap() = None;
                shared.ring.lock().unwrap().clear();

                let _ = probed.format.seek(
                    SeekMode::Accurate,
                    SeekTo::Time {
                        time: Time::from(target),
                        track_id: Some(track_id),
                    },
                );

                decoder.reset();
                shared.stop_buffering();
                consecutive_errors = 0;
                was_buffering = false;
                first_sample_processed = false;

                tracing::info!("[DECODER] Seeked to {:.2}s", target);
            }
        }

        // Pause handling
        if shared.paused.load(Ordering::SeqCst) {
            std::thread::sleep(Duration::from_millis(20));
            continue;
        }

        // Back-pressure
        if shared.ring.lock().unwrap().available() > 192_000 * 7 {
            std::thread::sleep(Duration::from_millis(5));
            continue;
        }

        // Next packet
        let packet = match probed.format.next_packet() {
            Ok(p) => {
                consecutive_errors = 0;
                if was_buffering {
                    shared.stop_buffering();
                    was_buffering = false;
                }
                p
            }
            Err(SymphErr::IoError(e)) if e.kind() == std::io::ErrorKind::WouldBlock => {
                if !was_buffering {
                    let current_pos = shared.get_position();
                    shared.start_buffering(current_pos);
                    was_buffering = true;
                }
                std::thread::sleep(Duration::from_millis(200));
                continue;
            }
            Err(SymphErr::IoError(e)) => {
                consecutive_errors += 1;

                if !was_buffering {
                    let current_pos = shared.get_position();
                    shared.start_buffering(current_pos);
                    was_buffering = true;
                }

                if consecutive_errors > 10 {
                    return Err(format!(
                        "Persistent network error after {} attempts: {}",
                        consecutive_errors, e
                    ));
                }

                // Only log first few errors to avoid spam
                if consecutive_errors <= 3 {
                    user_action!(
                        "NETWORK",
                        "Error (attempt {}/10): {}",
                        consecutive_errors,
                        e
                    );
                }
                tracing::warn!(
                    "[DECODER] Network error (attempt {}), buffering...",
                    consecutive_errors
                );
                std::thread::sleep(Duration::from_millis(500));
                continue;
            }
            Err(SymphErr::ResetRequired) => {
                decoder.reset();
                continue;
            }
            Err(e) => {
                // Only log once, not per packet
                user_error!("DECODE", "Packet error: {}", e);
                tracing::warn!("[DECODER] Packet error: {e}");
                break;
            }
        };

        if packet.track_id() != track_id {
            continue;
        }

        let decoded = match decoder.decode(&packet) {
            Ok(d) => d,
            Err(SymphErr::DecodeError(e)) => {
                // Skip logging individual decode errors - too frequent
                tracing::warn!("[DECODER] Decode error (skipping): {e}");
                continue;
            }
            Err(e) => {
                user_error!("DECODE", "Fatal decode error: {}", e);
                tracing::warn!("[DECODER] Fatal decode error: {e}");
                break;
            }
        };

        let spec = *decoded.spec();
        let cap = decoded.capacity() as usize;
        let sb = sample_buf.get_or_insert_with(|| SampleBuffer::<f32>::new(cap as u64, spec));
        sb.copy_interleaved_ref(decoded);

        let mut owned: Vec<f32> = sb.samples().to_vec();

        if let Some(ref mut rs) = resampler {
            let mut planes: Vec<Vec<f32>> = (0..channels).map(|_| Vec::new()).collect();
            for (i, &s) in owned.iter().enumerate() {
                planes[i % channels].push(s);
            }
            let plane_refs: Vec<&[f32]> = planes.iter().map(|p| p.as_slice()).collect();
            match rs.process(&plane_refs, None) {
                Ok(out_planes) => {
                    let frame_count = out_planes[0].len();
                    owned = Vec::with_capacity(frame_count * channels);
                    for f in 0..frame_count {
                        for c in 0..channels {
                            owned.push(out_planes[c][f]);
                        }
                    }
                }
                Err(e) => {
                    // Only log on first occurrence
                    static mut RESAMPLE_ERROR_LOGGED: bool = false;
                    unsafe {
                        if !RESAMPLE_ERROR_LOGGED {
                            user_error!("DECODE", "Resample error: {}", e);
                            RESAMPLE_ERROR_LOGGED = true;
                        }
                    }
                    tracing::warn!("[DECODER] Resample error: {e}");
                }
            }
        }

        // Start clock on first decoded packet
        if !first_sample_processed && !shared.paused.load(Ordering::SeqCst) {
            shared.start_playback();
            first_sample_processed = true;
        }

        shared.ring.lock().unwrap().push_slice(&owned);
        std::thread::sleep(Duration::from_micros(100));
    }

    Ok(())
}

fn build_mss(
    url: &str,
    buf_downloaded: Arc<AtomicU64>,
    buf_total: Arc<AtomicU64>,
) -> Result<(MediaSourceStream, Option<Arc<AtomicBool>>), String> {
    if url.starts_with("http") {
        let (reader, seeking_flag) =
            crate::audio::http_reader::HttpReader::new(url, buf_downloaded, buf_total)?;
        Ok((
            MediaSourceStream::new(Box::new(reader), Default::default()),
            Some(seeking_flag),
        ))
    } else {
        let file = std::fs::File::open(url).map_err(|e| e.to_string())?;
        Ok((
            MediaSourceStream::new(Box::new(file), Default::default()),
            None,
        ))
    }
}
