#![allow(dependency_on_unit_never_type_fallback)]
#![allow(dead_code)]
mod audio;
mod commands;
mod error;
mod logging;
mod models;
mod remote_server;
mod state;
mod stream_server;
mod tests;
mod tray;

use crate::error::KymaError;
use commands::*;
use state::app_state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if cfg!(target_os = "linux") {
        std::env::set_var("NO_AT_BRIDGE", "1");
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        std::env::set_var("WEBKIT_DISABLE_THREADED_RENDERING", "1");
    }

    logging::init();
    logging::log_event("INFO", "APP", "Kyma started");

    user_action!("APP", "Kyma starting...");
    user_action!("APP", "Version: {}", env!("CARGO_PKG_VERSION"));
    user_action!("APP", "OS: {}", std::env::consts::OS);
    user_action!("APP", "Arch: {}", std::env::consts::ARCH);

    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let app_state = tauri::async_runtime::block_on(AppState::new(app_handle.clone()));
            app.manage(app_state);

            tray::create_tray(app)?;
            commands::notifications::init_notifications(app);

            tauri::async_runtime::spawn(async {
                clear_stream_cache().await;
            });

            // Start Kyma Cast remote control server
            let router = remote_server::remote_router(app_handle.clone())
                .merge(stream_server::stream_router());

            tauri::async_runtime::spawn(async move {
                let listener = tokio::net::TcpListener::bind("0.0.0.0:1421").await.unwrap();
                axum::serve(listener, router.into_make_service())
                    .await
                    .unwrap();
            });

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_folder,
            get_songs,
            search_songs,
            delete_song,
            play_track,
            pause_playback,
            resume_playback,
            stop_playback,
            seek_to,
            set_volume,
            get_volume,
            get_playback_state,
            next_track,
            prev_track,
            youtube_search,
            resolve_youtube_url,
            invalidate_stream_url,
            stream_youtube,
            youtube_download,
            check_download_exists,
            check_ytdlp,
            get_setting,
            set_setting,
            get_local_ip,
            fetch_listenbrainz_stats,
            get_listenbrainz_recent,
            get_listenbrainz_weekly_stats,
            get_heatmap,
            get_all_time_stats,
            get_weekly_stats,
            get_deezer_genre_chart,
            get_deezer_genre_artists,
            save_play_history,
            get_recently_played,
            toggle_like,
            toggle_like_soundcloud,
            get_liked_songs,
            get_liked_songs_full,
            save_liked_song,
            create_playlist,
            get_playlists,
            add_to_playlist,
            get_playlist_songs,
            remove_from_playlist,
            remove_playlist,
            soundcloud_search,
            resolve_soundcloud_url,
            check_soundcloud_download_exists,
            soundcloud_download,
            stream_soundcloud,
            get_saved_artists,
            remove_artist,
            save_artist,
            search_artist_for_save,
            add_to_queue,
            clear_queue,
            remove_from_queue,
            get_queue,
            set_queue,
            add_to_queue_at_position,
            search_radio_stations,
            get_popular_stations,
            get_stations_by_genre,
            save_radio_station,
            get_saved_stations,
            remove_radio_station,
            toggle_recording,
            is_recording,
            get_recording_name,
            get_resume_state,
            search_deezer,
            search_musicbrainz,
            search_metadata,
            clean_track_metadata,
            batch_clean_metadata,
            search_suggestions,
            search_albums_deezer,
            get_album_tracks_deezer,
            search_artists_deezer,
            get_deezer_chart,
            get_lastfm_similar_artists,
            get_lastfm_weekly_chart,
            scrobble_listenbrainz,
            get_log_file_path,
            read_logs,
            log_frontend,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                let state = app_handle.state::<AppState>();

                let current = state.current_track.lock();
                let audio_state = state.audio_engine.get_state();

                let is_local = current
                    .as_ref()
                    .map(|s| {
                        s.source.as_deref() != Some("youtube")
                            && s.source.as_deref() != Some("soundcloud")
                            && !s.path.starts_with("http")
                    })
                    .unwrap_or(false);

                if is_local {
                    let resume_data = serde_json::json!({
                        "song": current.as_ref().and_then(|s| serde_json::to_value(s.clone()).ok()),
                        "position": audio_state.position,
                        "is_playing": audio_state.is_playing,
                    });

                    if let Ok(json) = serde_json::to_string(&resume_data) {
                        let path = dirs::data_local_dir()
                            .unwrap_or_else(|| std::path::PathBuf::from("."))
                            .join("Kyma")
                            .join("resume.json");
                        let _ = std::fs::write(path, json);
                    }
                }

                state.audio_engine.stop();
                std::thread::sleep(std::time::Duration::from_millis(300));
            }
        });
}
