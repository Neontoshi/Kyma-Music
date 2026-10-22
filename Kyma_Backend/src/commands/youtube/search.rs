use super::query::parse_query;
use super::scoring::{artist_from_entry, dedup_results, score_song, ScoreContext};
use super::types::YtDlpEntry;
use crate::commands::media::{secs_to_duration_str, ytdlp_command, YtError, YtSong};
use crate::user_error;

//  Main command

#[tauri::command]
pub async fn youtube_search(
    query: String,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Vec<YtSong>, YtError> {
    let query_trimmed = query.trim();

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
    let offset = offset.unwrap_or(0) as usize;
    let result_limit = (limit.unwrap_or(50) as usize + offset).clamp(10, 150);
    let search_arg = format!("ytsearch{result_limit}:{best_query}");

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

    candidates.sort_by_key(|c| std::cmp::Reverse(c.1));
    let results: Vec<YtSong> = dedup_results(candidates).into_iter().skip(offset).collect();

    Ok(results)
}
