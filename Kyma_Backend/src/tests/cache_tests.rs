use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

// ─── Minimal copy of the cache for isolated testing ─────────────────────────

static TEST_CACHE: Mutex<Option<HashMap<String, (String, Instant)>>> = Mutex::new(None);

const TTL: Duration = Duration::from_secs(21600); // 6 hours

fn get_cached(video_id: &str) -> Option<String> {
    let cache = TEST_CACHE.lock().ok()?;
    let cache = cache.as_ref()?;
    let (url, timestamp) = cache.get(video_id)?;
    if timestamp.elapsed() < TTL {
        Some(url.clone())
    } else {
        None
    }
}

fn set_cached(video_id: String, url: String) {
    if let Ok(mut cache) = TEST_CACHE.lock() {
        if cache.is_none() {
            *cache = Some(HashMap::new());
        }
        if let Some(map) = cache.as_mut() {
            if map.len() > 500 {
                map.clear();
            }
            map.insert(video_id, (url, Instant::now()));
        }
    }
}

fn invalidate(video_id: &str) {
    if let Ok(mut cache) = TEST_CACHE.lock() {
        if let Some(map) = cache.as_mut() {
            map.remove(video_id);
        }
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[test]
fn test_cache_hit() {
    let video_id = "dQw4w9WgXcQ";
    let url = "https://rr1---sn-abc123.googlevideo.com/videoplayback?...";

    // Initially empty
    assert!(get_cached(video_id).is_none());

    // Set and retrieve
    set_cached(video_id.to_string(), url.to_string());
    assert_eq!(get_cached(video_id), Some(url.to_string()));
}

#[test]
fn test_cache_invalidate() {
    let video_id = "test_invalidate";
    let url = "https://example.com/stream.mp4";

    set_cached(video_id.to_string(), url.to_string());
    assert!(get_cached(video_id).is_some());

    invalidate(video_id);
    assert!(get_cached(video_id).is_none());
}

#[test]
fn test_cache_expiry() {
    let video_id = "test_expired";

    // Insert with an old timestamp to simulate expiry
    {
        let mut cache = TEST_CACHE.lock().unwrap();
        if cache.is_none() {
            *cache = Some(HashMap::new());
        }
        if let Some(map) = cache.as_mut() {
            map.insert(
                video_id.to_string(),
                (
                    "https://example.com/old.mp4".to_string(),
                    Instant::now() - Duration::from_secs(21601), // 1 second past TTL
                ),
            );
        }
    }

    // Should return None because it's expired
    assert!(get_cached(video_id).is_none());
}

#[test]
fn test_cache_multiple_entries() {
    set_cached("vid1".to_string(), "https://example.com/1.mp4".to_string());
    set_cached("vid2".to_string(), "https://example.com/2.mp4".to_string());
    set_cached("vid3".to_string(), "https://example.com/3.mp4".to_string());

    assert_eq!(
        get_cached("vid1"),
        Some("https://example.com/1.mp4".to_string())
    );
    assert_eq!(
        get_cached("vid2"),
        Some("https://example.com/2.mp4".to_string())
    );
    assert_eq!(
        get_cached("vid3"),
        Some("https://example.com/3.mp4".to_string())
    );

    // Invalidate one and check others still there
    invalidate("vid2");
    assert!(get_cached("vid1").is_some());
    assert!(get_cached("vid2").is_none());
    assert!(get_cached("vid3").is_some());
}

#[test]
fn test_cache_overwrite() {
    let video_id = "test_overwrite";

    set_cached(
        video_id.to_string(),
        "https://example.com/old.mp4".to_string(),
    );
    assert_eq!(
        get_cached(video_id),
        Some("https://example.com/old.mp4".to_string())
    );

    // Overwrite with new URL
    set_cached(
        video_id.to_string(),
        "https://example.com/new.mp4".to_string(),
    );
    assert_eq!(
        get_cached(video_id),
        Some("https://example.com/new.mp4".to_string())
    );
}

#[test]
fn test_cache_unknown_key() {
    assert!(get_cached("nonexistent_video_id").is_none());
    invalidate("nonexistent_video_id"); // should not panic
}

#[test]
fn test_cache_fresh_within_ttl() {
    let video_id = "test_fresh";

    set_cached(
        video_id.to_string(),
        "https://example.com/fresh.mp4".to_string(),
    );

    // Should still be valid (just set, so well within TTL)
    assert!(get_cached(video_id).is_some());
}
