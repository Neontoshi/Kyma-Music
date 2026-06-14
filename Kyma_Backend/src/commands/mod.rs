pub mod artists;
pub mod history;
pub mod library;
pub mod likes;
pub mod logs;
pub mod metadata;
pub mod metadata_providers;
pub mod notifications;
pub mod player;
pub mod playlist;
pub mod prefetch;
pub mod radio;
pub mod settings;
pub mod soundcloud;
pub mod updates;
pub mod youtube;

// Re-export the commands for easier access

pub use artists::{get_saved_artists, remove_artist, save_artist, search_artist_for_save};

pub use history::{get_recently_played, save_play_history};

pub use prefetch::{cancel_prefetch, clear_prefetch_cache, get_prefetched_url, prefetch_track};

pub use logs::*;

pub use library::{delete_song, get_songs, scan_folder, search_songs};

pub use likes::{
    get_liked_songs, get_liked_songs_full, save_liked_song, toggle_like, toggle_like_soundcloud,
};

pub use metadata_providers::{
    batch_clean_metadata, clean_track_metadata, get_album_tracks_deezer, get_all_time_stats,
    get_deezer_chart, get_deezer_genre_artists, get_deezer_genre_chart, get_heatmap,
    get_lastfm_similar_artists, get_lastfm_weekly_chart, get_listenbrainz_recent,
    get_listenbrainz_weekly_stats, get_weekly_stats, scrobble_listenbrainz, search_albums_deezer,
    search_artists_deezer, search_deezer, search_metadata, search_musicbrainz, search_suggestions,
};

pub use player::{
    add_to_queue, add_to_queue_at_position, clear_queue, get_playback_state, get_queue,
    get_resume_state, get_volume, next_track, pause_playback, play_track, prev_track,
    remove_from_queue, resume_playback, seek_to, set_queue, set_volume, stop_playback,
};
pub use updates::{download_update, open_file, run_installer};

pub use playlist::{
    add_to_playlist, create_playlist, get_playlist_songs, get_playlists, remove_from_playlist,
    remove_playlist,
};

pub use settings::{
    fetch_listenbrainz_stats, get_app_version, get_local_ip, get_setting, set_setting,
};

pub use radio::{
    get_popular_stations, get_recording_name, get_saved_stations, get_stations_by_genre,
    is_recording, remove_radio_station, save_radio_station, search_radio_stations,
    toggle_recording,
};

pub use soundcloud::{
    check_soundcloud_download_exists, resolve_soundcloud_url, soundcloud_download,
    soundcloud_search, stream_soundcloud,
};

pub use youtube::{
    check_download_exists, check_ytdlp, clear_stream_cache, invalidate_stream_url,
    resolve_youtube_url, stream_youtube, youtube_download, youtube_search,
};
