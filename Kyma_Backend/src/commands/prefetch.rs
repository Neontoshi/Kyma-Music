use crate::commands::player::FrontendSong;
use crate::state::app_state::AppState;
use crate::user_action;
use crate::user_error;
use std::time::Instant;

const PREFETCH_TTL_SECS: u64 = 120; // 2 minutes
const MAX_CACHE_SIZE: usize = 50;

#[tauri::command]
pub async fn prefetch_track(
    song: FrontendSong,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let title_log = if song.title.len() > 40 {
        format!("{}...", &song.title[..37])
    } else {
        song.title.clone()
    };

    // Skip local files
    if !song.path.is_empty() && !song.path.starts_with("http") {
        return Ok(());
    }

    // Check if already prefetched and not expired
    {
        let cache = state.prefetched_urls.lock();
        if let Some((_, timestamp)) = cache.get(&song.id) {
            if timestamp.elapsed().as_secs() < PREFETCH_TTL_SECS {
                return Ok(());
            }
        }
    }

    // Check if already being prefetched
    {
        let pending = state.pending_prefetches.lock();
        if pending.contains(&song.id) {
            return Ok(());
        }
    }

    // Mark as pending
    {
        let mut pending = state.pending_prefetches.lock();
        pending.insert(song.id.clone());
    }

    user_action!("PREFETCH", "Starting: {} - {}", title_log, song.artist);

    // Resolve the URL
    let play_url = if let Some(video_id) = &song.video_id {
        if song.source.as_deref() == Some("youtube") {
            match crate::commands::youtube::resolve_youtube_url(video_id.clone()).await {
                Ok(url) => url,
                Err(e) => {
                    user_error!("PREFETCH", "Failed YouTube: {} - {}", title_log, e);
                    let mut pending = state.pending_prefetches.lock();
                    pending.remove(&song.id);
                    return Err(e.to_string());
                }
            }
        } else if song.source.as_deref() == Some("soundcloud") {
            match crate::commands::soundcloud::resolve_soundcloud_url(video_id.clone()).await {
                Ok(url) => url,
                Err(e) => {
                    user_error!("PREFETCH", "Failed SoundCloud: {} - {}", title_log, e);
                    let mut pending = state.pending_prefetches.lock();
                    pending.remove(&song.id);
                    return Err(e.to_string());
                }
            }
        } else {
            let mut pending = state.pending_prefetches.lock();
            pending.remove(&song.id);
            return Err("Unknown source".into());
        }
    } else {
        let mut pending = state.pending_prefetches.lock();
        pending.remove(&song.id);
        return Err("No video_id".into());
    };

    // Store in cache with size limit enforcement
    {
        let mut cache = state.prefetched_urls.lock();

        // Evict expired entries first
        cache.retain(|_, (_, ts)| ts.elapsed().as_secs() < PREFETCH_TTL_SECS);

        // If still over limit, evict oldest entries
        if cache.len() >= MAX_CACHE_SIZE {
            // Collect keys to remove first, then remove them
            let keys_to_remove: Vec<String> = {
                let mut entries: Vec<_> = cache.iter().collect();
                entries.sort_by_key(|(_, (_, ts))| *ts);
                let remove_count = cache.len() - MAX_CACHE_SIZE + 1;
                entries
                    .iter()
                    .take(remove_count)
                    .map(|(k, _)| (*k).clone())
                    .collect::<Vec<_>>()
            };

            for key in keys_to_remove {
                cache.remove(&key);
            }
        }

        cache.insert(song.id.clone(), (play_url, Instant::now()));
    }

    // Remove from pending
    {
        let mut pending = state.pending_prefetches.lock();
        pending.remove(&song.id);
    }

    user_action!("PREFETCH", "Complete: {}", title_log);
    Ok(())
}

#[tauri::command]
pub async fn get_prefetched_url(
    song_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Option<String>, String> {
    let cache = state.prefetched_urls.lock();
    if let Some((url, timestamp)) = cache.get(&song_id) {
        if timestamp.elapsed().as_secs() < PREFETCH_TTL_SECS {
            return Ok(Some(url.clone()));
        }
    }
    Ok(None)
}

#[tauri::command]
pub async fn cancel_prefetch(
    song_ids: Vec<String>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut pending = state.pending_prefetches.lock();
    if song_ids.is_empty() {
        // Cancel all pending prefetches
        pending.clear();
    } else {
        for id in &song_ids {
            pending.remove(id);
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn clear_prefetch_cache(state: tauri::State<'_, AppState>) -> Result<(), String> {
    {
        let mut cache = state.prefetched_urls.lock();
        cache.clear();
    }
    {
        let mut pending = state.pending_prefetches.lock();
        pending.clear();
    }
    user_action!("PREFETCH", "Cleared all prefetch cache");
    Ok(())
}
