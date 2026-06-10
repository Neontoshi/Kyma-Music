// Kyma_Backend/src/tests/playlist_integration_tests.rs
use crate::tests::db_fixtures::create_test_db;

#[tokio::test]
async fn test_create_playlist() {
    let pool = create_test_db().await;

    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO playlists (id, name, description, emoji) VALUES (?, ?, ?, ?)")
        .bind(&id)
        .bind("Test Playlist")
        .bind("A test playlist")
        .bind("🎵")
        .execute(&pool)
        .await
        .unwrap();

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM playlists WHERE id = ?")
        .bind(&id)
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(count, 1);
}

#[tokio::test]
async fn test_add_and_remove_from_playlist() {
    let pool = create_test_db().await;

    let playlist_id = uuid::Uuid::new_v4().to_string();
    let song_id = uuid::Uuid::new_v4().to_string();

    // Create playlist
    sqlx::query("INSERT INTO playlists (id, name) VALUES (?, ?)")
        .bind(&playlist_id)
        .bind("My Playlist")
        .execute(&pool)
        .await
        .unwrap();

    // Add song
    sqlx::query(
        "INSERT INTO playlist_tracks (id, playlist_id, track_id, title, artist, source, path, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&playlist_id)
    .bind(&song_id)
    .bind("Song Title")
    .bind("Artist Name")
    .bind("local")
    .bind("/music/song.mp3")
    .bind(0)
    .execute(&pool)
    .await
    .unwrap();

    // Verify added
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = ?")
            .bind(&playlist_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(count, 1);

    // Remove song
    sqlx::query("DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?")
        .bind(&playlist_id)
        .bind(&song_id)
        .execute(&pool)
        .await
        .unwrap();

    // Verify removed
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = ?")
            .bind(&playlist_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
async fn test_delete_playlist_cascades() {
    let pool = create_test_db().await;

    let playlist_id = uuid::Uuid::new_v4().to_string();

    // Create playlist with a track
    sqlx::query("INSERT INTO playlists (id, name) VALUES (?, ?)")
        .bind(&playlist_id)
        .bind("Temp Playlist")
        .execute(&pool)
        .await
        .unwrap();

    sqlx::query(
        "INSERT INTO playlist_tracks (id, playlist_id, track_id, title, artist, source, path, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&playlist_id)
    .bind("song-1")
    .bind("Song")
    .bind("Artist")
    .bind("local")
    .bind("/music/song.mp3")
    .bind(0)
    .execute(&pool)
    .await
    .unwrap();

    // Delete playlist (should cascade delete tracks)
    sqlx::query("DELETE FROM playlists WHERE id = ?")
        .bind(&playlist_id)
        .execute(&pool)
        .await
        .unwrap();

    // Verify playlist gone
    let playlist_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM playlists WHERE id = ?")
        .bind(&playlist_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(playlist_count, 0);

    // Verify tracks also gone (cascade)
    let track_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = ?")
            .bind(&playlist_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(track_count, 0);
}

#[tokio::test]
async fn test_get_playlists_empty() {
    let pool = create_test_db().await;

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM playlists")
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(count, 0);
}
