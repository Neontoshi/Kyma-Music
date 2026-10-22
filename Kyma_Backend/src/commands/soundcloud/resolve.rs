use super::sc_url;
use super::validation::validate_sc_id;
use crate::commands::media::{ytdlp_command, YtError};
use crate::commands::stream_cache::{get_cached_stream_url, set_cached_stream_url};
use crate::{user_action, user_error};

#[tauri::command]
pub async fn resolve_soundcloud_url(video_id: String) -> Result<String, YtError> {
    // Truncate long IDs for logging
    let id_log = if video_id.len() > 50 {
        format!("{}...", &video_id[..47])
    } else {
        video_id.clone()
    };
    user_action!("SOUNDCLOUD", "Resolving URL for: {}", id_log);

    validate_sc_id(&video_id)?;

    if let Some(cached) = get_cached_stream_url(&video_id) {
        user_action!("SOUNDCLOUD", "Cache hit for: {}", id_log);
        return Ok(cached);
    }

    let url = sc_url(&video_id);

    // Try to get a direct (non-HLS) progressive stream URL first
    let output = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        ytdlp_command()
            .args([
                &url,
                "-f",
                "bestaudio[protocol!=m3u8_native][protocol!=m3u8]/bestaudio",
                "--get-url",
                "--no-playlist",
                "--no-warnings",
                "--quiet",
            ])
            .output(),
    )
    .await
    .map_err(|_| {
        user_error!("SOUNDCLOUD", "Resolution timed out for: {}", id_log);
        YtError::DownloadTimeout
    })?
    .map_err(|e| {
        user_error!("SOUNDCLOUD", "yt-dlp spawn failed: {}", e);
        YtError::NotInstalled
    })?;

    if output.status.success() {
        let resolved = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !resolved.is_empty() && !resolved.contains(".m3u8") {
            user_action!("SOUNDCLOUD", "Resolved URL successfully for: {}", id_log);
            set_cached_stream_url(video_id, resolved.clone());
            return Ok(resolved);
        }
    }

    // Log what we actually got for debugging
    let stderr = String::from_utf8_lossy(&output.stderr);
    if !stderr.is_empty() {
        user_error!("SOUNDCLOUD", "yt-dlp stderr: {}", stderr);
        tracing::warn!("SC yt-dlp stderr: {}", stderr);
    }

    user_error!("SOUNDCLOUD", "Failed to resolve URL for: {}", id_log);
    Err(YtError::SearchFailed)
}
