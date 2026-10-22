// YouTube provider, split into focused submodules:
// - types      raw yt-dlp entry shape
// - validation URL/ID input validation
// - text       normalisation + fuzzy matching helpers
// - query      natural-language query parsing
// - scoring    result ranking and de-duplication
// - search     yt-dlp search command
// - resolve    direct stream URL resolution (with cache + concurrency lock)
// - stream     cached audio streaming
// - download   file download, yt-dlp version check/update
// - cache      cache invalidation / clearing
mod cache;
mod download;
mod query;
mod resolve;
mod scoring;
mod search;
mod stream;
mod text;
mod types;
mod validation;

pub use crate::commands::media::YtError;
pub use crate::commands::stream_cache::invalidate_stream_url;
pub use cache::clear_stream_cache;
pub use download::{check_ytdlp, update_ytdlp, youtube_download};
pub use resolve::resolve_youtube_url;
pub use search::youtube_search;
pub use stream::{check_download_exists, stream_youtube};
#[allow(unused_imports)]
pub use validation::validate_video_id;

fn yt_url(video_id: &str) -> String {
    format!("https://www.youtube.com/watch?v={video_id}")
}
