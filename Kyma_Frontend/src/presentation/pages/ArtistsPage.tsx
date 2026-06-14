import { useParams, useNavigate, useLocation } from "react-router-dom";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";
import { useArtistSearchStore } from "../stores/artistSearchStore";
import SongRow from "../components/Library/SongRow";

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
      { amp: 10, freq: 0.012, speed: 0.002, alpha: 0.18, hue: h1 },
      { amp: 7, freq: 0.018, speed: 0.003, alpha: 0.14, hue: h2 },
      { amp: 5, freq: 0.026, speed: 0.004, alpha: 0.1, hue: h1 + 20 },
      { amp: 4, freq: 0.034, speed: 0.002, alpha: 0.08, hue: h2 + 15 },
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
  return `linear-gradient(135deg, hsl(${h}, 45%, 32%), hsl(${h + 30}, 38%, 18%))`;
};

//@ts-ignore
const formatDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const splitArtists = (name: string): string[] => {
  return name
    .split(/[,;&]|\band\b|\bfeat\.?\b|\bft\.?\b|\bx\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 100);
};

const CACHE_TTL = 3 * 24 * 60 * 60 * 1000;
const ARTIST_CACHE_KEY = (artist: string) => `kyma_artist_songs_${artist}`;

interface CachedArtistSongs {
  songs: Song[];
  lastFetched: number;
}

function loadCachedArtistSongs(artist: string): CachedArtistSongs | null {
  try {
    const raw = localStorage.getItem(ARTIST_CACHE_KEY(artist));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const ArtistsPage: React.FC = () => {
  const { songs } = useLibraryStore();
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const { setQueue } = useQueueStore();
  const { artistName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname.startsWith("/artists");
  const selectedArtist = artistName ? decodeURIComponent(artistName) : null;
  const [searchQuery, setSearchQuery] = useState("");
  const [ytArtistSongs, setYtArtistSongs] = useState<Song[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [savedArtists, setSavedArtists] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [addSearchResults, setAddSearchResults] = useState<any[]>([]);
  const [addingArtist, setAddingArtist] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(-1);

  const addSearchTimeout = useRef<number | null>(null);
  const addSearchRequestId = useRef(0);
  const suggestionRequestId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { searchArtist, isSearching } = useArtistSearchStore();

  useEffect(() => {
    tauriCommands
      .getSavedArtists()
      .then((artists) => {
        setSavedArtists(artists);
        setFollowedIds(new Set(artists.map((a: any) => a.artist_id)));
      })
      .catch(() => {});
  }, []);

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

  const allArtists = useMemo(() => {
    return savedArtists
      .map((a: any) => ({
        key: a.artist_id,
        name: a.name,
        source: a.source || "youtube",
        thumbnail: a.thumbnail,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [savedArtists]);

  const selectedArtistKey =
    allArtists.find((a) => a.name === selectedArtist)?.key ?? "";

  const filteredArtists = searchQuery
    ? allArtists.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allArtists;

  const selectedLocalSongs = useMemo(() => {
    if (!selectedArtist) return [];
    return songs.filter((s) => {
      if (s.source === "youtube" || s.source === "soundcloud") return false;
      const searchName = selectedArtist.toLowerCase().replace(/-/g, " ");
      const artists = splitArtists(s.artist || "").map((a) => a.toLowerCase());
      return artists.some(
        (a) => a.includes(searchName) || searchName.includes(a),
      );
    });
  }, [songs, selectedArtist]);

  useEffect(() => {
    if (!selectedArtist) return;

    setYtArtistSongs([]);
    setLoadingStreams(true);
    setRefreshing(false);

    const cached = loadCachedArtistSongs(selectedArtist);
    if (cached && cached.songs.length > 0) {
      setYtArtistSongs(cached.songs);
      setLoadingStreams(false);
      const age = Date.now() - cached.lastFetched;
      if (age > CACHE_TTL) {
        setRefreshing(true);
        searchArtist(selectedArtist);
      }
      return;
    }

    searchArtist(selectedArtist);
  }, [selectedArtist]);

  useEffect(() => {
    if (!selectedArtist) return;
    if (!isSearching(selectedArtist)) {
      const cached = loadCachedArtistSongs(selectedArtist);
      if (cached && cached.songs.length > 0) {
        setYtArtistSongs(cached.songs);
      }
      setLoadingStreams(false);
      setRefreshing(false);
      return;
    }

    const interval = setInterval(() => {
      if (!isSearching(selectedArtist)) {
        const cached = loadCachedArtistSongs(selectedArtist);
        if (cached && cached.songs.length > 0) {
          setYtArtistSongs(cached.songs);
        }
        setLoadingStreams(false);
        setRefreshing(false);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [selectedArtist]);

  const fetchSuggestions = async (query: string) => {
    const requestId = ++suggestionRequestId.current;
    try {
      const results = await tauriCommands.searchArtistsDeezer(query);
      if (requestId === suggestionRequestId.current) {
        const mapped = ((results as any[]) || []).slice(0, 8);
        setSuggestions(mapped);
        setShowSuggestions(mapped.length > 0);
        setSelectedSuggestionIdx(-1);
      }
    } catch {
      if (requestId === suggestionRequestId.current) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (addSearchTimeout.current) clearTimeout(addSearchTimeout.current);
    };
  }, []);

  const handleAddSearch = (query: string) => {
    setAddSearchQuery(query);
    if (addSearchTimeout.current) clearTimeout(addSearchTimeout.current);
    if (!query.trim()) {
      addSearchRequestId.current = 0;
      suggestionRequestId.current = 0;
      setAddSearchResults([]);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    fetchSuggestions(query);
    const requestId = ++addSearchRequestId.current;
    addSearchTimeout.current = window.setTimeout(async () => {
      try {
        const results = await tauriCommands.searchArtistForSave(query);
        if (requestId === addSearchRequestId.current)
          setAddSearchResults(results);
      } catch (err) {
        if (requestId === addSearchRequestId.current)
          console.error("Add artist search failed:", err);
      }
    }, 400);
  };

  const handleSelectSuggestion = async (suggestion: any) => {
    setAddSearchQuery(suggestion.name);
    setShowSuggestions(false);
    setSuggestions([]);
    if (addingArtist) return;
    const alreadyFollowed =
      followedIds.has(String(suggestion.id)) ||
      savedArtists.some((a: any) => a.artist_id === String(suggestion.id));
    if (alreadyFollowed) return;
    setAddingArtist(true);
    try {
      await tauriCommands.saveArtist(
        suggestion.name,
        suggestion.picture_medium || null,
        "deezer",
      );
      setFollowedIds((prev) => new Set(prev).add(String(suggestion.id)));
      setSavedArtists(await tauriCommands.getSavedArtists());
      setShowAddModal(false);
      setAddSearchQuery("");
      setAddSearchResults([]);
    } catch (err) {
      console.error("Failed to save artist:", err);
    } finally {
      setAddingArtist(false);
    }
  };

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
      handleSelectSuggestion(suggestions[selectedSuggestionIdx]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSaveArtist = async (artist: any) => {
    if (addingArtist) return;
    setAddingArtist(true);
    try {
      await tauriCommands.saveArtist(
        artist.name,
        artist.thumbnail || null,
        artist.source || "youtube",
      );
      setFollowedIds((prev) => new Set(prev).add(artist.artist_id));
      setSavedArtists(await tauriCommands.getSavedArtists());
    } catch (err) {
      console.error("Failed to save artist:", err);
    } finally {
      setAddingArtist(false);
    }
  };

  const handleRemoveArtist = async (artistKey: string) => {
    try {
      await tauriCommands.removeArtist(artistKey);
      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.delete(artistKey);
        return next;
      });
      setSavedArtists(await tauriCommands.getSavedArtists());
    } catch (err) {
      console.error("Failed to remove artist:", err);
    }
  };

  const allArtistSongs = useMemo(
    () => [...selectedLocalSongs, ...ytArtistSongs],
    [selectedLocalSongs, ytArtistSongs],
  );

  const handlePlayAll = () => {
    if (allArtistSongs.length > 0) {
      setQueue(allArtistSongs, allArtistSongs[0], "library");
      setCurrentSong(allArtistSongs[0]);
      setProgress(0);
    }
  };

  const handlePlaySong = (song: Song) => {
    setQueue(allArtistSongs, song, "library");
    setCurrentSong(song);
    setProgress(0);
  };

  const formatFans = (nb: number): string => {
    if (nb >= 1000000) return `${(nb / 1000000).toFixed(1)}M`;
    if (nb >= 1000) return `${(nb / 1000).toFixed(1)}K`;
    return nb.toString();
  };

  return (
    <div
      style={{
        display: isActive ? "flex" : "none",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {selectedArtist ? (
        <div
          className="ap-detail"
          ref={scrollRef}
          key={selectedArtist}
          style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
        >
          <div className="ap-detail-inner">
            <button className="ap-back" onClick={() => navigate("/artists")}>
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
              Artists
            </button>
            <div
              className="ap-hero"
              style={{
                background: randomGradient(selectedArtist),
                position: "relative",
                overflow: "hidden",
              }}
            >
              <WaveCanvas seed={selectedArtist} isPlaying={isPlaying} />
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
                    background: randomGradient(selectedArtist + "_inner"),
                  }}
                >
                  {savedArtists.find((a: any) => a.name === selectedArtist)
                    ?.thumbnail ? (
                    <img
                      src={
                        savedArtists.find((a: any) => a.name === selectedArtist)
                          ?.thumbnail
                      }
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "var(--radius-circle)",
                      }}
                    />
                  ) : (
                    <span>🎤</span>
                  )}
                </div>
                <div className="ap-hero-meta">
                  <div className="ap-hero-eyebrow">Artist</div>
                  <h1 className="ap-hero-name">{selectedArtist}</h1>
                  <div className="ap-hero-stats">
                    {selectedLocalSongs.length > 0 && (
                      <div className="ap-stat">
                        <span className="ap-stat-val">
                          {selectedLocalSongs.length}
                        </span>
                        <span className="ap-stat-lbl">Local</span>
                      </div>
                    )}
                    {refreshing && (
                      <div className="ap-stat">
                        <span
                          className="ap-stat-val"
                          style={{ fontSize: 11, color: "var(--text3)" }}
                        >
                          refreshing…
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div
                className="ap-hero-actions"
                style={{ position: "relative", zIndex: 2 }}
              >
                {allArtistSongs.length > 0 && !loadingStreams && (
                  <button className="ap-play-all" onClick={handlePlayAll}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      width="14"
                      height="14"
                    >
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                    Play All{" "}
                  </button>
                )}
                {savedArtists.some(
                  (a: any) => a.artist_id === selectedArtistKey,
                ) && (
                  <button
                    className="ap-unfollow"
                    onClick={() => handleRemoveArtist(selectedArtistKey)}
                  >
                    Unfollow
                  </button>
                )}
              </div>
            </div>
            <div className="ap-tracks-section">
              {loadingStreams ? (
                <div className="ap-loading">
                  <div className="ap-spinner" />
                  <p>Searching streams…</p>
                </div>
              ) : (
                <>
                  {allArtistSongs.length > 0 && (
                    <div className="ap-tracks-header"></div>
                  )}
                  {allArtistSongs.map((song, i) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      index={i}
                      isCurrent={currentSong?.id === song.id}
                      onPlay={() => handlePlaySong(song)}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="ap-page"
          style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
        >
          <div
            className="ap-container"
            style={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <div
              style={{
                flexShrink: 0,
                padding: "1.5rem 0 1.25rem",
                borderBottom: "1px solid var(--border)",
                marginBottom: "1.5rem",
                background: "var(--bg)",
              }}
            >
              <div className="ap-page-header-top">
                <div>
                  <div className="ap-page-eyebrow">Collection</div>
                  <h1 className="ap-page-title">
                    Artists
                    {filteredArtists.length > 0 && (
                      <span className="ap-page-count">
                        {filteredArtists.length}
                      </span>
                    )}
                  </h1>
                </div>
                <div className="ap-page-controls">
                  <div className="ap-search-wrap">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text3)"
                      strokeWidth="2"
                      width="13"
                      height="13"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Filter artists…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="ap-add-btn"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      width="13"
                      height="13"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Follow Artist
                  </button>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              <div className="ap-grid">
                {filteredArtists.map((artist, idx) => (
                  <div
                    key={artist.key}
                    className="ap-card"
                    onClick={() =>
                      navigate(`/artists/${encodeURIComponent(artist.name)}`)
                    }
                    style={{ animationDelay: `${idx * 0.03}s` }}
                  >
                    <div
                      className="ap-card-avatar"
                      style={{ background: randomGradient(artist.name) }}
                    >
                      {artist.thumbnail ? (
                        <img src={artist.thumbnail} alt={artist.name} />
                      ) : (
                        <span>🎤</span>
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
                      <div className="ap-card-name">{artist.name}</div>
                      <div className="ap-card-meta">
                        {artist.source === "soundcloud"
                          ? "SoundCloud"
                          : "YouTube"}{" "}
                        · Followed
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {filteredArtists.length === 0 && (
                <div className="ap-empty">
                  {searchQuery ? (
                    <>
                      <div className="ap-empty-icon">🔍</div>
                      <div className="ap-empty-text">
                        No artists match "{searchQuery}"
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ap-empty-icon">🎤</div>
                      <div className="ap-empty-text">
                        No followed artists yet
                      </div>
                      <div className="ap-empty-sub">
                        Click "Follow Artist" to start building your collection
                      </div>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="ap-add-btn"
                        style={{ marginTop: "16px" }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          width="13"
                          height="13"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Follow Artist
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          {showAddModal && (
            <>
              <div
                className="ap-modal-overlay"
                onClick={() => {
                  setShowAddModal(false);
                  setAddSearchQuery("");
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
              />
              <div className="ap-modal" style={{ overflow: "visible" }}>
                <div className="ap-modal-header">
                  <div className="ap-modal-title-row">
                    <h2 className="ap-modal-title">Follow Artist</h2>
                    <button
                      className="ap-modal-close"
                      onClick={() => {
                        setShowAddModal(false);
                        setAddSearchQuery("");
                        setSuggestions([]);
                        setShowSuggestions(false);
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        width="14"
                        height="14"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div
                    ref={searchWrapRef}
                    style={{ position: "relative" }}
                    onKeyDown={handleSuggestionKeyDown}
                  >
                    <div className="ap-modal-search-wrap">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--text3)"
                        strokeWidth="2"
                        width="14"
                        height="14"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        ref={inputRef}
                        autoFocus
                        type="text"
                        placeholder="Search for an artist…"
                        value={addSearchQuery}
                        onChange={(e) => handleAddSearch(e.target.value)}
                        className="ap-modal-input"
                      />
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
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
                          maxHeight: 320,
                          overflowY: "auto",
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
                          }}
                        >
                          Deezer Suggestions
                        </div>
                        {suggestions.map((suggestion: any, idx: number) => {
                          const alreadySaved =
                            followedIds.has(String(suggestion.id)) ||
                            savedArtists.some(
                              (a: any) => a.artist_id === String(suggestion.id),
                            );
                          return (
                            <div
                              key={suggestion.id}
                              onClick={() => handleSelectSuggestion(suggestion)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "10px 12px",
                                cursor: alreadySaved ? "default" : "pointer",
                                background:
                                  selectedSuggestionIdx === idx
                                    ? "var(--surface2)"
                                    : "transparent",
                                opacity: alreadySaved ? 0.5 : 1,
                                transition: "background 0.1s",
                              }}
                              onMouseEnter={() => setSelectedSuggestionIdx(idx)}
                            >
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: "var(--radius-circle)",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 16,
                                  background: randomGradient(suggestion.name),
                                  overflow: "hidden",
                                }}
                              >
                                {suggestion.picture_medium ? (
                                  <img
                                    src={suggestion.picture_medium}
                                    alt=""
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  "🎤"
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
                                  {suggestion.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "var(--text3)",
                                    fontFamily: "'DM Mono', monospace",
                                    marginTop: 2,
                                  }}
                                >
                                  {formatFans(suggestion.nb_fan || 0)} fans
                                  {alreadySaved && " · Already followed"}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ap-modal-results">
                  {addSearchResults.map((artist: any) => {
                    const isFollowed =
                      followedIds.has(artist.artist_id) ||
                      savedArtists.some(
                        (a: any) => a.artist_id === artist.artist_id,
                      );
                    return (
                      <div key={artist.artist_id} className="ap-modal-row">
                        <div className="ap-modal-artist-info">
                          <div
                            className="ap-modal-avatar"
                            style={{ background: randomGradient(artist.name) }}
                          >
                            🎤
                          </div>
                          <div>
                            <div className="ap-modal-artist-name">
                              {artist.name}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSaveArtist(artist)}
                          disabled={addingArtist || isFollowed}
                          className={`ap-follow-btn${isFollowed ? " followed" : ""}`}
                        >
                          {isFollowed ? "✓ Followed" : "Follow"}
                        </button>
                      </div>
                    );
                  })}
                  {addSearchQuery &&
                    addSearchResults.length === 0 &&
                    !showSuggestions && (
                      <div className="ap-modal-empty">No artists found</div>
                    )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ArtistsPage;
