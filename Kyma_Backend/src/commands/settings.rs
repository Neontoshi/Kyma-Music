use crate::error::KymaError;
use crate::state::app_state::AppState;
use crate::user_action;
use crate::user_error;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

// Simple XOR-based obfuscation for locally stored tokens.
// This is NOT cryptographically secure, but prevents plaintext exposure
// from casual DB inspection. For a local music app, this is sufficient.
const XOR_KEY: &[u8; 10] = b"Kyma2026!!";

pub fn obfuscate(data: &str) -> String {
    let bytes: Vec<u8> = data
        .bytes()
        .zip(XOR_KEY.iter().cycle())
        .map(|(b, k)| b ^ k)
        .collect();
    BASE64.encode(bytes)
}

pub fn deobfuscate(encoded: &str) -> Result<String, KymaError> {
    let bytes = BASE64
        .decode(encoded)
        .map_err(|e| KymaError::DatabaseError(format!("Failed to decode token: {e}")))?;
    let decoded: String = bytes
        .iter()
        .zip(XOR_KEY.iter().cycle())
        .map(|(b, k)| (b ^ k) as char)
        .collect();
    Ok(decoded)
}

// Keys that contain sensitive data and should be stored obfuscated
const SENSITIVE_KEYS: &[&str] = &[
    "listenbrainz_token",
    "spotify_token",
    "spotify_refresh_token",
    "lastfm_token",
];

fn is_sensitive(key: &str) -> bool {
    SENSITIVE_KEYS.contains(&key)
}

#[tauri::command]
pub async fn get_setting(
    key: String,
    state: tauri::State<'_, AppState>,
) -> Result<Option<String>, KymaError> {
    // Don't log sensitive keys or log them as "[redacted]"
    let log_key = if is_sensitive(&key) {
        "[redacted]"
    } else {
        &key
    };
    user_action!("SETTINGS", "Getting setting: {}", log_key);

    let row: Option<(String,)> = sqlx::query_as("SELECT value FROM settings WHERE key = ?")
        .bind(&key)
        .fetch_optional(&state.db)
        .await?;

    match row {
        Some((value,)) if is_sensitive(&key) => match deobfuscate(&value) {
            Ok(decrypted) => {
                user_action!("SETTINGS", "Retrieved setting: {} (obfuscated)", log_key);
                Ok(Some(decrypted))
            }
            Err(e) => {
                user_error!(
                    "SETTINGS",
                    "Failed to deobfuscate setting '{}': {}",
                    log_key,
                    e
                );
                tracing::warn!("Failed to deobfuscate setting '{}': {}", key, e);
                Ok(None)
            }
        },
        Some((value,)) => {
            user_action!(
                "SETTINGS",
                "Retrieved setting: {} = {}",
                log_key,
                if value.len() > 50 {
                    &value[..47]
                } else {
                    &value
                }
            );
            Ok(Some(value))
        }
        None => {
            user_action!("SETTINGS", "Setting not found: {}", log_key);
            Ok(None)
        }
    }
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub async fn set_setting(
    key: String,
    value: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), KymaError> {
    let log_key = if is_sensitive(&key) {
        "[redacted]"
    } else {
        &key
    };
    let log_value = if is_sensitive(&key) {
        "[redacted]".to_string()
    } else if value.len() > 50 {
        format!("{}...", &value[..47])
    } else {
        value.clone()
    };

    user_action!("SETTINGS", "Setting: {} = {}", log_key, log_value);

    let stored_value = if is_sensitive(&key) {
        obfuscate(&value)
    } else {
        value
    };

    match sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
        .bind(&key)
        .bind(&stored_value)
        .execute(&state.db)
        .await
    {
        Ok(_) => {
            user_action!("SETTINGS", "Saved setting: {}", log_key);
            Ok(())
        }
        Err(e) => {
            user_error!("SETTINGS", "Failed to save setting {}: {}", log_key, e);
            Err(KymaError::DatabaseError(e.to_string()))
        }
    }
}

#[tauri::command]
pub async fn fetch_listenbrainz_stats(user: String) -> Result<String, String> {
    user_action!("LISTENBRAINZ", "Fetching stats for user: {}", user);

    let url = format!(
        "https://api.listenbrainz.org/1/stats/user/{}/top-artists?range=week&count=5",
        user
    );
    let client = reqwest::Client::new();
    match client.get(&url).send().await {
        Ok(resp) => {
            let status = resp.status();
            let body = resp.text().await.map_err(|e| e.to_string())?;
            if status.is_success() {
                user_action!(
                    "LISTENBRAINZ",
                    "Stats fetched successfully for user: {}",
                    user
                );
            } else {
                user_error!(
                    "LISTENBRAINZ",
                    "Failed to fetch stats for {}: HTTP {}",
                    user,
                    status
                );
            }
            Ok(body)
        }
        Err(e) => {
            user_error!("LISTENBRAINZ", "Request failed for user {}: {}", user, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn get_local_ip() -> Result<String, String> {
    user_action!("NETWORK", "Getting local IP address");

    let socket = std::net::UdpSocket::bind("0.0.0.0:0").map_err(|e| {
        user_error!("NETWORK", "Failed to bind socket: {}", e);
        e.to_string()
    })?;

    socket.connect("8.8.8.8:80").map_err(|e| {
        user_error!("NETWORK", "Failed to connect: {}", e);
        e.to_string()
    })?;

    let ip = socket
        .local_addr()
        .map(|a| a.ip().to_string())
        .map_err(|e| {
            user_error!("NETWORK", "Failed to get local address: {}", e);
            e.to_string()
        })?;

    user_action!("NETWORK", "Local IP: {}", ip);
    Ok(ip)
}
