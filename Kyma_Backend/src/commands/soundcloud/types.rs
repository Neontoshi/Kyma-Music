use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub(super) struct ScEntry {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub uploader: String,
    #[serde(default)]
    pub channel: String,
    #[serde(default)]
    pub duration: Option<f64>,
    #[serde(default)]
    pub thumbnail: Option<String>,
    #[serde(default)]
    pub webpage_url: Option<String>,
    #[serde(default)]
    pub view_count: Option<u64>,
    #[serde(default)]
    pub genre: Option<String>,
}
