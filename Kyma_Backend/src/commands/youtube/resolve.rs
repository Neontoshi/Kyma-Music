use super::validation::validate_video_id;
use crate::commands::media::{ytdlp_command, YtError};
use crate::commands::stream_cache::{get_cached_stream_url, set_cached_stream_url};
use crate::user_error;
use std::collections::HashMap;
use std::time::Duration;
use tokio::sync::Mutex as TokioMutex;

// Prevent concurrent re-resolution of the same video
static RESOLVE_LOCKS: TokioMutex<Option<HashMap<String, bool>>> = TokioMutex::const_new(None);

// URL Resolution & Download Commands

#[tauri::command]
pub async fn resolve_youtube_url(video_id: String) -> Result<String, YtError> {
    validate_video_id(&video_id)?;

    // Check cache first
    if let Some(cached_url) = get_cached_stream_url(&video_id) {
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
    // YouTube intermittently rate-limits individual requests. Retry the
    // client that works reliably here with a short exponential backoff.
    const MAX_ATTEMPTS: usize = 3;
    let mut failures = Vec::new();

    for attempt in 0..MAX_ATTEMPTS {
        if attempt > 0 {
            let backoff_ms = 600 * 2u64.pow(attempt as u32 - 1);
            tokio::time::sleep(Duration::from_millis(backoff_ms)).await;
        }

        let output = tokio::time::timeout(
            Duration::from_secs(20),
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
        .await;

        match output {
            Err(_) => {
                failures.push(format!("attempt {}: timeout", attempt + 1));
                tracing::warn!(
                    "[YOUTUBE] Resolve timeout for {id_log} (attempt {})",
                    attempt + 1
                );
            }
            Ok(Err(e)) => {
                user_error!("YOUTUBE", "yt-dlp spawn failed: {}", e);
                return Err(YtError::NotInstalled);
            }
            Ok(Ok(output)) => {
                let resolved_url = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if output.status.success() && !resolved_url.is_empty() {
                    set_cached_stream_url(video_id.to_string(), resolved_url.clone());
                    return Ok(resolved_url);
                }

                let stderr = String::from_utf8_lossy(&output.stderr);
                let reason = stderr
                    .lines()
                    .rev()
                    .find(|line| !line.trim().is_empty())
                    .map(str::trim)
                    .unwrap_or_else(|| {
                        if output.status.success() {
                            "empty response"
                        } else {
                            "yt-dlp returned an error"
                        }
                    });
                failures.push(format!("attempt {}: {reason}", attempt + 1));
                tracing::warn!(
                    "[YOUTUBE] Resolve failed for {id_log} (attempt {}): {reason}",
                    attempt + 1
                );
            }
        }
    }

    let reason = truncate_chars(&failures.join(" | "), 500);
    user_error!(
        "YOUTUBE",
        "Failed to resolve URL for {}: {}",
        id_log,
        reason
    );
    Err(YtError::SearchFailed)
}

fn truncate_chars(value: &str, max: usize) -> String {
    if value.chars().count() <= max {
        value.to_string()
    } else {
        value.chars().take(max).collect::<String>() + "..."
    }
}
