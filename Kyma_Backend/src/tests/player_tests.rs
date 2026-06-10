// Kyma_Backend/src/tests/player_tests.rs
use crate::models::song::Song;

fn make_test_song() -> Song {
    Song {
        id: "test-1".to_string(),
        title: "Test Song".to_string(),
        artist: "Test Artist".to_string(),
        album: "Test Album".to_string(),
        duration: 180.0,
        path: "/tmp/nonexistent.mp3".to_string(),
        source: None,
        artwork: None,
        genre: None,
        year: None,
        track_number: None,
    }
}

#[test]
fn test_song_creation() {
    let song = make_test_song();
    assert_eq!(song.id, "test-1");
    assert_eq!(song.title, "Test Song");
    assert!(!song.path.is_empty());
}

#[test]
fn test_song_empty_path_rejected() {
    let mut song = make_test_song();
    song.path = "".to_string();
    assert!(song.path.is_empty());
}

#[test]
fn test_song_source_detection() {
    let mut song = make_test_song();
    assert!(song.source.is_none()); // local

    song.source = Some("youtube".to_string());
    assert_eq!(song.source.as_deref(), Some("youtube"));

    song.source = Some("soundcloud".to_string());
    assert_eq!(song.source.as_deref(), Some("soundcloud"));
}
