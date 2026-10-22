import React, { useState, useMemo, useRef, useEffect } from "react";
import SongRow from "./SongRow";
import { useLibrary } from "../../hooks/useLibrary";
import { usePlayerStore } from "../../stores/playerStore";
import { useUIStore } from "../../stores/uiStore";
import { Song } from "../../../core/entities/Song";
import { useQueueStore } from "../../stores/queueStore";
import { useLibraryStore } from "../../stores/libraryStore";
import { formatDuration, formatTotalDuration } from "../../../lib/formatTime";
import fuzzysort from "fuzzysort";
import { logger } from "../../../services/logger";

const SORT_CHIPS = ["#", "Title", "Artist", "Album", "Duration", "Plays"];

const LibraryView: React.FC = () => {
  const { songs: librarySongs, setActiveSort, loading } = useLibrary();
  const { searchQuery, setSearchQuery } = useUIStore();
  const { setSearchQuery: setLibSearchQuery } = useLibraryStore();
  const { setCurrentSong, setProgress, currentSong } = usePlayerStore();
  const { libraryView, setLibraryView } = useUIStore();
  const { setQueue } = useQueueStore();

  const [sortChip, setSortChip] = useState("#");
  const [lastSearchLength, setLastSearchLength] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const isFiltering = searchQuery.trim().length > 0;

  const localSongs = useMemo(
    () =>
      librarySongs.filter(
        (song) => !song.source || song.source === "local",
      ),
    [librarySongs],
  );

  const displaySongs: Song[] = useMemo(() => {
    if (!searchQuery.trim()) return localSongs;
    const results = fuzzysort.go(searchQuery, localSongs, {
      keys: ["title", "artist", "album"],
      threshold: -10000,
      limit: 100,
    });
    return results.map((r) => r.obj);
  }, [localSongs, searchQuery]);

  const albumCount = useMemo(() => {
    const set = new Set<string>();
    for (const song of localSongs) {
      if (song.album) set.add(song.album);
    }
    return set.size;
  }, [localSongs]);

  const totalDuration = useMemo(
    () => localSongs.reduce((acc, song) => acc + (song.duration || 0), 0),
    [localSongs],
  );

  useEffect(() => {
    setLibSearchQuery(searchQuery);

    const currentLength = searchQuery.length;
    if (currentLength >= 2 && currentLength !== lastSearchLength) {
      logger.logUI("LibraryView", "search", {
        query: searchQuery.slice(0, 100),
        resultCount: displaySongs.length,
        totalSongs: localSongs.length,
      });
    }
    setLastSearchLength(currentLength);
  }, [searchQuery, displaySongs.length, localSongs.length, lastSearchLength]);

  const playFrom = (song: Song, songs: Song[]) => {
    logger.logUI("LibraryView", "play_song", {
      songId: song.id,
      title: song.title.slice(0, 50),
      artist: song.artist,
      fromFilter: isFiltering,
      searchQuery: isFiltering ? searchQuery.slice(0, 50) : undefined,
    });
    setQueue(songs, song, "library");
    setCurrentSong(song);
    setProgress(0);
  };

  const handlePlayAll = () => {
    if (displaySongs.length > 0) playFrom(displaySongs[0], displaySongs);
  };

  const handleShuffle = () => {
    if (displaySongs.length === 0) return;
    const shuffled = [...displaySongs].sort(() => Math.random() - 0.5);
    logger.logUI("LibraryView", "shuffle", {
      songCount: shuffled.length,
    });
    const player = usePlayerStore.getState();
    if (!player.isShuffle) player.toggleShuffle();
    playFrom(shuffled[0], shuffled);
  };

  const handleSortChip = (chip: string) => {
    logger.logUI("LibraryView", "sort_change", { from: sortChip, to: chip });
    setSortChip(chip);
    if (chip === "#") setActiveSort("default");
    else if (chip === "Title") setActiveSort("title");
    else if (chip === "Artist") setActiveSort("artist");
    else if (chip === "Album") setActiveSort("album");
    else if (chip === "Duration") setActiveSort("duration");
    else if (chip === "Plays") setActiveSort("plays");
  };

  const handleViewChange = (view: "list" | "grid") => {
    logger.logUI("LibraryView", "view_change", { from: libraryView, to: view });
    setLibraryView(view);
  };

  const handleClearSearch = () => {
    logger.logUI("LibraryView", "clear_search", {
      previousQuery: searchQuery.slice(0, 100),
      hadResults: displaySongs.length > 0,
    });
    setSearchQuery("");
    inputRef.current?.focus();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  if (loading) {
    return (
      <div className="local-songs-page">
        <div className="local-songs-status">
          <div className="ap-spinner" />
          <span>Reading your local library…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="local-songs-page">
      <div className="local-songs-inner">
        <section className="local-songs-hero">
          <div className="local-songs-art">
            <div className="local-songs-disc">
              <div className="local-songs-disc-label">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="28"
                  height="28"
                  aria-hidden="true"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
            </div>
            <span className="local-songs-art-badge">On device</span>
          </div>

          <div className="local-songs-copy">
            <div className="local-songs-eyebrow">Your collection</div>
            <h1>
              Local <span>Songs</span>
            </h1>
            <p>Everything stored on this device, ready to play offline.</p>
            <div className="local-songs-stats">
              <span>
                <strong>{localSongs.length}</strong> track
                {localSongs.length === 1 ? "" : "s"}
              </span>
              <span className="local-songs-dot" />
              <span>
                <strong>{albumCount}</strong> album
                {albumCount === 1 ? "" : "s"}
              </span>
              <span className="local-songs-dot" />
              <span>
                <strong>{formatTotalDuration(totalDuration)}</strong>
              </span>
            </div>
            <div className="local-songs-actions">
              <button
                type="button"
                className="local-songs-play"
                onClick={handlePlayAll}
                disabled={displaySongs.length === 0}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="13"
                  height="13"
                  aria-hidden="true"
                >
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Play all
              </button>
              <button
                type="button"
                className="local-songs-shuffle"
                onClick={handleShuffle}
                disabled={displaySongs.length === 0}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
                Shuffle
              </button>
            </div>
          </div>
        </section>

        <section className="local-songs-panel">
          <div className="local-songs-head">
            <div className="local-songs-head-copy">
              <h2>All local tracks</h2>
              <span>
                {isFiltering
                  ? `${displaySongs.length} result${displaySongs.length === 1 ? "" : "s"}`
                  : "Sorted and ready to play"}
              </span>
            </div>

            <div className="local-songs-tools">
              <div className="local-songs-search">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="13"
                  height="13"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search local songs…"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  autoComplete="off"
                  spellCheck={false}
                />
                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    className="local-songs-search-clear"
                    onClick={handleClearSearch}
                    title="Clear"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="local-songs-view-toggle">
                <button
                  type="button"
                  className={`local-songs-view-btn ${
                    libraryView === "list" ? "active" : ""
                  }`}
                  onClick={() => handleViewChange("list")}
                  title="List view"
                  aria-label="List view"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`local-songs-view-btn ${
                    libraryView === "grid" ? "active" : ""
                  }`}
                  onClick={() => handleViewChange("grid")}
                  title="Grid view"
                  aria-label="Grid view"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="local-songs-sort-row">
            {SORT_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={`local-songs-chip ${
                  sortChip === chip ? "active" : ""
                }`}
                onClick={() => handleSortChip(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          {displaySongs.length === 0 ? (
            <div className="local-songs-empty">
              <div className="local-songs-empty-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  width="26"
                  height="26"
                  aria-hidden="true"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <h3>{isFiltering ? "No songs found" : "No local songs yet"}</h3>
              <p>
                {isFiltering
                  ? "Try a different title, artist, or album."
                  : "Add music to your Kyma library to see it here."}
              </p>
            </div>
          ) : libraryView === "grid" ? (
            <div className="local-songs-grid">
              {displaySongs.map((song, idx) => (
                <div
                  key={song.id}
                  className={`local-song-card ${
                    currentSong?.id === song.id ? "playing" : ""
                  }`}
                  onClick={() => playFrom(song, displaySongs)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      playFrom(song, displaySongs);
                    }
                  }}
                >
                  <div className="local-song-cover">
                    {song.artwork ? (
                      <img src={song.artwork} alt="" />
                    ) : song.source === "youtube" && song.videoId ? (
                      <img
                        src={`https://i.ytimg.com/vi/${song.videoId}/default.jpg`}
                        alt=""
                      />
                    ) : (
                      <span>{song.emoji || "🎵"}</span>
                    )}
                    <div className="local-song-cover-shade" />
                    <div className="local-song-cover-play">
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="16"
                        height="16"
                      >
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    </div>
                    {currentSong?.id === song.id && (
                      <div className="local-song-cover-active">
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                  </div>
                  <div className="local-song-meta">
                    <div className="local-song-title" title={song.title}>
                      {song.title}
                    </div>
                    <div className="local-song-artist" title={song.artist}>
                      {song.artist}
                    </div>
                    <div className="local-song-sub">
                      <span>{idx + 1}</span>
                      <span className="local-song-dot" />
                      <span>
                        {song.dur || formatDuration(song.duration || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="local-songs-list">
              <div className="local-songs-columns" aria-hidden="true">
                <span />
                <span />
                <span>Title</span>
                <span>Album</span>
                <span>Time</span>
                <span />
              </div>
              {displaySongs.map((song, idx) => (
                <SongRow
                  key={song.id}
                  song={song}
                  index={idx}
                  isCurrent={currentSong?.id === song.id}
                  onPlay={() => playFrom(song, displaySongs)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default LibraryView;
