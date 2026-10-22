use super::sc_url;
use super::validation::validate_sc_id;
use crate::commands::media::{
    audio_cache_path, cache_is_complete, ready_marker_path, ytdlp_command, YtError,
};
use crate::{user_action, user_error};

#[tauri::command]
pub async fn check_soundcloud_download_exists(video_id: String) -> Result<bool, String> {
    let id_log = if video_id.len() > 50 {
        format!("{}...", &video_id[..47])
    } else {
        video_id.clone()
    };

    if let Err(e) = validate_sc_id(&video_id) {
        user_error!("SOUNDCLOUD", "Invalid ID for download check: {}", e);
        return Err(e.to_string());
    }
    let path = audio_cache_path("Kyma_sc", &video_id);
    let ready = ready_marker_path("Kyma_sc", &video_id);
    let exists = cache_is_complete(&path) && ready.exists();

    if exists {
        user_action!("SOUNDCLOUD", "Download exists for: {}", id_log);
    }
    Ok(exists)
}

#[tauri::command]
pub async fn stream_soundcloud(video_id: String) -> Result<String, YtError> {
    let id_log = if video_id.len() > 40 {
        format!("{}...", &video_id[..37])
    } else {
        video_id.clone()
    };
    user_action!("SOUNDCLOUD", "Streaming: {}", id_log);

    validate_sc_id(&video_id)?;
    let path = audio_cache_path("Kyma_sc", &video_id);
    let ready_path = ready_marker_path("Kyma_sc", &video_id);

    if cache_is_complete(&path) && ready_path.exists() {
        user_action!("SOUNDCLOUD", "Using cached stream for: {}", id_log);
        return Ok(path.to_string_lossy().to_string());
    }

    let _ = tokio::fs::remove_file(&path).await;
    let _ = tokio::fs::remove_file(&ready_path).await;

    let url = sc_url(&video_id);
    let path_str = path.to_string_lossy().to_string();
    let ready_path_clone = ready_path.clone();
    let (tx, rx) = tokio::sync::oneshot::channel();

    tokio::spawn(async move {
        let result = tokio::time::timeout(
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
                    &path_str,
                    "--no-part",
                    "--force-overwrites",
                    "--no-playlist",
                    "--no-warnings",
                    "--retries",
                    "5",
                    "--fragment-retries",
                    "5",
                ])
                .stdin(std::process::Stdio::null())
                .stderr(std::process::Stdio::piped())
                .output(),
        )
        .await;

        match result {
            Ok(Ok(output)) if output.status.success() => {
                let _ = tokio::fs::write(&ready_path_clone, b"ready").await;
                let _ = tx.send(Ok(()));
            }
            Ok(Ok(_)) => {
                let _ = std::fs::remove_file(&path_str);
                let _ = tx.send(Err(YtError::DownloadFailed));
            }
            Ok(Err(_)) => {
                let _ = tx.send(Err(YtError::NotInstalled));
            }
            Err(_) => {
                let _ = std::fs::remove_file(&path_str);
                let _ = tx.send(Err(YtError::DownloadTimeout));
            }
        }
    });

    match rx.await {
        Ok(Ok(())) => {
            user_action!("SOUNDCLOUD", "Stream ready for: {}", id_log);
            Ok(path.to_string_lossy().to_string())
        }
        Ok(Err(e)) => {
            user_error!("SOUNDCLOUD", "Stream failed for {}: {:?}", id_log, e);
            Err(e)
        }
        Err(_) => {
            user_error!("SOUNDCLOUD", "Stream channel error for: {}", id_log);
            Err(YtError::DownloadFailed)
        }
    }
}
