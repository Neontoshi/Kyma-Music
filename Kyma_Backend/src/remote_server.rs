// Kyma_Backend/src/remote_server.rs
use crate::user_action;
use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::State,
    response::IntoResponse,
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tokio::sync::broadcast;
use tower_http::services::ServeDir;

struct AppState {
    tx: broadcast::Sender<String>,
}

fn broadcast_state(app_handle: &tauri::AppHandle, tx: &broadcast::Sender<String>) {
    // REMOVED: No log - called every 500ms
    let state = app_handle.state::<crate::state::app_state::AppState>();
    let current = state.current_track.lock();
    let audio = state.audio_engine.get_state();
    let volume = *state.volume.lock();

    let msg = serde_json::json!({
        "type": "state",
        "title": current.as_ref().map(|s| s.title.clone()).unwrap_or_default(),
        "artist": current.as_ref().map(|s| s.artist.clone()).unwrap_or_default(),
        "album": current.as_ref().map(|s| s.album.clone()).unwrap_or_default(),
        "is_playing": audio.is_playing,
        "position": audio.position,
        "duration": audio.duration,
        "volume": (volume * 100.0) as u32,
    });

    let _ = tx.send(msg.to_string());
}

pub fn remote_router(app_handle: tauri::AppHandle) -> Router {
    user_action!("REMOTE", "Starting Kyma Cast server on port 1421");

    let (tx, _) = broadcast::channel::<String>(100);
    let state = Arc::new(AppState { tx: tx.clone() });

    // Process commands from remote clients
    let mut cmd_rx = tx.subscribe();
    let cmd_handle = app_handle.clone();
    let cmd_tx = tx.clone();
    tauri::async_runtime::spawn(async move {
        while let Ok(msg) = cmd_rx.recv().await {
            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&msg) {
                if let Some(cmd) = data["command"].as_str() {
                    let state = cmd_handle.state::<crate::state::app_state::AppState>();
                    match cmd {
                        "toggle" => {
                            user_action!("REMOTE", "Toggle playback from remote");
                            let is_playing = *state.is_playing.lock();
                            if is_playing {
                                state.audio_engine.pause();
                                *state.is_playing.lock() = false;
                            } else {
                                state.audio_engine.resume();
                                *state.is_playing.lock() = true;
                            }
                            broadcast_state(&cmd_handle, &cmd_tx);
                        }
                        "next" => {
                            user_action!("REMOTE", "Next track from remote");
                            let _ = cmd_handle.emit("tray-next", ());
                            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
                            broadcast_state(&cmd_handle, &cmd_tx);
                        }
                        "prev" => {
                            user_action!("REMOTE", "Previous track from remote");
                            let _ = cmd_handle.emit("tray-prev", ());
                            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
                            broadcast_state(&cmd_handle, &cmd_tx);
                        }
                        "volume" => {
                            if let Some(v) = data["value"].as_f64() {
                                let vol_percent = v as i32;
                                user_action!(
                                    "REMOTE",
                                    "Volume set to {}% from remote",
                                    vol_percent
                                );
                                let vol = (v as f32 / 100.0).clamp(0.0, 1.0);
                                state.audio_engine.set_volume(vol);
                                *state.volume.lock() = vol;
                                broadcast_state(&cmd_handle, &cmd_tx);
                            }
                        }
                        "seek" => {
                            if let Some(pos) = data["value"].as_f64() {
                                user_action!("REMOTE", "Seek to {:.1}% from remote", pos);
                                let audio = state.audio_engine.get_state();
                                if audio.duration > 0.0 {
                                    let target = (pos / 100.0) * audio.duration;
                                    state.audio_engine.seek(target);
                                    broadcast_state(&cmd_handle, &cmd_tx);
                                }
                            }
                        }
                        _ => {
                            user_action!("REMOTE", "Unknown command from remote: {}", cmd);
                        }
                    }
                }
            }
        }
    });

    // Periodic state broadcast every 500ms
    let state_tx = tx.clone();
    let state_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            broadcast_state(&state_handle, &state_tx);
        }
    });

    user_action!("REMOTE", "Kyma Cast server started successfully");

    Router::new()
        .route("/ws", get(ws_handler))
        .route("/state", get(state_handler))
        .fallback_service({
            let cwd = std::env::current_dir().unwrap_or_default();
            let remote_dir = if cwd.join("remote").exists() {
                cwd.join("remote")
            } else {
                // Fallback for dev
                std::path::PathBuf::from("../Kyma_Frontend/remote")
            };
            ServeDir::new(remote_dir)
        })
        .with_state(state)
}

async fn state_handler() -> impl IntoResponse {
    axum::Json(serde_json::json!({
        "status": "ok",
        "version": "1.0.0"
    }))
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<Arc<AppState>>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    user_action!("REMOTE", "WebSocket client connected");

    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.tx.subscribe();

    let _ = sender
        .send(Message::Text(
            serde_json::json!({
                "type": "connected",
                "message": "Connected to Kyma"
            })
            .to_string()
            .into(),
        ))
        .await;

    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    let tx = state.tx.clone();
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(text) = msg {
                let _ = tx.send(text.to_string());
            }
        }
    });

    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }

    user_action!("REMOTE", "WebSocket client disconnected");
}
