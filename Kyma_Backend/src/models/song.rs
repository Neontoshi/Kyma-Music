use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Song {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: f64,
    pub path: String,
    pub source: Option<String>, // "youtube" or None for local
    pub artwork: Option<Vec<u8>>,
    pub genre: Option<String>,
    pub year: Option<i32>,
    pub track_number: Option<u32>,
}

impl Song {
    pub fn new(path: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            title: "Unknown".to_string(),
            artist: "Unknown".to_string(),
            album: "Unknown".to_string(),
            duration: 0.0,
            path,
            source: None,
            artwork: None,
            genre: None,
            year: None,
            track_number: None,
        }
    }
}
