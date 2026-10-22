// Kyma_Frontend/src/presentation/pages/AlbumsPage.tsx
import { useLocation } from "react-router-dom";
import React, { useState, useRef, useEffect } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";
import SongRow from "../components/Library/SongRow";
import { logger } from "../../services/logger";
import { formatDuration } from "../../lib/formatTime";
import { albumGradient } from "../../lib/gradients";
import { makeSong } from "../../lib/song";

const CACHE_KEY = (albumId: string | number) => `kyma_album_${albumId}`;
const RECENTLY_VIEWED_KEY = "kyma_recently_viewed_albums";
const MAX_RECENT = 12;
const ALBUMS_PER_PAGE = 25;

function loadCachedVideoIds(albumId: string | number): Record<string, string> {
  try {
    const raw = localStorage.getItem(CACHE_KEY(albumId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCachedVideoIds(
  albumId: string | number,
  map: Record<string, string>,
) {
  try {
    localStorage.setItem(CACHE_KEY(albumId), JSON.stringify(map));
  } catch {}
}

function loadRecentlyViewed(): any[] {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentlyViewed(albums: any[]) {
  try {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(albums));
  } catch {}
}

function addToRecentlyViewed(album: any) {
  const recent = loadRecentlyViewed();
  const filtered = recent.filter((a: any) => a.id !== album.id);
  filtered.unshift({
    id: album.id,
    title: album.title,
    artist: album.artist,
    cover_url: album.cover_url,
    track_count: album.track_count,
  });
  if (filtered.length > MAX_RECENT) {
    filtered.length = MAX_RECENT;
  }
  saveRecentlyViewed(filtered);
}

const buildCleanTitle = (title: string): string => {
  const stripped = title
    .replace(/\s*\(live[^)]*\)/gi, "")
    .replace(/\s*\[live[^]*\]/gi, "")
    .replace(/\s*\(in concert[^)]*\)/gi, "")
    .replace(/\s*\(at [^)]*\)/gi, "")
    .replace(/\s*\(recorded[^)]*\)/gi, "")
    .trim();
  return stripped.length >= 2 ? stripped : title;
};

const SEARCH_QUERIES = [
  (artist: string, title: string) => `${artist} - ${title} official audio`,
  (artist: string, title: string) => `${artist} - ${title}`,
  (artist: string, title: string) => `${artist} ${title} audio`,
  (artist: string, title: string) => `${artist} ${title}`,
  (artist: string, title: string) => `${artist} - ${title} vevo`,
];

const QUERY_CONCURRENCY = 3; // Run 3 search queries at once per track

// Shared YouTube search cache across all tracks in the same album
const searchPool: Map<string, any[]> = new Map();

const resolveTrack = async (
  artist: string,
  title: string,
  expectedDuration: number,
): Promise<{ videoId: string; duration_secs: number } | null> => {
  const cleanTitle = buildCleanTitle(title);
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  // Check shared pool first
  for (const [, results] of searchPool) {
    const match = findMatchInResults(
      results,
      artist,
      cleanTitle,
      expectedDuration,
      normalize,
    );
    if (match) return match;
  }

  // Generate all queries
  const queries = SEARCH_QUERIES.map((fn) => fn(artist, cleanTitle));

  // Run queries in parallel batches
  const allResults: any[] = [];
  for (let i = 0; i < queries.length; i += QUERY_CONCURRENCY) {
    const batch = queries.slice(i, i + QUERY_CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map(async (q) => {
        // Check pool again before searching
        const cacheKey = q.toLowerCase();
        for (const [, cached] of searchPool) {
          const match = findMatchInResults(
            cached,
            artist,
            cleanTitle,
            expectedDuration,
            normalize,
          );
          if (match) return cached; // Return full results so we don't double-search
        }

        try {
          const results = await tauriCommands.searchYoutube(q, 20);
          searchPool.set(cacheKey, results || []);
          return results || [];
        } catch {
          return [];
        }
      }),
    );

    for (const results of batchResults) {
      allResults.push(...results);
    }

    // Check if we found a match in this batch
    const match = findMatchInResults(
      allResults,
      artist,
      cleanTitle,
      expectedDuration,
      normalize,
    );
    if (match) return match;
  }

  return null;
};

function findMatchInResults(
  results: any[],
  artist: string,
  cleanTitle: string,
  expectedDuration: number,
  normalize: (s: string) => string,
): { videoId: string; duration_secs: number } | null {
  if (!results?.length) return null;

  // Exact match: title + artist + duration
  let match = results.find((r: any) => {
    const titleMatch =
      normalize(r.title).includes(normalize(cleanTitle)) ||
      normalize(cleanTitle).includes(normalize(r.title));
    const artistMatch =
      normalize(r.artist).includes(normalize(artist)) ||
      normalize(artist).includes(normalize(r.artist));
    const durationMatch =
      !expectedDuration ||
      !r.duration_secs ||
      Math.abs(r.duration_secs - expectedDuration) < expectedDuration * 0.15;
    return titleMatch && artistMatch && durationMatch;
  });

  // Fallback: title + artist
  if (!match) {
    match = results.find((r: any) => {
      const titleMatch =
        normalize(r.title).includes(normalize(cleanTitle)) ||
        normalize(cleanTitle).includes(normalize(r.title));
      const artistMatch =
        normalize(r.artist).includes(normalize(artist)) ||
        normalize(artist).includes(normalize(r.artist));
      return titleMatch && artistMatch;
    });
  }

  // Final fallback: title only
  if (!match) {
    match = results.find((r: any) =>
      normalize(r.title).includes(normalize(cleanTitle)),
    );
  }

  if (match) {
    return {
      videoId: match.id,
      duration_secs: match.duration_secs || expectedDuration,
    };
  }

  return null;
}

const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: "var(--accent2)", fontWeight: 700 }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
};

const AlbumsPage: React.FC = () => {
  const { currentSong } = usePlayerStore();
  const { setQueue } = useQueueStore();
  const location = useLocation();

  useEffect(() => {
    const state = location.state as any;
    if (state?.selectedAlbum) {
      handleAlbumClick(state.selectedAlbum);
      window.history.replaceState({}, document.title);
    }
  }, []);

  const [albums, setAlbums] = useState<any[]>([]);
  const [tracks, setTracks] = useState<Song[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [allResolved, setAllResolved] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(-1);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [recentlyViewed, setRecentlyViewed] =
    useState<any[]>(loadRecentlyViewed());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchTimeout = useRef<number | null>(null);
  const searchRequestId = useRef(0);
  const suggestionRequestId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeAlbumIdRef = useRef<string | null>(null);
  const resolvedTracksRef = useRef<Song[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const lastQueryRef = useRef("");

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSuggestions = async (query: string) => {
    const requestId = ++suggestionRequestId.current;
    setSuggestionsLoading(true);
    try {
      const results = await tauriCommands.searchAlbumsDeezer(query);
      if (requestId === suggestionRequestId.current) {
        const mapped = ((results as any[]) || []).slice(0, 8);
        setSuggestions(mapped);
        setShowSuggestions(mapped.length > 0);
        setSelectedSuggestionIdx(-1);
      }
    } catch {
      if (requestId === suggestionRequestId.current) {
        setSuggestions([]);
        setShowSuggestions(true);
      }
    } finally {
      if (requestId === suggestionRequestId.current) {
        setSuggestionsLoading(false);
      }
    }
  };

  const loadAlbums = async (
    query: string,
    pageNum: number,
    append: boolean,
  ) => {
    const requestId = ++searchRequestId.current;
    if (!append) {
      setLoading(true);
      setAlbums([]);
    } else {
      setLoadingMore(true);
    }
    try {
      const results = await tauriCommands.searchAlbumsDeezer(
        query,
        pageNum * ALBUMS_PER_PAGE,
      );
      if (requestId === searchRequestId.current) {
        const data = results || [];
        if (append) {
          setAlbums((prev) => {
            const seen = new Set(prev.map((a) => a.id));
            return [...prev, ...data.filter((a) => !seen.has(a.id))];
          });
        } else {
          setAlbums(data);
        }
        setHasMore(data.length >= ALBUMS_PER_PAGE);
      }
    } catch {
      if (requestId === searchRequestId.current && !append) {
        setAlbums([]);
      }
    } finally {
      if (requestId === searchRequestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) {
      searchRequestId.current = 0;
      suggestionRequestId.current = 0;
      setAlbums([]);
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestionsLoading(false);
      setPage(1);
      setHasMore(true);
      lastQueryRef.current = "";
      return;
    }
    logger.logUI("AlbumsPage", "search_start", { query: value.slice(0, 100) });
    fetchSuggestions(value);
    lastQueryRef.current = value;
    setPage(1);
    setHasMore(true);
    searchTimeout.current = window.setTimeout(() => {
      loadAlbums(value, 0, false);
    }, 400);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore || !lastQueryRef.current) return;
    const nextPage = page + 1;
    setPage(nextPage);
    logger.logUI("AlbumsPage", "load_more", {
      page: nextPage,
      query: lastQueryRef.current.slice(0, 50),
    });
    loadAlbums(lastQueryRef.current, nextPage - 1, true);
  };

  // Infinite scroll
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const handleScroll = () => {
      if (
        grid.scrollHeight - grid.scrollTop - grid.clientHeight < 300 &&
        hasMore &&
        !loadingMore &&
        lastQueryRef.current
      ) {
        loadMore();
      }
    };
    grid.addEventListener("scroll", handleScroll, { passive: true });
    return () => grid.removeEventListener("scroll", handleScroll);
  }, [hasMore, loadingMore, page]);

  const handleSuggestionKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestionIdx((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIdx((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1,
      );
    } else if (e.key === "Enter" && selectedSuggestionIdx >= 0) {
      e.preventDefault();
      searchRequestId.current = 0;
      suggestionRequestId.current = 0;
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      handleAlbumClick(suggestions[selectedSuggestionIdx]);
      setShowSuggestions(false);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleAlbumClick = async (album: any) => {
    const albumId = album.id;
    const albumName = album.title;
    logger.logUI("AlbumsPage", "album_click", {
      albumId,
      name: albumName.slice(0, 50),
      trackCount: album.track_count,
    });

    addToRecentlyViewed(album);
    setRecentlyViewed(loadRecentlyViewed());

    // Clear shared search pool for new album
    searchPool.clear();

    activeAlbumIdRef.current = albumId;
    setSelectedAlbum(album);
    setTracks([]);
    setAllResolved(false);
    setLoadingTracks(true);
    setShowSuggestions(false);

    const startTime = Date.now();

    try {
      const result = await tauriCommands.getAlbumTracksDeezer(albumId);
      const mapped = (result || []).map((t: any, i: number) =>
        makeSong({
          id: `dz-${albumId}-${i}`,
          title: t.title,
          artist: t.artist || album.artist,
          album: album.title,
          duration: t.duration_secs,
          track_number: t.track_number || i + 1,
          artwork: album.cover_url,
          source: "youtube",
          videoId: undefined,
          dur: formatDuration(t.duration_secs),
          emoji: "💿",
          grad: albumGradient(album.title),
        }),
      );

      setTracks(mapped);
      setLoadingTracks(false);

      const cached = loadCachedVideoIds(albumId);
      const newCache: Record<string, string> = { ...cached };

      for (const track of mapped) {
        const cacheKey = `${track.artist}__${track.title}`.toLowerCase();
        if (cached[cacheKey]) {
          track.videoId = cached[cacheKey] as any;
        }
      }

      // Resolve tracks with parallel queries - track concurrency limit of 5
      const trackConcurrencyLimit = 5;
      const unresolvedTracks = mapped.filter((t) => !t.videoId);
      const queue: (() => Promise<void>)[] = [];
      let activeRequests = 0;

      const runNext = () => {
        if (queue.length === 0 || activeRequests >= trackConcurrencyLimit)
          return;
        const next = queue.shift()!;
        activeRequests++;
        next().finally(() => {
          activeRequests--;
          runNext();
        });
      };

      await new Promise<void>((resolve) => {
        for (const track of unresolvedTracks) {
          const task = async () => {
            if (activeAlbumIdRef.current !== albumId) return;
            try {
              const resolved = await resolveTrack(
                track.artist,
                track.title,
                track.duration,
              );
              if (resolved && activeAlbumIdRef.current === albumId) {
                track.videoId = resolved.videoId as any;
                if (resolved.duration_secs) {
                  track.duration = resolved.duration_secs;
                  track.dur = formatDuration(resolved.duration_secs);
                }
                const cacheKey =
                  `${track.artist}__${track.title}`.toLowerCase();
                newCache[cacheKey] = resolved.videoId;
              }
            } catch {
              // Resolution failed; track stays unavailable.
            }
          };
          queue.push(task);
        }

        // Start initial batch
        for (let i = 0; i < trackConcurrencyLimit; i++) {
          runNext();
        }

        // Poll for completion
        const checkDone = setInterval(() => {
          if (queue.length === 0 && activeRequests === 0) {
            clearInterval(checkDone);
            resolve();
          }
        }, 100);
      });

      if (activeAlbumIdRef.current === albumId) {
        saveCachedVideoIds(albumId, newCache);
      }
      if (activeAlbumIdRef.current === albumId) {
        resolvedTracksRef.current = [...mapped];
        setTracks([...mapped]);
        setAllResolved(true);

        const loadTime = Date.now() - startTime;
        const resolvedCount = mapped.filter((t) => t.videoId).length;
        const failedCount = mapped.filter((t) => !t.videoId).length;
        logger.logUI("AlbumsPage", "album_loaded", {
          albumId,
          name: albumName.slice(0, 50),
          trackCount: mapped.length,
          resolvedCount,
          failedCount,
          loadTimeMs: loadTime,
          fromCache: Object.keys(cached).length > 0,
        });
      }
    } catch (err) {
      logger.logError("AlbumsPage album_load_failed", {
        albumId,
        name: albumName.slice(0, 50),
        error: err,
      });
      if (activeAlbumIdRef.current === albumId) {
        setTracks([]);
        setLoadingTracks(false);
      }
    }
  };

  const handlePlayTrack = async (song: Song) => {
    if (!song.videoId) return;
    logger.logUI("AlbumsPage", "play_track", {
      songId: song.id,
      title: song.title.slice(0, 50),
      album: selectedAlbum?.title?.slice(0, 50),
    });
    tauriCommands.stopPlayback().catch(() => {});
    const player = usePlayerStore.getState();
    player.setProgress(0);
    player.setDuration(0);
    const playableTracks = resolvedTracksRef.current.filter((t) => t.videoId);
    setQueue(playableTracks, song, "search");
    player.setCurrentSong(song);
    player.setProgress(0);
  };

  const handlePlayAll = () => {
    const playable = tracks.filter((t) => t.videoId);
    if (playable.length === 0) return;

    logger.logUI("AlbumsPage", "play_all", {
      albumId: selectedAlbum?.id,
      albumName: selectedAlbum?.title?.slice(0, 50),
      playableCount: playable.length,
      totalCount: tracks.length,
    });
    tauriCommands.stopPlayback().catch(() => {});
    const player = usePlayerStore.getState();
    player.setProgress(0);
    player.setDuration(0);
    setQueue(playable, playable[0], "search");
    player.setCurrentSong(playable[0]);
    player.setProgress(0);
  };

  const handleBackToAlbums = () => {
    logger.logUI("AlbumsPage", "back_to_albums", {
      fromAlbum: selectedAlbum?.title?.slice(0, 50),
    });
    setSelectedAlbum(null);
  };

  if (selectedAlbum) {
    return (
      <div className="ap-detail album-detail" ref={scrollRef}>
        <div className="ap-detail-inner album-detail-inner">
          <button className="album-detail-back" onClick={handleBackToAlbums}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Albums
          </button>

          <section className="album-detail-hero">
            <div className="album-detail-art">
              {selectedAlbum.cover_url ? (
                <img src={selectedAlbum.cover_url} alt="" />
              ) : (
                <span>💿</span>
              )}
            </div>
            <div className="album-detail-copy">
              <div className="album-detail-eyebrow">Album</div>
              <h1>{selectedAlbum.title}</h1>
              <p className="album-detail-artist">{selectedAlbum.artist}</p>
              <div className="album-detail-meta">
                <span>
                  {tracks.length} track{tracks.length === 1 ? "" : "s"}
                </span>
                <span className="album-detail-dot" />
                <span>{allResolved ? "Ready to play" : "Preparing tracks"}</span>
              </div>
              <div className="album-detail-actions">
                {tracks.filter((t) => t.videoId).length > 0 && allResolved && (
                  <button className="album-detail-play" onClick={handlePlayAll}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      width="13"
                      height="13"
                    >
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                    Play album
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="artist-all-songs album-tracks-panel">
            <div className="artist-section-head">
              <h2>Tracklist</h2>
              <span>{tracks.length} tracks</span>
            </div>
            {loadingTracks || !allResolved ? (
              <div className="album-detail-loading">
                <div className="ap-spinner ap-spinner--sm" />
                <span>
                  {loadingTracks
                    ? "Loading tracks…"
                    : `Resolving ${tracks.length} tracks…`}
                </span>
              </div>
            ) : (
              <div className="album-detail-tracks">
                {tracks.map((song, i) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={i}
                    isCurrent={currentSong?.id === song.id}
                    onPlay={() => song.videoId && handlePlayTrack(song)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  const showRecentlyViewed = !searchQuery && recentlyViewed.length > 0;

  return (
    <div className="ap-page albums-page">
      <div className="ap-container">
        <header className="artist-collection-header album-collection-header">
          <div className="artist-collection-copy">
            <div className="artist-collection-eyebrow">
              <span className="artist-collection-dot" />
              Browse
            </div>
            <h1 className="artist-collection-title">Albums</h1>
            <p className="artist-collection-subtitle">
              {searchQuery
                ? "Search results from Deezer"
                : `${recentlyViewed.length} recently viewed · Search any album`}
            </p>
          </div>
          <div className="artist-collection-controls">
            <div
              ref={searchWrapRef}
              className="ap-search-wrap album-collection-search"
              style={{ position: "relative" }}
              onKeyDown={handleSuggestionKeyDown}
            >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="var(--text3)"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for an artist or album..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() =>
              (suggestions.length > 0 || suggestionsLoading) &&
              setShowSuggestions(true)
            }
            style={{ width: "100%", fontSize: 12 }}
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 99999,
                background: "var(--surface)",
                border: "1px solid var(--border2)",
                borderRadius: "var(--radius-sm)",
                marginTop: 4,
                overflow: "hidden",
                boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
                maxHeight: 400,
                overflowY: "auto",
                animation: "suggestFadeIn 0.15s ease",
              }}
            >
              <div
                style={{
                  padding: "6px 12px",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text3)",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--surface)",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
              >
                Albums
              </div>
              {suggestionsLoading ? (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "var(--text3)",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                  }}
                >
                  <div
                    className="ap-spinner ap-spinner--sm"
                    style={{ margin: "0 auto 8px" }}
                  />
                  Searching...
                </div>
              ) : suggestions.length === 0 ? (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "var(--text3)",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                  }}
                >
                  No albums found
                </div>
              ) : (
                suggestions.map((album: any, idx: number) => (
                  <div
                    key={album.id}
                    onClick={() => {
                      searchRequestId.current = 0;
                      suggestionRequestId.current = 0;
                      if (searchTimeout.current)
                        clearTimeout(searchTimeout.current);
                      handleAlbumClick(album);
                      setShowSuggestions(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      cursor: "pointer",
                      background:
                        selectedSuggestionIdx === idx
                          ? "var(--surface2)"
                          : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={() => setSelectedSuggestionIdx(idx)}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--radius-sm)",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        background: albumGradient(album.title),
                        overflow: "hidden",
                      }}
                    >
                      {album.cover_url ? (
                        <img
                          src={album.cover_url}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        "💿"
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {highlightMatch(album.title, searchQuery)}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text3)",
                          fontFamily: "'Inter', sans-serif",
                          marginTop: 2,
                        }}
                      >
                        {highlightMatch(album.artist, searchQuery)} ·{" "}
                        {album.track_count} tracks
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

          </div>
        </header>

        {showRecentlyViewed && (
          <section className="album-showcase">
            <button
              type="button"
              className="album-showcase-art"
              onClick={() => handleAlbumClick(recentlyViewed[0])}
              aria-label={`Open ${recentlyViewed[0].title}`}
            >
              {recentlyViewed[0].cover_url ? (
                <img src={recentlyViewed[0].cover_url} alt="" />
              ) : (
                <span>💿</span>
              )}
            </button>
            <div className="album-showcase-copy">
              <div className="album-showcase-eyebrow">Jump back in</div>
              <h2>{recentlyViewed[0].title}</h2>
              <p>{recentlyViewed[0].artist}</p>
              <div className="album-showcase-meta">
                <span>{recentlyViewed[0].track_count} tracks</span>
                <span className="album-showcase-dot" />
                <span>Album</span>
              </div>
              <button
                type="button"
                className="album-showcase-btn"
                onClick={() => handleAlbumClick(recentlyViewed[0])}
              >
                Open album
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="13"
                  height="13"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </section>
        )}

        {/* Recently Viewed */}
        {showRecentlyViewed && recentlyViewed.length > 1 && (
          <div className="album-recent-section">
            <div className="album-section-title">More recently viewed</div>
            <div className="ap-grid">
              {recentlyViewed.slice(1).map((album: any, idx: number) => (
                <div
                  key={album.id}
                  className="ap-card"
                  onClick={() => handleAlbumClick(album)}
                  style={{ animationDelay: `${idx * 0.03}s` }}
                >
                  <div
                    className="ap-card-avatar"
                                      >
                    {album.cover_url ? (
                      <img
                        src={album.cover_url}
                        alt=""
                      />
                    ) : (
                      <span>💿</span>
                    )}
                    <div className="ap-card-overlay">
                      <svg
                        viewBox="0 0 24 24"
                        fill="white"
                        width="20"
                        height="20"
                      >
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    </div>
                  </div>
                  <div className="ap-card-info">
                    <div className="ap-card-name">{album.title}</div>
                    <div className="ap-card-meta">
                      {album.artist} · {album.track_count} tracks
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchQuery && (
          <>
            <div className="album-results-head">
              <div>
                <div className="album-section-title">Search results</div>
                <h2 className="album-results-query">{searchQuery}</h2>
              </div>
              {!loading && albums.length > 0 && (
                <span className="album-results-count">
                  {albums.length} album{albums.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {loading ? (
              <div className="album-loading">
                <div className="ap-spinner ap-spinner--sm" />
                <span>Searching albums…</span>
              </div>
            ) : albums.length === 0 ? (
              <div className="ap-empty">
                <div className="ap-empty-icon">💿</div>
                <div className="ap-empty-text">No albums found</div>
              </div>
            ) : (
              <div
                ref={gridRef}
                style={{ overflowY: "auto", maxHeight: "calc(100vh - 300px)" }}
              >
                <div className="ap-grid">
                  {albums.map((album, idx) => (
                    <div
                      key={album.id}
                      className="ap-card"
                      onClick={() => handleAlbumClick(album)}
                      style={{ animationDelay: `${idx * 0.03}s` }}
                    >
                      <div
                        className="ap-card-avatar"
                                              >
                        {album.cover_url ? (
                          <img
                            src={album.cover_url}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              position: "absolute",
                              inset: 0,
                            }}
                          />
                        ) : (
                          <span>💿</span>
                        )}
                        <div className="ap-card-overlay">
                          <svg
                            viewBox="0 0 24 24"
                            fill="white"
                            width="20"
                            height="20"
                          >
                            <polygon points="5,3 19,12 5,21" />
                          </svg>
                        </div>
                      </div>
                      <div className="ap-card-info">
                        <div className="ap-card-name">
                          {highlightMatch(album.title, searchQuery)}
                        </div>
                        <div className="ap-card-meta">
                          {highlightMatch(album.artist, searchQuery)} ·{" "}
                          {album.track_count} tracks
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {loadingMore && (
                  <div style={{ textAlign: "center", padding: "16px" }}>
                    <div
                      className="ap-spinner ap-spinner--sm"
                      style={{ margin: "0 auto" }}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Empty state when no search and no recent */}
        {!searchQuery && !showRecentlyViewed && (
          <div className="albums-empty">
            <div className="albums-empty-disc">
              <span>💿</span>
            </div>
            <div className="albums-empty-eyebrow">Your shelf is waiting</div>
            <h2>Find your next favorite album</h2>
            <p>
              Search any artist or album above to start building your
              collection.
            </p>
          </div>
        )}
      </div>

      {/* Suggestion fade-in animation */}
      <style>{`
        @keyframes suggestFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AlbumsPage;
