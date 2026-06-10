use crate::user_action;
use crate::user_error;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex as StdMutex;
use std::time::{Duration, Instant};
use tokio::process::Command;
use tokio::sync::Mutex as TokioMutex;

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

#[derive(Debug, Deserialize)]
pub struct YtDlpEntry {
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
    pub view_count: Option<u64>,
    #[serde(default)]
    pub like_count: Option<u64>,
    #[serde(default)]
    pub upload_date: Option<String>,
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

// ─── Stream URL Cache (disk-backed) ──────────────────────────────────────────

static STREAM_URL_CACHE: StdMutex<Option<HashMap<String, (String, Instant)>>> = StdMutex::new(None);

const STREAM_URL_TTL: Duration = Duration::from_secs(18000); // 5 hours

// Prevent concurrent re-resolution of the same video
static RESOLVE_LOCKS: TokioMutex<Option<HashMap<String, bool>>> = TokioMutex::const_new(None);

fn cache_file_path() -> PathBuf {
    dirs::cache_dir()
        .unwrap_or_else(|| std::env::temp_dir())
        .join("Kyma")
        .join("stream_url_cache.json")
}

fn load_cache_from_disk() -> HashMap<String, (String, Instant)> {
    let path = cache_file_path();
    if let Ok(data) = std::fs::read_to_string(&path) {
        if let Ok(map) = serde_json::from_str::<HashMap<String, (String, u64)>>(&data) {
            let now = Instant::now();
            return map
                .into_iter()
                .filter_map(|(k, (url, elapsed_secs))| {
                    if elapsed_secs < STREAM_URL_TTL.as_secs() {
                        Some((k, (url, now - Duration::from_secs(elapsed_secs))))
                    } else {
                        None
                    }
                })
                .collect();
        }
    }
    HashMap::new()
}

fn save_cache_to_disk(cache: &HashMap<String, (String, Instant)>) {
    let path = cache_file_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let now = Instant::now();
    let serializable: HashMap<String, (String, u64)> = cache
        .iter()
        .map(|(k, (url, ts))| {
            let elapsed = now.duration_since(*ts).as_secs();
            (k.clone(), (url.clone(), elapsed))
        })
        .collect();
    if let Ok(json) = serde_json::to_string(&serializable) {
        let _ = std::fs::write(&path, json);
    }
}

/// Returns a cached stream URL if it exists and has not yet expired.
/// Made `pub` so soundcloud.rs can share the same cache.
pub fn get_cached_stream_url(video_id: &str) -> Option<String> {
    let mut cache = STREAM_URL_CACHE.lock().ok()?;

    // Lazy-load from disk on first access
    if cache.is_none() {
        *cache = Some(load_cache_from_disk());
    }

    let cache = cache.as_ref()?;
    let (url, timestamp) = cache.get(video_id)?;
    if timestamp.elapsed() < STREAM_URL_TTL {
        Some(url.clone())
    } else {
        None
    }
}

/// Inserts or updates a stream URL entry and persists it to disk.
/// Made `pub` so soundcloud.rs can write into the shared cache.
pub fn set_cached_stream_url(video_id: String, url: String) {
    if let Ok(mut cache) = STREAM_URL_CACHE.lock() {
        if cache.is_none() {
            *cache = Some(load_cache_from_disk());
        }
        if let Some(map) = cache.as_mut() {
            if map.len() > 500 {
                map.clear();
            }
            map.insert(video_id.clone(), (url, Instant::now()));
            save_cache_to_disk(map);
        }
    }
}

#[tauri::command]
pub fn invalidate_stream_url(video_id: String) {
    if let Ok(mut cache) = STREAM_URL_CACHE.lock() {
        if cache.is_none() {
            *cache = Some(load_cache_from_disk());
        }
        if let Some(map) = cache.as_mut() {
            map.remove(&video_id);
            save_cache_to_disk(map);
        }
    }
}

pub fn secs_to_duration_str(secs: f64) -> String {
    let total = secs as u64;
    let h = total / 3600;
    let m = (total % 3600) / 60;
    let s = total % 60;
    if h > 0 {
        format!("{h}:{m:02}:{s:02}")
    } else {
        format!("{m}:{s:02}")
    }
}

fn cache_path(video_id: &str) -> PathBuf {
    std::env::temp_dir().join(format!("Kyma_yt_{video_id}.mp3"))
}

fn yt_url(video_id: &str) -> String {
    format!("https://www.youtube.com/watch?v={video_id}")
}

fn cache_is_complete(path: &PathBuf) -> bool {
    path.metadata().map(|m| m.len() > 102_400).unwrap_or(false)
}

// ─── Input Validation ────────────────────────────────────────────────────────

pub fn validate_video_id(id: &str) -> Result<(), YtError> {
    if id.is_empty() {
        return Err(YtError::InvalidId("empty ID".into()));
    }
    if id.len() > 32 {
        return Err(YtError::InvalidId("ID too long".into()));
    }
    if !id
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
    {
        return Err(YtError::InvalidId(id.to_string()));
    }
    Ok(())
}

pub fn validate_sc_id(id: &str) -> Result<(), YtError> {
    if id.is_empty() {
        return Err(YtError::InvalidId("empty ID".into()));
    }
    if id.len() > 2048 {
        return Err(YtError::InvalidId("ID too long".into()));
    }
    if id.contains("..") {
        return Err(YtError::InvalidId("path traversal blocked".into()));
    }
    if let Some(pos) = id.find("//") {
        if !id[..pos].ends_with(':') {
            return Err(YtError::InvalidId("path traversal blocked".into()));
        }
    }
    if id.contains("\\\\") {
        return Err(YtError::InvalidId("path traversal blocked".into()));
    }
    Ok(())
}

// ─── Language Filter ─────────────────────────────────────────────────────────

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

// ─── Query Intelligence ───────────────────────────────────────────────────────

#[derive(Debug, Default)]
struct ParsedQuery {
    raw: String,
    title_tokens: Vec<String>,
    artist_tokens: Vec<String>,
    year_hint: Option<u32>,
    explicit_version: Option<String>,
    is_lyric_query: bool,
}

fn parse_query(raw: &str) -> ParsedQuery {
    let mut pq = ParsedQuery {
        raw: raw.to_lowercase(),
        ..Default::default()
    };

    let lyric_markers = [
        "that goes ",
        "lyrics ",
        "the song where",
        "song about",
        "that song ",
    ];
    pq.is_lyric_query = lyric_markers.iter().any(|m| pq.raw.contains(m));

    let version_keywords = [
        "acoustic",
        "live",
        "remix",
        "mashup",
        "cover",
        "instrumental",
        "piano",
        "unplugged",
        "stripped",
        "lofi",
        "lo-fi",
    ];
    for kw in version_keywords {
        if pq.raw.contains(kw) {
            pq.explicit_version = Some(kw.to_string());
            break;
        }
    }

    let year_re: Vec<&str> = pq.raw.split_whitespace().collect();
    for token in &year_re {
        if let Ok(y) = token.parse::<u32>() {
            if (1950..=2030).contains(&y) {
                pq.year_hint = Some(y);
                break;
            }
        }
    }

    if let Some(by_pos) = pq.raw.find(" by ") {
        let (title_part, artist_part) = pq.raw.split_at(by_pos);
        let artist_part = &artist_part[4..];
        pq.title_tokens = title_part
            .split_whitespace()
            .map(|s| s.to_string())
            .collect();
        pq.artist_tokens = artist_part
            .split_whitespace()
            .map(|s| s.to_string())
            .collect();
        return pq;
    }

    let dash_sep = if pq.raw.contains(" - ") {
        Some(" - ")
    } else if pq.raw.contains(" – ") {
        Some(" – ")
    } else {
        None
    };

    if let Some(sep) = dash_sep {
        let parts: Vec<&str> = pq.raw.splitn(2, sep).collect();
        if parts.len() == 2 {
            pq.title_tokens = parts[0].split_whitespace().map(|s| s.to_string()).collect();
            pq.artist_tokens = parts[1].split_whitespace().map(|s| s.to_string()).collect();
            return pq;
        }
    }

    let feat_markers = [" feat. ", " feat ", " ft. ", " ft ", " featuring "];
    let mut working = pq.raw.clone();
    for marker in feat_markers {
        if let Some(pos) = working.find(marker) {
            let feat_artist = &working[pos + marker.len()..];
            pq.artist_tokens = feat_artist
                .split_whitespace()
                .map(|s| s.to_string())
                .collect();
            working = working[..pos].trim().to_string();
            break;
        }
    }

    pq.title_tokens = working.split_whitespace().map(|s| s.to_string()).collect();
    pq
}

// ─── Normalisation ────────────────────────────────────────────────────────────

fn normalize(text: &str) -> String {
    let mut s = text.to_lowercase();

    let patterns = [
        " (official video)",
        " (official music video)",
        " (official audio)",
        " (official lyric video)",
        " (official lyrics)",
        " (official)",
        " (audio)",
        " (lyrics)",
        " (lyric video)",
        " (visualizer)",
        " (music video)",
        " (video)",
        " (hd)",
        " (hq)",
        " (4k)",
        " (explicit)",
        " (clean)",
        " (radio edit)",
        " [official video]",
        " [official audio]",
        " [official]",
        " [lyrics]",
        " [audio]",
        " [hd]",
        " [hq]",
    ];

    for pattern in patterns {
        if let Some(pos) = s.find(pattern) {
            s = s[..pos].trim().to_string();
        }
    }

    s = s.replace('&', "and");
    s = s.replace('|', " ");
    s = s
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == ' ' {
                c
            } else {
                ' '
            }
        })
        .collect();
    s = s.split_whitespace().collect::<Vec<_>>().join(" ");
    s
}

fn phonetic_key(s: &str) -> String {
    let s = normalize(s);
    let mut key = String::new();
    let mut prev = ' ';
    for c in s.chars() {
        let code = match c {
            'a' | 'e' | 'i' | 'o' | 'u' => '0',
            'b' | 'f' | 'p' | 'v' => '1',
            'c' | 'g' | 'j' | 'k' | 'q' | 's' | 'x' | 'z' => '2',
            'd' | 't' => '3',
            'l' => '4',
            'm' | 'n' => '5',
            'r' => '6',
            ' ' => ' ',
            _ => continue,
        };
        if code != prev {
            key.push(code);
            prev = code;
        }
    }
    key
}

fn token_overlap(a: &str, b: &str) -> f32 {
    let set_a: std::collections::HashSet<&str> = a.split_whitespace().collect();
    let set_b: std::collections::HashSet<&str> = b.split_whitespace().collect();
    if set_a.is_empty() && set_b.is_empty() {
        return 1.0;
    }
    let intersection = set_a.intersection(&set_b).count() as f32;
    let union = set_a.union(&set_b).count() as f32;
    intersection / union
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

fn artist_from_entry(entry: &YtDlpEntry) -> String {
    if !entry.uploader.is_empty() {
        entry.uploader.clone()
    } else if !entry.channel.is_empty() {
        entry.channel.clone()
    } else {
        "Unknown Artist".to_string()
    }
}

struct ScoreContext<'a> {
    song: &'a YtSong,
    pq: &'a ParsedQuery,
    is_topic: bool,
    is_official: bool,
    view_count: u64,
    upload_date: Option<&'a str>,
}

fn score_song(ctx: &ScoreContext) -> i32 {
    let pq = ctx.pq;
    let song = ctx.song;

    let norm_title = normalize(&song.title);
    let norm_artist = normalize(&song.artist);
    let norm_query = normalize(&pq.raw);

    let title_tokens_str = pq.title_tokens.join(" ");
    let artist_tokens_str = pq.artist_tokens.join(" ");
    let norm_title_tokens = normalize(&title_tokens_str);
    let norm_artist_tokens = normalize(&artist_tokens_str);

    let mut score: i32 = 0;

    if norm_title == norm_query {
        score += 250;
    }
    if !norm_title_tokens.is_empty() && norm_title == norm_title_tokens {
        score += 200;
    }
    if norm_title.starts_with(&norm_query) {
        score += 100;
    }
    if norm_title.contains(&norm_query) {
        score += 60;
    }

    let title_overlap = token_overlap(&norm_title, &norm_query);
    score += (title_overlap * 80.0) as i32;

    if !norm_title_tokens.is_empty() {
        let title_side_overlap = token_overlap(&norm_title, &norm_title_tokens);
        score += (title_side_overlap * 60.0) as i32;
    }

    if !norm_artist_tokens.is_empty() {
        if norm_artist.contains(&norm_artist_tokens) {
            score += 80;
        } else if token_overlap(&norm_artist, &norm_artist_tokens) > 0.5 {
            score += 50;
        }
    }

    for word in norm_query.split_whitespace() {
        if word.len() < 2 {
            continue;
        }
        if norm_artist.contains(word) {
            score += 10;
        }
    }

    let phonetic_title = phonetic_key(&norm_title);
    let phonetic_query = phonetic_key(&norm_query);
    if !phonetic_title.is_empty() && !phonetic_query.is_empty() {
        let phon_overlap = token_overlap(&phonetic_title, &phonetic_query);
        score += (phon_overlap * 40.0) as i32;
    }

    if ctx.is_topic {
        score += 130;
    }
    if ctx.is_official {
        score += 80;
    }

    if ctx.view_count > 0 {
        let log_views = (ctx.view_count as f64).log10();
        score += (log_views * 8.0) as i32;
    }

    if let (Some(year_hint), Some(upload_date)) = (pq.year_hint, ctx.upload_date) {
        if upload_date.len() >= 4 {
            if let Ok(upload_year) = upload_date[..4].parse::<u32>() {
                let year_diff = (upload_year as i32 - year_hint as i32).unsigned_abs();
                if year_diff == 0 {
                    score += 60;
                } else if year_diff <= 1 {
                    score += 30;
                }
            }
        }
    }

    let lowered = song.title.to_lowercase();
    if let Some(ref version) = pq.explicit_version {
        if lowered.contains(version.as_str()) {
            score += 80;
        }
    } else {
        if lowered.contains("live") && !pq.raw.contains("live") {
            score -= 130;
        }
        if lowered.contains("karaoke") {
            score -= 180;
        }
        if lowered.contains("instrumental") {
            score -= 130;
        }
        if lowered.contains("cover") && !pq.raw.contains("cover") {
            score -= 180;
        }
        if lowered.contains("reaction") {
            score -= 220;
        }
        if lowered.contains("slowed") || lowered.contains("reverb") {
            score -= 180;
        }
        if lowered.contains("8d audio") {
            score -= 160;
        }
        if lowered.contains("nightcore") {
            score -= 220;
        }
        if lowered.contains("edit") && !pq.raw.contains("edit") {
            score -= 140;
        }
        if lowered.contains("remix") && !pq.raw.contains("remix") {
            score -= 150;
        }
        if lowered.contains("tutorial")
            || lowered.contains("lesson")
            || lowered.contains("how to play")
        {
            score -= 200;
        }
        if lowered.contains("bass boost") {
            score -= 180;
        }
        if lowered.contains("sped up") || lowered.contains("speed up") {
            score -= 180;
        }
    }

    let d = song.duration_secs;
    match d as u64 {
        90..=300 => score += 50,
        301..=480 => score += 30,
        481..=900 => score += 0,
        _ if d > 900.0 => score -= 100,
        _ => {}
    }

    score
}

// ─── Deduplication ───────────────────────────────────────────────────────────

fn dedup_results(candidates: Vec<(YtSong, i32)>) -> Vec<YtSong> {
    let mut seen_keys: Vec<String> = Vec::new();
    let mut results: Vec<YtSong> = Vec::new();

    for (song, _score) in candidates {
        let key = normalize(&song.title);
        if seen_keys.contains(&key) {
            continue;
        }
        let is_near_dup = seen_keys.iter().any(|k| token_overlap(k, &key) > 0.85);
        if is_near_dup {
            continue;
        }
        seen_keys.push(key);
        results.push(song);
        if results.len() >= 50 {
            break;
        }
    }

    results
}

// ─── Main command ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn youtube_search(query: String) -> Result<Vec<YtSong>, YtError> {
    let query_trimmed = query.trim();
    user_action!("YOUTUBE", "Searching: \"{}\"", query_trimmed);

    if query_trimmed.is_empty() {
        return Ok(Vec::new());
    }

    let pq = parse_query(query_trimmed);

    let best_query = if !pq.artist_tokens.is_empty() && !pq.title_tokens.is_empty() {
        format!(
            "{} - {}",
            pq.artist_tokens.join(" "),
            pq.title_tokens.join(" ")
        )
    } else {
        match pq.year_hint {
            Some(y) => pq.raw.replace(&y.to_string(), "").trim().to_string(),
            None => pq.raw.clone(),
        }
    };

    let search_arg = format!("ytsearch50:{best_query}");

    let output = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        ytdlp_command()
            .args([
                search_arg.as_str(),
                "--flat-playlist",
                "--dump-json",
                "--no-warnings",
                "--quiet",
                "--user-agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "--extractor-args",
                "youtube:player_client=tv_embedded",
            ])
            .output(),
    )
    .await
    .map_err(|_| {
        user_error!("YOUTUBE", "Search timed out after 30s");
        YtError::DownloadTimeout
    })?
    .map_err(|e| {
        user_error!("YOUTUBE", "yt-dlp spawn failed: {}", e);
        YtError::NotInstalled
    })?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if !output.status.success() {
        if stdout.trim().is_empty() {
            user_error!("YOUTUBE", "Search failed with no output");
            return Err(YtError::SearchFailed);
        }
        tracing::warn!(
            "yt-dlp exited with error but returned data, proceeding: {}",
            String::from_utf8_lossy(&output.stderr)
                .lines()
                .next()
                .unwrap_or("")
        );
    }

    let mut candidates: Vec<(YtSong, i32)> = Vec::new();
    let mut parse_errors = 0u32;

    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        match serde_json::from_str::<YtDlpEntry>(line) {
            Ok(entry) => {
                let duration_secs = entry.duration.unwrap_or(0.0);
                if duration_secs > 0.0 && duration_secs < 20.0 {
                    continue;
                }

                let artist = artist_from_entry(&entry);
                let is_topic = artist.ends_with(" - Topic") || entry.channel.ends_with(" - Topic");
                let channel_lc = entry.channel.to_lowercase();
                let uploader_lc = entry.uploader.to_lowercase();
                let is_official = channel_lc.contains("vevo")
                    || channel_lc.contains("official")
                    || uploader_lc.contains("vevo")
                    || uploader_lc.contains("official");

                let song = YtSong {
                    id: entry.id,
                    title: entry.title,
                    artist,
                    duration_secs,
                    duration_str: secs_to_duration_str(duration_secs),
                    thumbnail: entry.thumbnail.unwrap_or_default(),
                    source: "youtube".to_string(),
                };

                let ctx = ScoreContext {
                    song: &song,
                    pq: &pq,
                    is_topic,
                    is_official,
                    view_count: entry.view_count.unwrap_or(0),
                    upload_date: entry.upload_date.as_deref(),
                };

                let score = score_song(&ctx);
                candidates.push((song, score));
            }
            Err(e) => {
                parse_errors += 1;
                tracing::warn!(
                    "Skipped unparseable entry ({e}): {}",
                    &line[..line.len().min(80)]
                );
            }
        }
    }

    if parse_errors > 0 {
        user_error!(
            "YOUTUBE",
            "{} entries skipped due to parse errors",
            parse_errors
        );
    }

    if candidates.is_empty() {
        user_error!(
            "YOUTUBE",
            "Search returned no candidates for: \"{}\"",
            query_trimmed
        );
        return Err(YtError::SearchFailed);
    }

    candidates.sort_by(|a, b| b.1.cmp(&a.1));
    let results = dedup_results(candidates);

    user_action!(
        "YOUTUBE",
        "Found {} results for \"{}\"",
        results.len(),
        query_trimmed
    );
    Ok(results)
}

// ─── URL Resolution & Download Commands ──────────────────────────────────────

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

#[tauri::command]
pub async fn check_download_exists(video_id: String) -> Result<bool, String> {
    if let Err(e) = validate_video_id(&video_id) {
        return Err(e.to_string());
    }
    let path = std::env::temp_dir().join(format!("Kyma_yt_{video_id}.mp3"));
    Ok(path.exists() && path.metadata().map(|m| m.len() > 102_400).unwrap_or(false))
}

#[tauri::command]
pub async fn stream_youtube(video_id: String) -> Result<String, YtError> {
    let id_log = if video_id.len() > 20 {
        format!("{}...", &video_id[..17])
    } else {
        video_id.clone()
    };
    user_action!("YOUTUBE", "Streaming: {}", id_log);

    validate_video_id(&video_id)?;
    let path = cache_path(&video_id);
    let ready_path = ready_marker_path(&video_id);

    if cache_is_complete(&path) && ready_path.exists() {
        user_action!("YOUTUBE", "Using cached stream for: {}", id_log);
        return Ok(path.to_string_lossy().to_string());
    }

    let _ = tokio::fs::remove_file(&path).await;
    let _ = tokio::fs::remove_file(&ready_path).await;

    let url = yt_url(&video_id);
    let path_str = path.to_string_lossy().to_string();
    let ready_path_clone = ready_path.clone();
    let (tx, rx) = tokio::sync::oneshot::channel();

    tokio::spawn(async move {
        let result = tokio::time::timeout(
            std::time::Duration::from_secs(300),
            ytdlp_command()
                .args([
                    &url,
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
            user_action!("YOUTUBE", "Stream ready for: {}", id_log);
            Ok(path.to_string_lossy().to_string())
        }
        Ok(Err(e)) => {
            user_error!("YOUTUBE", "Stream failed for {}: {:?}", id_log, e);
            Err(e)
        }
        Err(_) => {
            user_error!("YOUTUBE", "Stream channel error for: {}", id_log);
            Err(YtError::DownloadFailed)
        }
    }
}

fn is_valid_audio_file(path: &PathBuf) -> bool {
    if !path.exists() {
        return false;
    }
    let metadata = match std::fs::metadata(path) {
        Ok(m) => m,
        Err(_) => return false,
    };
    if metadata.len() < 102_400 {
        return false;
    }
    let file = match std::fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return false,
    };
    let mut reader = std::io::BufReader::new(file);
    let mut header = [0u8; 3];
    use std::io::Read;
    if reader.read_exact(&mut header).is_err() {
        return false;
    }
    (header[0] == 0x49 && header[1] == 0x44 && header[2] == 0x33)
        || (header[0] == 0xFF && (header[1] & 0xE0) == 0xE0)
}

fn ready_marker_path(video_id: &str) -> PathBuf {
    std::env::temp_dir().join(format!("Kyma_yt_{video_id}.mp3.ready"))
}

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

/// Clears temp `.mp3` stream files AND the persistent disk URL cache JSON.
/// Called on app shutdown or manual cache-clear.
pub async fn clear_stream_cache() {
    user_action!("YOUTUBE", "Clearing stream cache");

    // 1. Remove temp audio files
    let temp_dir = std::env::temp_dir();
    let Ok(mut entries) = tokio::fs::read_dir(&temp_dir).await else {
        return;
    };

    let mut count = 0;
    while let Ok(Some(entry)) = entries.next_entry().await {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with("Kyma_yt_") && (name.ends_with(".mp3") || name.ends_with(".mp3.ready"))
        {
            let _ = tokio::fs::remove_file(entry.path()).await;
            count += 1;
        }
    }

    // 2. Wipe the in-memory cache and the disk JSON so stale entries don't
    //    survive a restart
    if let Ok(mut cache) = STREAM_URL_CACHE.lock() {
        if let Some(map) = cache.as_mut() {
            map.clear();
        }
        *cache = Some(HashMap::new());
    }
    let _ = std::fs::remove_file(cache_file_path());

    if count > 0 {
        user_action!("YOUTUBE", "Cleared {} cached files", count);
    }
    tracing::info!("Stream URL cache cleared (memory + disk)");
}

fn ytdlp_command() -> Command {
    let cmd = if let Ok(mock_path) = std::env::var("Kyma_MOCK_YTDLP") {
        Command::new(mock_path)
    } else {
        Command::new("yt-dlp")
    };

    // Prevent a console window from flashing on Windows
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    cmd
}
