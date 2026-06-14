use crate::state::app_state::AppState;
use crate::user_action;
use crate::user_error;
use crate::KymaError;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(serde::Serialize)]
pub struct ResumeState {
    pub song: Option<FrontendSong>,
    pub position: f64,
    pub is_playing: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrontendSong {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: f64,
    pub path: String,
    pub source: Option<String>,
    #[serde(rename = "videoId")]
    pub video_id: Option<String>,
    pub artwork_url: Option<String>,
    pub dur: String,
    pub emoji: String,
    pub grad: String,
    pub bpm: i32,
    pub key: String,
    pub plays: i32,
    pub liked: bool,
}

#[tauri::command]
pub async fn get_resume_state() -> Result<ResumeState, KymaError> {
    let path = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("Kyma")
        .join("resume.json");

    if !path.exists() {
        return Ok(ResumeState {
            song: None,
            position: 0.0,
            is_playing: false,
        });
    }

    let json =
        std::fs::read_to_string(&path).map_err(|e| KymaError::FileReadError(e.to_string()))?;
    let data: serde_json::Value =
        serde_json::from_str(&json).map_err(|e| KymaError::FileReadError(e.to_string()))?;

    let song: Option<FrontendSong> = match &data["song"] {
        serde_json::Value::Object(_) => serde_json::from_value(data["song"].clone()).ok(),
        _ => None,
    };

    // Reject stream sources and radio
    let song = song.filter(|s| {
        s.source.as_deref() != Some("youtube")
            && s.source.as_deref() != Some("soundcloud")
            && !s.path.starts_with("http")
    });

    if song.is_none() {
        let _ = std::fs::remove_file(&path);
    }
    let _ = std::fs::remove_file(&path);

    Ok(ResumeState {
        song,
        position: data["position"].as_f64().unwrap_or(0.0),
        is_playing: false,
    })
}

/// Helper: check prefetch cache for a song, returning the URL if fresh (< 90s old)
fn check_prefetch_cache(state: &AppState, song: &FrontendSong) -> Option<String> {
    let prefetch_cache = state.prefetched_urls.lock();
    if let Some((url, timestamp)) = prefetch_cache.get(&song.id) {
        if timestamp.elapsed().as_secs() < 90 {
            return Some(url.clone());
        }
    }
    None
}

#[tauri::command]
pub async fn play_track(
    song: FrontendSong,
    state: tauri::State<'_, AppState>,
) -> Result<u64, KymaError> {
    // Truncate long title for logging
    let title_log = if song.title.len() > 50 {
        format!("{}...", &song.title[..47])
    } else {
        song.title.clone()
    };

    user_action!(
        "PLAYBACK",
        "Playing: {} - {} (source: {:?})",
        title_log,
        song.artist,
        song.source
    );

    let app = &*state;

    // Determine the playable URL - check prefetch cache first
    let play_url = if !song.path.is_empty() {
        // Local file - use path directly
        song.path.clone()
    } else if let Some(cached_url) = check_prefetch_cache(app, &song) {
        user_action!("PLAYBACK", "Using prefetched URL for: {}", title_log);
        cached_url
    } else if let Some(video_id) = &song.video_id {
        // Not prefetched - resolve now
        if song.source.as_deref() == Some("youtube") {
            match crate::commands::youtube::resolve_youtube_url(video_id.clone()).await {
                Ok(url) => url,
                Err(e) => {
                    user_error!(
                        "PLAYBACK",
                        "Failed to resolve YouTube URL for {}: {}",
                        song.video_id.as_deref().unwrap_or("unknown"),
                        e
                    );
                    return Err(e.into());
                }
            }
        } else if song.source.as_deref() == Some("soundcloud") {
            match crate::commands::soundcloud::resolve_soundcloud_url(video_id.clone()).await {
                Ok(url) => url,
                Err(e) => {
                    user_error!(
                        "PLAYBACK",
                        "Failed to resolve SoundCloud URL for {}: {}",
                        song.video_id.as_deref().unwrap_or("unknown"),
                        e
                    );
                    return Err(e.into());
                }
            }
        } else {
            user_error!(
                "PLAYBACK",
                "No valid source for streaming: {:?}",
                song.source
            );
            return Err(KymaError::PlaybackError(
                "No valid source for streaming".into(),
            ));
        }
    } else {
        user_error!(
            "PLAYBACK",
            "Cannot play: no path or video_id for '{}'",
            song.title
        );
        return Err(KymaError::PlaybackError(format!(
            "Cannot play song: no path or video_id for '{}'",
            song.title
        )));
    };

    let track_id = if song.source.as_deref() == Some("youtube") {
        let vid = song.video_id.as_deref().unwrap_or("");
        app.audio_engine.play_youtube(&play_url, vid)
    } else {
        app.audio_engine.play(&play_url, false)
    };

    user_action!("PLAYBACK", "Started with track_id: {}", track_id);

    tokio::time::sleep(Duration::from_millis(50)).await;
    {
        let mut current_track = app.current_track.lock();
        *current_track = Some(song.clone());
    }
    {
        let queue = state.queue.lock();
        if let Some(pos) = queue.iter().position(|s| s.id == song.id) {
            *state.queue_index.lock() = pos;
        }
    }
    *app.is_playing.lock() = true;

    Ok(track_id)
}

#[tauri::command]
pub async fn pause_playback(state: tauri::State<'_, AppState>) -> Result<(), KymaError> {
    user_action!("PLAYBACK", "Paused");
    state.audio_engine.pause();
    *state.is_playing.lock() = false;
    Ok(())
}

#[tauri::command]
pub async fn resume_playback(state: tauri::State<'_, AppState>) -> Result<(), KymaError> {
    user_action!("PLAYBACK", "Resumed");
    state.audio_engine.resume();
    *state.is_playing.lock() = true;
    Ok(())
}

#[tauri::command]
pub async fn stop_playback(state: tauri::State<'_, AppState>) -> Result<(), KymaError> {
    user_action!("PLAYBACK", "Stopped");
    state.audio_engine.stop();
    *state.is_playing.lock() = false;
    let mut current = state.current_track.lock();
    *current = None;
    Ok(())
}

#[tauri::command]
pub async fn seek_to(position: f64, state: tauri::State<'_, AppState>) -> Result<(), KymaError> {
    user_action!("SEEK", "To {:.2}s", position);
    state.audio_engine.seek(position);
    Ok(())
}

#[tauri::command]
pub async fn set_volume(level: f32, state: tauri::State<'_, AppState>) -> Result<(), KymaError> {
    let clamped = level.clamp(0.0, 1.0);
    let percent = (clamped * 100.0) as i32;

    user_action!("VOLUME", "Set to {}%", percent);
    state.audio_engine.set_volume(clamped);
    *state.volume.lock() = clamped;
    Ok(())
}

#[tauri::command]
pub async fn get_volume(state: tauri::State<'_, AppState>) -> Result<f32, KymaError> {
    Ok(*state.volume.lock())
}

#[tauri::command]
pub async fn get_playback_state(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, KymaError> {
    let audio_state = state.audio_engine.get_state();
    Ok(serde_json::json!({
        "position": audio_state.position,
        "duration": audio_state.duration,
        "is_playing": audio_state.is_playing,
    }))
}

async fn resolve_song_path(song: &FrontendSong) -> Result<String, KymaError> {
    if !song.path.is_empty() {
        return Ok(song.path.clone());
    }
    if let Some(video_id) = &song.video_id {
        return match song.source.as_deref() {
            Some("youtube") => crate::commands::youtube::resolve_youtube_url(video_id.clone())
                .await
                .map_err(|e| KymaError::PlaybackError(e.to_string())),
            Some("soundcloud") => {
                crate::commands::soundcloud::resolve_soundcloud_url(video_id.clone())
                    .await
                    .map_err(|e| KymaError::PlaybackError(e.to_string()))
            }
            _ => Err(KymaError::PlaybackError("Unknown source".into())),
        };
    }
    Err(KymaError::PlaybackError(format!(
        "No path or video_id for '{}'",
        song.title
    )))
}

#[tauri::command]
pub async fn next_track(state: tauri::State<'_, AppState>) -> Result<(), KymaError> {
    user_action!("PLAYBACK", "Next track");

    let next_song = {
        let queue = state.queue.lock();
        let mut idx = state.queue_index.lock();

        if queue.is_empty() {
            user_action!("PLAYBACK", "Next track: queue empty");
            return Ok(());
        }

        let next_idx = *idx + 1;
        if next_idx >= queue.len() {
            user_action!("PLAYBACK", "Next track: end of queue reached");
            *state.is_playing.lock() = false;
            return Ok(());
        }

        *idx = next_idx;
        queue[next_idx].clone()
    };

    let title_log = if next_song.title.len() > 50 {
        format!("{}...", &next_song.title[..47])
    } else {
        next_song.title.clone()
    };

    user_action!(
        "PLAYBACK",
        "Playing next: {} - {}",
        title_log,
        next_song.artist
    );

    // Check prefetch cache first, then fall back to resolving
    let play_path = if let Some(cached_url) = check_prefetch_cache(&state, &next_song) {
        user_action!("PLAYBACK", "Using prefetched URL for next: {}", title_log);
        cached_url
    } else {
        resolve_song_path(&next_song).await?
    };

    state.audio_engine.play(&play_path, false);
    *state.current_track.lock() = Some(next_song);
    *state.is_playing.lock() = true;
    Ok(())
}

#[tauri::command]
pub async fn prev_track(state: tauri::State<'_, AppState>) -> Result<(), KymaError> {
    user_action!("PLAYBACK", "Previous track");

    let prev_song = {
        let queue = state.queue.lock();
        let mut idx = state.queue_index.lock();

        if queue.is_empty() {
            user_action!("PLAYBACK", "Previous track: queue empty");
            return Ok(());
        }

        if *idx == 0 {
            user_action!("PLAYBACK", "Previous track: already at start");
            return Ok(());
        }

        *idx -= 1;
        queue[*idx].clone()
    };

    let title_log = if prev_song.title.len() > 50 {
        format!("{}...", &prev_song.title[..47])
    } else {
        prev_song.title.clone()
    };

    user_action!(
        "PLAYBACK",
        "Playing previous: {} - {}",
        title_log,
        prev_song.artist
    );

    // Check prefetch cache first, then fall back to resolving
    let play_path = if let Some(cached_url) = check_prefetch_cache(&state, &prev_song) {
        user_action!(
            "PLAYBACK",
            "Using prefetched URL for previous: {}",
            title_log
        );
        cached_url
    } else {
        resolve_song_path(&prev_song).await?
    };

    state.audio_engine.play(&play_path, false);
    *state.current_track.lock() = Some(prev_song);
    *state.is_playing.lock() = true;
    Ok(())
}

#[tauri::command]
pub async fn set_queue(
    queue: Vec<FrontendSong>,
    state: tauri::State<'_, AppState>,
) -> Result<(), KymaError> {
    user_action!("QUEUE", "Set queue: {} songs", queue.len());
    {
        let mut queue_lock = state.queue.lock();
        *queue_lock = queue;
    }
    *state.queue_index.lock() = 0;
    Ok(())
}

#[tauri::command]
pub async fn add_to_queue(
    song: FrontendSong,
    state: tauri::State<'_, AppState>,
) -> Result<(), KymaError> {
    let title_log = if song.title.len() > 50 {
        format!("{}...", &song.title[..47])
    } else {
        song.title.clone()
    };

    user_action!("QUEUE", "Add: {} - {}", title_log, song.artist);

    let mut queue = state.queue.lock();
    queue.push(song);
    let new_size = queue.len();
    user_action!("QUEUE", "Size: {}", new_size);
    Ok(())
}

#[tauri::command]
pub async fn get_queue(state: tauri::State<'_, AppState>) -> Result<Vec<FrontendSong>, KymaError> {
    let queue = state.queue.lock();
    user_action!("QUEUE", "Get queue: {} songs", queue.len());
    Ok(queue.clone())
}

#[tauri::command]
pub async fn add_to_queue_at_position(
    song: FrontendSong,
    position: usize,
    state: tauri::State<'_, AppState>,
) -> Result<(), KymaError> {
    let title_log = if song.title.len() > 40 {
        format!("{}...", &song.title[..37])
    } else {
        song.title.clone()
    };

    user_action!(
        "QUEUE",
        "Add at position {}: {} - {}",
        position,
        title_log,
        song.artist
    );

    let mut queue = state.queue.lock();
    let insert_pos = position.min(queue.len());
    queue.insert(insert_pos, song);
    user_action!("QUEUE", "New size: {}", queue.len());
    Ok(())
}

#[tauri::command]
pub async fn remove_from_queue(
    song_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), KymaError> {
    user_action!("QUEUE", "Remove: {}", song_id);
    let mut queue = state.queue.lock();
    let before_size = queue.len();
    queue.retain(|s| s.id != song_id);
    let after_size = queue.len();
    if before_size != after_size {
        user_action!("QUEUE", "Removed, size: {} -> {}", before_size, after_size);
    }
    Ok(())
}

#[tauri::command]
pub async fn clear_queue(state: tauri::State<'_, AppState>) -> Result<(), KymaError> {
    user_action!("QUEUE", "Clear all");

    let mut queue = state.queue.lock();
    let size = queue.len();
    queue.clear();
    user_action!("QUEUE", "Cleared {} songs", size);
    Ok(())
}
