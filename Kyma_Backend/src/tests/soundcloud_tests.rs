// Kyma_Backend/src/tests/soundcloud_tests.rs
use crate::commands::soundcloud::{soundcloud_search, validate_sc_id};

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

#[tokio::test]
async fn test_soundcloud_search_with_mock() {
    let mock_path = std::env::current_dir()
        .unwrap()
        .join("tests/fixtures/mock-yt-dlp");
    std::env::set_var("Kyma_MOCK_YTDLP", mock_path.to_str().unwrap());

    let results = soundcloud_search("test".to_string()).await.unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].source, "soundcloud");
    assert_eq!(results[0].title, "Test SoundCloud Track");
    assert_eq!(results[0].artist, "TestArtist");
}
