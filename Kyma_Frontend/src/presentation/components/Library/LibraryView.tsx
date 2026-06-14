import React, { useState, useMemo, useRef, useEffect } from "react";
import SongRow from "./SongRow";
import { useLibrary } from "../../hooks/useLibrary";
import { usePlayerStore } from "../../stores/playerStore";
import { useUIStore } from "../../stores/uiStore";
import { Song } from "../../../core/entities/Song";
import { useQueueStore } from "../../stores/queueStore";
import { useLibraryStore } from "../../stores/libraryStore";
import fuzzysort from "fuzzysort";
import { logger } from "../../../services/logger";

const LibraryView: React.FC = () => {
  const { songs: localSongs, setActiveSort, loading } = useLibrary();
  const { searchQuery, setSearchQuery } = useUIStore();
  const { setSearchQuery: setLibSearchQuery } = useLibraryStore();
  const { setCurrentSong, setProgress, currentSong } = usePlayerStore();
  const { libraryView, setLibraryView } = useUIStore();
  const { setQueue } = useQueueStore();

  const [sortChip, setSortChip] = useState("#");
  const [lastSearchLength, setLastSearchLength] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const isFiltering = searchQuery.trim().length > 0;

  const displaySongs: Song[] = useMemo(() => {
    if (!searchQuery.trim()) return localSongs;
    const results = fuzzysort.go(searchQuery, localSongs, {
      keys: ["title", "artist", "album"],
      threshold: -10000,
      limit: 100,
    });
    return results.map((r) => r.obj);
  }, [localSongs, searchQuery]);

  // Log search when it changes (after displaySongs is calculated)
  useEffect(() => {
    setLibSearchQuery(searchQuery);

    // Log search when it changes (only log when meaningful)
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

  const handlePlaySong = (song: Song) => {
    logger.logUI("LibraryView", "play_song", {
      songId: song.id,
      title: song.title.slice(0, 50),
      artist: song.artist,
      fromFilter: isFiltering,
      searchQuery: isFiltering ? searchQuery.slice(0, 50) : undefined,
    });
    setQueue(displaySongs, song, "library");
    setCurrentSong(song);
    setProgress(0);
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
      <div className="song-list-pane">
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "var(--text3)",
          }}
        >
          Loading songs...
        </div>
      </div>
    );
  }

  if (localSongs.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
          gap: 8,
        }}
      >
        <div
          style={{
            color: "var(--text3)",
            fontFamily: "'DM Mono', monospace",
            fontSize: 13,
          }}
        >
          No songs in library
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Fixed Header */}
      <div
        style={{
          flexShrink: 0,
          padding: "1.5rem 2rem 1rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      >
        <div
          className="search-wrap"
          style={{ maxWidth: "100%", position: "relative" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="Search Library"
            value={searchQuery}
            onChange={handleSearchChange}
            autoComplete="off"
            spellCheck={false}
          />
          {searchQuery.length > 0 && (
            <button
              onClick={handleClearSearch}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text3)",
                fontSize: 14,
                lineHeight: 1,
                padding: "4px",
                borderRadius: "var(--radius-xs)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.1s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--text)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--text3)")
              }
              title="Clear"
            >
              ✕
            </button>
          )}
        </div>
        <div
          className="section-header"
          style={{ marginTop: "0.75rem", marginBottom: 0 }}
        >
          <div>
            <div className="section-title">Your Library</div>
            <div className="section-sub">
              {isFiltering
                ? `${displaySongs.length} results`
                : `${localSongs.length} songs`}
            </div>
          </div>
          <div className="view-toggle">
            <div
              className={`view-btn ${libraryView === "list" ? "active" : ""}`}
              onClick={() => handleViewChange("list")}
              title="List view"
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
            </div>
            <div
              className={`view-btn ${libraryView === "grid" ? "active" : ""}`}
              onClick={() => handleViewChange("grid")}
              title="Grid view"
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
            </div>
          </div>
        </div>
        <div
          className="sort-row"
          style={{
            marginBottom: 0,
            borderBottom: "none",
            paddingBottom: "0.5rem",
          }}
        >
          {["#", "Title", "Artist", "Album", "Duration", "Plays"].map(
            (chip) => (
              <div
                key={chip}
                className={`sort-chip ${sortChip === chip ? "active" : ""}`}
                onClick={() => handleSortChip(chip)}
              >
                {chip}
              </div>
            ),
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          padding: "0 2rem 6rem",
        }}
      >
        {displaySongs.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "var(--text3)",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {`No songs matching "${searchQuery}"`}
          </div>
        ) : (
          displaySongs.map((song, idx) => (
            <SongRow
              key={song.id}
              song={song}
              index={idx}
              isCurrent={currentSong?.id === song.id}
              onPlay={() => handlePlaySong(song)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default LibraryView;
