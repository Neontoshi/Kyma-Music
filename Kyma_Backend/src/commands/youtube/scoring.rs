use super::query::ParsedQuery;
use super::text::{normalize, phonetic_key, token_overlap};
use super::types::YtDlpEntry;
use crate::commands::media::YtSong;

pub(super) fn artist_from_entry(entry: &YtDlpEntry) -> String {
    if !entry.uploader.is_empty() {
        entry.uploader.clone()
    } else if !entry.channel.is_empty() {
        entry.channel.clone()
    } else {
        "Unknown Artist".to_string()
    }
}

pub(super) struct ScoreContext<'a> {
    pub(super) song: &'a YtSong,
    pub(super) pq: &'a ParsedQuery,
    pub(super) is_topic: bool,
    pub(super) is_official: bool,
    pub(super) view_count: u64,
    pub(super) upload_date: Option<&'a str>,
}

pub(super) fn score_song(ctx: &ScoreContext) -> i32 {
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

//  Deduplication

pub(super) fn dedup_results(candidates: Vec<(YtSong, i32)>) -> Vec<YtSong> {
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
