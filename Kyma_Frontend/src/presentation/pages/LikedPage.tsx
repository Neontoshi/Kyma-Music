import React, { useMemo, useState } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { Song } from "../../core/entities/Song";
import SongRow from "../components/Library/SongRow";
import { formatTotalDuration } from "../../lib/formatTime";

const LikedPage: React.FC = () => {
  const { songs } = useLibraryStore();
  const { currentSong, setCurrentSong, setProgress } = usePlayerStore();
  const { setQueue } = useQueueStore();
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState(0);
  const sortModes = ["Recently Added", "Title A–Z", "Artist A–Z", "Duration"];

  const likedSongs = useMemo(() => songs.filter((s) => s.liked), [songs]);

  const getSorted = () => {
    const list = [...likedSongs];
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

  const totalDuration = filtered.reduce(
    (acc, song) => acc + (song.duration || 0),
    0,
  );

  const handlePlay = (_song: Song, index: number) => {
    setQueue(filtered, filtered[index], "library");
    setCurrentSong(filtered[index]);
    setProgress(0);
  };

  const handlePlayAll = () => {
    if (filtered.length > 0) handlePlay(filtered[0], 0);
  };

  return (
    <div className="liked-page">
      <div className="liked-inner">
        <section className="liked-hero">
          <div className="liked-disc">
            <div className="liked-disc-label">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="34"
                height="34"
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          </div>

          <div className="liked-hero-copy">
            <div className="liked-eyebrow">Your collection</div>
            <h1>
              Liked <span>Songs</span>
            </h1>
            <p>Every track you love, collected in one place.</p>
            <div className="liked-stats">
              <span>
                <strong>{filtered.length}</strong> track
                {filtered.length === 1 ? "" : "s"}
              </span>
              <span className="liked-dot" />
              <span>
                <strong>{formatTotalDuration(totalDuration)}</strong>
              </span>
            </div>
            <div className="liked-hero-actions">
              <button
                type="button"
                className="liked-play"
                onClick={handlePlayAll}
                disabled={filtered.length === 0}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="13"
                  height="13"
                >
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Play all
              </button>
              <button
                type="button"
                className="liked-sort"
                onClick={() =>
                  setSortMode((sortMode + 1) % sortModes.length)
                }
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
            </div>
          </div>
        </section>

        <section className="artist-all-songs liked-list-panel">
          <div className="artist-section-head liked-list-head">
            <h2>All liked tracks</h2>
            <div className="liked-list-tools">
              <div className="ap-search-wrap liked-search">
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
                  placeholder="Filter songs…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <span>{filtered.length}</span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="liked-empty">
              <div className="liked-empty-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  width="26"
                  height="26"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <h3>{query ? "No songs found" : "No liked songs yet"}</h3>
              <p>
                {query
                  ? "Try a different title, artist, or album."
                  : "Tap the heart on any song to save it here."}
              </p>
            </div>
          ) : (
            <div className="liked-tracks">
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
        </section>
      </div>
    </div>
  );
};

export default LikedPage;
