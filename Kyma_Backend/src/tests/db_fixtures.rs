// Kyma_Backend/src/tests/db_fixtures.rs
use sqlx::SqlitePool;

pub async fn create_test_db() -> SqlitePool {
    let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();

    sqlx::query("PRAGMA busy_timeout = 5000")
        .execute(&pool)
        .await
        .unwrap();

    sqlx::query(include_str!("../../migration/001_init.sql"))
        .execute(&pool)
        .await
        .unwrap();

    // Also create schema_version (normally done by app_state init)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at INTEGER DEFAULT (unixepoch())
        )",
    )
    .execute(&pool)
    .await
    .unwrap();

    // Mark migration as applied
    sqlx::query("INSERT INTO schema_version (version) VALUES (1)")
        .execute(&pool)
        .await
        .unwrap();

    pool
}
