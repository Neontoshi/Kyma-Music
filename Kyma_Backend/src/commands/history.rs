use crate::state::app_state::AppState;
use crate::KymaError;
use serde::Serialize;
use sqlx::Row;

#[derive(Serialize, sqlx::FromRow)]
pub struct PlayHistoryEntry {
    pub id: String,
    pub track_id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_secs: f64,
    pub thumbnail: String,
    pub video_id: Option<String>,
    pub source: String,
    pub played_at: i64,
    pub path: String,
}

#[tauri::command]
pub async fn save_play_history(
    song_id: String,
    title: String,
    artist: String,
    album: String,
    duration_secs: f64,
    thumbnail: String,
    video_id: Option<String>,
    source: String,
    path: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), KymaError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    sqlx::query(
        "INSERT INTO play_history (id, track_id, title, artist, album, duration_secs, thumbnail, video_id, source, path, played_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&song_id)
    .bind(&title)
    .bind(&artist)
    .bind(&album)
    .bind(duration_secs)
    .bind(&thumbnail)
    .bind(&video_id)
    .bind(&source)
    .bind(&path)
    .bind(now)
    .execute(&state.db)
    .await?;

    Ok(())
}

#[tauri::command]
pub async fn get_recently_played(
    limit: Option<i64>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<PlayHistoryEntry>, KymaError> {
    let limit = limit.unwrap_or(20);
    let rows = sqlx::query(
        "SELECT id, track_id, title, artist, album, duration_secs, thumbnail, video_id, source, path, played_at
         FROM play_history
         ORDER BY played_at DESC
         LIMIT ?"
    )
    .bind(limit)
    .fetch_all(&state.db)
    .await?;

    let entries: Vec<PlayHistoryEntry> = rows
        .iter()
        .map(|row| PlayHistoryEntry {
            id: row.get("id"),
            track_id: row.get("track_id"),
            title: row.get("title"),
            artist: row.get("artist"),
            album: row.get("album"),
            duration_secs: row.get("duration_secs"),
            thumbnail: row.get("thumbnail"),
            video_id: row.get("video_id"),
            source: row.get("source"),
            played_at: row.get("played_at"),
            path: row.get("path"),
        })
        .collect();

    Ok(entries)
}
