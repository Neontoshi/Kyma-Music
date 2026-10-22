use super::validation::validate_video_id;
use crate::commands::media::{ytdlp_command, YtError};
use crate::commands::stream_cache::{get_cached_stream_url, set_cached_stream_url};
use crate::{user_action, user_error};
use std::collections::HashMap;
use std::time::Duration;
use tokio::sync::Mutex as TokioMutex;

// Prevent concurrent re-resolution of the same video
static RESOLVE_LOCKS: TokioMutex<Option<HashMap<String, bool>>> = TokioMutex::const_new(None);

// URL Resolution & Download Commands

#[tauri::command]
pub async fn resolve_youtube_url(video_id: String) -> Result<String, YtError> {
    // Truncate ID for logging
    let id_log = if video_id.len() > 20 {
        format!("{}...", &video_id[..17])
    } else {
        video_id.clone()
    };
    user_action!("YOUTUBE", "Resolving URL for: {}", id_log);

    validate_video_id(&video_id)?;

    // Check cache first
    if let Some(cached_url) = get_cached_stream_url(&video_id) {
        user_action!("YOUTUBE", "Cache hit for: {}", id_log);
        return Ok(cached_url);
    }

    // Prevent duplicate concurrent resolves for the same video
    loop {
        let mut locks = RESOLVE_LOCKS.lock().await;
        if locks.is_none() {
            *locks = Some(HashMap::new());
        }
        let should_wait = locks
            .as_ref()
            .map(|m| m.contains_key(&video_id))
            .unwrap_or(false);
        drop(locks);

        if should_wait {
            tokio::time::sleep(Duration::from_millis(200)).await;
        } else {
            break;
        }
    }

    // Acquire the lock
    {
        let mut locks = RESOLVE_LOCKS.lock().await;
        if let Some(map) = locks.as_mut() {
            map.insert(video_id.clone(), true);
        }
    }

    let result = resolve_youtube_url_inner(&video_id).await;

    // Release lock
    {
        let mut locks = RESOLVE_LOCKS.lock().await;
        if let Some(map) = locks.as_mut() {
            map.remove(&video_id);
        }
    }

    result
}

async fn resolve_youtube_url_inner(video_id: &str) -> Result<String, YtError> {
    let id_log = if video_id.len() > 20 {
        format!("{}...", &video_id[..17])
    } else {
        video_id.to_string()
    };

    let url = format!("https://www.youtube.com/watch?v={video_id}");

    let output = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        ytdlp_command()
            .args([
                &url,
                "-f",
                "140",
                "--get-url",
                "--no-playlist",
                "--no-warnings",
                "--quiet",
                "--extractor-args",
                "youtube:player_client=tv_embedded",
            ])
            .output(),
    )
    .await
    .map_err(|_| {
        user_error!("YOUTUBE", "Resolution timeout for: {}", id_log);
        YtError::DownloadTimeout
    })?
    .map_err(|e| {
        user_error!("YOUTUBE", "yt-dlp spawn failed: {}", e);
        YtError::NotInstalled
    })?;

    if output.status.success() {
        let resolved_url = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !resolved_url.is_empty() {
            user_action!("YOUTUBE", "Resolved URL successfully for: {}", id_log);
            set_cached_stream_url(video_id.to_string(), resolved_url.clone());
            return Ok(resolved_url);
        }
    }

    user_error!("YOUTUBE", "Failed to resolve URL for: {}", id_log);
    Err(YtError::SearchFailed)
}
