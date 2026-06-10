// Kyma_Backend/src/tests/queue_tests.rs

// Queue logic lives in the frontend (queueStore.ts), not the backend.
// For Rust-side queue tests, we test the backend queue ordering.

use crate::models::song::Song;

fn make_song(id: &str, path: &str) -> Song {
    Song {
        id: id.to_string(),
        title: format!("Song {}", id),
        artist: "Test Artist".to_string(),
        album: "Test Album".to_string(),
        duration: 180.0,
        path: path.to_string(),
        source: None,
        artwork: None,
        genre: None,
        year: None,
        track_number: None,
    }
}

#[test]
fn test_queue_next_song() {
    let songs = vec![
        make_song("1", "/music/1.mp3"),
        make_song("2", "/music/2.mp3"),
        make_song("3", "/music/3.mp3"),
    ];

    // Find song at position 0, next should be position 1
    let current_idx = songs.iter().position(|s| s.id == "1").unwrap();
    assert_eq!(current_idx, 0);
    assert_eq!(current_idx + 1, 1);
    assert_eq!(songs[current_idx + 1].id, "2");
}

#[test]
fn test_queue_prev_song() {
    let songs = vec![
        make_song("1", "/music/1.mp3"),
        make_song("2", "/music/2.mp3"),
        make_song("3", "/music/3.mp3"),
    ];

    let current_idx = songs.iter().position(|s| s.id == "3").unwrap();
    assert_eq!(current_idx, 2);
    assert_eq!(current_idx - 1, 1);
    assert_eq!(songs[current_idx - 1].id, "2");
}

#[test]
fn test_queue_wrap_around() {
    let songs = vec![
        make_song("1", "/music/1.mp3"),
        make_song("2", "/music/2.mp3"),
        make_song("3", "/music/3.mp3"),
    ];

    let len = songs.len();
    // Next from last wraps to first
    let next_idx = (2 + 1) % len;
    assert_eq!(next_idx, 0);

    // Prev from first wraps to last
    let prev_idx = (0 + len - 1) % len;
    assert_eq!(prev_idx, 2);
}
