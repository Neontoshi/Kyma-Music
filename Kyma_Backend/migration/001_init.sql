-- Artists
CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    thumbnail TEXT,
    bio TEXT,
    source TEXT DEFAULT 'youtube', -- 'local' | 'youtube'
    fetched_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Albums
CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    artist_id TEXT,
    title TEXT NOT NULL,
    thumbnail TEXT,
    year INTEGER,
    genre TEXT,
    source TEXT DEFAULT 'youtube',
    fetched_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL
);

-- Tracks
CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    album_id TEXT,
    artist_id TEXT,
    title TEXT NOT NULL,
    duration_secs REAL DEFAULT 0,
    thumbnail TEXT,
    path TEXT,                      -- local file path
    video_id TEXT,                  -- YouTube video ID
    track_number INTEGER,
    disc_number INTEGER,
    genre TEXT,
    year INTEGER,
    lyrics TEXT,
    source TEXT DEFAULT 'youtube',  -- 'local' | 'youtube'
    play_count INTEGER DEFAULT 0,
    last_played_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL,
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL
);

-- Playlists
CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    thumbnail TEXT,
    emoji TEXT DEFAULT '🎵',
    mood TEXT,
    privacy TEXT DEFAULT 'private',
    is_smart INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    artist TEXT NOT NULL DEFAULT '',
    album TEXT DEFAULT '',
    duration_secs REAL DEFAULT 0,
    thumbnail TEXT DEFAULT '',
    video_id TEXT,
    source TEXT DEFAULT 'local',
    path TEXT DEFAULT '',
    position INTEGER NOT NULL,
    added_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);
-- Liked tracks
CREATE TABLE IF NOT EXISTS liked_tracks (
    track_id TEXT PRIMARY KEY,
    liked_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS liked_songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT DEFAULT '',
    duration_secs REAL DEFAULT 0,
    thumbnail TEXT DEFAULT '',
    video_id TEXT,
    source TEXT DEFAULT 'local',
    path TEXT DEFAULT ''
);

-- Saved/followed artists
CREATE TABLE IF NOT EXISTS saved_artists (
    artist_id TEXT PRIMARY KEY,
    saved_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);

-- Play history
CREATE TABLE IF NOT EXISTS play_history (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT DEFAULT '',
    duration_secs REAL DEFAULT 0,
    thumbnail TEXT DEFAULT '',
    video_id TEXT,
    source TEXT DEFAULT 'local',
    played_at INTEGER DEFAULT (unixepoch()),
    path TEXT DEFAULT '',
    duration_played REAL DEFAULT 0
);

-- Queue (persistent queue state)
CREATE TABLE IF NOT EXISTS queue (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    added_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- User settings/preferences
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_play_history_track ON play_history(track_id);
CREATE INDEX IF NOT EXISTS idx_play_history_played_at ON play_history(played_at);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_liked_tracks_track ON liked_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_liked_songs_id ON liked_songs(id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks(track_id);
