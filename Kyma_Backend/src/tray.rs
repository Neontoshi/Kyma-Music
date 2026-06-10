use crate::state::app_state::AppState;
use crate::user_action;
use crate::user_error;
use tauri::image::Image;
use tauri::menu::{MenuBuilder, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};

pub fn create_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    user_action!("TRAY", "Creating system tray icon");

    let tray_menu = MenuBuilder::new(app)
        .item(&MenuItem::with_id(
            app,
            "play_pause",
            "Play/Pause",
            true,
            None::<&str>,
        )?)
        .item(&MenuItem::with_id(app, "next", "Next", true, None::<&str>)?)
        .item(&MenuItem::with_id(
            app,
            "prev",
            "Previous",
            true,
            None::<&str>,
        )?)
        .separator()
        .item(&MenuItem::with_id(
            app,
            "show",
            "Show App",
            true,
            None::<&str>,
        )?)
        .item(&MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?)
        .build()?;

    let icon = app.default_window_icon().cloned().unwrap_or_else(|| {
        let rgba = vec![124, 106, 245, 255];
        Image::new_owned(rgba, 1, 1)
    });

    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&tray_menu)
        .on_menu_event(|app: &tauri::AppHandle, event: tauri::menu::MenuEvent| {
            let state = app.state::<AppState>();
            match event.id().as_ref() {
                "play_pause" => {
                    user_action!("TRAY", "Play/Pause clicked");
                    let mut is_playing = state.is_playing.lock();
                    if *is_playing {
                        state.audio_engine.pause();
                        *is_playing = false;
                        user_action!("TRAY", "Paused from tray");
                    } else {
                        state.audio_engine.resume();
                        *is_playing = true;
                        user_action!("TRAY", "Resumed from tray");
                    }
                }
                "next" => {
                    user_action!("TRAY", "Next track clicked");
                    match app.emit("tray-next", ()) {
                        Ok(_) => user_action!("TRAY", "Next track event emitted"),
                        Err(e) => user_error!("TRAY", "Failed to emit next track event: {}", e),
                    }
                }
                "prev" => {
                    user_action!("TRAY", "Previous track clicked");
                    match app.emit("tray-prev", ()) {
                        Ok(_) => user_action!("TRAY", "Previous track event emitted"),
                        Err(e) => user_error!("TRAY", "Failed to emit previous track event: {}", e),
                    }
                }
                "show" => {
                    user_action!("TRAY", "Show App clicked");
                    if let Some(window) = app.get_webview_window("main") {
                        match window.show() {
                            Ok(_) => {
                                user_action!("TRAY", "Window shown");
                                let _ = window.set_focus();
                            }
                            Err(e) => user_error!("TRAY", "Failed to show window: {}", e),
                        }
                    } else {
                        user_error!("TRAY", "Main window not found");
                    }
                }
                "quit" => {
                    user_action!("TRAY", "Quit clicked, exiting application");
                    app.exit(0);
                }
                _ => {
                    user_action!(
                        "TRAY",
                        "Unknown menu item clicked: {:?}",
                        event.id().as_ref()
                    );
                }
            }
        })
        .build(app)?;

    user_action!("TRAY", "System tray icon created successfully");
    Ok(())
}
