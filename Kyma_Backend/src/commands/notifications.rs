use crate::state::app_state::AppState;
use crate::user_action;
use crate::user_error;
use std::cell::Cell;
use tauri::Listener;
use tauri::Manager;
use tauri_plugin_notification::NotificationExt;

pub fn init_notifications(app: &tauri::App) {
    user_action!("NOTIFICATIONS", "Initializing notification system");

    let handle = app.handle().clone();
    let last_track_id = Cell::new(0u64);

    app.listen("playback-update", move |event: tauri::Event| {
        // REMOVED: No log - called every 100ms
        let payload_str = event.payload().to_string();
        let payload: serde_json::Value = serde_json::from_str(&payload_str).unwrap_or_default();

        let position = payload
            .get("position")
            .and_then(|p| p.as_f64())
            .unwrap_or(0.0);
        let track_id = payload
            .get("track_id")
            .and_then(|t| t.as_u64())
            .unwrap_or(0);

        if position < 0.5 && track_id != last_track_id.get() {
            last_track_id.set(track_id);
            let state = handle.state::<AppState>();
            let track = state.current_track.lock();
            if let Some(ref song) = &*track {
                // Truncate long titles for logging
                let title_log = if song.title.len() > 50 {
                    format!("{}...", &song.title[..47])
                } else {
                    song.title.clone()
                };
                user_action!(
                    "NOTIFICATIONS",
                    "Showing notification for: {} - {}",
                    title_log,
                    song.artist
                );

                match handle
                    .notification()
                    .builder()
                    .title(&song.title)
                    .body(&format!("{} • {}", song.artist, song.album))
                    .show()
                {
                    Ok(_) => {
                        user_action!("NOTIFICATIONS", "Notification shown successfully");
                    }
                    Err(e) => {
                        user_error!("NOTIFICATIONS", "Failed to show notification: {}", e);
                    }
                }
            }
        }
    });

    user_action!("NOTIFICATIONS", "Notification system ready");
}
