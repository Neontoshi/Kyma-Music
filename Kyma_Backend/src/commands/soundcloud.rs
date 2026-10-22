// SoundCloud provider, split into focused submodules:
// - types      raw yt-dlp entry shape
// - validation URL/ID input validation
// - filters    generic-title filtering + relevance scoring
// - search     yt-dlp search command
// - resolve    direct stream URL resolution (with cache)
// - stream     cached audio streaming
// - download   file download
mod download;
mod filters;
mod resolve;
mod search;
mod stream;
mod types;
mod validation;

pub use download::soundcloud_download;
pub use resolve::resolve_soundcloud_url;
pub use search::soundcloud_search;
pub use stream::{check_soundcloud_download_exists, stream_soundcloud};
#[allow(unused_imports)]
pub use validation::validate_sc_id;

fn sc_url(track_id: &str) -> String {
    if track_id.starts_with("http") {
        track_id.to_string()
    } else {
        format!("https://soundcloud.com/tracks/{}", track_id)
    }
}
