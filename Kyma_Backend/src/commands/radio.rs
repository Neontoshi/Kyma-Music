use crate::state::app_state::AppState;
use crate::user_action;
use crate::user_error;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tokio::process::Child;

static RECORDING: Lazy<Mutex<Option<(Child, String)>>> = Lazy::new(|| Mutex::new(None));
static RECORD_COUNTER: Lazy<Mutex<u32>> = Lazy::new(|| Mutex::new(0));

fn get_next_filename() -> String {
    let mut counter = RECORD_COUNTER.lock().unwrap();
    *counter += 1;
    format!("Radio Recording {}", counter)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RadioStation {
    pub id: String,
    pub name: String,
    pub url: String,
    pub genre: String,
    pub country: String,
    pub bitrate: String,
    pub codec: String,
}

const RADIO_API: &str = "https://de1.api.radio-browser.info/json";

#[tauri::command]
pub async fn search_radio_stations(query: String) -> Result<Vec<RadioStation>, String> {
    user_action!("RADIO", "Searching: {}", query);

    let url = format!(
        "{}/stations/search?name={}&limit=100&hidebroken=true&order=clickcount&reverse=true",
        RADIO_API, query
    );
    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("User-Agent", "Kyma/1.0")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let stations: Vec<serde_json::Value> = resp.json().await.map_err(|e| e.to_string())?;
    let count = stations.len();

    user_action!("RADIO", "Found {} stations for '{}'", count, query);

    Ok(stations
        .into_iter()
        .map(|s| RadioStation {
            id: s["stationuuid"].as_str().unwrap_or("").to_string(),
            name: s["name"].as_str().unwrap_or("Unknown").to_string(),
            url: s["url_resolved"]
                .as_str()
                .unwrap_or(s["url"].as_str().unwrap_or(""))
                .to_string(),
            genre: s["tags"].as_str().unwrap_or("Unknown").to_string(),
            country: s["country"].as_str().unwrap_or("Unknown").to_string(),
            bitrate: s["bitrate"]
                .as_u64()
                .map(|b| format!("{} kbps", b / 1000))
                .unwrap_or_default(),
            codec: s["codec"].as_str().unwrap_or("MP3").to_string(),
        })
        .collect())
}

#[tauri::command]
pub async fn get_popular_stations() -> Result<Vec<RadioStation>, String> {
    user_action!("RADIO", "Fetching popular stations");

    let url = format!("{}/stations/topclick?limit=100&hidebroken=true", RADIO_API);
    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("User-Agent", "Kyma/1.0")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let stations: Vec<serde_json::Value> = resp.json().await.map_err(|e| e.to_string())?;
    let count = stations.len();

    user_action!("RADIO", "Retrieved {} popular stations", count);

    Ok(stations
        .into_iter()
        .map(|s| RadioStation {
            id: s["stationuuid"].as_str().unwrap_or("").to_string(),
            name: s["name"].as_str().unwrap_or("Unknown").to_string(),
            url: s["url_resolved"]
                .as_str()
                .unwrap_or(s["url"].as_str().unwrap_or(""))
                .to_string(),
            genre: s["tags"].as_str().unwrap_or("Unknown").to_string(),
            country: s["country"].as_str().unwrap_or("Unknown").to_string(),
            bitrate: s["bitrate"]
                .as_u64()
                .map(|b| format!("{} kbps", b / 1000))
                .unwrap_or_default(),
            codec: s["codec"].as_str().unwrap_or("MP3").to_string(),
        })
        .collect())
}

#[tauri::command]
pub async fn save_radio_station(
    station: RadioStation,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    user_action!(
        "RADIO",
        "Saving station: {} ({})",
        station.name,
        station.genre
    );

    let json = serde_json::to_string(&station).map_err(|e| e.to_string())?;
    match sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
        .bind(format!("radio_{}", station.id))
        .bind(&json)
        .execute(&state.db)
        .await
    {
        Ok(_) => {
            user_action!("RADIO", "Saved station: {}", station.name);
            Ok(())
        }
        Err(e) => {
            user_error!("RADIO", "Failed to save station {}: {}", station.name, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn get_saved_stations(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<RadioStation>, String> {
    let rows =
        sqlx::query_as::<_, (String,)>("SELECT value FROM settings WHERE key LIKE 'radio_%'")
            .fetch_all(&state.db)
            .await
            .map_err(|e| e.to_string())?;

    let stations: Vec<RadioStation> = rows
        .into_iter()
        .filter_map(|r| serde_json::from_str(&r.0).ok())
        .collect();

    user_action!("RADIO", "Retrieved {} saved stations", stations.len());
    Ok(stations)
}

#[tauri::command]
pub async fn remove_radio_station(
    station_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    user_action!("RADIO", "Removing station: {}", station_id);

    match sqlx::query("DELETE FROM settings WHERE key = ?")
        .bind(format!("radio_{}", station_id))
        .execute(&state.db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                user_action!("RADIO", "Removed station: {}", station_id);
            } else {
                user_action!("RADIO", "Station not found: {}", station_id);
            }
            Ok(())
        }
        Err(e) => {
            user_error!("RADIO", "Failed to remove station {}: {}", station_id, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn get_stations_by_genre(genre: String) -> Result<Vec<RadioStation>, String> {
    user_action!("RADIO", "Fetching stations by genre: {}", genre);

    let url = format!(
        "{}/stations/search?tags={}&limit=100&hidebroken=true&order=clickcount&reverse=true",
        RADIO_API, genre
    );
    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("User-Agent", "Kyma/1.0")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let stations: Vec<serde_json::Value> = resp.json().await.map_err(|e| e.to_string())?;
    let count = stations.len();

    user_action!("RADIO", "Found {} stations for genre: {}", count, genre);

    Ok(stations
        .into_iter()
        .map(|s| RadioStation {
            id: s["stationuuid"].as_str().unwrap_or("").to_string(),
            name: s["name"].as_str().unwrap_or("Unknown").to_string(),
            url: s["url_resolved"]
                .as_str()
                .unwrap_or(s["url"].as_str().unwrap_or(""))
                .to_string(),
            genre: s["tags"].as_str().unwrap_or("Unknown").to_string(),
            country: s["country"].as_str().unwrap_or("Unknown").to_string(),
            bitrate: s["bitrate"]
                .as_u64()
                .map(|b| format!("{} kbps", b / 1000))
                .unwrap_or_default(),
            codec: s["codec"].as_str().unwrap_or("MP3").to_string(),
        })
        .collect())
}

#[tauri::command]
pub async fn toggle_recording(url: String) -> Result<String, String> {
    // Truncate URL for logging
    let url_log = if url.len() > 60 {
        format!("{}...", &url[..57])
    } else {
        url.clone()
    };
    user_action!("RADIO", "Toggling recording for: {}", url_log);

    // Extract values from the lock before any await
    let existing = {
        let mut rec = RECORDING
            .lock()
            .map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        rec.take()
    };

    if let Some((mut child, filename)) = existing {
        user_action!("RADIO", "Stopping recording: {}", filename);
        let _ = child.kill().await;
        return Ok(format!("Saved: {}", filename));
    }

    let music_dir = dirs::audio_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    let filename = get_next_filename();
    let output_path = music_dir.join(format!("{}.mp3", filename));

    user_action!("RADIO", "Starting recording: {}", filename);

    match tokio::process::Command::new("yt-dlp")
        .args([
            &url,
            "-o",
            &output_path.to_string_lossy(),
            "--no-part",
            "--no-playlist",
            "--quiet",
        ])
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .spawn()
    {
        Ok(child) => {
            // Lock again to store the new recording
            let mut rec = RECORDING
                .lock()
                .map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
            *rec = Some((child, filename.clone()));
            user_action!("RADIO", "Recording started: {}", filename);
            Ok(format!("Recording: {}", filename))
        }
        Err(e) => {
            user_error!("RADIO", "Failed to start recording: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn is_recording() -> Result<bool, String> {
    let rec = RECORDING.lock().map_err(|e| e.to_string())?;
    let is_recording = rec.is_some();
    if is_recording {
        user_action!("RADIO", "Recording status check: active");
    }
    Ok(is_recording)
}

#[tauri::command]
pub async fn get_recording_name() -> Result<String, String> {
    let rec = RECORDING.lock().map_err(|e| e.to_string())?;
    Ok(rec
        .as_ref()
        .map(|(_, name)| name.clone())
        .unwrap_or_default())
}

pub const POPULAR_GENRES: &[&str] = &[
    "pop",
    "rock",
    "jazz",
    "classical",
    "electronic",
    "hip hop",
    "r&b",
    "country",
    "reggae",
    "blues",
    "metal",
    "punk",
    "folk",
    "soul",
    "funk",
    "disco",
    "house",
    "techno",
    "trance",
    "ambient",
    "drum and bass",
    "dubstep",
    "lofi",
    "chillout",
    "lounge",
];
