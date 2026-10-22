// Shared helpers for the yt-dlp backed providers (YouTube / SoundCloud).
use serde::Serialize;
use std::path::{Path, PathBuf};
use tokio::process::Command;

#[derive(Debug, thiserror::Error)]
pub enum YtError {
    #[error("yt-dlp is not installed. Run: pip install yt-dlp --break-system-packages")]
    NotInstalled,

    #[error("Search Unavailable")]
    SearchFailed,

    #[error("Download did not start in time")]
    DownloadTimeout,

    #[error("Download failed")]
    DownloadFailed,

    #[error("Invalid video ID: {0}")]
    InvalidId(String),
}

impl Serialize for YtError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Serialize, Clone)]
pub struct YtSong {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub duration_secs: f64,
    pub duration_str: String,
    pub thumbnail: String,
    pub source: String,
}

pub fn secs_to_duration_str(secs: f64) -> String {
    let total = secs.round() as u64;
    let h = total / 3600;
    let m = (total % 3600) / 60;
    let s = total % 60;
    if h > 0 {
        format!("{h}:{m:02}:{s:02}")
    } else {
        format!("{m}:{s:02}")
    }
}

//  Language Filter

pub fn is_likely_english(title: &str) -> bool {
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

pub fn artist_from_parts(uploader: &str, channel: &str) -> String {
    if !uploader.is_empty() {
        uploader.to_string()
    } else if !channel.is_empty() {
        channel.to_string()
    } else {
        "Unknown Artist".to_string()
    }
}

fn safe_cache_id(id: &str) -> String {
    id.replace("https://", "")
        .replace("http://", "")
        .replace(['/', ':'], "_")
}

/// Temp path used to cache a downloaded/streamed audio file.
pub fn audio_cache_path(prefix: &str, id: &str) -> PathBuf {
    std::env::temp_dir().join(format!("{prefix}_{}.mp3", safe_cache_id(id)))
}

/// Marker written after an audio cache file is fully downloaded.
pub fn ready_marker_path(prefix: &str, id: &str) -> PathBuf {
    std::env::temp_dir().join(format!("{prefix}_{}.mp3.ready", safe_cache_id(id)))
}

/// A cached audio file is only usable once it is large enough to be real audio.
pub fn cache_is_complete(path: &Path) -> bool {
    path.metadata().map(|m| m.len() > 102_400).unwrap_or(false)
}

pub fn ytdlp_command() -> Command {
    #[allow(unused_mut)]
    let mut cmd = if let Ok(mock_path) = std::env::var("Kyma_MOCK_YTDLP") {
        Command::new(mock_path)
    } else {
        Command::new("yt-dlp")
    };

    // Prevent a console window from flashing on Windows
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    cmd
}
