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

pub(super) fn is_generic_title(title: &str) -> bool {
    let lower = title.to_lowercase();
    BLOCKED_TITLE_PATTERNS.iter().any(|p| lower.contains(p))
}

pub(super) fn title_relevance(title: &str, artist: &str, query: &str) -> f32 {
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
