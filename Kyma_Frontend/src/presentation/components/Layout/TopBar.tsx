import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserStore } from "../../stores/userStore";
import { useLibraryStore } from "../../stores/libraryStore";
import { usePlayerStore } from "../../stores/playerStore";
import { useQueueStore } from "../../stores/queueStore";
import { useYouTubeStore } from "../../stores/youtubeStore";
import { useSystemStore } from "../../stores/systemStore";
import { Song } from "../../../core/entities/Song";
import { logger } from "../../../services/logger";

const NAV_ITEMS = [
  { label: "Home", path: "/" },
  { label: "Browse", path: "/explore" },
  { label: "Radio", path: "/radio" },
  { label: "Lyrics", path: "/nowplaying" },
];

const formatDuration = (song: Song) => {
  if (song.dur) return song.dur;
  if (!song.duration) return "";
  const minutes = Math.floor(song.duration / 60);
  const seconds = Math.floor(song.duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const SongArtwork: React.FC<{ song: Song }> = ({ song }) => {
  const src =
    song.artwork ||
    (song.source === "youtube" && song.videoId
      ? `https://i.ytimg.com/vi/${song.videoId}/default.jpg`
      : null);

  return (
    <div className="topbar-result-art">
      {src ? (
        <img src={src} alt="" />
      ) : (
        <span
          style={{ background: song.grad || "linear-gradient(135deg, #222, #111)" }}
        >
          {song.emoji || "🎵"}
        </span>
      )}
    </div>
  );
};

const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { displayName, username } = useUserStore();
  const librarySongs = useLibraryStore((s) => s.songs);
  const ytResults = useYouTubeStore((s) => s.results);
  const ytSearching = useYouTubeStore((s) => s.isSearching);
  const ytLastQuery = useYouTubeStore((s) => s.lastQuery);
  const searchYouTube = useYouTubeStore((s) => s.search);
  const ytdlpAvailable = useSystemStore((s) => s.ytdlpAvailable);
  const { setCurrentSong, setProgress } = usePlayerStore();
  const { setQueue } = useQueueStore();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const term = query.trim();
  const normalizedTerm = term.toLowerCase();

  const name = displayName || "Kyma Listener";
  const initial = name.charAt(0).toUpperCase();

  const localMatches = useMemo(() => {
    if (!normalizedTerm) return [];
    return librarySongs
      .filter((song) => {
        const haystack =
          `${song.title} ${song.artist} ${song.album || ""}`.toLowerCase();
        return haystack.includes(normalizedTerm);
      })
      .slice(0, 4);
  }, [librarySongs, normalizedTerm]);

  const youtubeMatches = useMemo(() => {
    if (!normalizedTerm || !ytdlpAvailable) return [];
    if (ytLastQuery.toLowerCase() !== normalizedTerm) return [];
    return ytResults.slice(0, 6);
  }, [normalizedTerm, ytdlpAvailable, ytLastQuery, ytResults]);

  const combinedSongs = useMemo(() => {
    const seen = new Set<string>();
    return [...localMatches, ...youtubeMatches].filter((song) => {
      if (seen.has(song.id)) return false;
      seen.add(song.id);
      return true;
    });
  }, [localMatches, youtubeMatches]);

  const isSearching =
    term.length >= 2 &&
    ytdlpAvailable &&
    (ytSearching || ytLastQuery.toLowerCase() !== normalizedTerm);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (term.length < 2 || !ytdlpAvailable) return;
    const timer = window.setTimeout(() => {
      searchYouTube(term);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [term, ytdlpAvailable, searchYouTube]);

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  const openFullResults = () => {
    if (!term) return;
    logger.logUI("TopBar", "search_submit", { query: term.slice(0, 50) });
    navigate("/search", { state: { query: term } });
    setIsOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    openFullResults();
  };

  const playSong = (song: Song) => {
    if (!combinedSongs.length) return;
    logger.logUI("TopBar", "search_play_song", {
      songId: song.id,
      title: song.title.slice(0, 50),
      artist: song.artist,
      source: song.source,
    });
    setQueue(combinedSongs, song, "search");
    setCurrentSong(song);
    setProgress(0);
    setIsOpen(false);
    inputRef.current?.blur();
    navigate("/nowplaying");
  };

  const showDropdown = isOpen && term.length > 0;
  const showEmpty =
    showDropdown && !isSearching && combinedSongs.length === 0;

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <div className="topbar-history">
          <button
            className="topbar-history-btn"
            aria-label="Go back"
            onClick={() => navigate(-1)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            className="topbar-history-btn"
            aria-label="Go forward"
            onClick={() => navigate(1)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <nav className="topbar-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              className={`topbar-nav-link ${isActive(item.path) ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="topbar-search-wrap" ref={searchRef}>
        <form className="topbar-search" onSubmit={submitSearch}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsOpen(false);
                inputRef.current?.blur();
              }
            }}
            placeholder="Search songs, artists, albums…"
            aria-label="Search"
            autoComplete="off"
          />
          {query.length > 0 ? (
            <button
              type="button"
              className="topbar-search-clear"
              onClick={() => {
                setQuery("");
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          ) : (
            <kbd className="topbar-search-hint">⌘K</kbd>
          )}
        </form>

        {showDropdown && (
          <div className="topbar-search-pop" role="listbox">
            {isSearching && (
              <div className="topbar-search-status">
                <span className="ap-spinner ap-spinner--sm" />
                Searching the web…
              </div>
            )}

            {localMatches.length > 0 && (
              <div className="topbar-result-group">
                <div className="topbar-result-label">In your library</div>
                {localMatches.map((song) => (
                  <button
                    key={song.id}
                    className="topbar-result"
                    onClick={() => playSong(song)}
                  >
                    <SongArtwork song={song} />
                    <span className="topbar-result-copy">
                      <span className="topbar-result-title">{song.title}</span>
                      <span className="topbar-result-meta">
                        {song.artist}
                        {song.album ? ` · ${song.album}` : ""}
                      </span>
                    </span>
                    <span className="topbar-result-duration">
                      {formatDuration(song)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {youtubeMatches.length > 0 && (
              <div className="topbar-result-group">
                <div className="topbar-result-label">
                  From YouTube
                  {ytSearching && <span className="topbar-result-live" />}
                </div>
                {youtubeMatches.map((song) => (
                  <button
                    key={song.id}
                    className="topbar-result"
                    onClick={() => playSong(song)}
                  >
                    <SongArtwork song={song} />
                    <span className="topbar-result-copy">
                      <span className="topbar-result-title">{song.title}</span>
                      <span className="topbar-result-meta">
                        {song.artist} · YouTube
                      </span>
                    </span>
                    <span className="topbar-result-duration">
                      {formatDuration(song)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {showEmpty && (
              <div className="topbar-search-empty">
                <span>No songs found for "{term}"</span>
                <small>Try the full search for more results.</small>
              </div>
            )}

            {term.length >= 2 && (
              <button
                className="topbar-search-all"
                onClick={openFullResults}
              >
                See all results for "{term}"
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <button
        className="topbar-profile"
        onClick={() => navigate("/settings")}
        title="Settings"
      >
        <div className="topbar-profile-text">
          <div className="topbar-profile-name">{name}</div>
          <div className="topbar-profile-sub">
            {username ? `@${username}` : "Local Library"}
          </div>
        </div>
        <div className="topbar-avatar">{initial}</div>
      </button>
    </header>
  );
};

export default TopBar;
