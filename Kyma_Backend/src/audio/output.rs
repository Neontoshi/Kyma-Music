use crate::user_action;
use crate::user_error;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Stream, StreamConfig};
use std::sync::{
    atomic::{AtomicBool, AtomicU32, AtomicUsize, Ordering},
    Arc, Mutex,
};

const RING_CAP: usize = 192_000 * 8; // ~8 seconds @ 48kHz stereo

// ─────────────────────────────────────────────
// Lock-free SPSC ring buffer
// ─────────────────────────────────────────────

pub struct Ring {
    buf: Vec<f32>,
    write: AtomicUsize,
    read: AtomicUsize,
}

impl Ring {
    pub fn new() -> Self {
        Self {
            buf: vec![0.0; RING_CAP],
            write: AtomicUsize::new(0),
            read: AtomicUsize::new(0),
        }
    }

    #[inline(always)]
    pub fn push_slice(&mut self, samples: &[f32]) {
        // REMOVED: No log - called very frequently for every audio packet
        let mut w = self.write.load(Ordering::Relaxed);
        let mut r = self.read.load(Ordering::Acquire);

        for &s in samples {
            let next_w = (w + 1) % RING_CAP;

            if next_w == r {
                r = (r + 1) % RING_CAP;
            }

            self.buf[w] = s;
            w = next_w;
        }

        self.write.store(w, Ordering::Release);
        self.read.store(r, Ordering::Release);
    }

    pub fn last_samples(&self, count: usize) -> Vec<f32> {
        // REMOVED: No log - called frequently for visualizer
        let w = self.write.load(Ordering::Acquire);
        if w < count {
            return vec![0.0; count];
        }
        let start = w - count;
        (start..w).map(|i| self.buf[i % RING_CAP]).collect()
    }

    #[inline(always)]
    pub fn pop_slice(&mut self, out: &mut [f32]) {
        // REMOVED: No log - called every audio callback
        let mut r = self.read.load(Ordering::Acquire);
        let w = self.write.load(Ordering::Acquire);

        for o in out.iter_mut() {
            if r != w {
                *o = self.buf[r];
                r = (r + 1) % RING_CAP;
            } else {
                *o = 0.0;
            }
        }

        self.read.store(r, Ordering::Release);
    }

    pub fn available(&self) -> usize {
        // REMOVED: No log - called frequently
        let w = self.write.load(Ordering::Acquire);
        let r = self.read.load(Ordering::Acquire);

        if w >= r {
            w - r
        } else {
            RING_CAP - r + w
        }
    }

    pub fn clear(&mut self) {
        // REMOVED: No log - internal operation
        self.write.store(0, Ordering::Release);
        self.read.store(0, Ordering::Release);

        for sample in self.buf.iter_mut() {
            *sample = 0.0;
        }
    }

    /// Returns an iterator that yields samples from the ring in order (oldest to newest).
    /// This is a snapshot — it won't consume from the ring.
    pub fn iter(&self) -> RingIter<'_> {
        let r = self.read.load(Ordering::Acquire);
        let w = self.write.load(Ordering::Acquire);
        RingIter {
            ring: self,
            pos: r,
            end: w,
            done: false,
        }
    }
}

pub struct RingIter<'a> {
    ring: &'a Ring,
    pos: usize,
    end: usize,
    done: bool,
}

impl<'a> Iterator for RingIter<'a> {
    type Item = &'a f32;

    fn next(&mut self) -> Option<Self::Item> {
        if self.done || self.pos == self.end {
            return None;
        }
        let sample = &self.ring.buf[self.pos];
        self.pos = (self.pos + 1) % RING_CAP;
        if self.pos == self.end {
            self.done = true;
        }
        Some(sample)
    }
}

// ─────────────────────────────────────────────
// Audio Output (CPAL)
// ─────────────────────────────────────────────

pub struct AudioOutput {
    pub stream: Stream,
    pub config: StreamConfig,
    pub sample_rate: u32,
    pub channels: usize,
    pub volume: Arc<AtomicU32>,
}

impl AudioOutput {
    pub fn new(ring: Arc<Mutex<Ring>>, paused: Arc<AtomicBool>, volume: Arc<AtomicU32>) -> Self {
        let host = cpal::default_host();

        let device = host
            .default_output_device()
            .expect("[OUTPUT] No output device");

        let supported = device
            .default_output_config()
            .expect("[OUTPUT] No output config");

        let sample_rate = supported.sample_rate().0;
        let channels = supported.channels() as usize;
        let config: StreamConfig = supported.clone().into();

        user_action!(
            "AUDIO",
            "Output device: {} channels @ {} Hz",
            channels,
            sample_rate
        );
        tracing::info!("[OUTPUT] {} channels @ {} Hz", channels, sample_rate);

        let underrun_count = Arc::new(AtomicU32::new(0));
        let underrun_count_clone = underrun_count.clone();

        let stream = match supported.sample_format() {
            cpal::SampleFormat::F32 => {
                let r = ring.clone();
                let p = paused.clone();
                let uc = underrun_count.clone();
                let vol = volume.clone();

                device
                    .build_output_stream(
                        &config,
                        move |data: &mut [f32], _| {
                            if p.load(Ordering::Relaxed) {
                                data.fill(0.0);
                                return;
                            }
                            let mut ring = r.lock().unwrap();
                            let avail = ring.available();

                            if avail < data.len() {
                                let prev = uc.fetch_add(1, Ordering::Relaxed);
                                if prev == 0 {
                                    user_error!(
                                        "AUDIO",
                                        "Buffer underrun (available={}, needed={})",
                                        avail,
                                        data.len()
                                    );
                                    tracing::warn!(
                                        "[OUTPUT] Buffer underrun (available={}, needed={})",
                                        avail,
                                        data.len()
                                    );
                                }
                            } else {
                                uc.store(0, Ordering::Relaxed);
                            }

                            ring.pop_slice(data);

                            // Apply volume at the last moment
                            let volume_percent = vol.load(Ordering::Relaxed) as f32 / 100.0;
                            for sample in data.iter_mut() {
                                *sample *= volume_percent;
                            }
                        },
                        |e| {
                            user_error!("AUDIO", "CPAL stream error: {}", e);
                            tracing::error!("[CPAL] {e}");
                        },
                        None,
                    )
                    .expect("F32 stream failed")
            }

            cpal::SampleFormat::I16 => {
                let r = ring.clone();
                let p = paused.clone();
                let uc = underrun_count.clone();
                let vol = volume.clone();

                device
                    .build_output_stream(
                        &config,
                        move |data: &mut [i16], _| {
                            if p.load(Ordering::Relaxed) {
                                data.fill(0);
                                return;
                            }

                            let mut tmp = vec![0.0f32; data.len()];
                            {
                                let mut ring = r.lock().unwrap();
                                let avail = ring.available();

                                if avail < data.len() {
                                    let prev = uc.fetch_add(1, Ordering::Relaxed);
                                    if prev == 0 {
                                        user_error!(
                                            "AUDIO",
                                            "Buffer underrun (available={}, needed={})",
                                            avail,
                                            data.len()
                                        );
                                        tracing::warn!(
                                            "[OUTPUT] Buffer underrun (available={}, needed={})",
                                            avail,
                                            data.len()
                                        );
                                    }
                                } else {
                                    uc.store(0, Ordering::Relaxed);
                                }

                                ring.pop_slice(&mut tmp);
                            }

                            let volume_percent = vol.load(Ordering::Relaxed) as f32 / 100.0;
                            for (d, s) in data.iter_mut().zip(tmp.iter()) {
                                *d = ((s * volume_percent).clamp(-1.0, 1.0) * i16::MAX as f32)
                                    as i16;
                            }
                        },
                        |e| {
                            user_error!("AUDIO", "CPAL stream error: {}", e);
                            tracing::error!("[CPAL] {e}");
                        },
                        None,
                    )
                    .expect("I16 stream failed")
            }

            cpal::SampleFormat::U16 => {
                let r = ring.clone();
                let p = paused.clone();
                let uc = underrun_count.clone();
                let vol = volume.clone();

                device
                    .build_output_stream(
                        &config,
                        move |data: &mut [u16], _| {
                            if p.load(Ordering::Relaxed) {
                                data.fill(u16::MAX / 2);
                                return;
                            }

                            let mut tmp = vec![0.0f32; data.len()];
                            {
                                let mut ring = r.lock().unwrap();
                                let avail = ring.available();

                                if avail < data.len() {
                                    let prev = uc.fetch_add(1, Ordering::Relaxed);
                                    if prev == 0 {
                                        user_error!(
                                            "AUDIO",
                                            "Buffer underrun (available={}, needed={})",
                                            avail,
                                            data.len()
                                        );
                                        tracing::warn!(
                                            "[OUTPUT] Buffer underrun (available={}, needed={})",
                                            avail,
                                            data.len()
                                        );
                                    }
                                } else {
                                    uc.store(0, Ordering::Relaxed);
                                }

                                ring.pop_slice(&mut tmp);
                            }

                            let volume_percent = vol.load(Ordering::Relaxed) as f32 / 100.0;
                            for (d, s) in data.iter_mut().zip(tmp.iter()) {
                                let scaled = (s * volume_percent).clamp(-1.0, 1.0);
                                *d = ((scaled + 1.0) * 0.5 * u16::MAX as f32) as u16;
                            }
                        },
                        |e| {
                            user_error!("AUDIO", "CPAL stream error: {}", e);
                            tracing::error!("[CPAL] {e}");
                        },
                        None,
                    )
                    .expect("U16 stream failed")
            }

            fmt => panic!("[OUTPUT] Unsupported format: {fmt:?}"),
        };

        stream.play().expect("[OUTPUT] Failed to start");
        user_action!("AUDIO", "Audio stream started successfully");

        // Log underrun stats periodically
        let uc = underrun_count_clone;
        std::thread::spawn(move || loop {
            std::thread::sleep(std::time::Duration::from_secs(30));
            let count = uc.swap(0, Ordering::Relaxed);
            if count > 0 {
                user_error!("AUDIO", "{} buffer underruns in last 30s", count);
                tracing::warn!("[OUTPUT] {count} underruns in last 30s");
            }
        });

        Self {
            stream,
            config,
            sample_rate,
            channels,
            volume,
        }
    }
}
