use super::sc_url;
use super::validation::validate_sc_id;
use crate::commands::media::{ytdlp_command, YtError};
use crate::{user_action, user_error};
use std::path::PathBuf;

#[tauri::command]
pub async fn soundcloud_download(video_id: String, title: String) -> Result<String, YtError> {
    let title_log = if title.len() > 50 {
        format!("{}...", &title[..47])
    } else {
        title.clone()
    };
    user_action!("SOUNDCLOUD", "Downloading: {} ({})", title_log, video_id);

    validate_sc_id(&video_id)?;
    let url = sc_url(&video_id);
    let music_dir = dirs::audio_dir().unwrap_or_else(|| PathBuf::from("."));
    let output_template = music_dir.join("%(uploader)s - %(title)s.%(ext)s");

    let output = tokio::time::timeout(
        std::time::Duration::from_secs(300),
        ytdlp_command()
            .args([
                &url,
                "-f",
                "bestaudio",
                "--extract-audio",
                "--audio-format",
                "mp3",
                "--audio-quality",
                "0",
                "--output",
                &output_template.to_string_lossy(),
                "--no-part",
                "--no-playlist",
                "--no-warnings",
                "--retries",
                "3",
                "--fragment-retries",
                "3",
            ])
            .output(),
    )
    .await
    .map_err(|_| {
        user_error!("SOUNDCLOUD", "Download timeout for: {}", title_log);
        YtError::DownloadTimeout
    })?
    .map_err(|e| {
        user_error!("SOUNDCLOUD", "yt-dlp spawn failed: {}", e);
        YtError::NotInstalled
    })?;

    if !output.status.success() {
        user_error!("SOUNDCLOUD", "Download failed for: {}", title_log);
        return Err(YtError::DownloadFailed);
    }

    user_action!("SOUNDCLOUD", "Download complete: {}", title_log);
    Ok(format!("Downloaded \"{title}\""))
}
