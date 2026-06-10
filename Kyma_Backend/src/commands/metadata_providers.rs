// Kyma_Backend/src/commands/metadata_providers.rs
use crate::state::app_state::AppState;
use crate::user_action;
use crate::user_error;
use chrono::{Datelike, Timelike};
use serde::{Deserialize, Serialize};
use sqlx::Row;

#[derive(Debug, Clone, Serialize)]
pub struct MetadataTrack {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_secs: f64,
    pub track_number: u32,
    pub genre: String,
    pub artwork_url: String,
    pub source: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct BatchCleanResult {
    pub video_id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_secs: f64,
    pub artwork_url: String,
}

#[derive(Debug, Serialize)]
pub struct CleanMetadata {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_secs: f64,
    pub artwork_url: String,
    pub genre: String,
}

// ── Deezer ──────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct DeezerSearchResponse {
    data: Vec<DeezerTrack>,
}

#[derive(Debug, Deserialize)]
struct DeezerTrack {
    id: u64,
    title: String,
    title_short: String,
    duration: u32,
    artist: DeezerArtist,
    album: DeezerAlbum,
}

#[derive(Debug, Deserialize)]
struct DeezerArtist {
    name: String,
}

#[derive(Debug, Deserialize)]
struct DeezerAlbum {
    title: String,
    cover_medium: Option<String>,
}

// ── Deezer Chart (Trending) ─────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct DeezerChartTrack {
    pub id: u64,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_secs: u32,
    pub artwork_url: String,
    pub position: u32,
}

#[tauri::command]
pub async fn get_deezer_chart() -> Result<Vec<DeezerChartTrack>, String> {
    user_action!("DEEZER", "Fetching trending chart");
    let url = "https://api.deezer.com/chart/0/tracks?limit=20";

    let client = reqwest::Client::new();
    let resp = client
        .get(url)
        .header("User-Agent", "Mozilla/5.0 Kyma/1.0")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| format!("Read failed: {}", e))?;

    if !status.is_success() {
        user_error!("DEEZER", "Chart request failed with status: {}", status);
        return Err(format!("HTTP {}", status));
    }

    let data: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("JSON parse error: {}", e))?;

    let tracks_array = data["tracks"]["data"]
        .as_array()
        .or_else(|| data["data"].as_array())
        .or_else(|| data.as_array());

    match tracks_array {
        Some(arr) => {
            let tracks: Vec<DeezerChartTrack> = arr
                .iter()
                .enumerate()
                .map(|(i, t)| DeezerChartTrack {
                    id: t["id"].as_u64().unwrap_or(0),
                    title: t["title_short"].as_str().unwrap_or("").to_string(),
                    artist: t["artist"]["name"].as_str().unwrap_or("").to_string(),
                    album: t["album"]["title"].as_str().unwrap_or("").to_string(),
                    duration_secs: t["duration"].as_u64().unwrap_or(0) as u32,
                    artwork_url: t["album"]["cover_medium"]
                        .as_str()
                        .unwrap_or("")
                        .to_string(),
                    position: (i + 1) as u32,
                })
                .collect();
            user_action!("DEEZER", "Retrieved {} trending tracks", tracks.len());
            Ok(tracks)
        }
        None => {
            user_error!("DEEZER", "No tracks array in chart response");
            Err("No tracks array in response".to_string())
        }
    }
}

// ── Last.fm Similar Artists ─────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct LastfmSimilarArtist {
    pub name: String,
    pub match_score: f32,
    pub image_url: String,
}

#[derive(Debug, Deserialize)]
struct LastfmSimilarArtistsResponse {
    similarartists: LastfmSimilarArtistsContainer,
}

#[derive(Debug, Deserialize)]
struct LastfmSimilarArtistsContainer {
    artist: Vec<LastfmArtistNode>,
}

#[derive(Debug, Deserialize)]
struct LastfmArtistNode {
    name: String,
    #[serde(default)]
    match_field: Option<String>,
    image: Vec<LastfmImage>,
}

#[derive(Debug, Deserialize)]
struct LastfmImage {
    #[serde(rename = "#text")]
    text: String,
    size: String,
}

#[tauri::command]
pub async fn get_lastfm_similar_artists(
    artist: String,
    api_key: String,
) -> Result<Vec<LastfmSimilarArtist>, String> {
    user_action!("LASTFM", "Fetching similar artists for: {}", artist);

    let url = format!(
        "https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist={}&api_key={}&format=json&limit=10",
        artist.replace(' ', "%20"),
        api_key
    );

    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let data: LastfmSimilarArtistsResponse = resp.json().await.map_err(|e| e.to_string())?;

    let artists: Vec<LastfmSimilarArtist> = data
        .similarartists
        .artist
        .into_iter()
        .map(|a| {
            let image_url = a
                .image
                .iter()
                .find(|img| img.size == "large" || img.size == "extralarge")
                .map(|img| img.text.clone())
                .unwrap_or_default();

            let match_score: f32 = a
                .match_field
                .as_deref()
                .unwrap_or("0")
                .parse()
                .unwrap_or(0.0);

            LastfmSimilarArtist {
                name: a.name,
                match_score,
                image_url,
            }
        })
        .collect();

    user_action!(
        "LASTFM",
        "Found {} similar artists for {}",
        artists.len(),
        artist
    );
    Ok(artists)
}

// ── Last.fm Weekly Track Chart ──────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct LastfmWeeklyTrack {
    pub title: String,
    pub artist: String,
    pub playcount: u32,
    pub rank: u32,
}

#[derive(Debug, Deserialize)]
struct LastfmWeeklyChartResponse {
    weeklytrackchart: LastfmWeeklyChartContainer,
}

#[derive(Debug, Deserialize)]
struct LastfmWeeklyChartContainer {
    #[serde(rename = "track")]
    tracks: Vec<LastfmWeeklyTrackNode>,
}

#[derive(Debug, Deserialize)]
struct LastfmWeeklyTrackNode {
    name: String,
    artist: LastfmTrackArtist,
    playcount: String,
    #[serde(rename = "@attr")]
    attr: LastfmTrackAttr,
}

#[derive(Debug, Deserialize)]
struct LastfmTrackArtist {
    #[serde(rename = "#text")]
    text: String,
}

#[derive(Debug, Deserialize)]
struct LastfmTrackAttr {
    rank: String,
}

#[tauri::command]
pub async fn get_lastfm_weekly_chart(
    user: String,
    api_key: String,
) -> Result<Vec<LastfmWeeklyTrack>, String> {
    user_action!("LASTFM", "Fetching weekly chart for user: {}", user);

    let url = format!(
        "https://ws.audioscrobbler.com/2.0/?method=user.getweeklytrackchart&user={}&api_key={}&format=json&limit=20",
        user,
        api_key
    );

    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let data: LastfmWeeklyChartResponse = resp.json().await.map_err(|e| e.to_string())?;

    let tracks: Vec<LastfmWeeklyTrack> = data
        .weeklytrackchart
        .tracks
        .into_iter()
        .map(|t| LastfmWeeklyTrack {
            title: t.name,
            artist: t.artist.text,
            playcount: t.playcount.parse().unwrap_or(0),
            rank: t.attr.rank.parse().unwrap_or(0),
        })
        .collect();

    user_action!(
        "LASTFM",
        "Retrieved {} tracks for user {}",
        tracks.len(),
        user
    );
    Ok(tracks)
}

#[tauri::command]
pub async fn search_deezer(query: String) -> Result<Vec<MetadataTrack>, String> {
    user_action!("DEEZER", "Searching: {}", query);
    let url = format!(
        "https://api.deezer.com/search/track?q={}&limit=25",
        query.replace(' ', "%20")
    );

    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let data: DeezerSearchResponse = resp.json().await.map_err(|e| e.to_string())?;

    let tracks: Vec<MetadataTrack> = data
        .data
        .into_iter()
        .map(|t| MetadataTrack {
            id: format!("deezer-{}", t.id),
            title: t.title_short,
            artist: t.artist.name,
            album: t.album.title,
            duration_secs: t.duration as f64,
            track_number: 0,
            genre: String::new(),
            artwork_url: t.album.cover_medium.unwrap_or_default(),
            source: "deezer".to_string(),
        })
        .collect();

    user_action!("DEEZER", "Found {} results for '{}'", tracks.len(), query);
    Ok(tracks)
}

// ── Deezer Artist Search ───────────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
pub struct DeezerArtistInfo {
    pub id: u64,
    pub name: String,
    pub picture_medium: String,
    pub nb_fan: u64,
}

#[derive(Debug, Deserialize)]
struct DeezerArtistSearchResponse {
    data: Vec<DeezerArtistData>,
}

#[derive(Debug, Deserialize)]
struct DeezerArtistData {
    id: u64,
    name: String,
    picture_medium: Option<String>,
    nb_fan: Option<u64>,
}

#[tauri::command]
pub async fn search_artists_deezer(query: String) -> Result<Vec<DeezerArtistInfo>, String> {
    user_action!("DEEZER", "Searching artists: {}", query);
    let url = format!(
        "https://api.deezer.com/search/artist?q={}&limit=8",
        query.replace(' ', "%20")
    );

    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let data: DeezerArtistSearchResponse = resp.json().await.map_err(|e| e.to_string())?;

    let artists: Vec<DeezerArtistInfo> = data
        .data
        .into_iter()
        .map(|a| DeezerArtistInfo {
            id: a.id,
            name: a.name,
            picture_medium: a.picture_medium.unwrap_or_default(),
            nb_fan: a.nb_fan.unwrap_or(0),
        })
        .collect();

    user_action!("DEEZER", "Found {} artists for '{}'", artists.len(), query);
    Ok(artists)
}

// ── MusicBrainz ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn search_musicbrainz(query: String) -> Result<Vec<MetadataTrack>, String> {
    user_action!("MUSICBRAINZ", "Searching: {}", query);
    let url = format!(
        "https://musicbrainz.org/ws/2/recording/?query={}&limit=25&fmt=json",
        query.replace(' ', "%20")
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("User-Agent", "Kyma/1.0")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let mut tracks = Vec::new();

    if let Some(recordings) = data["recordings"].as_array() {
        for r in recordings {
            let title = r["title"].as_str().unwrap_or("Unknown").to_string();
            let artist = r["artist-credit"]
                .as_array()
                .and_then(|a| a.first())
                .and_then(|a| a["name"].as_str())
                .unwrap_or("Unknown")
                .to_string();
            let duration = r["length"].as_f64().unwrap_or(0.0) / 1000.0;
            let id = r["id"].as_str().unwrap_or("").to_string();
            let album = r["releases"]
                .as_array()
                .and_then(|rels| rels.first())
                .and_then(|rel| rel["title"].as_str())
                .unwrap_or("")
                .to_string();

            tracks.push(MetadataTrack {
                id: format!("mb-{}", id),
                title,
                artist,
                album,
                duration_secs: duration,
                track_number: 0,
                genre: String::new(),
                artwork_url: String::new(),
                source: "musicbrainz".to_string(),
            });
        }
    }

    user_action!(
        "MUSICBRAINZ",
        "Found {} results for '{}'",
        tracks.len(),
        query
    );
    Ok(tracks)
}

// ── Combined search ────────────────────────────────────────────────────────

#[tauri::command]
pub async fn search_metadata(query: String) -> Result<Vec<MetadataTrack>, String> {
    user_action!("METADATA", "Combined search: {}", query);
    if let Ok(tracks) = search_deezer(query.clone()).await {
        if !tracks.is_empty() {
            return Ok(tracks);
        }
    }
    search_musicbrainz(query).await
}

// ── Single track cleaning ──────────────────────────────────────────────────

#[tauri::command]
pub async fn clean_track_metadata(title: String, artist: String) -> Result<CleanMetadata, String> {
    user_action!("METADATA", "Cleaning metadata: {} - {}", title, artist);
    let query = format!("{} {}", artist, title);
    let url = format!(
        "https://api.deezer.com/search/track?q={}&limit=3",
        query.replace(' ', "%20")
    );

    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if let Some(tracks) = data["data"].as_array() {
        for track in tracks {
            let dz_title = track["title_short"].as_str().unwrap_or("");
            let dz_artist = track["artist"]["name"].as_str().unwrap_or("");

            if title_match(&title, dz_title) || artist_match(&artist, dz_artist) {
                user_action!("METADATA", "Found match: {} - {}", dz_title, dz_artist);
                return Ok(CleanMetadata {
                    title: dz_title.to_string(),
                    artist: dz_artist.to_string(),
                    album: track["album"]["title"].as_str().unwrap_or("").to_string(),
                    duration_secs: track["duration"].as_f64().unwrap_or(0.0),
                    artwork_url: track["album"]["cover_medium"]
                        .as_str()
                        .unwrap_or("")
                        .to_string(),
                    genre: String::new(),
                });
            }
        }
    }

    user_action!("METADATA", "No match found for: {} - {}", title, artist);
    Ok(CleanMetadata {
        title,
        artist,
        album: String::new(),
        duration_secs: 0.0,
        artwork_url: String::new(),
        genre: String::new(),
    })
}

fn title_match(original: &str, deezer: &str) -> bool {
    let orig = clean_title_for_search(original);
    let dz = deezer.to_lowercase().trim().to_string();
    orig.contains(&dz) || dz.contains(&orig) || orig.split_whitespace().eq(dz.split_whitespace())
}

fn artist_match(original: &str, deezer: &str) -> bool {
    let orig = original
        .to_lowercase()
        .replace(" - topic", "")
        .replace(" vevo", "")
        .replace(" official", "")
        .trim()
        .to_string();
    let dz = deezer.to_lowercase().trim().to_string();
    orig.contains(&dz) || dz.contains(&orig)
}

// ── Batch clean ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn batch_clean_metadata(
    tracks: Vec<serde_json::Value>,
) -> Result<Vec<BatchCleanResult>, String> {
    let track_count = tracks.len();
    user_action!("METADATA", "Batch cleaning {} tracks", track_count);

    if tracks.is_empty() {
        return Ok(Vec::new());
    }

    let batch_size = 10;
    let track_chunks: Vec<&[serde_json::Value]> = tracks.chunks(batch_size).collect();
    let mut all_results: Vec<Option<BatchCleanResult>> = vec![None; tracks.len()];

    for (chunk_idx, chunk) in track_chunks.iter().enumerate() {
        let mut queries: Vec<String> = Vec::new();
        for track in *chunk {
            let title = track["title"].as_str().unwrap_or("");
            let artist = track["artist"].as_str().unwrap_or("");
            let clean_title = clean_title_for_search(title);
            if !clean_title.is_empty() && !artist.is_empty() {
                queries.push(format!(
                    "(title:\"{}\" AND artist:\"{}\")",
                    clean_title.replace('"', ""),
                    artist.replace('"', "")
                ));
            }
        }

        if queries.is_empty() {
            continue;
        }

        let query_string = queries.join(" OR ");
        let url = format!(
            "https://musicbrainz.org/ws/2/recording/?query={}&limit={}&fmt=json",
            urlencoding(&query_string),
            chunk.len() + 5
        );

        let client = reqwest::Client::new();
        match client
            .get(&url)
            .header("User-Agent", "Kyma/1.0")
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
        {
            Ok(resp) => {
                if let Ok(data) = resp.json::<serde_json::Value>().await {
                    let mut mb_map: std::collections::HashMap<String, (String, String)> =
                        std::collections::HashMap::new();

                    if let Some(recordings) = data["recordings"].as_array() {
                        for r in recordings {
                            let mb_title = r["title"].as_str().unwrap_or("").to_lowercase();
                            let mb_artist = r["artist-credit"]
                                .as_array()
                                .and_then(|a| a.first())
                                .and_then(|a| a["name"].as_str())
                                .unwrap_or("")
                                .to_lowercase();
                            let mb_album = r["releases"]
                                .as_array()
                                .and_then(|rels| rels.first())
                                .and_then(|rel| rel["title"].as_str())
                                .unwrap_or("")
                                .to_string();

                            let key = format!("{}|{}", mb_title, mb_artist);
                            mb_map.insert(key, (mb_title, mb_album));
                        }
                    }

                    for (i, track) in chunk.iter().enumerate() {
                        let global_idx = chunk_idx * batch_size + i;
                        let title = track["title"].as_str().unwrap_or("").to_string();
                        let artist = track["artist"].as_str().unwrap_or("").to_string();
                        let video_id = track["id"].as_str().unwrap_or("").to_string();
                        let duration = track["duration_secs"].as_f64().unwrap_or(0.0);

                        let clean_title = clean_title_for_search(&title).to_lowercase();
                        let clean_artist = artist
                            .to_lowercase()
                            .replace(" - topic", "")
                            .replace(" vevo", "");
                        let key = format!("{}|{}", clean_title, clean_artist);

                        if let Some((mb_title, mb_album)) = mb_map.get(&key) {
                            all_results[global_idx] = Some(BatchCleanResult {
                                video_id,
                                title: capitalize_first(mb_title),
                                artist: artist.clone(),
                                album: mb_album.clone(),
                                duration_secs: duration,
                                artwork_url: String::new(),
                            });
                        } else {
                            all_results[global_idx] = Some(BatchCleanResult {
                                video_id,
                                title,
                                artist,
                                album: String::new(),
                                duration_secs: duration,
                                artwork_url: String::new(),
                            });
                        }
                    }
                }
            }
            Err(e) => {
                user_error!("METADATA", "MusicBrainz batch request failed: {}", e);
                tracing::warn!("MusicBrainz batch request failed: {}", e);
            }
        }
    }

    let results: Vec<BatchCleanResult> = tracks
        .iter()
        .enumerate()
        .map(|(i, track)| {
            if let Some(result) = all_results[i].take() {
                result
            } else {
                BatchCleanResult {
                    video_id: track["id"].as_str().unwrap_or("").to_string(),
                    title: track["title"].as_str().unwrap_or("").to_string(),
                    artist: track["artist"].as_str().unwrap_or("").to_string(),
                    album: String::new(),
                    duration_secs: track["duration_secs"].as_f64().unwrap_or(0.0),
                    artwork_url: String::new(),
                }
            }
        })
        .collect();

    user_action!(
        "METADATA",
        "Batch cleaning completed for {} tracks",
        track_count
    );
    Ok(results)
}

// ── Search Suggestions ─────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct SearchSuggestion {
    pub text: String,
    pub artist: String,
    pub artwork_url: String,
}

#[tauri::command]
pub async fn search_suggestions(query: String) -> Result<Vec<SearchSuggestion>, String> {
    if query.trim().len() < 2 {
        return Ok(Vec::new());
    }

    user_action!("SEARCH", "Getting suggestions for: {}", query);

    let url = format!(
        "https://api.deezer.com/search/track?q={}&limit=15",
        query.replace(' ', "%20")
    );

    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let mut seen = std::collections::HashSet::new();
    let mut suggestions = Vec::new();

    if let Some(tracks) = data["data"].as_array() {
        for track in tracks {
            let title = track["title_short"].as_str().unwrap_or("");
            let artist = track["artist"]["name"].as_str().unwrap_or("");
            let key = format!("{} - {}", artist, title);

            if !seen.contains(&key) {
                seen.insert(key.clone());
                suggestions.push(SearchSuggestion {
                    text: key,
                    artist: artist.to_string(),
                    artwork_url: track["album"]["cover_small"]
                        .as_str()
                        .unwrap_or("")
                        .to_string(),
                });
            }

            if suggestions.len() >= 15 {
                break;
            }
        }
    }

    user_action!(
        "SEARCH",
        "Found {} suggestions for '{}'",
        suggestions.len(),
        query
    );
    Ok(suggestions)
}

// ── Deezer Albums ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct DeezerAlbumInfo {
    pub id: u64,
    pub title: String,
    pub artist: String,
    pub cover_url: String,
    pub track_count: u32,
}

#[derive(Debug, Serialize)]
pub struct DeezerAlbumTrack {
    pub title: String,
    pub duration_secs: u32,
    pub artist: String,
    pub track_number: u32,
}

#[tauri::command]
pub async fn search_albums_deezer(query: String) -> Result<Vec<DeezerAlbumInfo>, String> {
    user_action!("DEEZER", "Searching albums: {}", query);

    let url = format!(
        "https://api.deezer.com/search/album?q={}&limit=25",
        query.replace(' ', "%20")
    );
    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let albums: Vec<DeezerAlbumInfo> = data["data"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|a| DeezerAlbumInfo {
            id: a["id"].as_u64().unwrap_or(0),
            title: a["title"].as_str().unwrap_or("").to_string(),
            artist: a["artist"]["name"].as_str().unwrap_or("").to_string(),
            cover_url: a["cover_medium"].as_str().unwrap_or("").to_string(),
            track_count: a["nb_tracks"].as_u64().unwrap_or(0) as u32,
        })
        .collect();

    user_action!("DEEZER", "Found {} albums for '{}'", albums.len(), query);
    Ok(albums)
}

#[tauri::command]
pub async fn get_album_tracks_deezer(album_id: u64) -> Result<Vec<DeezerAlbumTrack>, String> {
    let url = format!("https://api.deezer.com/album/{}", album_id);
    user_action!("DEEZER", "Fetching tracks for album ID: {}", album_id);

    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let tracks: Vec<DeezerAlbumTrack> = data["tracks"]["data"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|t| DeezerAlbumTrack {
            title: t["title_short"].as_str().unwrap_or("").to_string(),
            duration_secs: t["duration"].as_u64().unwrap_or(0) as u32,
            artist: t["artist"]["name"].as_str().unwrap_or("").to_string(),
            track_number: t["track_position"].as_u64().unwrap_or(0) as u32,
        })
        .collect();

    user_action!(
        "DEEZER",
        "Found {} tracks for album ID: {}",
        tracks.len(),
        album_id
    );
    Ok(tracks)
}

// ── ListenBrainz ────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn scrobble_listenbrainz(
    token: String,
    artist_name: String,
    track_name: String,
    release_name: String,
) -> Result<(), String> {
    user_action!(
        "LISTENBRAINZ",
        "Scrobbling: {} - {}",
        track_name,
        artist_name
    );

    let payload = serde_json::json!({
        "listen_type": "single",
        "payload": [{
            "listened_at": std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            "track_metadata": {
                "artist_name": artist_name,
                "track_name": track_name,
                "release_name": release_name
            }
        }]
    });

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.listenbrainz.org/1/submit-listens")
        .header("Authorization", format!("Token {}", token))
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if resp.status().is_success() {
        user_action!(
            "LISTENBRAINZ",
            "Successfully scrobbled: {} - {}",
            track_name,
            artist_name
        );
        tracing::info!(
            "Scrobbled to ListenBrainz: {} - {}",
            track_name,
            artist_name
        );
        Ok(())
    } else {
        let text = resp.text().await.unwrap_or_default();
        user_error!("LISTENBRAINZ", "Scrobble failed: {}", text);
        Err(text)
    }
}

#[derive(Debug, Serialize)]
pub struct ListenbrainzRecentTrack {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub listened_at: i64,
    pub track_id: String,
}

#[tauri::command]
pub async fn get_listenbrainz_recent(
    user: String,
    count: u32,
) -> Result<Vec<ListenbrainzRecentTrack>, String> {
    user_action!("LISTENBRAINZ", "Fetching recent listens for user: {}", user);

    let url = format!(
        "https://api.listenbrainz.org/1/user/{}/listens?count={}",
        user, count
    );

    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let tracks: Vec<ListenbrainzRecentTrack> = data["payload"]["listens"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|l| {
            let meta = &l["track_metadata"];
            ListenbrainzRecentTrack {
                title: meta["track_name"].as_str().unwrap_or("").to_string(),
                artist: meta["artist_name"].as_str().unwrap_or("").to_string(),
                album: meta["release_name"].as_str().unwrap_or("").to_string(),
                listened_at: l["listened_at"].as_i64().unwrap_or(0) * 1000,
                track_id: format!(
                    "{}-{}",
                    meta["artist_name"].as_str().unwrap_or(""),
                    meta["track_name"].as_str().unwrap_or("")
                ),
            }
        })
        .collect();

    user_action!(
        "LISTENBRAINZ",
        "Retrieved {} recent listens for {}",
        tracks.len(),
        user
    );
    Ok(tracks)
}

// ── ListenBrainz Weekly Stats ──────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ListenbrainzWeeklyStats {
    pub total_listens: u64,
    pub unique_artists: u64,
    pub unique_tracks: u64,
    pub listening_hours: f64,
}

#[tauri::command]
pub async fn get_listenbrainz_weekly_stats(
    user: String,
) -> Result<ListenbrainzWeeklyStats, String> {
    user_action!("LISTENBRAINZ", "Fetching weekly stats for user: {}", user);

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let week_ago = now - 604800; // 7 days

    let url = format!(
        "https://api.listenbrainz.org/1/user/{}/listens?min_ts={}&max_ts={}&count=1000",
        user, week_ago, now
    );

    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let empty_vec = vec![];
    let listens = data["payload"]["listens"].as_array().unwrap_or(&empty_vec);

    let total_listens = listens.len() as u64;

    let mut artists = std::collections::HashSet::new();
    let mut tracks = std::collections::HashSet::new();
    let mut total_duration = 0u64;

    for l in listens {
        let meta = &l["track_metadata"];
        let artist = meta["artist_name"].as_str().unwrap_or("");
        let track = meta["track_name"].as_str().unwrap_or("");

        artists.insert(artist.to_string());
        tracks.insert(format!("{}|{}", artist, track));

        // Estimate 3.5 min per track
        total_duration += 210;
    }

    user_action!(
        "LISTENBRAINZ",
        "Weekly stats for {}: {} listens, {} artists",
        user,
        total_listens,
        artists.len()
    );

    Ok(ListenbrainzWeeklyStats {
        total_listens,
        unique_artists: artists.len() as u64,
        unique_tracks: tracks.len() as u64,
        listening_hours: total_duration as f64 / 3600.0,
    })
}

// ── ListenBrainz Listening Heatmap ─────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ListenbrainzHeatmapEntry {
    pub hour: u32,
    pub day: u32,
    pub count: u32,
}

#[tauri::command]
pub async fn get_heatmap(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ListenbrainzHeatmapEntry>, String> {
    user_action!("STATS", "Generating listening heatmap");

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let month_ago = now - 2592000; // 30 days

    let rows = sqlx::query("SELECT played_at FROM play_history WHERE played_at >= ?")
        .bind(month_ago)
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let mut heatmap: std::collections::HashMap<(u32, u32), u32> = std::collections::HashMap::new();

    for row in &rows {
        let timestamp: i64 = row.get("played_at");
        let dt = chrono::DateTime::from_timestamp(timestamp, 0).unwrap_or_default();
        let hour = dt.hour();
        let day = dt.weekday().num_days_from_monday(); // 0=Mon, 6=Sun
        *heatmap.entry((hour, day)).or_insert(0) += 1;
    }

    let entries: Vec<ListenbrainzHeatmapEntry> = heatmap
        .into_iter()
        .map(|((hour, day), count)| ListenbrainzHeatmapEntry { hour, day, count })
        .collect();

    user_action!("STATS", "Heatmap generated with {} entries", entries.len());
    Ok(entries)
}

#[tauri::command]
pub async fn get_all_time_stats(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    user_action!("STATS", "Fetching all-time stats");

    let row = sqlx::query(
        "SELECT COUNT(*) as total_plays, COALESCE(SUM(duration_secs), 0) as total_duration FROM play_history"
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let total_plays: i64 = row.get("total_plays");
    let total_duration: f64 = row.get("total_duration");
    let total_hours = total_duration / 3600.0;

    user_action!(
        "STATS",
        "All-time: {} plays, {:.1} hours",
        total_plays,
        total_hours
    );

    Ok(serde_json::json!({
        "total_plays": total_plays,
        "total_hours": total_hours,
    }))
}

// ── Deezer Genre Chart ──────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_deezer_genre_chart(genre: String) -> Result<Vec<DeezerChartTrack>, String> {
    user_action!("DEEZER", "Fetching genre chart for: {}", genre);

    let genre_id = match genre.to_lowercase().as_str() {
        "pop" => 132,
        "rock" => 152,
        "jazz" => 129,
        "classical" => 98,
        "electronic" => 106,
        "hip hop" | "hip-hop" => 116,
        "r&b" => 165,
        "country" => 161,
        "reggae" => 151,
        "blues" => 160,
        "metal" => 173,
        "punk" => 189,
        "folk" => 118,
        "soul" => 170,
        "funk" => 115,
        "disco" => 104,
        "house" => 117,
        "techno" => 180,
        "trance" => 183,
        "ambient" => 83,
        "drum and bass" | "drum & bass" => 105,
        "dubstep" => 188,
        "lofi" | "lo-fi" => 138,
        "chillout" => 94,
        "lounge" => 136,
        "gospel" => 120,
        "latin" => 131,
        "afrobeats" => 81,
        "k-pop" => 128,
        "indie" => 124,
        "alternative" => 85,
        _ => {
            user_action!("DEEZER", "Unknown genre: {}", genre);
            return Ok(vec![]);
        }
    };

    let url = format!("https://api.deezer.com/chart/{}/tracks?limit=30", genre_id);

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 Kyma/1.0")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let text = resp
        .text()
        .await
        .map_err(|e| format!("Read failed: {}", e))?;
    let data: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("JSON error: {}", e))?;

    let tracks_array = data["tracks"]["data"]
        .as_array()
        .or_else(|| data["data"].as_array());

    match tracks_array {
        Some(arr) => {
            let tracks: Vec<DeezerChartTrack> = arr
                .iter()
                .enumerate()
                .map(|(i, t)| DeezerChartTrack {
                    id: t["id"].as_u64().unwrap_or(0),
                    title: t["title_short"].as_str().unwrap_or("").to_string(),
                    artist: t["artist"]["name"].as_str().unwrap_or("").to_string(),
                    album: t["album"]["title"].as_str().unwrap_or("").to_string(),
                    duration_secs: t["duration"].as_u64().unwrap_or(0) as u32,
                    artwork_url: t["album"]["cover_medium"]
                        .as_str()
                        .unwrap_or("")
                        .to_string(),
                    position: (i + 1) as u32,
                })
                .collect();
            user_action!(
                "DEEZER",
                "Genre chart for {}: {} tracks",
                genre,
                tracks.len()
            );
            Ok(tracks)
        }
        None => {
            user_error!("DEEZER", "No tracks array for genre: {}", genre);
            Ok(vec![])
        }
    }
}

#[tauri::command]
pub async fn get_deezer_genre_artists(genre: String) -> Result<Vec<DeezerArtistInfo>, String> {
    user_action!("DEEZER", "Fetching artists for genre: {}", genre);

    // Search for a genre playlist first
    let search_url = format!(
        "https://api.deezer.com/search/playlist?q={}&limit=3",
        genre.replace(' ', "%20")
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&search_url)
        .header("User-Agent", "Mozilla/5.0 Kyma/1.0")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    // Get the first playlist ID
    let playlist_id = data["data"]
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|p| p["id"].as_u64())
        .unwrap_or(0);

    if playlist_id == 0 {
        user_error!("DEEZER", "No playlist found for genre: {}", genre);
        return Ok(vec![]);
    }

    // Get tracks from that playlist
    let tracks_url = format!(
        "https://api.deezer.com/playlist/{}/tracks?limit=50",
        playlist_id
    );
    let resp = client
        .get(&tracks_url)
        .header("User-Agent", "Mozilla/5.0 Kyma/1.0")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let mut seen = std::collections::HashSet::new();
    let mut artists: Vec<DeezerArtistInfo> = Vec::new();

    if let Some(tracks) = data["data"].as_array() {
        for track in tracks {
            let artist = &track["artist"];
            let id = artist["id"].as_u64().unwrap_or(0);
            if id > 0 && !seen.contains(&id) {
                seen.insert(id);
                artists.push(DeezerArtistInfo {
                    id,
                    name: artist["name"].as_str().unwrap_or("").to_string(),
                    picture_medium: artist["picture_medium"].as_str().unwrap_or("").to_string(),
                    nb_fan: 0,
                });
                if artists.len() >= 50 {
                    break;
                }
            }
        }
    }

    user_action!(
        "DEEZER",
        "Found {} artists for genre: {}",
        artists.len(),
        genre
    );
    Ok(artists)
}

#[tauri::command]
pub async fn get_weekly_stats(
    state: tauri::State<'_, AppState>,
) -> Result<ListenbrainzWeeklyStats, String> {
    user_action!("STATS", "Fetching weekly stats");

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let week_ago = now - 604800;

    let rows = sqlx::query(
        "SELECT artist, COUNT(*) as play_count, COALESCE(SUM(duration_secs), 0) as total_dur
         FROM play_history
         WHERE played_at >= ?
         GROUP BY artist",
    )
    .bind(week_ago)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let mut total_listens = 0u64;
    let mut artists = std::collections::HashSet::new();
    let mut total_duration = 0u64;

    for row in &rows {
        let plays: i64 = row.get("play_count");
        let artist: String = row.get("artist");
        let dur: f64 = row.get("total_dur");

        total_listens += plays as u64;
        artists.insert(artist);
        total_duration += dur as u64;
    }

    user_action!(
        "STATS",
        "Weekly: {} listens, {} unique artists",
        total_listens,
        artists.len()
    );

    Ok(ListenbrainzWeeklyStats {
        total_listens,
        unique_artists: artists.len() as u64,
        unique_tracks: 0,
        listening_hours: total_duration as f64 / 3600.0,
    })
}

// ── Helpers ────────────────────────────────────────────────────────────────

fn clean_title_for_search(title: &str) -> String {
    title
        .to_lowercase()
        .replace(['(', ')', '[', ']', '"', '\''], "")
        .replace("official video", "")
        .replace("official audio", "")
        .replace("official music video", "")
        .replace("lyric video", "")
        .replace("lyrics", "")
        .replace("audio", "")
        .replace("video", "")
        .replace("hd", "")
        .replace("hq", "")
        .replace("explicit", "")
        .replace("clean", "")
        .split(" ft. ")
        .next()
        .unwrap_or("")
        .split(" feat. ")
        .next()
        .unwrap_or("")
        .trim()
        .to_string()
}

fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        Some(c) => c.to_uppercase().to_string() + chars.as_str(),
        None => String::new(),
    }
}

fn urlencoding(s: &str) -> String {
    s.replace(' ', "%20")
        .replace('&', "%26")
        .replace('#', "%23")
        .replace('+', "%2B")
        .replace('=', "%3D")
        .replace('?', "%3F")
}
