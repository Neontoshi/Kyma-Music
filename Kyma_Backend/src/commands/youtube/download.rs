use super::validation::validate_video_id;
use super::yt_url;
use crate::commands::media::{ytdlp_command, YtError};
use crate::{user_action, user_error};
use std::path::PathBuf;

#[tauri::command]
pub async fn youtube_download(video_id: String, title: String) -> Result<String, YtError> {
    let title_log = if title.len() > 50 {
        format!("{}...", &title[..47])
    } else {
        title.clone()
    };
    user_action!("YOUTUBE", "Downloading: {} ({})", title_log, video_id);

    validate_video_id(&video_id)?;
    let music_dir = dirs::audio_dir().unwrap_or_else(|| PathBuf::from("."));
    let output_template = music_dir.join("%(title)s.%(ext)s");
    let url = yt_url(&video_id);

    let output = tokio::time::timeout(
        std::time::Duration::from_secs(300),
        ytdlp_command()
            .args([
                &url,
                "-f",
                "bestaudio[ext=m4a]/bestaudio",
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
                "1",
                "--fragment-retries",
                "1",
            ])
            .output(),
    )
    .await
    .map_err(|_| {
        user_error!("YOUTUBE", "Download timeout for: {}", title_log);
        YtError::DownloadTimeout
    })?
    .map_err(|e| {
        user_error!("YOUTUBE", "yt-dlp spawn failed: {}", e);
        YtError::NotInstalled
    })?;

    if !output.status.success() {
        user_error!("YOUTUBE", "Download failed for: {}", title_log);
        return Err(YtError::DownloadFailed);
    }

    user_action!("YOUTUBE", "Download complete: {}", title_log);
    Ok(format!("Downloaded \"{title}\""))
}

#[tauri::command]
pub async fn check_ytdlp() -> Result<String, YtError> {
    let output = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        ytdlp_command().arg("--version").output(),
    )
    .await
    .map_err(|_| YtError::NotInstalled)?
    .map_err(|_| YtError::NotInstalled)?;

    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
    user_action!("YOUTUBE", "yt-dlp version: {}", version);
    Ok(version)
}

#[tauri::command]
pub async fn update_ytdlp() -> Result<String, String> {
    user_action!("YOUTUBE", "Updating yt-dlp...");

    let output = tokio::process::Command::new("pip")
        .args(["install", "--upgrade", "yt-dlp", "--break-system-packages"])
        .output()
        .await
        .map_err(|e| format!("Failed to run pip: {}", e))?;

    if output.status.success() {
        // Get new version
        let version_output = tokio::process::Command::new("yt-dlp")
            .arg("--version")
            .output()
            .await
            .map_err(|e| format!("Failed to get version: {}", e))?;

        let new_version = String::from_utf8_lossy(&version_output.stdout)
            .trim()
            .to_string();
        user_action!("YOUTUBE", "Updated to yt-dlp version: {}", new_version);
        Ok(new_version)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        user_error!("YOUTUBE", "Failed to update yt-dlp: {}", stderr);
        Err(format!("Update failed: {}", stderr))
    }
}
