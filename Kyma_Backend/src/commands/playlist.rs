use crate::state::app_state::AppState;
use crate::user_action;
use crate::user_error;
use crate::KymaError;
use serde::Serialize;
use sqlx::Row;

#[derive(Serialize)]
pub struct Playlist {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub emoji: Option<String>,
    pub mood: Option<String>,
    pub privacy: Option<String>,
    pub created_at: i64,
    pub song_count: i64,
}

#[derive(Serialize)]
pub struct PlaylistSong {
    pub song_id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_secs: f64,
    pub thumbnail: String,
    pub video_id: Option<String>,
    pub source: String,
    pub path: String,
    pub position: i64,
}

#[tauri::command]
pub async fn create_playlist(
    name: String,
    description: Option<String>,
    emoji: Option<String>,
    mood: Option<String>,
    privacy: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<String, KymaError> {
    let emoji_value = emoji.unwrap_or_else(|| "🎵".to_string());
    let privacy_value = privacy.unwrap_or_else(|| "private".to_string());

    user_action!(
        "PLAYLIST",
        "Creating: \"{}\" (privacy: {}, emoji: {})",
        name,
        privacy_value,
        emoji_value
    );

    let id = uuid::Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    match sqlx::query(
        "INSERT INTO playlists (id, name, description, emoji, mood, privacy, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&name)
    .bind(&description)
    .bind(&emoji_value)
    .bind(&mood)
    .bind(&privacy_value)
    .bind(now)
    .execute(&state.db)
    .await
    {
        Ok(_) => {
            user_action!("PLAYLIST", "Created playlist: {} (id: {})", name, id);
            Ok(id)
        }
        Err(e) => {
            user_error!("PLAYLIST", "Failed to create playlist '{}': {}", name, e);
            Err(KymaError::DatabaseError(e.to_string()))
        }
    }
}

#[tauri::command]
pub async fn get_playlists(state: tauri::State<'_, AppState>) -> Result<Vec<Playlist>, KymaError> {
    let rows = sqlx::query(
        "SELECT p.id, p.name, p.description, p.emoji, p.mood, p.privacy, p.created_at, COUNT(pt.id) as song_count
         FROM playlists p
         LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
         GROUP BY p.id
         ORDER BY p.created_at DESC",
    )
    .fetch_all(&state.db)
    .await?;

    let playlists: Vec<Playlist> = rows
        .iter()
        .map(|r| Playlist {
            id: r.get("id"),
            name: r.get("name"),
            description: r.get("description"),
            emoji: r.get("emoji"),
            mood: r.get("mood"),
            privacy: r.get("privacy"),
            created_at: r.get("created_at"),
            song_count: r.get("song_count"),
        })
        .collect();

    user_action!("PLAYLIST", "Retrieved {} playlists", playlists.len());
    Ok(playlists)
}

#[tauri::command]
pub async fn add_to_playlist(
    playlist_id: String,
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
    // Truncate long title for logging
    let title_log = if title.len() > 40 {
        format!("{}...", &title[..37])
    } else {
        title.clone()
    };

    user_action!(
        "PLAYLIST",
        "Adding to playlist: \"{} - {}\" (playlist_id: {})",
        title_log,
        artist,
        playlist_id
    );

    let id = uuid::Uuid::new_v4().to_string();

    // Get max position
    let max_pos: Option<i64> =
        sqlx::query_scalar("SELECT MAX(position) FROM playlist_tracks WHERE playlist_id = ?")
            .bind(&playlist_id)
            .fetch_optional(&state.db)
            .await?;

    let position = max_pos.unwrap_or(-1) + 1;

    match sqlx::query(
        "INSERT INTO playlist_tracks (id, playlist_id, track_id, title, artist, album, duration_secs, thumbnail, video_id, source, path, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&playlist_id)
    .bind(&song_id)
    .bind(&title)
    .bind(&artist)
    .bind(&album)
    .bind(duration_secs)
    .bind(&thumbnail)
    .bind(&video_id)
    .bind(&source)
    .bind(&path)
    .bind(position)
    .execute(&state.db)
    .await
    {
        Ok(_) => {
            user_action!("PLAYLIST", "Added to playlist at position {}", position);
            Ok(())
        }
        Err(e) => {
            user_error!("PLAYLIST", "Failed to add to playlist: {}", e);
            Err(KymaError::DatabaseError(e.to_string()))
        }
    }
}

#[tauri::command]
pub async fn get_playlist_songs(
    playlist_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<PlaylistSong>, KymaError> {
    user_action!("PLAYLIST", "Fetching songs for playlist: {}", playlist_id);

    let rows = sqlx::query(
        "SELECT track_id, title, artist, album, duration_secs, thumbnail, video_id, source, path, position
         FROM playlist_tracks
         WHERE playlist_id = ?
         ORDER BY position"
    )
    .bind(&playlist_id)
    .fetch_all(&state.db)
    .await?;

    let songs: Vec<PlaylistSong> = rows
        .iter()
        .map(|r| PlaylistSong {
            song_id: r.get("track_id"),
            title: r.get("title"),
            artist: r.get("artist"),
            album: r.get("album"),
            duration_secs: r.get("duration_secs"),
            thumbnail: r.get("thumbnail"),
            video_id: r.get("video_id"),
            source: r.get("source"),
            path: r.get("path"),
            position: r.get("position"),
        })
        .collect();

    user_action!("PLAYLIST", "Retrieved {} songs from playlist", songs.len());
    Ok(songs)
}

#[tauri::command]
pub async fn remove_from_playlist(
    playlist_id: String,
    song_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), KymaError> {
    user_action!(
        "PLAYLIST",
        "Removing song {} from playlist {}",
        song_id,
        playlist_id
    );

    match sqlx::query("DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?")
        .bind(&playlist_id)
        .bind(&song_id)
        .execute(&state.db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                user_action!("PLAYLIST", "Successfully removed song");
            } else {
                user_action!("PLAYLIST", "Song not found in playlist");
            }
            Ok(())
        }
        Err(e) => {
            user_error!("PLAYLIST", "Failed to remove from playlist: {}", e);
            Err(KymaError::DatabaseError(e.to_string()))
        }
    }
}

#[tauri::command]
pub async fn remove_playlist(
    playlist_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), KymaError> {
    user_action!("PLAYLIST", "Removing playlist: {}", playlist_id);

    // First get the playlist name for better logging
    let playlist_name: Option<String> =
        sqlx::query_scalar("SELECT name FROM playlists WHERE id = ?")
            .bind(&playlist_id)
            .fetch_optional(&state.db)
            .await?;

    let name_log = playlist_name.as_deref().unwrap_or(&playlist_id);

    // Delete tracks first (FK constraint)
    match sqlx::query("DELETE FROM playlist_tracks WHERE playlist_id = ?")
        .bind(&playlist_id)
        .execute(&state.db)
        .await
    {
        Ok(result) => {
            user_action!(
                "PLAYLIST",
                "Deleted {} tracks from playlist",
                result.rows_affected()
            );
        }
        Err(e) => {
            user_error!("PLAYLIST", "Failed to delete tracks: {}", e);
        }
    }

    // Delete the playlist
    match sqlx::query("DELETE FROM playlists WHERE id = ?")
        .bind(&playlist_id)
        .execute(&state.db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                user_action!("PLAYLIST", "Removed playlist: {}", name_log);
            } else {
                user_error!("PLAYLIST", "Playlist not found: {}", playlist_id);
            }
            Ok(())
        }
        Err(e) => {
            user_error!("PLAYLIST", "Failed to remove playlist: {}", e);
            Err(KymaError::DatabaseError(e.to_string()))
        }
    }
}
