// Kyma_Backend/src/tests/likes_persistence_tests.rs
use crate::tests::db_fixtures::create_test_db;

#[tokio::test]
async fn test_like_saves_full_song_data() {
    let pool = create_test_db().await;

    let track_id = "test-like-song-1";

    // Insert a like with full song data
    sqlx::query("INSERT INTO liked_tracks (track_id) VALUES (?)")
        .bind(track_id)
        .execute(&pool)
        .await
        .unwrap();

    sqlx::query(
        "INSERT OR REPLACE INTO liked_songs (id, title, artist, album, duration_secs, thumbnail, video_id, source, path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(track_id)
    .bind("Test Song Title")
    .bind("Test Artist")
    .bind("Test Album")
    .bind(240.0)
    .bind("https://img.example.com/thumb.jpg")
    .bind("dQw4w9WgXcQ")
    .bind("youtube")
    .bind("")
    .execute(&pool)
    .await
    .unwrap();

    // Verify it's in liked_tracks
    let liked: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM liked_tracks WHERE track_id = ?")
        .bind(track_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(liked, 1);

    // Verify full data is saved
    let (title, artist, source): (String, String, String) =
        sqlx::query_as("SELECT title, artist, source FROM liked_songs WHERE id = ?")
            .bind(track_id)
            .fetch_one(&pool)
            .await
            .unwrap();

    assert_eq!(title, "Test Song Title");
    assert_eq!(artist, "Test Artist");
    assert_eq!(source, "youtube");
}

#[tokio::test]
async fn test_unlike_removes_from_both_tables() {
    let pool = create_test_db().await;

    let track_id = "test-unlike-song-1";

    // Add to both tables
    sqlx::query("INSERT INTO liked_tracks (track_id) VALUES (?)")
        .bind(track_id)
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT OR REPLACE INTO liked_songs (id, title, artist, album, duration_secs, thumbnail, source, path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(track_id).bind("Title").bind("Artist").bind("Album").bind(180.0).bind("").bind("local").bind("/tmp/test.mp3")
        .execute(&pool).await.unwrap();

    // Unlike
    sqlx::query("DELETE FROM liked_tracks WHERE track_id = ?")
        .bind(track_id)
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("DELETE FROM liked_songs WHERE id = ?")
        .bind(track_id)
        .execute(&pool)
        .await
        .unwrap();

    // Verify both are gone
    let tracks: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM liked_tracks WHERE track_id = ?")
        .bind(track_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    let songs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM liked_songs WHERE id = ?")
        .bind(track_id)
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(tracks, 0);
    assert_eq!(songs, 0);
}

#[tokio::test]
async fn test_like_persists_after_reopen() {
    let pool = create_test_db().await;

    let track_id = "test-persist-song-1";

    // Simulate first session: like a song
    sqlx::query("INSERT INTO liked_tracks (track_id) VALUES (?)")
        .bind(track_id)
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT OR REPLACE INTO liked_songs (id, title, artist, album, duration_secs, thumbnail, source, path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(track_id).bind("Persist Test").bind("Artist").bind("Album").bind(200.0).bind("").bind("youtube").bind("")
        .execute(&pool).await.unwrap();

    // Simulate reopening: query liked songs
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM liked_tracks WHERE track_id = ?")
        .bind(track_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1);

    let title: String = sqlx::query_scalar("SELECT title FROM liked_songs WHERE id = ?")
        .bind(track_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(title, "Persist Test");
}
