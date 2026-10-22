//  Query Intelligence

#[derive(Debug, Default)]
pub(super) struct ParsedQuery {
    pub(super) raw: String,
    pub(super) title_tokens: Vec<String>,
    pub(super) artist_tokens: Vec<String>,
    pub(super) year_hint: Option<u32>,
    pub(super) explicit_version: Option<String>,
    pub(super) is_lyric_query: bool,
}

pub(super) fn parse_query(raw: &str) -> ParsedQuery {
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
