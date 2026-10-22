// Kyma_Backend/src/tests/youtube_tests.rs
use crate::commands::youtube::validate_video_id;

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
