// Kyma_Frontend/src/presentation/pages/AlbumsPage.tsx
import { useLocation } from "react-router-dom";
import React, { useState, useRef, useEffect } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";
import SongRow from "../components/Library/SongRow";
import { logger } from "../../services/logger";

// Animated wave background
const WaveCanvas: React.FC<{ seed: string; isPlaying: boolean }> = ({
  seed,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const hash = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 40, 160, 100, 10, 260, 320, 180];
  const h1 = hues[hash % hues.length];
  const h2 = hues[(hash + 3) % hues.length];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let t = 0;

    const waves = [
      { amp: 10, freq: 0.042, speed: 0.005, alpha: 0.18, hue: h1 },
      { amp: 7, freq: 0.037, speed: 0.007, alpha: 0.14, hue: h2 },
      { amp: 5, freq: 0.039, speed: 0.009, alpha: 0.1, hue: h1 + 20 },
      { amp: 4, freq: 0.044, speed: 0.004, alpha: 0.08, hue: h2 + 15 },
    ];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      if (isPlayingRef.current) {
        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        waves.forEach((w) => {
          ctx.beginPath();
          const baseline = height * 0.62;
          ctx.moveTo(0, baseline);

          for (let x = 0; x <= width; x += 3) {
            const y =
              baseline +
              Math.sin(x * w.freq + t * w.speed * 60) * w.amp +
              Math.sin(x * w.freq * 1.7 + t * w.speed * 40) * (w.amp * 0.4);
            ctx.lineTo(x, y);
          }

          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();

          const grad = ctx.createLinearGradient(0, baseline - w.amp, 0, height);
          grad.addColorStop(0, `hsla(${w.hue}, 70%, 60%, ${w.alpha})`);
          grad.addColorStop(1, `hsla(${w.hue}, 50%, 30%, 0)`);
          ctx.fillStyle = grad;
          ctx.fill();
        });

        t += 1;
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [h1, h2]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
};

const randomGradient = (seed: string) => {
  const hash = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 40, 160, 100, 10, 260, 320, 180];
  const h = hues[hash % hues.length];
  return `linear-gradient(135deg, hsl(${h}, 40%, 22%), hsl(${h + 30}, 35%, 10%))`;
};

const formatDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

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

  for (const queryFn of SEARCH_QUERIES) {
    try {
      const results = await tauriCommands.searchYoutube(
        queryFn(artist, cleanTitle),
      );
      if (!results?.length) continue;

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
          Math.abs(r.duration_secs - expectedDuration) <
            expectedDuration * 0.15;
        return titleMatch && artistMatch && durationMatch;
      });

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
    } catch {}
  }

  return null;
};

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
  const { currentSong, isPlaying } = usePlayerStore();
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
  //@ts-ignore
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  //@ts-ignore
  const [failedTracks, setFailedTracks] = useState<Set<string>>(new Set());
  //@ts-ignore
  const [retryingTrackId, setRetryingTrackId] = useState<string | null>(null);
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
  const toastTimeout = useRef<number | null>(null);
  const searchRequestId = useRef(0);
  const suggestionRequestId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeAlbumIdRef = useRef<string | null>(null);
  const resolvedTracksRef = useRef<Song[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const lastQueryRef = useRef("");

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

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
        setShowSuggestions(true); // show empty state
      }
    } finally {
      if (requestId === suggestionRequestId.current) {
        setSuggestionsLoading(false);
      }
    }
  };

  const loadAlbums = async (
    query: string,
    //@ts-ignore
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
      const results = await tauriCommands.searchAlbumsDeezer(query);
      if (requestId === searchRequestId.current) {
        const data = results || [];
        if (append) {
          setAlbums((prev) => [...prev, ...data]);
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

    activeAlbumIdRef.current = albumId;
    setSelectedAlbum(album);
    setTracks([]);
    setAllResolved(false);
    setFailedTracks(new Set());
    setLoadingTracks(true);
    setShowSuggestions(false);

    const startTime = Date.now();

    try {
      const result = await tauriCommands.getAlbumTracksDeezer(albumId);
      const mapped = (result || []).map((t: any, i: number) => ({
        id: `dz-${albumId}-${i}`,
        path: "",
        title: t.title,
        artist: t.artist || album.artist,
        album: album.title,
        duration: t.duration_secs,
        genre: null,
        year: null,
        track_number: t.track_number || i + 1,
        artwork: album.cover_url,
        source: "youtube" as any,
        videoId: undefined,
        dur: formatDuration(t.duration_secs),
        emoji: "💿",
        grad: randomGradient(album.title),
        bpm: 0,
        key: "—",
        plays: 0,
        liked: false,
      }));

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

      const concurrencyLimit = 5;
      let activeRequests = 0;
      const queue: (() => void)[] = [];

      const runNext = () => {
        if (queue.length === 0 || activeRequests >= concurrencyLimit) return;
        const next = queue.shift()!;
        activeRequests++;
        next();
      };

      await Promise.all(
        mapped
          .filter((track) => !track.videoId)
          .map((track) => {
            return new Promise<void>((resolve) => {
              const task = async () => {
                if (activeAlbumIdRef.current !== albumId) {
                  activeRequests--;
                  runNext();
                  resolve();
                  return;
                }
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
                  } else {
                    setFailedTracks((prev) => new Set(prev).add(track.id));
                  }
                } catch {
                  setFailedTracks((prev) => new Set(prev).add(track.id));
                }
                activeRequests--;
                runNext();
                resolve();
              };
              queue.push(task);
              runNext();
            });
          }),
      );

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
    if (!song.videoId) {
      showToast("Track unavailable, try again");
      return;
    }
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
  //@ts-ignore
  const handleRetry = async (song: Song) => {
    logger.logUI("AlbumsPage", "retry_track", {
      songId: song.id,
      title: song.title.slice(0, 50),
    });
    setRetryingTrackId(song.id);
    setFailedTracks((prev) => {
      const next = new Set(prev);
      next.delete(song.id);
      return next;
    });

    const resolved = await resolveTrack(song.artist, song.title, song.duration);
    if (resolved) {
      const updated = resolvedTracksRef.current.map((t) =>
        t.id === song.id
          ? {
              ...t,
              videoId: resolved.videoId,
              duration: resolved.duration_secs || t.duration,
              dur: resolved.duration_secs
                ? formatDuration(resolved.duration_secs)
                : t.dur,
            }
          : t,
      );
      resolvedTracksRef.current = updated;
      setTracks([...updated]);

      const albumId = activeAlbumIdRef.current;
      if (albumId) {
        const cached = loadCachedVideoIds(albumId);
        const cacheKey = `${song.artist}__${song.title}`.toLowerCase();
        saveCachedVideoIds(albumId, {
          ...cached,
          [cacheKey]: resolved.videoId,
        });
      }
    } else {
      setFailedTracks((prev) => new Set(prev).add(song.id));
    }
    setRetryingTrackId(null);
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
      <div className="ap-detail" ref={scrollRef}>
        <div className="ap-detail-inner">
          <button className="ap-back" onClick={handleBackToAlbums}>
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
          <div
            className="ap-hero"
            style={{
              background: randomGradient(selectedAlbum.title),
              position: "relative",
              overflow: "hidden",
            }}
          >
            <WaveCanvas seed={selectedAlbum.title} isPlaying={isPlaying} />
            <div
              className="ap-hero-noise"
              style={{ position: "relative", zIndex: 2 }}
            />
            <div
              className="ap-hero-content"
              style={{ position: "relative", zIndex: 2 }}
            >
              <div
                className="ap-hero-avatar"
                style={{
                  background: randomGradient(selectedAlbum.title + "_inner"),
                }}
              >
                {selectedAlbum.cover_url ? (
                  <img
                    src={selectedAlbum.cover_url}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  <span>💿</span>
                )}
              </div>
              <div className="ap-hero-meta">
                <div className="ap-hero-eyebrow">Album</div>
                <h1 className="ap-hero-name">{selectedAlbum.title}</h1>
                <div
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 14,
                    marginTop: 4,
                  }}
                >
                  {selectedAlbum.artist}
                </div>
                <div className="ap-hero-stats">
                  <div className="ap-stat">
                    <span className="ap-stat-val">{tracks.length}</span>
                    <span className="ap-stat-lbl">Tracks</span>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="ap-hero-actions"
              style={{ position: "relative", zIndex: 2 }}
            >
              {tracks.filter((t) => t.videoId).length > 0 && allResolved && (
                <button className="ap-play-all" onClick={handlePlayAll}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="14"
                    height="14"
                  >
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  Play All
                </button>
              )}
            </div>
          </div>
          <div className="ap-tracks-section">
            {loadingTracks || !allResolved ? (
              <div className="ap-loading">
                <div className="ap-spinner ap-spinner--sm" />
                <p>
                  {loadingTracks
                    ? "Loading tracks..."
                    : `Resolving ${tracks.length} tracks...`}
                </p>
              </div>
            ) : (
              <>
                <div className="ap-tracks-header"></div>
                {tracks.map((song, i) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={i}
                    isCurrent={currentSong?.id === song.id}
                    onPlay={() => song.videoId && handlePlayTrack(song)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const showRecentlyViewed = !searchQuery && recentlyViewed.length > 0;

  return (
    <div className="ap-page">
      <div className="ap-container">
        <div className="ap-page-header">
          <div className="ap-page-header-top">
            <div>
              <div className="ap-page-eyebrow">Browse</div>
              <h1 className="ap-page-title">Albums</h1>
            </div>
          </div>
        </div>

        {/* Search with suggestions */}
        <div
          ref={searchWrapRef}
          className="ap-search-wrap"
          style={{ marginBottom: 20, position: "relative" }}
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
                  fontFamily: "'DM Mono', monospace",
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
                    fontFamily: "'DM Mono', monospace",
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
                    fontFamily: "'DM Mono', monospace",
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
                        borderRadius: 6,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        background: randomGradient(album.title),
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
                          fontFamily: "'DM Mono', monospace",
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

        {/* Recently Viewed */}
        {showRecentlyViewed && (
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text3)",
                marginBottom: 12,
              }}
            >
              Recently Viewed
            </div>
            <div className="ap-grid">
              {recentlyViewed.map((album: any, idx: number) => (
                <div
                  key={album.id}
                  className="ap-card"
                  onClick={() => handleAlbumClick(album)}
                  style={{ animationDelay: `${idx * 0.03}s` }}
                >
                  <div
                    className="ap-card-avatar"
                    style={{ background: randomGradient(album.title) }}
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
            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "var(--text3)",
                }}
              >
                Searching albums...
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
                        style={{ background: randomGradient(album.title) }}
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
          <div className="ap-empty">
            <div className="ap-empty-icon">🔍</div>
            <div className="ap-empty-text">Search for an artist or album</div>
            <div className="ap-empty-sub">
              Type an artist name to see their albums
            </div>
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
