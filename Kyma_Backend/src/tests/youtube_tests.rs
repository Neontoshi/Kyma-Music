// Kyma_Backend/src/tests/youtube_tests.rs
use crate::commands::youtube::{validate_sc_id, validate_video_id};

#[test]
fn test_valid_youtube_id() {
    assert!(validate_video_id("dQw4w9WgXcQ").is_ok());
    assert!(validate_video_id("abc123-_").is_ok());
}

#[test]
fn test_invalid_youtube_id() {
    assert!(validate_video_id("").is_err());
    assert!(validate_video_id("../../../etc/passwd").is_err());
    assert!(validate_video_id("dQw4w9WgXcQ<script>").is_err());
    assert!(validate_video_id("https://youtube.com/watch?v=abc").is_err());
}

#[test]
fn test_valid_sc_id() {
    assert!(validate_sc_id("https://soundcloud.com/artist/track").is_ok());
    assert!(validate_sc_id("12345").is_ok());
}

#[test]
fn test_invalid_sc_id() {
    assert!(validate_sc_id("").is_err());
    assert!(validate_sc_id("https://evil.com/../../../etc/passwd").is_err());
    assert!(validate_sc_id("a".repeat(2049).as_str()).is_err());
}
