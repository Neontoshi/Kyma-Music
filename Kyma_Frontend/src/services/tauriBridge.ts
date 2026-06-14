import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Song } from "../core/entities/Song";
import { logger, logCommandError } from "../services/logger";

export class TauriError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: string,
  ) {
    super(message);
    this.name = "Error";
  }
}

const handleInvoke = async <T>(command: string, args?: any): Promise<T> => {
  const startTime = performance.now();
  try {
    const result = await invoke<T>(command, args);
    const duration = performance.now() - startTime;

    // Log slow commands (> 1 second) as warnings
    if (duration > 1000) {
      logger.logWarn(`Slow command: ${command} took ${duration.toFixed(0)}ms`, {
        command,
        args,
      });
    }

    return result;
  } catch (error) {
    const errorMessage =
      typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : "Unknown error occurred";

    const errorDetails = error instanceof Error ? error.stack : undefined;

    console.error(`[TauriBridge] Failed to invoke "${command}":`, {
      error: errorMessage,
      args: args ? JSON.stringify(args).slice(0, 200) : undefined,
      stack: errorDetails?.split("\n").slice(0, 3).join("\n"),
    });

    logCommandError(command, error, args);
    throw new TauriError(errorMessage, "INVOKE_ERROR", errorDetails);
  }
};

//  Types

export interface YtSong {
  id: string;
  title: string;
  artist: string;
  duration_secs: number;
  duration_str: string;
  thumbnail: string;
  source: "youtube" | "soundcloud";
}

//  Commands

export const tauriCommands = {
  // Library
  scanFolder: (path: string): Promise<Song[]> =>
    handleInvoke("scan_folder", { path }),

  getSongs: (): Promise<Song[]> => handleInvoke("get_songs"),

  searchSongs: (query: string): Promise<Song[]> =>
    handleInvoke("search_songs", { query }),

  deleteSong: (songId: string): Promise<void> =>
    handleInvoke("delete_song", { songId }),

  getMetadata: (path: string): Promise<Partial<Song>> =>
    handleInvoke("get_metadata", { path }),

  // Updates
  downloadUpdate: (url: string, filename: string): Promise<string> =>
    handleInvoke("download_update", { url, filename }),

  runInstaller: (path: string): Promise<void> =>
    handleInvoke("run_installer", { path }),

  openFile: (path: string): Promise<void> =>
    handleInvoke("open_file", { path }),

  // Prefetch
  prefetchTrack: (song: Song): Promise<void> =>
    handleInvoke("prefetch_track", { song }),

  getPrefetchedUrl: (songId: string): Promise<string | null> =>
    handleInvoke("get_prefetched_url", { songId }),

  cancelPrefetch: (songIds: string[]): Promise<void> =>
    handleInvoke("cancel_prefetch", { songIds }),

  clearPrefetchCache: (): Promise<void> => handleInvoke("clear_prefetch_cache"),

  // Player
  playTrack: (song: Song): Promise<number> => {
    logger.logInfo(`Play track called: ${song.title} - ${song.artist}`, {
      songId: song.id,
      source: song.source,
      hasVideoId: !!song.videoId,
    });
    return handleInvoke("play_track", { song });
  },

  pausePlayback: (): Promise<void> => handleInvoke("pause_playback"),
  resumePlayback: (): Promise<void> => handleInvoke("resume_playback"),
  stopPlayback: (): Promise<void> => handleInvoke("stop_playback"),

  seekTo: (position: number): Promise<void> =>
    handleInvoke("seek_to", { position }),

  setVolume: (level: number): Promise<void> =>
    handleInvoke("set_volume", { level }),

  getVolume: (): Promise<number> => handleInvoke("get_volume"),

  getPlaybackState: (): Promise<{
    position: number;
    duration: number;
    is_playing: boolean;
  }> => handleInvoke("get_playback_state"),

  nextTrack: (): Promise<void> => handleInvoke("next_track"),
  previousTrack: (): Promise<void> => handleInvoke("prev_track"),

  getResumeState: (): Promise<{
    song: Song | null;
    position: number;
    is_playing: boolean;
  }> => handleInvoke("get_resume_state"),

  addToQueue: (song: Song): Promise<void> =>
    handleInvoke("add_to_queue", { song }),

  getQueue: (): Promise<Song[]> => handleInvoke("get_queue"),

  removeFromQueue: (songId: string): Promise<void> =>
    handleInvoke("remove_from_queue", { songId }),

  clearQueue: (): Promise<void> => handleInvoke("clear_queue"),

  setQueue: (queue: Song[]): Promise<void> =>
    handleInvoke("set_queue", { queue }),

  addToQueueAtPosition: (song: Song, position: number): Promise<void> =>
    handleInvoke("add_to_queue_at_position", { song, position }),

  // YouTube
  searchYoutube: (query: string): Promise<YtSong[]> =>
    handleInvoke("youtube_search", { query }),

  streamYoutube: (videoId: string): Promise<string> =>
    handleInvoke("stream_youtube", { videoId }),

  downloadYoutube: (videoId: string, title: string): Promise<string> =>
    handleInvoke("youtube_download", { videoId, title }),

  resolveYoutubeUrl: (videoId: string): Promise<string> =>
    handleInvoke("resolve_youtube_url", { videoId }),

  checkDownloadExists: (videoId: string): Promise<boolean> =>
    handleInvoke("check_download_exists", { videoId }),

  invalidateStreamUrl: (videoId: string): Promise<void> =>
    handleInvoke("invalidate_stream_url", { videoId }),

  // SoundCloud
  searchSoundcloud: (query: string): Promise<YtSong[]> =>
    handleInvoke("soundcloud_search", { query }),

  resolveSoundcloudUrl: (videoId: string): Promise<string> =>
    handleInvoke("resolve_soundcloud_url", { videoId }),

  streamSoundcloud: (videoId: string): Promise<string> =>
    handleInvoke("stream_soundcloud", { videoId }),

  downloadSoundcloud: (videoId: string, title: string): Promise<string> =>
    handleInvoke("soundcloud_download", { videoId, title }),

  checkSoundcloudDownloadExists: (videoId: string): Promise<boolean> =>
    handleInvoke("check_soundcloud_download_exists", { videoId }),

  // Artists
  saveArtist: (
    name: string,
    thumbnail: string | null,
    source: string,
  ): Promise<void> => handleInvoke("save_artist", { name, thumbnail, source }),

  removeArtist: (artistId: string): Promise<void> =>
    handleInvoke("remove_artist", { artistId }),

  getSavedArtists: (): Promise<any[]> => handleInvoke("get_saved_artists"),

  searchArtistForSave: (query: string): Promise<any[]> =>
    handleInvoke("search_artist_for_save", { query }),

  searchArtistsDeezer: (query: string): Promise<any[]> =>
    handleInvoke("search_artists_deezer", { query }),

  // Settings
  getSetting: (key: string): Promise<string | null> =>
    handleInvoke("get_setting", { key }),

  setSetting: (key: string, value: string): Promise<void> =>
    handleInvoke("set_setting", { key, value }),

  fetchListenbrainzStats: (user: string): Promise<string> =>
    handleInvoke("fetch_listenbrainz_stats", { user }),

  getAppVersion: (): Promise<string> => invoke("get_app_version"),

  getLocalIP: (): Promise<string> => handleInvoke("get_local_ip"),

  // Play history
  savePlayHistory: (params: {
    songId: string;
    title: string;
    artist: string;
    album: string;
    durationSecs: number;
    thumbnail: string;
    videoId?: string;
    source: string;
    path?: string;
  }): Promise<void> => handleInvoke("save_play_history", params),

  getRecentlyPlayed: (limit?: number): Promise<any[]> =>
    handleInvoke("get_recently_played", { limit }),

  getHeatmap: (): Promise<any[]> => handleInvoke("get_heatmap"),
  getWeeklyStats: (): Promise<any> => handleInvoke("get_weekly_stats"),
  getAllTimeStats: (): Promise<any> => handleInvoke("get_all_time_stats"),

  // Radio
  getPopularStations: (): Promise<any[]> =>
    handleInvoke("get_popular_stations"),

  searchRadioStations: (query: string): Promise<any[]> =>
    handleInvoke("search_radio_stations", { query }),

  getStationsByGenre: (genre: string): Promise<any[]> =>
    handleInvoke("get_stations_by_genre", { genre }),

  saveRadioStation: (station: any): Promise<void> =>
    handleInvoke("save_radio_station", { station }),

  getSavedStations: (): Promise<any[]> => handleInvoke("get_saved_stations"),

  removeRadioStation: (stationId: string): Promise<void> =>
    handleInvoke("remove_radio_station", { stationId }),

  toggleRecording: (url: string): Promise<string> =>
    handleInvoke("toggle_recording", { url }),

  isRecording: (): Promise<boolean> => handleInvoke("is_recording"),

  getRecordingName: (): Promise<string> => handleInvoke("get_recording_name"),

  // Logs
  getLogFilePath: (): Promise<string> => handleInvoke("get_log_file_path"),

  readLogs: (lines?: number): Promise<string> =>
    handleInvoke("read_logs", { lines }),

  // Liked songs
  getLikedSongs: (): Promise<string[]> => handleInvoke("get_liked_songs"),

  getLikedSongsFull: (): Promise<any[]> => handleInvoke("get_liked_songs_full"),

  toggleLike: (song: {
    trackId: string;
    title?: string;
    artist?: string;
    album?: string;
    durationSecs?: number;
    thumbnail?: string;
    videoId?: string | null;
    source?: string;
    path?: string;
  }): Promise<boolean> => handleInvoke("toggle_like", { input: song }),

  toggleLikeSoundcloud: (params: {
    trackId: string;
    title: string;
    artist: string;
    album: string;
    durationSecs: number;
    thumbnail: string;
    videoId?: string | null;
    path: string;
  }): Promise<boolean> => handleInvoke("toggle_like_soundcloud", params),

  saveLikedSong: (params: {
    id: string;
    title: string;
    artist: string;
    album: string;
    durationSecs: number;
    thumbnail: string;
    videoId?: string;
    source: string;
    path: string;
  }): Promise<void> => handleInvoke("save_liked_song", params),

  // Home page / charts
  getDeezerChart: (): Promise<any[]> => handleInvoke("get_deezer_chart"),

  getLastfmSimilarArtists: (artist: string, apiKey: string): Promise<any[]> =>
    handleInvoke("get_lastfm_similar_artists", { artist, apiKey }),

  getLastfmWeeklyChart: (user: string, apiKey: string): Promise<any[]> =>
    handleInvoke("get_lastfm_weekly_chart", { user, apiKey }),

  getDeezerGenreChart: (genre: string): Promise<any[]> =>
    handleInvoke("get_deezer_genre_chart", { genre }),

  getDeezerGenreArtists: (genre: string): Promise<any[]> =>
    handleInvoke("get_deezer_genre_artists", { genre }),

  // Playlists
  createPlaylist: (
    name: string,
    description?: string,
    emoji?: string,
    mood?: string,
    privacy?: string,
  ): Promise<string> =>
    handleInvoke("create_playlist", {
      name,
      description,
      emoji,
      mood,
      privacy,
    }),

  getPlaylists: (): Promise<any[]> => handleInvoke("get_playlists"),

  addToPlaylist: (
    playlistId: string,
    songId: string,
    title: string,
    artist: string,
    album: string,
    durationSecs: number,
    thumbnail: string,
    source: string,
    path: string,
    videoId?: string,
  ): Promise<void> =>
    handleInvoke("add_to_playlist", {
      playlistId,
      songId,
      title,
      artist,
      album,
      durationSecs,
      thumbnail,
      source,
      path,
      videoId,
    }),

  getPlaylistSongs: (playlistId: string): Promise<any[]> =>
    handleInvoke("get_playlist_songs", { playlistId }),

  removeFromPlaylist: (playlistId: string, songId: string): Promise<void> =>
    handleInvoke("remove_from_playlist", { playlistId, songId }),

  removePlaylist: (playlistId: string): Promise<void> =>
    handleInvoke("remove_playlist", { playlistId }),

  // Metadata
  searchDeezer: (query: string): Promise<any[]> =>
    handleInvoke("search_deezer", { query }),
  searchMusicbrainz: (query: string): Promise<any[]> =>
    handleInvoke("search_musicbrainz", { query }),
  searchMetadata: (query: string): Promise<any[]> =>
    handleInvoke("search_metadata", { query }),
  cleanTrackMetadata: (
    title: string,
    artist: string,
  ): Promise<{
    title: string;
    artist: string;
    album: string;
    duration_secs: number;
    artwork_url: string;
    genre: string;
  }> => handleInvoke("clean_track_metadata", { title, artist }),

  batchCleanMetadata: (tracks: any[]): Promise<any[]> =>
    handleInvoke("batch_clean_metadata", { tracks }),

  searchSuggestions: (query: string): Promise<any[]> =>
    handleInvoke("search_suggestions", { query }),

  searchAlbumsDeezer: (query: string): Promise<any[]> =>
    handleInvoke("search_albums_deezer", { query }),

  getAlbumTracksDeezer: (albumId: number): Promise<any[]> =>
    handleInvoke("get_album_tracks_deezer", { albumId }),

  // ListenBrainz
  scrobbleListenbrainz: (
    token: string,
    artistName: string,
    trackName: string,
    releaseName: string,
  ): Promise<void> =>
    handleInvoke("scrobble_listenbrainz", {
      token,
      artistName,
      trackName,
      releaseName,
    }),

  getListenbrainzRecent: (user: string, count: number): Promise<any[]> =>
    handleInvoke("get_listenbrainz_recent", { user, count }),

  getListenbrainzWeeklyStats: (user: string): Promise<any> =>
    handleInvoke("get_listenbrainz_weekly_stats", { user }),

  // Utilities
  checkYtdlp: (): Promise<string> => handleInvoke("check_ytdlp"),
};

//  Events

export const tauriEvents = {
  onPlaybackUpdate: (
    callback: (data: {
      position: number;
      duration: number;
      track_id: number;
      is_playing: boolean;
      buffered: number;
    }) => void,
  ): (() => void) => {
    const unlisten = listen<{
      position: number;
      duration: number;
      track_id: number;
      is_playing: boolean;
      buffered: number;
    }>("playback-update", (event) => callback(event.payload));
    let done = false;
    return () => {
      if (!done) {
        done = true;
        unlisten.then((fn) => fn());
      }
    };
  },

  onTrackEnded: (callback: () => void): (() => void) => {
    const unlisten = listen<boolean>("track-ended", () => callback());
    let done = false;
    return () => {
      if (!done) {
        done = true;
        unlisten.then((fn) => fn());
      }
    };
  },
};
