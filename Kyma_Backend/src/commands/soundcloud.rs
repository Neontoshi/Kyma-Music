use super::youtube::{
    clear_stream_cache, get_cached_stream_url, secs_to_duration_str, set_cached_stream_url,
    validate_sc_id, YtError, YtSong,
};
use crate::user_action;
use crate::user_error;
use serde::Deserialize;
use std::path::PathBuf;
use tokio::process::Command;

#[derive(Debug, Deserialize)]
struct ScEntry {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub uploader: String,
    #[serde(default)]
    pub channel: String,
    #[serde(default)]
    pub duration: Option<f64>,
    #[serde(default)]
    pub thumbnail: Option<String>,
    #[serde(default)]
    pub webpage_url: Option<String>,
    #[serde(default)]
    pub view_count: Option<u64>,
    #[serde(default)]
    pub genre: Option<String>,
}

fn sc_cache_path(track_id: &str) -> PathBuf {
    let safe = track_id
        .replace("https://", "")
        .replace("http://", "")
        .replace('/', "_")
        .replace(':', "_");
    std::env::temp_dir().join(format!("Kyma_sc_{safe}.mp3"))
}

fn sc_ready_marker_path(track_id: &str) -> PathBuf {
    let safe = track_id
        .replace("https://", "")
        .replace("http://", "")
        .replace('/', "_")
        .replace(':', "_");
    std::env::temp_dir().join(format!("Kyma_sc_{safe}.mp3.ready"))
}

fn sc_cache_is_complete(path: &PathBuf) -> bool {
    path.metadata().map(|m| m.len() > 102_400).unwrap_or(false)
}

fn sc_url(track_id: &str) -> String {
    if track_id.starts_with("http") {
        track_id.to_string()
    } else {
        format!("https://soundcloud.com/tracks/{}", track_id)
    }
}

const BLOCKED_TITLE_PATTERNS: &[&str] = &[
    "untitled",
    "track 0",
    "track 1",
    "track 2",
    "track 3",
    "audio recording",
    "voice memo",
    "new recording",
    "output",
    "bounce",
    "export",
    "final master",
    "demo",
    "rough mix",
    "logic pro",
    "fl studio",
    "ableton",
    "garageband",
    "type beat",
    "free beat",
    "free download",
    "loop kit",
];

fn is_generic_title(title: &str) -> bool {
    let lower = title.to_lowercase();
    BLOCKED_TITLE_PATTERNS.iter().any(|p| lower.contains(p))
}

fn is_likely_english(title: &str) -> bool {
    for c in title.chars() {
        if ('\u{0900}'..='\u{097F}').contains(&c)
            || ('\u{0D00}'..='\u{0D7F}').contains(&c)
            || ('\u{0B80}'..='\u{0BFF}').contains(&c)
            || ('\u{0C00}'..='\u{0C7F}').contains(&c)
            || ('\u{0980}'..='\u{09FF}').contains(&c)
            || ('\u{3040}'..='\u{309F}').contains(&c)
            || ('\u{30A0}'..='\u{30FF}').contains(&c)
            || ('\u{4E00}'..='\u{9FFF}').contains(&c)
            || ('\u{0E00}'..='\u{0E7F}').contains(&c)
            || ('\u{0600}'..='\u{06FF}').contains(&c)
        {
            return false;
        }
    }
    true
}

fn title_relevance(title: &str, artist: &str, query: &str) -> f32 {
    let title_lower = title.to_lowercase();
    let artist_lower = artist.to_lowercase();
    let query_lower = query.to_lowercase();

    let query_words: Vec<&str> = query_lower.split_whitespace().collect();
    if query_words.is_empty() {
        return 0.0;
    }

    let mut score = 0.0f32;

    for word in &query_words {
        if word.len() < 3 {
            continue;
        }
        if title_lower.contains(word) {
            score += 0.35;
        }
        if artist_lower.contains(word) {
            score += 0.15;
        }
    }

    if title_lower.contains(&query_lower) {
        score += 0.4;
    }

    (score / query_words.len() as f32).min(1.0)
}

fn sc_command() -> Command {
    let cmd = Command::new("yt-dlp");
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    cmd
}

#[tauri::command]
pub async fn soundcloud_search(query: String) -> Result<Vec<YtSong>, YtError> {
    let query_trimmed = query.trim();
    user_action!("SOUNDCLOUD", "Searching: \"{}\"", query_trimmed);

    if query_trimmed.is_empty() {
        return Ok(Vec::new());
    }

    let search_arg = format!("scsearch40:{}", query_trimmed);

    let output = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        sc_command()
            .args([
                search_arg.as_str(),
                "--dump-json",
                "--no-playlist",
                "--flat-playlist",
                "--no-warnings",
                "--quiet",
            ])
            .output(),
    )
    .await
    .map_err(|_| {
        user_error!("SOUNDCLOUD", "Search timed out after 30s");
        YtError::DownloadTimeout
    })?
    .map_err(|e| {
        user_error!("SOUNDCLOUD", "yt-dlp spawn failed: {}", e);
        YtError::NotInstalled
    })?;

    if !output.status.success() {
        user_error!(
            "SOUNDCLOUD",
            "Search failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        return Err(YtError::SearchFailed);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut candidates: Vec<(YtSong, f32)> = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        match serde_json::from_str::<ScEntry>(line) {
            Ok(entry) => {
                let duration_secs = entry.duration.unwrap_or(0.0);

                if duration_secs < 90.0 || duration_secs > 900.0 {
                    continue;
                }
                if is_generic_title(&entry.title) {
                    continue;
                }
                if !is_likely_english(&entry.title) {
                    continue;
                }

                let artist = if !entry.uploader.is_empty() {
                    entry.uploader.clone()
                } else if !entry.channel.is_empty() {
                    entry.channel.clone()
                } else {
                    "Unknown Artist".to_string()
                };

                let dedup_key = format!("{}|{}", entry.title.to_lowercase(), artist.to_lowercase());
                if seen.contains(&dedup_key) {
                    continue;
                }
                seen.insert(dedup_key);

                let relevance = title_relevance(&entry.title, &artist, query_trimmed);
                if relevance < 0.15 {
                    continue;
                }

                let views = entry.view_count.unwrap_or(0);
                let popularity_bonus = if views > 100_000 {
                    0.3
                } else if views > 10_000 {
                    0.15
                } else {
                    0.0
                };

                let final_score = relevance + popularity_bonus;

                let track_id = entry
                    .webpage_url
                    .clone()
                    .unwrap_or_else(|| entry.id.clone());

                candidates.push((
                    YtSong {
                        id: track_id,
                        title: entry.title,
                        artist,
                        duration_secs,
                        duration_str: secs_to_duration_str(duration_secs),
                        thumbnail: String::new(),
                        source: "soundcloud".to_string(),
                    },
                    final_score,
                ));
            }
            Err(_) => {}
        }
    }

    candidates.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let results: Vec<YtSong> = candidates.into_iter().map(|(s, _)| s).collect();

    user_action!(
        "SOUNDCLOUD",
        "Found {} results for \"{}\"",
        results.len(),
        query_trimmed
    );
    Ok(results)
}

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
        sc_command()
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
    let path = sc_cache_path(&video_id);
    let ready = sc_ready_marker_path(&video_id);
    let exists = sc_cache_is_complete(&path) && ready.exists();

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
    let path = sc_cache_path(&video_id);
    let ready_path = sc_ready_marker_path(&video_id);

    if sc_cache_is_complete(&path) && ready_path.exists() {
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
            sc_command()
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
        sc_command()
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

pub async fn clear_soundcloud_stream_cache() {
    user_action!("SOUNDCLOUD", "Clearing stream cache");

    let temp_dir = std::env::temp_dir();
    let Ok(mut entries) = tokio::fs::read_dir(&temp_dir).await else {
        return;
    };

    let mut count = 0;
    while let Ok(Some(entry)) = entries.next_entry().await {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with("Kyma_sc_") && (name.ends_with(".mp3") || name.ends_with(".mp3.ready"))
        {
            let _ = tokio::fs::remove_file(entry.path()).await;
            count += 1;
        }
    }

    clear_stream_cache().await;

    if count > 0 {
        user_action!("SOUNDCLOUD", "Cleared {} cached files", count);
    }
}
