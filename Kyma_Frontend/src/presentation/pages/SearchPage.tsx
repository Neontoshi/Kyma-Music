import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { useYouTubeStore } from "../stores/youtubeStore";
import { useSystemStore } from "../stores/systemStore";
import { useLibraryStore } from "../stores/libraryStore";
import { Song } from "../../core/entities/Song";
import { tauriCommands } from "../../services/tauriBridge";
import SongRow from "../components/Library/SongRow";
import { makeSong } from "../../lib/song";
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
  const location = useLocation();
  const navigate = useNavigate();
  const incomingQuery = (location.state as { query?: string } | null)?.query;
  const [query, setQuery] = useState(incomingQuery || "");
  const [activeTab, setActiveTab] = useState<SearchTab>("youtube");
  const [scSongs, setScSongs] = useState<Song[]>([]);
  const [isScSearching, setIsScSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchStartTime = useRef<number>(0);

  useEffect(() => {
    if (incomingQuery) setQuery(incomingQuery);
  }, [incomingQuery]);

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
      setIsScSearching(false);
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
            (results || []).map((r: any) =>
              makeSong({
                id: `sc-${r.id}`,
                title: r.title,
                artist: r.artist,
                album: "SoundCloud",
                duration: r.duration_secs,
                artwork: r.thumbnail,
                source: "soundcloud",
                videoId: r.id,
                dur: r.duration_str,
                emoji: randomEmoji(),
              }),
            ),
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
    navigate("/nowplaying");
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

  const exampleQueries = [
    "Daft Punk",
    "Lo-fi beats",
    "Bohemian Rhapsody",
    "Frank Ocean",
    "Tame Impala",
  ];

  const tryExample = (value: string) => {
    setQuery(value);
    setShowDropdown(false);
    addToHistory(value);
    savedQueryRef.current = value;
  };

  return (
    <div className="search-page">
      <div className="search-page-ambient" aria-hidden="true" />
      <div className="search-page-inner">
        <section className="search-hero">
          <div className="search-hero-copy">
            <span className="search-eyebrow">Discover</span>
            <h1>
              Search the <span>soundscape</span>
            </h1>
            <p>
              Pull tracks from YouTube and SoundCloud, preview the list, then
              dive straight into the full song view.
            </p>
          </div>
          <div className="search-hero-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </section>

        {!ytdlpAvailable && (
          <div className="search-warning">
            <span className="search-warning-icon">⚠</span>
            <div>
              <strong>Streaming search is unavailable</strong>
              <small>Install yt-dlp to search YouTube and SoundCloud. Run: pip install yt-dlp</small>
            </div>
          </div>
        )}

        <div ref={searchWrapRef} className="search-box-wrap">
          <div className="search-box">
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
              className="search-box-input"
              type="text"
              placeholder="Search YouTube or SoundCloud…"
              value={query}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            {query.length > 0 ? (
              <button
                className="search-box-clear"
                onClick={handleClearSearch}
                title="Clear"
                type="button"
              >
                ✕
              </button>
            ) : (
              <span className="search-box-hint">Enter to browse</span>
            )}
          </div>

          <SearchHistory
            history={history}
            onSelect={handleDropdownSelect}
            onRemove={removeFromHistory}
            onClear={clearHistory}
            visible={showHistory}
            currentQuery={query}
          />

          <SearchSuggestions
            query={query}
            onSelect={handleDropdownSelect}
            visible={showSuggestions}
          />
        </div>

        {hasQuery ? (
          <>
            <div className="search-controls">
              <div className="search-tabs" role="tablist">
                <button
                  className={`search-tab ${activeTab === "youtube" ? "active" : ""}`}
                  onClick={() => handleTabChange("youtube")}
                  role="tab"
                  aria-selected={activeTab === "youtube"}
                >
                  YouTube
                  {ytSongs.length > 0 && (
                    <span className="search-tab-count">{ytSongs.length}</span>
                  )}
                  {ytSearching && !ytSongs.length && (
                    <span className="search-tab-loading" />
                  )}
                </button>
                <button
                  className={`search-tab ${activeTab === "soundcloud" ? "active" : ""}`}
                  onClick={() => {
                    if (!ytdlpAvailable) return;
                    handleTabChange("soundcloud");
                  }}
                  disabled={!ytdlpAvailable}
                  role="tab"
                  aria-selected={activeTab === "soundcloud"}
                >
                  SoundCloud
                  {scSongs.length > 0 && (
                    <span className="search-tab-count">{scSongs.length}</span>
                  )}
                  {isScSearching && !scSongs.length && (
                    <span className="search-tab-loading" />
                  )}
                </button>
              </div>

              <div className="search-result-meta">
                <span>
                  {isLoading
                    ? "Searching…"
                    : `${displaySongs.length} result${displaySongs.length !== 1 ? "s" : ""}`}
                </span>
                {displaySongs.length > 0 && (
                  <button className="search-play-all" onClick={playAll}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                    Play all
                  </button>
                )}
              </div>
            </div>

            <section className="search-results-panel">
              <div className="search-list-head" aria-hidden="true">
                <span>#</span>
                <span />
                <span>Track</span>
                <span>Album</span>
                <span>Time</span>
                <span />
              </div>

              {isLoading && displaySongs.length === 0 && (
                <div className="search-skeletons">
                  {[0, 1, 2, 3, 4].map((row) => (
                    <div className="search-skeleton" key={row}>
                      <span className="search-skeleton-art" />
                      <span className="search-skeleton-lines">
                        <span />
                        <span />
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {displaySongs.map((song, idx) => (
                <SongRow
                  key={song.id}
                  song={song}
                  index={idx}
                  isCurrent={currentSong?.id === song.id}
                  onPlay={() => handlePlaySong(song)}
                />
              ))}

              {hasQuery &&
                !isLoading &&
                displaySongs.length === 0 &&
                !ytSearching &&
                !isScSearching && (
                  <div className="search-empty">
                    <div className="search-empty-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <line x1="20" y1="20" x2="16" y2="16" />
                      </svg>
                    </div>
                    <h3>No results for "{query}"</h3>
                    <p>
                      Nothing matched on{" "}
                      {activeTab === "youtube" ? "YouTube" : "SoundCloud"}. Try
                      a different spelling or switch tabs.
                    </p>
                  </div>
                )}
            </section>
          </>
        ) : (
          <section className="search-idle">
            <div className="search-idle-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <h2>What do you want to hear?</h2>
            <p>Start with an artist, track, or mood — then pick a result.</p>
            <div className="search-examples">
              {exampleQueries.map((example) => (
                <button key={example} onClick={() => tryExample(example)}>
                  {example}
                </button>
              ))}
            </div>
            <div className="search-idle-tips">
              <span>YouTube & SoundCloud results</span>
              <span>Click a track to open the song view</span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
