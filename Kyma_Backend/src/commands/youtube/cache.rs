use crate::commands::stream_cache::{clear_temp_files, clear_url_cache};
use crate::user_action;

/// Clears temp `.mp3` stream files AND the persistent disk URL cache JSON.
/// Called on app shutdown or manual cache-clear.
pub async fn clear_stream_cache() {
    user_action!("YOUTUBE", "Clearing stream cache");

    let count = clear_temp_files("Kyma_yt_").await;
    clear_url_cache().await;

    if count > 0 {
        user_action!("YOUTUBE", "Cleared {} cached files", count);
    }
    tracing::info!("Stream URL cache cleared (memory + disk)");
}
