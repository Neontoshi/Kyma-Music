import { useParams, useNavigate, useLocation } from "react-router-dom";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";
import { useArtistSearchStore } from "../stores/artistSearchStore";
import SongRow from "../components/Library/SongRow";
import { randomGradient } from "../../lib/gradients";

const highResArtistImage = (url?: string): string => {
  if (!url) return "";
  return url.replace(/\/\d+x\d+-/, "/1000x1000-");
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
  const { currentSong, setCurrentSong, setProgress, isPlaying, togglePlay } =
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
  const [artistTab, setArtistTab] = useState<"overview" | "about" | "concerts">(
    "overview",
  );
  const [deezerArtistImage, setDeezerArtistImage] = useState("");

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
    setDeezerArtistImage("");
    if (!selectedArtist) return;

    const saved = savedArtists.find(
      (artist: any) => artist.name === selectedArtist,
    );
    if (saved?.thumbnail) return;

    let cancelled = false;
    tauriCommands
      .searchArtistsDeezer(selectedArtist)
      .then((results: any[]) => {
        const match = (results || []).find(
          (artist: any) =>
            artist.name?.toLowerCase() === selectedArtist.toLowerCase(),
        ) || results?.[0];
        const image =
          match?.picture_xl || match?.picture_big || match?.picture_medium;
        if (!cancelled && image) setDeezerArtistImage(image);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedArtist, savedArtists]);

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

  const selectedMeta = savedArtists.find(
    (artist: any) => artist.name === selectedArtist,
  );
  const artistImage = highResArtistImage(
    selectedMeta?.thumbnail ||
      deezerArtistImage ||
      selectedLocalSongs.find((song) => song.artwork)?.artwork ||
      "",
  );
  const isFollowing = savedArtists.some(
    (artist: any) => artist.artist_id === selectedArtistKey,
  );
  const latestRelease = allArtistSongs[0];
  const artistPick = allArtistSongs[1] || allArtistSongs[0];
  const popularSongs = useMemo(
    () =>
      [...allArtistSongs]
        .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0))
        .slice(0, 4),
    [allArtistSongs],
  );
  const artistIsPlaying =
    isPlaying &&
    !!currentSong &&
    allArtistSongs.some((song) => song.id === currentSong.id);

  const handleHeroPlay = () => {
    if (
      currentSong &&
      allArtistSongs.some((song) => song.id === currentSong.id)
    ) {
      togglePlay();
      return;
    }
    handlePlayAll();
  };

  const handleToggleFollow = async () => {
    if (isFollowing) {
      await handleRemoveArtist(selectedArtistKey);
      return;
    }
    try {
      await tauriCommands.saveArtist(
        selectedArtist || "",
        artistImage || null,
        "deezer",
      );
      setSavedArtists(await tauriCommands.getSavedArtists());
    } catch (err) {
      console.error("Failed to follow artist:", err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      usePlayerStore.getState().setMessage("Artist link copied");
      setTimeout(() => usePlayerStore.getState().setMessage(null), 2000);
    } catch {
      usePlayerStore.getState().setError("Couldn't copy artist link");
    }
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
          <div className="ap-detail-inner artist-detail-inner">
            <section className="artist-hero">
              <div
                className="artist-hero-bg"
                style={{
                  backgroundImage: artistImage
                    ? `url("${artistImage}")`
                    : randomGradient(selectedArtist),
                }}
              />
              <div className="artist-hero-scrim" />

              <button
                className="artist-back"
                onClick={() => navigate("/artists")}
                aria-label="Back to artists"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="16"
                  height="16"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <div className="artist-hero-content">
                <span className="artist-hero-eyebrow">Artist</span>
                <h1 className="artist-hero-name">{selectedArtist}</h1>
                {refreshing && (
                  <span className="artist-refreshing">Refreshing…</span>
                )}
                <div className="artist-hero-actions">
                  <button
                    className="artist-play-btn"
                    onClick={handleHeroPlay}
                    disabled={allArtistSongs.length === 0}
                  >
                    {artistIsPlaying ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                        Pause
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                        Play
                      </>
                    )}
                  </button>
                  <button
                    className={`artist-follow-btn${isFollowing ? " is-following" : ""}`}
                    onClick={handleToggleFollow}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                  <button
                    className="artist-more-btn"
                    onClick={handleCopyLink}
                    title="Copy artist link"
                    aria-label="Copy artist link"
                  >
                    •••
                  </button>
                </div>
              </div>

              <div className="artist-hero-tabs">
                {(["overview", "about", "concerts"] as const).map((tab) => (
                  <button
                    key={tab}
                    className={`artist-tab${artistTab === tab ? " active" : ""}`}
                    onClick={() => setArtistTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </section>

            {artistTab === "overview" && (
              <div className="artist-overview">
                <div className="artist-overview-main">
                  {loadingStreams && allArtistSongs.length === 0 ? (
                    <div className="ap-loading">
                      <div className="ap-spinner" />
                      <p>Searching streams…</p>
                    </div>
                  ) : (
                    <>
                      <div className="artist-feature-row">
                        {latestRelease && (
                          <button
                            className="artist-feature-card"
                            onClick={() => handlePlaySong(latestRelease)}
                          >
                            <span className="artist-feature-label">Latest Release</span>
                            <div className="artist-feature-art">
                              {latestRelease.artwork || latestRelease.videoId ? (
                                <img
                                  src={
                                    latestRelease.artwork ||
                                    `https://i.ytimg.com/vi/${latestRelease.videoId}/hqdefault.jpg`
                                  }
                                  alt=""
                                />
                              ) : (
                                <span>{latestRelease.emoji || "♪"}</span>
                              )}
                            </div>
                            <span className="artist-feature-title">
                              {latestRelease.album || latestRelease.title}
                            </span>
                            <span className="artist-feature-sub">
                              {latestRelease.title}
                            </span>
                          </button>
                        )}

                        {artistPick && artistPick.id !== latestRelease?.id && (
                          <button
                            className="artist-feature-card"
                            onClick={() => handlePlaySong(artistPick)}
                          >
                            <span className="artist-feature-label">Artist&apos;s Pick</span>
                            <div className="artist-feature-art">
                              {artistPick.artwork || artistPick.videoId ? (
                                <img
                                  src={
                                    artistPick.artwork ||
                                    `https://i.ytimg.com/vi/${artistPick.videoId}/hqdefault.jpg`
                                  }
                                  alt=""
                                />
                              ) : (
                                <span>{artistPick.emoji || "♪"}</span>
                              )}
                            </div>
                            <span className="artist-feature-title">
                              {artistPick.album || artistPick.title}
                            </span>
                            <span className="artist-feature-sub">
                              {artistPick.title}
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="artist-all-songs" id="artist-all-songs">
                        <div className="artist-section-head">
                          <h2>All Songs</h2>
                          <span>{allArtistSongs.length} tracks</span>
                        </div>
                        {allArtistSongs.map((song, index) => (
                          <SongRow
                            key={song.id}
                            song={song}
                            index={index}
                            isCurrent={currentSong?.id === song.id}
                            onPlay={() => handlePlaySong(song)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <aside className="artist-popular">
                  <div className="artist-popular-head">
                    Popular by {selectedArtist}
                  </div>
                  {popularSongs.map((song, index) => (
                    <button
                      key={song.id}
                      className={`artist-popular-row${currentSong?.id === song.id ? " active" : ""}`}
                      onClick={() => handlePlaySong(song)}
                    >
                      <span className="artist-popular-index">{index + 1}</span>
                      <span className="artist-popular-art">
                        {song.artwork || song.videoId ? (
                          <img
                            src={
                              song.artwork ||
                              `https://i.ytimg.com/vi/${song.videoId}/default.jpg`
                            }
                            alt=""
                          />
                        ) : (
                          <span>{song.emoji || "♪"}</span>
                        )}
                      </span>
                      <span className="artist-popular-title">
                        {song.title}
                        <small>{(song.plays ?? 0).toLocaleString()} plays</small>
                      </span>
                      <span className="artist-popular-dur">{song.dur}</span>
                    </button>
                  ))}
                  {popularSongs.length > 0 && (
                    <button
                      className="artist-show-more"
                      onClick={() =>
                        document
                          .getElementById("artist-all-songs")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      Show More
                    </button>
                  )}
                </aside>
              </div>
            )}

            {artistTab === "about" && (
              <div className="artist-about">
                <h2>About {selectedArtist}</h2>
                <p>
                  {selectedArtist} has {allArtistSongs.length} tracks in your
                  library across {new Set(allArtistSongs.map((song) => song.album)).size}{" "}
                  albums. Followed from {selectedMeta?.source === "deezer" ? "Deezer" : "your library"}.
                </p>
              </div>
            )}

            {artistTab === "concerts" && (
              <div className="artist-about">
                <h2>Concerts</h2>
                <p>No upcoming concerts for {selectedArtist} right now.</p>
              </div>
            )}
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
            <header className="artist-collection-header">
              <div className="artist-collection-copy">
                <div className="artist-collection-eyebrow">
                  <span className="artist-collection-dot" />
                  Collection
                </div>
                <h1 className="artist-collection-title">Artists</h1>
                <p className="artist-collection-subtitle">
                  {filteredArtists.length} followed artist
                  {filteredArtists.length === 1 ? "" : "s"} · Your personal
                  roster
                </p>
              </div>
              <div className="artist-collection-controls">
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
            </header>
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
                            fontFamily: "'Inter', sans-serif",
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
                                    fontFamily: "'Inter', sans-serif",
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
