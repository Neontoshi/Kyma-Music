// audio/engine.rs

use super::{AudioState, Command};
use crate::audio::decoder::{decode_and_push, DecoderShared};
use crate::audio::output::AudioOutput;
use crate::user_action;
use crate::user_error;
use rustfft::{num_complex::Complex, FftPlanner};
use std::sync::atomic::AtomicU32;
use std::sync::atomic::Ordering;
use std::sync::mpsc::{Receiver, Sender};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::Emitter;

pub fn run(rx: Receiver<Command>, _tx: Sender<Command>, app_handle: tauri::AppHandle) {
    let shared = DecoderShared::new();
    let output_volume = Arc::new(AtomicU32::new(70)); // Default 70%
    let output = AudioOutput::new(
        shared.ring.clone(),
        shared.paused.clone(),
        output_volume.clone(),
    );
    let device_sample_rate = output.sample_rate;

    let mut track_id: u64 = 0;
    let mut last_emit = Instant::now();
    let mut last_buffering_state = false;

    // Store the current YouTube video ID so we can re-resolve on stream expiry
    let mut current_video_id: Option<String> = None;

    loop {
        match rx.recv_timeout(Duration::from_millis(50)) {
            Ok(cmd) => match cmd {
                Command::PlayFile(path, reply) => {
                    user_action!("PLAYBACK", "Playing file: {}", path);
                    track_id += 1;
                    let _ = reply.send(track_id);
                    current_video_id = None;
                    start_track(&shared, path, device_sample_rate);
                }

                Command::PlayYoutube(url, video_id, reply) => {
                    user_action!("PLAYBACK", "Playing YouTube video ID: {}", video_id);
                    track_id += 1;
                    let _ = reply.send(track_id);
                    current_video_id = Some(video_id);
                    start_track(&shared, url, device_sample_rate);
                }

                Command::PlayNext(_path_or_id, _is_youtube) => {}

                Command::Pause => {
                    user_action!("PLAYBACK", "Paused");
                    shared.paused.store(true, Ordering::SeqCst);
                    shared.pause_playback();
                }

                Command::Resume => {
                    user_action!("PLAYBACK", "Resumed");
                    shared.paused.store(false, Ordering::SeqCst);
                    shared.resume_playback();
                }

                Command::Stop => {
                    user_action!("PLAYBACK", "Stopped");
                    shared.track_generation.fetch_add(1, Ordering::SeqCst);
                    shared.stop.store(true, Ordering::SeqCst);
                    shared.ring.lock().unwrap().clear();
                    std::thread::sleep(Duration::from_millis(20));
                    shared.reset_timing();
                    shared.paused.store(false, Ordering::SeqCst);
                    shared.stop.store(false, Ordering::SeqCst);
                    shared.stop_buffering();
                    current_video_id = None;
                    let gen = shared.track_generation.load(Ordering::SeqCst);
                    tracing::info!("[ENGINE] stopped track generation {gen}");
                }

                Command::Seek(pos) => {
                    user_action!("SEEK", "Seeking to {:.2}s", pos);
                    *shared.seek_to.lock().unwrap() = Some(pos);
                }

                Command::SetVolume(v) => {
                    let percent = (v * 100.0) as i32;
                    user_action!("VOLUME", "Set to {}%", percent);
                    let clamped = v.clamp(0.0, 1.0);
                    *shared.volume.lock().unwrap() = clamped;
                    output_volume.store((clamped * 100.0) as u32, Ordering::Relaxed);
                }

                Command::GetState(reply) => {
                    // REMOVED: No log - called frequently for UI updates
                    let position = shared.get_position();
                    let duration = *shared.duration_secs.lock().unwrap();
                    let volume = *shared.volume.lock().unwrap();
                    let is_playing = !shared.paused.load(Ordering::Relaxed)
                        && shared.is_playing.load(Ordering::Relaxed);
                    let is_buffering = shared.is_buffering_now();
                    let _ = reply.send(AudioState {
                        is_playing,
                        position,
                        duration,
                        volume,
                        is_buffering,
                    });
                }

                Command::Shutdown => {
                    user_action!("APP", "Audio engine shutting down");
                    shared.shutdown.store(true, Ordering::SeqCst);
                    drop(output);
                    return;
                }
            },

            Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                user_error!("ENGINE", "Channel disconnected, shutting down");
                shared.shutdown.store(true, Ordering::SeqCst);
                return;
            }
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                // REMOVED: No log - normal operation, happens every 50ms
            }
        }

        // ── Check for stream expiry ───────────────────────────────────────────
        // The decoder sets stream_expired_at when a YouTube CDN URL expires
        // mid-playback. We re-resolve and restart from the saved position.
        if let Some(expired_pos) = shared.stream_expired_at.lock().unwrap().take() {
            if let Some(ref vid) = current_video_id.clone() {
                let vid = vid.clone();
                let sh = Arc::clone(&shared);
                let sr = device_sample_rate;
                user_action!(
                    "STREAM",
                    "Expired at {:.2}s, re-resolving: {}",
                    expired_pos,
                    vid
                );
                tracing::warn!(
                    "[ENGINE] Stream expired at {:.2}s for {}, re-resolving...",
                    expired_pos,
                    vid
                );

                // Re-resolve in a background thread then restart the decoder
                std::thread::spawn(move || {
                    let rt = tokio::runtime::Runtime::new().unwrap();
                    let result =
                        rt.block_on(crate::commands::youtube::resolve_youtube_url(vid.clone()));
                    match result {
                        Ok(new_url) => {
                            user_action!("STREAM", "Re-resolved successfully: {}", vid);
                            tracing::info!(
                                "[ENGINE] Re-resolved stream for {vid}, resuming at {:.2}s",
                                expired_pos
                            );
                            // Set seek target so decoder resumes from expiry position
                            *sh.seek_to.lock().unwrap() = Some(expired_pos);
                            // Restart decoder with new URL
                            sh.stop.store(true, Ordering::SeqCst);
                            sh.ring.lock().unwrap().clear();
                            let gen = sh.track_generation.fetch_add(1, Ordering::SeqCst) + 1;
                            sh.paused.store(false, Ordering::SeqCst);
                            sh.stop.store(false, Ordering::SeqCst);
                            sh.is_playing.store(true, Ordering::SeqCst);
                            std::thread::spawn(move || {
                                decode_and_push(new_url, sh, sr, gen);
                            });
                        }
                        Err(e) => {
                            user_error!("STREAM", "Re-resolve failed for {}: {}", vid, e);
                            tracing::error!("[ENGINE] Re-resolve failed for {vid}: {e}");
                            sh.is_playing.store(false, Ordering::SeqCst);
                        }
                    }
                });
            }
        }

        // ── Emit playback updates every 100ms ─────────────────────────────────
        let now = Instant::now();
        if last_emit.elapsed() >= Duration::from_millis(100) {
            last_emit = now;
            let position = shared.get_position();
            let duration = *shared.duration_secs.lock().unwrap();
            let is_playing =
                !shared.paused.load(Ordering::Relaxed) && shared.is_playing.load(Ordering::Relaxed);

            // REMOVED: playback_update log - too frequent (every 100ms)

            let is_buffering = shared.is_buffering_now();

            if is_buffering != last_buffering_state {
                last_buffering_state = is_buffering;
                if is_buffering {
                    user_action!("BUFFER", "Buffering started (UI event)");
                } else {
                    user_action!("BUFFER", "Buffering ended (UI event)");
                }
                let _ = app_handle.emit(
                    "buffering-state",
                    serde_json::json!({ "is_buffering": is_buffering }),
                );
            }

            let buf_downloaded = shared.buf_downloaded.load(Ordering::Relaxed);
            let buf_total = shared.buf_total.load(Ordering::Relaxed);
            let buffered: f64 = if buf_total > 0 {
                (buf_downloaded as f64 / buf_total as f64).min(1.0)
            } else {
                1.0
            };

            let _ = app_handle.emit(
                "playback-update",
                serde_json::json!({
                    "position": position,
                    "duration": duration,
                    "is_playing": is_playing,
                    "is_buffering": is_buffering,
                    "track_id": track_id,
                    "buffered": buffered,
                }),
            );

            // ── FFT visualizer data ───────────────────────────────────────────
            if is_playing {
                let fft_bins = compute_fft_bins(&shared);
                let _ = app_handle.emit("visualizer-data", serde_json::json!({ "bins": fft_bins }));
            }
        }
    }
}

fn start_track(shared: &Arc<DecoderShared>, url: String, sample_rate: u32) {
    // Simplified URL for logging (truncate long URLs)
    let log_url = if url.len() > 80 {
        format!("{}...", &url[..77])
    } else {
        url.clone()
    };
    user_action!("DECODE", "Starting decoder for: {}", log_url);

    shared.stop.store(true, Ordering::SeqCst);
    shared.ring.lock().unwrap().clear();
    let gen = shared.track_generation.fetch_add(1, Ordering::SeqCst) + 1;
    shared.update_position(0.0);
    *shared.duration_secs.lock().unwrap() = 0.0;
    shared.paused.store(false, Ordering::SeqCst);
    shared.stop.store(false, Ordering::SeqCst);
    shared.stop_buffering();
    shared.is_playing.store(true, Ordering::SeqCst);
    shared.buf_downloaded.store(0, Ordering::Relaxed);
    shared.buf_total.store(0, Ordering::Relaxed);

    let sh = Arc::clone(shared);
    std::thread::spawn(move || {
        decode_and_push(url, sh, sample_rate, gen);
    });
}

fn compute_fft_bins(shared: &Arc<DecoderShared>) -> Vec<u8> {
    const FFT_SIZE: usize = 1024;
    const NUM_BINS: usize = 64;

    let samples: Vec<f32> = {
        let ring = shared.ring.lock().unwrap();
        ring.last_samples(FFT_SIZE)
    };

    if samples.len() < FFT_SIZE {
        return vec![0u8; NUM_BINS];
    }

    // Check if signal is silent
    let rms: f32 = (samples.iter().map(|&s| s * s).sum::<f32>() / FFT_SIZE as f32).sqrt();
    if rms < 0.001 {
        return vec![0u8; NUM_BINS];
    }

    // Apply Hann window
    let mut input: Vec<Complex<f32>> = samples
        .iter()
        .enumerate()
        .map(|(i, &s)| {
            let window =
                0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / FFT_SIZE as f32).cos());
            Complex {
                re: s * window,
                im: 0.0,
            }
        })
        .collect();

    let mut planner = FftPlanner::new();
    let fft = planner.plan_fft_forward(FFT_SIZE);
    fft.process(&mut input);

    let half = FFT_SIZE / 2;
    let chunk = half / NUM_BINS;

    // First pass: collect magnitudes
    let mags: Vec<f32> = input[..half]
        .chunks(chunk)
        .take(NUM_BINS)
        .map(|chunk: &[Complex<f32>]| {
            chunk.iter().map(|c: &Complex<f32>| c.norm()).sum::<f32>() / chunk.len() as f32
        })
        .collect();

    // Find peak magnitude for dynamic scaling
    let max_mag = mags.iter().cloned().fold(0.0f32, f32::max);
    if max_mag < 1e-9 {
        return vec![0u8; NUM_BINS];
    }

    // Normalize to 0-255 with log scaling
    mags.iter()
        .map(|&mag| {
            let normalized = (mag / max_mag).clamp(0.0, 1.0);
            let scaled = (1.0 + 9.0 * normalized).ln() / (10.0_f32).ln();
            (scaled * 255.0) as u8
        })
        .collect()
}
