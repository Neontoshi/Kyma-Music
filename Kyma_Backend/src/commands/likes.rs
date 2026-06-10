use crate::state::app_state::AppState;
use crate::user_action;
use crate::user_error;
use crate::KymaError;
use serde::{Deserialize, Serialize};

#[derive(Serialize, sqlx::FromRow)]
pub struct LikedSong {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_secs: f64,
    pub thumbnail: String,
    pub video_id: Option<String>,
    pub source: String,
    pub path: String,
}

#[derive(Deserialize)]
pub struct ToggleLikeScInput {
    #[serde(rename = "trackId")]
    pub track_id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    #[serde(rename = "durationSecs")]
    pub duration_secs: f64,
    pub thumbnail: String,
    #[serde(rename = "videoId")]
    pub video_id: Option<String>,
    pub path: String,
}

#[tauri::command]
pub async fn save_liked_song(
    id: String,
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
    user_action!("LIKES", "Saving liked song: {} - {}", title, artist);

    match sqlx::query(
        "INSERT OR REPLACE INTO liked_songs (id, title, artist, album, duration_secs, thumbnail, video_id, source, path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&title)
    .bind(&artist)
    .bind(&album)
    .bind(duration_secs)
    .bind(&thumbnail)
    .bind(&video_id)
    .bind(&source)
    .bind(&path)
    .execute(&state.db)
    .await
    {
        Ok(_) => {
            user_action!("LIKES", "Successfully saved liked song: {} ({})", title, id);
            Ok(())
        }
        Err(e) => {
            user_error!("LIKES", "Failed to save liked song {}: {}", id, e);
            Err(KymaError::DatabaseError(e.to_string()))
        }
    }
}

#[tauri::command]
pub async fn get_liked_songs_full(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<LikedSong>, KymaError> {
    let rows = sqlx::query_as::<_, (String, String, String, String, f64, String, Option<String>, String, String)>(
        "SELECT id, title, artist, album, duration_secs, thumbnail, video_id, source, path FROM liked_songs"
    )
    .fetch_all(&state.db)
    .await?;

    let count = rows.len();
    user_action!("LIKES", "Retrieved {} liked songs", count);

    Ok(rows
        .into_iter()
        .map(|r| LikedSong {
            id: r.0,
            title: r.1,
            artist: r.2,
            album: r.3,
            duration_secs: r.4,
            thumbnail: r.5,
            video_id: r.6,
            source: r.7,
            path: r.8,
        })
        .collect())
}

#[tauri::command]
pub async fn get_liked_songs(state: tauri::State<'_, AppState>) -> Result<Vec<String>, KymaError> {
    let rows = sqlx::query_as::<_, (String,)>("SELECT track_id FROM liked_tracks")
        .fetch_all(&state.db)
        .await?;
    let count = rows.len();
    user_action!("LIKES", "Retrieved {} liked track IDs", count);
    Ok(rows.into_iter().map(|r| r.0).collect())
}

#[derive(Deserialize)]
pub struct ToggleLikeInput {
    #[serde(rename = "trackId")]
    pub track_id: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    #[serde(rename = "durationSecs")]
    pub duration_secs: Option<f64>,
    pub thumbnail: Option<String>,
    #[serde(rename = "videoId")]
    pub video_id: Option<String>,
    pub source: Option<String>,
    pub path: Option<String>,
}

#[tauri::command]
pub async fn toggle_like(
    input: ToggleLikeInput,
    state: tauri::State<'_, AppState>,
) -> Result<bool, KymaError> {
    let title = input.title.as_deref().unwrap_or("unknown");
    let artist = input.artist.as_deref().unwrap_or("unknown");
    let track_id = &input.track_id;

    user_action!(
        "LIKES",
        "Toggling like for: {} - {} ({})",
        title,
        artist,
        track_id
    );

    let existing = sqlx::query("SELECT track_id FROM liked_tracks WHERE track_id = ?")
        .bind(track_id)
        .fetch_optional(&state.db)
        .await?;

    if existing.is_some() {
        // Unlike: Remove from liked tracks
        match sqlx::query("DELETE FROM liked_tracks WHERE track_id = ?")
            .bind(track_id)
            .execute(&state.db)
            .await
        {
            Ok(_) => user_action!("LIKES", "Removed like for: {} - {}", title, artist),
            Err(e) => user_error!("LIKES", "Failed to remove like from liked_tracks: {}", e),
        }

        match sqlx::query("DELETE FROM liked_songs WHERE id = ?")
            .bind(track_id)
            .execute(&state.db)
            .await
        {
            Ok(_) => {}
            Err(e) => user_error!("LIKES", "Failed to remove from liked_songs: {}", e),
        }
        Ok(false)
    } else {
        // Like: Add to liked tracks
        match sqlx::query("INSERT INTO liked_tracks (track_id) VALUES (?)")
            .bind(track_id)
            .execute(&state.db)
            .await
        {
            Ok(_) => user_action!("LIKES", "Added like for: {} - {}", title, artist),
            Err(e) => {
                user_error!("LIKES", "Failed to add like to liked_tracks: {}", e);
                return Err(KymaError::DatabaseError(e.to_string()));
            }
        }

        // Also save full song details if available
        if let (Some(t), Some(a)) = (&input.title, &input.artist) {
            match sqlx::query(
                "INSERT OR REPLACE INTO liked_songs
                 (id, title, artist, album, duration_secs, thumbnail, video_id, source, path)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(track_id)
            .bind(t)
            .bind(a)
            .bind(input.album.as_deref().unwrap_or(""))
            .bind(input.duration_secs.unwrap_or(0.0))
            .bind(input.thumbnail.as_deref().unwrap_or(""))
            .bind(&input.video_id)
            .bind(input.source.as_deref().unwrap_or("local"))
            .bind(input.path.as_deref().unwrap_or(""))
            .execute(&state.db)
            .await
            {
                Ok(_) => {}
                Err(e) => user_error!("LIKES", "Failed to save liked song details: {}", e),
            }
        }
        Ok(true)
    }
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn toggle_like_soundcloud(
    trackId: String,
    title: String,
    artist: String,
    album: String,
    durationSecs: f64,
    thumbnail: String,
    videoId: Option<String>,
    path: String,
    state: tauri::State<'_, AppState>,
) -> Result<bool, KymaError> {
    user_action!("LIKES", "Toggling SoundCloud like: {} - {}", title, artist);
    let track_id = trackId;
    let duration_secs = durationSecs;
    let video_id = videoId;

    let existing = sqlx::query("SELECT track_id FROM liked_tracks WHERE track_id = ?")
        .bind(&track_id)
        .fetch_optional(&state.db)
        .await?;

    if existing.is_some() {
        // Unlike
        match sqlx::query("DELETE FROM liked_tracks WHERE track_id = ?")
            .bind(&track_id)
            .execute(&state.db)
            .await
        {
            Ok(_) => user_action!(
                "LIKES",
                "Removed SoundCloud like for: {} - {}",
                title,
                artist
            ),
            Err(e) => user_error!("LIKES", "Failed to remove SoundCloud like: {}", e),
        }

        match sqlx::query("DELETE FROM liked_songs WHERE id = ?")
            .bind(&track_id)
            .execute(&state.db)
            .await
        {
            Ok(_) => {}
            Err(e) => user_error!("LIKES", "Failed to remove from liked_songs: {}", e),
        }
        Ok(false)
    } else {
        // Like
        match sqlx::query("INSERT INTO liked_tracks (track_id) VALUES (?)")
            .bind(&track_id)
            .execute(&state.db)
            .await
        {
            Ok(_) => user_action!("LIKES", "Added SoundCloud like for: {} - {}", title, artist),
            Err(e) => {
                user_error!("LIKES", "Failed to add SoundCloud like: {}", e);
                return Err(KymaError::DatabaseError(e.to_string()));
            }
        }

        match sqlx::query(
            "INSERT OR REPLACE INTO liked_songs
             (id, title, artist, album, duration_secs, thumbnail, video_id, source, path)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'soundcloud', ?)",
        )
        .bind(&track_id)
        .bind(&title)
        .bind(&artist)
        .bind(&album)
        .bind(duration_secs)
        .bind(&thumbnail)
        .bind(&video_id)
        .bind(&path)
        .execute(&state.db)
        .await
        {
            Ok(_) => user_action!(
                "LIKES",
                "Saved SoundCloud song details: {} - {}",
                title,
                artist
            ),
            Err(e) => user_error!("LIKES", "Failed to save SoundCloud song details: {}", e),
        }
        Ok(true)
    }
}
