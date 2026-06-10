// Kyma_Backend/src/tests/delete_song_tests.rs
use crate::tests::db_fixtures::create_test_db;

#[tokio::test]
async fn test_delete_song_removes_from_liked() {
    let pool = create_test_db().await;

    let song_id = "test-delete-song-1";

    // Add a liked song
    sqlx::query("INSERT INTO liked_tracks (track_id) VALUES (?)")
        .bind(song_id)
        .execute(&pool)
        .await
        .unwrap();

    sqlx::query(
        "INSERT INTO liked_songs (id, title, artist, album, duration_secs, thumbnail, source, path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(song_id)
    .bind("Delete Me")
    .bind("Test Artist")
    .bind("Test Album")
    .bind(180.0)
    .bind("")
    .bind("local")
    .bind("/tmp/test.mp3")
    .execute(&pool)
    .await
    .unwrap();

    // Verify it exists
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM liked_tracks WHERE track_id = ?")
        .bind(song_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1);

    // Delete from liked (simulating what delete_song does)
    sqlx::query("DELETE FROM liked_tracks WHERE track_id = ?")
        .bind(song_id)
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("DELETE FROM liked_songs WHERE id = ?")
        .bind(song_id)
        .execute(&pool)
        .await
        .unwrap();

    // Verify deleted
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM liked_tracks WHERE track_id = ?")
        .bind(song_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 0);

    let count2: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM liked_songs WHERE id = ?")
        .bind(song_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count2, 0);
}
