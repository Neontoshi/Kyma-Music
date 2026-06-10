use crate::commands::metadata::extract_metadata;
use crate::models::song::Song;
use crate::state::app_state::AppState;
use crate::user_action;
use crate::user_error;
use crate::KymaError;
use std::path::Path;
use walkdir::WalkDir;

#[tauri::command]
pub async fn scan_folder(
    path: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Song>, KymaError> {
    user_action!("LIBRARY", "Starting scan: {}", path);

    let app = &*state;
    let start_time = std::time::Instant::now();

    let scan_path = Path::new(&path);
    if !scan_path.is_absolute() {
        user_error!("LIBRARY", "Scan failed: path not absolute - {}", path);
        return Err(KymaError::InvalidPath(format!(
            "scan path must be absolute: {}",
            path
        )));
    }
    if !scan_path.exists() {
        user_error!("LIBRARY", "Scan failed: path does not exist - {}", path);
        return Err(KymaError::InvalidPath(format!(
            "scan path does not exist: {}",
            path
        )));
    }
    if !scan_path.is_dir() {
        user_error!("LIBRARY", "Scan failed: path is not a directory - {}", path);
        return Err(KymaError::InvalidPath(format!(
            "scan path must be a directory: {}",
            path
        )));
    }

    let canonical_base = scan_path
        .canonicalize()
        .map_err(|e| KymaError::InvalidPath(format!("failed to resolve scan path: {}", e)))?;

    let mut songs = Vec::new();
    let extensions = ["mp3", "flac", "wav", "ogg", "m4a", "aac"];
    let mut total_files = 0;
    let mut audio_files = 0;
    let mut metadata_errors = 0;

    for entry in WalkDir::new(&canonical_base)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        total_files += 1;
        let file_path = entry.path();

        if let Ok(canonical) = file_path.canonicalize() {
            if !canonical.starts_with(&canonical_base) {
                tracing::warn!("Symlink traversal blocked: {}", file_path.display());
                continue;
            }
        }

        if file_path.is_file() {
            if let Some(ext) = file_path.extension() {
                let ext_str = ext.to_string_lossy().to_lowercase();
                if extensions.contains(&ext_str.as_str()) {
                    audio_files += 1;
                    let path_str = file_path.to_string_lossy().to_string();
                    match extract_metadata(&path_str) {
                        Ok(song) => {
                            songs.push(song);
                        }
                        Err(e) => {
                            metadata_errors += 1;
                            user_error!(
                                "LIBRARY",
                                "Failed to read metadata for {}: {}",
                                file_path.file_name().unwrap_or_default().to_string_lossy(),
                                e
                            );
                            tracing::warn!("Failed to read metadata for {}: {}", path_str, e);
                        }
                    }
                }
            }
        }
    }

    *app.library.lock() = songs.clone();

    let elapsed = start_time.elapsed();
    user_action!(
        "LIBRARY",
        "Scan completed: {} songs found from {} audio files (scanned {} total files) in {:.2}s",
        songs.len(),
        audio_files,
        total_files,
        elapsed.as_secs_f64()
    );

    if metadata_errors > 0 {
        user_error!("LIBRARY", "{} files had metadata errors", metadata_errors);
    }

    Ok(songs)
}

#[tauri::command]
pub async fn get_songs(state: tauri::State<'_, AppState>) -> Result<Vec<Song>, KymaError> {
    let app = &*state;
    let count = app.library.lock().len();
    user_action!("LIBRARY", "Retrieved {} songs", count);
    Ok(app.library.lock().clone())
}

#[tauri::command]
pub async fn search_songs(
    query: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Song>, KymaError> {
    user_action!("LIBRARY", "Searching: \"{}\"", query);
    let app = &*state;
    let query_lower = query.to_lowercase();
    let songs = app.library.lock();
    let results: Vec<Song> = songs
        .iter()
        .filter(|song| {
            song.title.to_lowercase().contains(&query_lower)
                || song.artist.to_lowercase().contains(&query_lower)
                || song.album.to_lowercase().contains(&query_lower)
        })
        .cloned()
        .collect();

    let result_count = results.len();
    user_action!(
        "LIBRARY",
        "Search found {} results for \"{}\"",
        result_count,
        query
    );
    Ok(results)
}

#[tauri::command]
pub async fn delete_song(
    song_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), KymaError> {
    // First, find the song title for logging
    let song_title = {
        let library = state.library.lock();
        library
            .iter()
            .find(|s| s.id == song_id)
            .map(|s| s.title.clone())
    };

    let log_title = song_title.as_deref().unwrap_or(&song_id);
    user_action!("LIBRARY", "Deleting song: {} ({})", log_title, song_id);

    let app = &*state;
    let delete_start = std::time::Instant::now();

    let song_path = {
        let mut library = app.library.lock();
        let song = library.iter().find(|s| s.id == song_id).cloned();
        if let Some(ref s) = song {
            if !s.path.is_empty() && Path::new(&s.path).exists() {
                match std::fs::remove_file(&s.path) {
                    Ok(_) => {
                        user_action!("LIBRARY", "Deleted file: {}", s.path);
                    }
                    Err(e) => {
                        user_error!("LIBRARY", "Failed to delete file for {}: {}", log_title, e);
                        return Err(KymaError::FileReadError(format!(
                            "Failed to delete file: {}",
                            e
                        )));
                    }
                }
            }
            library.retain(|s| s.id != song_id);
        }
        // Drop library lock here
        song.map(|s| s.id.clone())
    };

    if let Some(ref _id) = song_path {
        // Remove from current track only
        {
            let mut current = app.current_track.lock();
            if let Some(ref current_song) = *current {
                if current_song.id == song_id {
                    user_action!("LIBRARY", "Song was currently playing, cleared from player");
                    *current = None;
                }
            }
        }

        // DB cleanup (no locks held)
        match sqlx::query("DELETE FROM liked_tracks WHERE track_id = ?")
            .bind(&song_id)
            .execute(&app.db)
            .await
        {
            Ok(result) => {
                if result.rows_affected() > 0 {
                    user_action!("LIBRARY", "Removed from liked tracks");
                }
            }
            Err(e) => {
                user_error!("LIBRARY", "Failed to delete from liked_tracks: {}", e);
            }
        }

        match sqlx::query("DELETE FROM liked_songs WHERE id = ?")
            .bind(&song_id)
            .execute(&app.db)
            .await
        {
            Ok(result) => {
                if result.rows_affected() > 0 {
                    user_action!("LIBRARY", "Removed from liked_songs");
                }
            }
            Err(e) => {
                user_error!("LIBRARY", "Failed to delete from liked_songs: {}", e);
            }
        }
    }

    let elapsed = delete_start.elapsed();
    user_action!(
        "LIBRARY",
        "Successfully deleted {} in {:.2}ms",
        log_title,
        elapsed.as_secs_f64() * 1000.0
    );

    Ok(())
}
