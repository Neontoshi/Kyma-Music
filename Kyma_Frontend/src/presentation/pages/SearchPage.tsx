import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { useYouTubeStore } from "../stores/youtubeStore";
import { useSystemStore } from "../stores/systemStore";
import { useLibraryStore } from "../stores/libraryStore";
import { Song } from "../../core/entities/Song";
import { tauriCommands } from "../../services/tauriBridge";
import SongRow from "../components/Library/SongRow";
import SearchSuggestions from "../components/Library/SearchSuggestions";
import SearchHistory from "../components/Library/SearchHistory";
import { logger } from "../../services/logger";

type SearchTab = "youtube" | "soundcloud";

const STORAGE_KEY = "kyma_search_history";
const MAX_HISTORY = 20;

const MUSIC_EMOJIS = [
  "🎵",
  "🎶",
  "🎧",
  "🎼",
  "🎹",
  "🎸",
  "🎤",
  "🥁",
  "🎺",
  "🎷",
];
const randomEmoji = () =>
  MUSIC_EMOJIS[Math.floor(Math.random() * MUSIC_EMOJIS.length)];

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("youtube");
  const [scSongs, setScSongs] = useState<Song[]>([]);
  const [isScSearching, setIsScSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchStartTime = useRef<number>(0);

  //  Search history state (lifted here so we control when to save)
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const searchWrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Track the last query we saved so we don't double-save
  const savedQueryRef = useRef<string>("");

  const { setCurrentSong, setProgress } = usePlayerStore();
  const { setQueue } = useQueueStore();
  const {
    results: ytSongs,
    isSearching: ytSearching,
    search: searchYouTube,
    clearResults: clearYtResults,
  } = useYouTubeStore();
  const { ytdlpAvailable } = useSystemStore();
  const currentSong = usePlayerStore((s) => s.currentSong);

  //  History helpers
  const addToHistory = useCallback((q: string) => {
    if (!q.trim()) return;
    setHistory((prev) => {
      const next = [q, ...prev.filter((h) => h !== q)].slice(0, MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromHistory = useCallback((q: string, e: React.MouseEvent) => {
    e.stopPropagation();
    logger.logUI("SearchPage", "remove_history_item", { query: q });
    setHistory((prev) => {
      const next = prev.filter((h) => h !== q);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    logger.logUI("SearchPage", "clear_history", {
      historyCount: history.length,
    });
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, [history.length]);

  //  Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  //  YouTube search (debounced)
  useEffect(() => {
    if (!query.trim()) {
      clearYtResults();
      return;
    }
    if (!ytdlpAvailable) return;
    clearYtResults();
    const timer = setTimeout(() => {
      searchStartTime.current = Date.now();
      searchYouTube(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, ytdlpAvailable]);

  //  SoundCloud search (debounced)
  useEffect(() => {
    if (!query.trim()) {
      setScSongs([]);
      return;
    }
    if (!ytdlpAvailable) return;
    setScSongs([]);
    const timer = setTimeout(() => {
      searchStartTime.current = Date.now();
      setIsScSearching(true);
      tauriCommands
        .searchSoundcloud(query)
        .then((results: any[]) => {
          const searchTime = Date.now() - searchStartTime.current;
          logger.logUI("SearchPage", "soundcloud_search_complete", {
            query: query.slice(0, 50),
            resultCount: results?.length || 0,
            searchTimeMs: searchTime,
          });
          setScSongs(
            (results || []).map((r: any) => ({
              id: `sc-${r.id}`,
              path: "",
              title: r.title,
              artist: r.artist,
              album: "SoundCloud",
              duration: r.duration_secs,
              genre: null,
              year: null,
              track_number: null,
              artwork: r.thumbnail,
              source: "soundcloud" as const,
              videoId: r.id,
              dur: r.duration_str,
              emoji: randomEmoji(),
              grad: "linear-gradient(135deg, var(--accent), var(--accent2))",
              bpm: 0,
              key: "—",
              plays: 0,
              liked: false,
            })),
          );
          setIsScSearching(false);
        })
        .catch((err) => {
          logger.logError("SearchPage soundcloud_search_failed", {
            query: query.slice(0, 50),
            error: err,
          });
          setIsScSearching(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, ytdlpAvailable]);

  const displaySongs: Song[] = useMemo(() => {
    const librarySongs = useLibraryStore.getState().songs;
    const likedIds = new Set(
      librarySongs.filter((s) => s.liked).map((s) => s.id),
    );
    if (activeTab === "youtube")
      return ytSongs.map((s) => ({ ...s, liked: likedIds.has(s.id) }));
    return scSongs.map((s) => ({ ...s, liked: likedIds.has(s.id) }));
  }, [ytSongs, scSongs, activeTab]);

  const handleSearchInput = (value: string) => {
    setQuery(value);
    setShowDropdown(true);
  };

  const handleDropdownSelect = (value: string) => {
    if (value !== query) {
      logger.logUI("SearchPage", "history_select", { from: query, to: value });
    }
    setQuery(value);
    setShowDropdown(false);
    inputRef.current?.blur();
    if (value.trim().length >= 2) {
      addToHistory(value.trim());
      savedQueryRef.current = value.trim();
    }
  };

  const handleTabChange = (tab: SearchTab) => {
    if (tab === activeTab) return;
    logger.logUI("SearchPage", "tab_change", { from: activeTab, to: tab });
    setActiveTab(tab);
  };

  const handleClearSearch = () => {
    const hadQuery = query.length > 0;
    if (hadQuery) {
      logger.logUI("SearchPage", "clear_search", { query: query.slice(0, 50) });
    }
    setQuery("");
    clearYtResults();
    setScSongs([]);
    savedQueryRef.current = "";
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handlePlaySong = (song: Song) => {
    if (query.trim().length >= 2 && query.trim() !== savedQueryRef.current) {
      addToHistory(query.trim());
      savedQueryRef.current = query.trim();
    }
    logger.logUI("SearchPage", "play_song", {
      songId: song.id,
      title: song.title.slice(0, 50),
      artist: song.artist,
      source: activeTab,
      query: query.slice(0, 50),
    });
    const allSongs = activeTab === "youtube" ? ytSongs : scSongs;
    setQueue(allSongs, song, "search");
    setCurrentSong(song);
    setProgress(0);
  };

  const playAll = () => {
    if (displaySongs.length === 0) return;
    logger.logUI("SearchPage", "play_all", {
      tab: activeTab,
      songCount: displaySongs.length,
      query: query.slice(0, 50),
    });
    setQueue(displaySongs, displaySongs[0], "search");
    setCurrentSong(displaySongs[0]);
    setProgress(0);
  };

  const isLoading = activeTab === "youtube" ? ytSearching : isScSearching;
  const hasQuery = query.trim().length > 0;
  // Show history when focused + empty query; suggestions when focused + typing
  const showHistory = showDropdown && !hasQuery && history.length > 0;
  const showSuggestions = showDropdown && hasQuery;

  return (
    <div
      className="song-list-pane"
      style={{
        overflow: "visible",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/*  Sticky block  */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--bg)",
          flexShrink: 0,
          borderBottom: "1px solid var(--border)",
          paddingBottom: "8px",
        }}
      >
        {!ytdlpAvailable && (
          <div
            style={{
              padding: "8px 16px",
              marginBottom: 10,
              borderRadius: "var(--radius-md)",
              background: "rgba(255,170,50,0.08)",
              border: "1px solid rgba(255,170,50,0.2)",
              color: "#ffaa33",
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>⚠️</span> yt-dlp not installed. Streaming search unavailable.
            Run: pip install yt-dlp
          </div>
        )}

        {/* Search input + dropdown */}
        <div
          ref={searchWrapRef}
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
            placeholder="Search YouTube or SoundCloud…"
            value={query}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          {query.length > 0 && (
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

          {/* History dropdown — shown when focused with no query */}
          <SearchHistory
            history={history}
            onSelect={handleDropdownSelect}
            onRemove={removeFromHistory}
            onClear={clearHistory}
            visible={showHistory}
            currentQuery={query}
          />

          {/* Suggestions dropdown — shown when focused with query */}
          <SearchSuggestions
            query={query}
            onSelect={handleDropdownSelect}
            visible={showSuggestions}
          />
        </div>

        {/* Title + result count + Play All */}
        <div
          className="section-header"
          style={{ marginTop: "8px", marginBottom: 0, paddingBottom: 0 }}
        >
          <div>
            <div className="section-title">Search Music</div>
            <div className="section-sub">
              {hasQuery
                ? isLoading
                  ? "Searching…"
                  : `${displaySongs.length} result${displaySongs.length !== 1 ? "s" : ""}`
                : "YouTube · SoundCloud"}
            </div>
          </div>
          {hasQuery && displaySongs.length > 0 && (
            <button
              onClick={playAll}
              style={{
                fontSize: "12px",
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                fontFamily: "'Syne', sans-serif",
                fontWeight: 600,
              }}
            >
              Play All
            </button>
          )}
        </div>
      </div>

      {/*  Scrollable results  */}
      <div style={{ overflowY: "auto", flex: 1, paddingTop: "8px" }}>
        {/* Tabs */}
        {hasQuery && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "8px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <button
              onClick={() => handleTabChange("youtube")}
              style={{
                padding: "6px 24px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === "youtube"
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                color: activeTab === "youtube" ? "var(--text)" : "var(--text3)",
                cursor: ytdlpAvailable ? "pointer" : "not-allowed",
                fontFamily: "'Syne', sans-serif",
                fontSize: "13px",
                fontWeight: activeTab === "youtube" ? 600 : 400,
                opacity: ytdlpAvailable ? 1 : 0.5,
              }}
            >
              YouTube{ytSongs.length > 0 ? ` (${ytSongs.length})` : ""}
              {ytSearching && !ytSongs.length && " ···"}
            </button>
            <button
              onClick={() => {
                if (!ytdlpAvailable) return;
                handleTabChange("soundcloud");
              }}
              style={{
                padding: "6px 24px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === "soundcloud"
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                color:
                  activeTab === "soundcloud" ? "var(--text)" : "var(--text3)",
                cursor: ytdlpAvailable ? "pointer" : "not-allowed",
                fontFamily: "'Syne', sans-serif",
                fontSize: "13px",
                fontWeight: activeTab === "soundcloud" ? 600 : 400,
                opacity: ytdlpAvailable ? 1 : 0.5,
              }}
            >
              SoundCloud{scSongs.length > 0 ? ` (${scSongs.length})` : ""}
              {isScSearching && !scSongs.length && " ···"}
            </button>
          </div>
        )}

        {/* Spinner */}
        {hasQuery && isLoading && displaySongs.length === 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "40px 0",
            }}
          >
            <div className="ap-spinner ap-spinner--sm" />
          </div>
        )}

        {/* Results */}
        {displaySongs.map((song, idx) => (
          <SongRow
            key={song.id}
            song={song}
            index={idx}
            isCurrent={currentSong?.id === song.id}
            onPlay={() => handlePlaySong(song)}
          />
        ))}

        {/* No results */}
        {hasQuery &&
          !isLoading &&
          displaySongs.length === 0 &&
          !ytSearching &&
          !isScSearching && (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--text3)",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              No results for "{query}" on{" "}
              {activeTab === "youtube" ? "YouTube" : "SoundCloud"}
            </div>
          )}

        {/* Empty state */}
        {!hasQuery && (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "var(--text3)",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Try "Bohemian Rhapsody", "Daft Punk", or "Lo-fi beats"
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
