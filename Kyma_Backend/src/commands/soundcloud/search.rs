use super::filters::{is_generic_title, title_relevance};
use super::types::ScEntry;
use crate::commands::media::{
    artist_from_parts, is_likely_english, secs_to_duration_str, ytdlp_command, YtError, YtSong,
};
use crate::{user_action, user_error};

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
        ytdlp_command()
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

        if let Ok(entry) = serde_json::from_str::<ScEntry>(line) {
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

            let artist = artist_from_parts(&entry.uploader, &entry.channel);

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
