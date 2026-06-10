import React, { useMemo, useState } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { Song } from "../../core/entities/Song";
import SongRow from "../components/Library/SongRow";

const formatTotalDuration = (songs: Song[]) => {
  const total = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
};

const LikedPage: React.FC = () => {
  const { songs } = useLibraryStore();
  const { currentSong, setCurrentSong, setProgress } = usePlayerStore();
  const { setQueue } = useQueueStore();
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState(0);
  const sortModes = ["Recently Added", "Title A–Z", "Artist A–Z", "Duration"];

  const likedSongs = useMemo(() => songs.filter((s) => s.liked), [songs]);

  const getSorted = () => {
    let list = [...likedSongs];
    if (sortMode === 1) list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortMode === 2)
      list.sort((a, b) => a.artist.localeCompare(b.artist));
    else if (sortMode === 3)
      list.sort((a, b) => (a.duration || 0) - (b.duration || 0));
    return list;
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return getSorted().filter(
      (s) =>
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.album || "").toLowerCase().includes(q),
    );
  }, [likedSongs, query, sortMode]);

  //@ts-ignore
  const handlePlay = (song: Song, index: number) => {
    setQueue(filtered, filtered[index], "library");
    setCurrentSong(filtered[index]);
    setProgress(0);
  };

  const handlePlayAll = () => {
    if (filtered.length > 0) handlePlay(filtered[0], 0);
  };

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
          padding: "1.5rem 2rem 1.25rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              className="ap-page-eyebrow"
              style={{ color: "var(--accent2)" }}
            >
              Your Collection
            </div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1,
                margin: 0,
              }}
            >
              Liked{" "}
              <span style={{ color: "var(--accent2)", fontStyle: "italic" }}>
                Songs
              </span>
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "var(--accent2)",
                  lineHeight: 1,
                }}
              >
                {filtered.length}
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 9,
                  color: "var(--text3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                tracks
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--text2)",
                  lineHeight: 1,
                }}
              >
                {formatTotalDuration(filtered)}
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 9,
                  color: "var(--text3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                duration
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: "1rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handlePlayAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 22px",
              background:
                "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none",
              borderRadius: 99,
              color: "#fff",
              fontFamily: "'Syne',sans-serif",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            Play All
          </button>
          <button
            onClick={() => setSortMode((sortMode + 1) % sortModes.length)}
            style={{
              padding: "9px 18px",
              borderRadius: 99,
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text2)",
              fontFamily: "'Syne',sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            {sortModes[sortMode]}
          </button>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "0 12px",
              height: 36,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="var(--text3)"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Filter..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text)",
                fontFamily: "'DM Mono',monospace",
                fontSize: 11,
                outline: "none",
                width: 140,
              }}
            />
          </div>
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
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(192,132,252,0.08)",
                border: "1px solid rgba(192,132,252,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              ♡
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
              {query ? "Nothing found" : "No liked songs yet"}
            </div>
            <div
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 11,
                color: "var(--text3)",
              }}
            >
              {query
                ? "No songs match your search"
                : "Click the heart on any song"}
            </div>
          </div>
        ) : (
          <div>
            {filtered.map((song, idx) => (
              <SongRow
                key={song.id}
                song={song}
                index={idx}
                isCurrent={currentSong?.id === song.id}
                onPlay={() => handlePlay(song, idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LikedPage;
