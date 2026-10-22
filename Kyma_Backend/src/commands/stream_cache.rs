// Disk-backed cache of resolved stream URLs, shared by all providers.
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex as StdMutex;
use std::time::{Duration, Instant};

//  Stream URL Cache (disk-backed)

static STREAM_URL_CACHE: StdMutex<Option<HashMap<String, (String, Instant)>>> = StdMutex::new(None);

const STREAM_URL_TTL: Duration = Duration::from_secs(3600); // 1 hour instead of 5

fn cache_file_path() -> PathBuf {
    dirs::cache_dir()
        .unwrap_or_else(std::env::temp_dir)
        .join("Kyma")
        .join("stream_url_cache.json")
}

fn load_cache_from_disk() -> HashMap<String, (String, Instant)> {
    let path = cache_file_path();
    if let Ok(data) = std::fs::read_to_string(&path) {
        if let Ok(map) = serde_json::from_str::<HashMap<String, (String, u64)>>(&data) {
            let now = Instant::now();
            return map
                .into_iter()
                .filter_map(|(k, (url, elapsed_secs))| {
                    if elapsed_secs < STREAM_URL_TTL.as_secs() {
                        Some((k, (url, now - Duration::from_secs(elapsed_secs))))
                    } else {
                        None
                    }
                })
                .collect();
        }
    }
    HashMap::new()
}

fn save_cache_to_disk(cache: &HashMap<String, (String, Instant)>) {
    let path = cache_file_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let now = Instant::now();
    let serializable: HashMap<String, (String, u64)> = cache
        .iter()
        .map(|(k, (url, ts))| {
            let elapsed = now.duration_since(*ts).as_secs();
            (k.clone(), (url.clone(), elapsed))
        })
        .collect();
    if let Ok(json) = serde_json::to_string(&serializable) {
        let _ = std::fs::write(&path, json);
    }
}

/// Returns a cached stream URL if it exists and has not yet expired.
/// Made `pub` so soundcloud.rs can share the same cache.
pub fn get_cached_stream_url(video_id: &str) -> Option<String> {
    let mut cache = STREAM_URL_CACHE.lock().ok()?;

    // Lazy-load from disk on first access
    if cache.is_none() {
        *cache = Some(load_cache_from_disk());
    }

    let cache = cache.as_ref()?;
    let (url, timestamp) = cache.get(video_id)?;
    if timestamp.elapsed() < STREAM_URL_TTL {
        Some(url.clone())
    } else {
        None
    }
}

/// Inserts or updates a stream URL entry and persists it to disk.
/// Made `pub` so soundcloud.rs can write into the shared cache.
pub fn set_cached_stream_url(video_id: String, url: String) {
    if let Ok(mut cache) = STREAM_URL_CACHE.lock() {
        if cache.is_none() {
            *cache = Some(load_cache_from_disk());
        }
        if let Some(map) = cache.as_mut() {
            if map.len() > 500 {
                map.clear();
            }
            map.insert(video_id.clone(), (url, Instant::now()));
            save_cache_to_disk(map);
        }
    }
}

#[tauri::command]
pub fn invalidate_stream_url(video_id: String) {
    if let Ok(mut cache) = STREAM_URL_CACHE.lock() {
        if cache.is_none() {
            *cache = Some(load_cache_from_disk());
        }
        if let Some(map) = cache.as_mut() {
            map.remove(&video_id);
            save_cache_to_disk(map);
        }
    }
}

/// Remove every cached temp audio file whose name starts with `prefix`.
pub async fn clear_temp_files(prefix: &str) -> usize {
    let temp_dir = std::env::temp_dir();
    let Ok(mut entries) = tokio::fs::read_dir(&temp_dir).await else {
        return 0;
    };

    let mut count = 0;
    while let Ok(Some(entry)) = entries.next_entry().await {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with(prefix) && (name.ends_with(".mp3") || name.ends_with(".mp3.ready")) {
            let _ = tokio::fs::remove_file(entry.path()).await;
            count += 1;
        }
    }
    count
}

/// Drop the in-memory and on-disk stream URL cache.
pub async fn clear_url_cache() {
    if let Ok(mut cache) = STREAM_URL_CACHE.lock() {
        if let Some(map) = cache.as_mut() {
            map.clear();
        }
        *cache = Some(HashMap::new());
    }
    let _ = std::fs::remove_file(cache_file_path());
}
