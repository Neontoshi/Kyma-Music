use crate::state::app_state::AppState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SavedArtist {
    pub artist_id: String,
    pub name: String,
    pub thumbnail: Option<String>,
    pub source: String,
}

fn clean_artist_name(name: &str) -> String {
    name.trim()
        .to_lowercase()
        .replace(" - topic", "")
        .replace(" vevo", "")
        .replace(" official", "")
        .replace("  ", " ")
        .trim()
        .to_string()
}

#[tauri::command]
pub async fn save_artist(
    name: String,
    thumbnail: Option<String>,
    source: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let id = name.to_lowercase().replace(' ', "-");

    sqlx::query("INSERT OR REPLACE INTO artists (id, name, thumbnail, source) VALUES (?, ?, ?, ?)")
        .bind(&id)
        .bind(&name)
        .bind(&thumbnail)
        .bind(&source)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("INSERT OR REPLACE INTO saved_artists (artist_id) VALUES (?)")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn remove_artist(
    artist_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    sqlx::query("DELETE FROM saved_artists WHERE artist_id = ?")
        .bind(&artist_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_saved_artists(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<SavedArtist>, String> {
    let rows = sqlx::query_as::<_, (String, String, Option<String>, String)>(
        "SELECT a.id, a.name, a.thumbnail, a.source FROM artists a
         INNER JOIN saved_artists sa ON a.id = sa.artist_id
         ORDER BY a.name",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .into_iter()
        .map(|r| SavedArtist {
            artist_id: r.0,
            name: r.1,
            thumbnail: r.2,
            source: r.3,
        })
        .collect())
}

#[tauri::command]
pub async fn search_artist_for_save(query: String) -> Result<Vec<SavedArtist>, String> {
    let yt = crate::commands::youtube::youtube_search(query)
        .await
        .map_err(|e| e.to_string())?;

    let mut seen = std::collections::HashSet::new();
    let mut artists = Vec::new();
    for song in &yt {
        let clean = clean_artist_name(&song.artist);
        if clean.is_empty() || clean == "unknown artist" {
            continue;
        }
        if seen.insert(clean) {
            artists.push(SavedArtist {
                artist_id: song.artist.to_lowercase().replace(' ', "-"),
                name: song.artist.clone(),
                thumbnail: Some(song.thumbnail.clone()),
                source: "youtube".into(),
            });
        }
        if artists.len() >= 10 {
            break;
        }
    }
    Ok(artists)
}
