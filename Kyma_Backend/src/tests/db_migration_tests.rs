// Lauv_Backend/src/tests/db_migration_tests.rs
use crate::tests::db_fixtures::create_test_db;

#[tokio::test]
async fn test_migration_creates_all_tables() {
    let pool = create_test_db().await;

    let tables = vec![
        "artists",
        "albums",
        "tracks",
        "playlists",
        "playlist_tracks",
        "liked_tracks",
        "liked_songs",
        "saved_artists",
        "play_history",
        "queue",
        "settings",
        "schema_version",
    ];

    for table in tables {
        let count: i64 = sqlx::query_scalar(&format!(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='{}'",
            table
        ))
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(count, 1, "Table '{}' was not created", table);
    }
}

#[tokio::test]
async fn test_migration_idempotent() {
    // Running migration twice should not fail
    let pool = create_test_db().await;

    // Run migration again
    sqlx::query(include_str!("../../migration/001_init.sql"))
        .execute(&pool)
        .await
        .unwrap();

    // Should still have the tables
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert!(count > 0);
}

#[tokio::test]
async fn test_schema_version_tracked() {
    let pool = create_test_db().await;

    let version: i64 = sqlx::query_scalar("SELECT MAX(version) FROM schema_version")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(version, 1);
}
