import React, { useMemo, useEffect, useState } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { Song } from "../../core/entities/Song";
import { tauriCommands } from "../../services/tauriBridge";
import { useNavigate } from "react-router-dom";
import { useLibrary } from "../hooks/useLibrary";
import { useRecentlyPlayedStore } from "../stores/recentlyPlayedStore";
import { useHomeDataStore } from "../stores/homeDataStore";
import ListeningLineChart from "../components/ListeningLineChart";
import { useQueueStore } from "../stores/queueStore";
import { logger } from "../../services/logger";

//  Helpers

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function totalListeningHours(songs: Song[]): number {
  return Math.floor(
    songs.reduce((acc, s) => acc + (s.duration ?? 0) * (s.plays ?? 0), 0) /
      3600,
  );
}

function topArtist(songs: Song[]): string {
  const counts: Record<string, number> = {};
  for (const s of songs) {
    counts[s.artist] = (counts[s.artist] ?? 0) + (s.plays ?? 0);
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
}

function getGreeting(): { text: string; period: string } {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", period: "morning" };
  if (h < 17) return { text: "Good afternoon", period: "afternoon" };
  return { text: "Good evening", period: "evening" };
}

function getMood(hour: number): "energetic" | "chill" | "focus" {
  if (hour >= 6 && hour < 12) return "energetic";
  if (hour >= 20 || hour < 4) return "chill";
  return "focus";
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const RECENTLY_VIEWED_KEY = "kyma_recently_viewed_albums";

function loadRecentlyViewedAlbums(): any[] {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? JSON.parse(raw).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function trendingTrackToSong(t: any): Song {
  return {
    id: `yt-${t.videoId}`,
    path: "",
    title: t.title,
    artist: t.artist,
    album: t.album || "Trending",
    duration: t.duration_secs || 0,
    genre: null,
    year: null,
    track_number: null,
    artwork: t.artwork_url || t.thumbnail,
    source: "youtube" as any,
    videoId: t.videoId,
    dur: t.duration_str || "",
    emoji: "🔥",
    grad: "linear-gradient(135deg, var(--accent), var(--accent2))",
    bpm: 0,
    key: "—",
    plays: 0,
    liked: false,
  };
}

//  Sub-components

const PlayingBars = () => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-end",
      gap: "2px",
      height: "12px",
    }}
  >
    {[0, 0.2, 0.1].map((delay, i) => (
      <div
        key={i}
        style={{
          width: "3px",
          background: "var(--accent2)",
          borderRadius: "2px",
          animation: "barBounce 0.7s ease-in-out infinite",
          animationDelay: `${delay}s`,
          height: "12px",
        }}
      />
    ))}
  </div>
);

const SongArt: React.FC<{
  song?: Song;
  artwork?: string;
  emoji?: string;
  grad?: string;
  videoId?: string;
  size?: number;
  radius?: number;
}> = ({ song, artwork, emoji, grad, videoId, size = 48, radius = 8 }) => {
  const art = artwork || song?.artwork;
  const em = emoji || song?.emoji || "🎵";
  const gr =
    grad ||
    song?.grad ||
    "linear-gradient(135deg, var(--accent), var(--accent2))";
  const vid = videoId || song?.videoId;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: gr,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {art ? (
        <img
          src={art}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            inset: 0,
          }}
        />
      ) : vid ? (
        <img
          src={`https://i.ytimg.com/vi/${vid}/default.jpg`}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            inset: 0,
          }}
          onError={(e) =>
            ((e.target as HTMLImageElement).style.display = "none")
          }
        />
      ) : (
        <span>{em}</span>
      )}
    </div>
  );
};

const SectionHeader: React.FC<{
  label: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
}> = ({ label, sub, action }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "1rem",
    }}
  >
    <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
      <span
        style={{
          fontSize: "1.1rem",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "var(--text)",
          fontFamily: "var(--font-family-base)", // Use CSS variable
        }}
      >
        {label}
      </span>
      {sub && (
        <span
          style={{
            fontFamily: "var(--font-family-mono)", // Use CSS variable without fallback
            fontSize: "9px",
            color: "var(--text3)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {sub}
        </span>
      )}
    </div>
    {action && (
      <button
        onClick={action.onClick}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-family-mono)", // Use CSS variable without fallback
          fontSize: "9px",
          color: "var(--accent)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "4px 0",
          opacity: 0.8,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
      >
        {action.label} →
      </button>
    )}
  </div>
);
const CardRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: "flex",
      gap: "12px",
      overflowX: "auto",
      paddingBottom: "8px",
      scrollbarWidth: "none",
    }}
  >
    {children}
  </div>
);

const MediaCard: React.FC<{
  title: string;
  sub: string;
  art?: string;
  emoji?: string;
  grad?: string;
  videoId?: string;
  isActive?: boolean;
  isPlaying?: boolean;
  onClick: () => void;
  width?: number;
  badge?: string;
}> = ({
  title,
  sub,
  art,
  emoji,
  grad,
  videoId,
  isActive,
  isPlaying,
  onClick,
  width = 140,
  badge,
}) => (
  <div
    onClick={onClick}
    style={{ flexShrink: 0, width, cursor: "pointer", position: "relative" }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
  >
    <div
      style={{
        width: "100%",
        aspectRatio: "1",
        borderRadius: "10px",
        background: grad || "var(--surface2)",
        overflow: "hidden",
        position: "relative",
        border: isActive
          ? "2px solid var(--accent)"
          : "1px solid var(--border)",
        transition: "border-color 0.2s, transform 0.2s",
        boxShadow: isActive ? "0 0 20px rgba(124,106,245,0.3)" : "none",
      }}
    >
      {art ? (
        <img
          src={art}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : videoId ? (
        <img
          src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) =>
            ((e.target as HTMLImageElement).style.display = "none")
          }
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
          }}
        >
          {emoji || "🎵"}
        </div>
      )}
      {badge && (
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            borderRadius: "4px",
            padding: "2px 6px",
            fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
            fontSize: "9px",
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "0.05em",
          }}
        >
          {badge}
        </div>
      )}
      <div
        className="card-overlay"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s",
          borderRadius: "9px",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isActive ? 1 : 0,
            transform: isActive ? "scale(1)" : "scale(0.7)",
            transition: "all 0.2s",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
          className="card-play-btn"
        >
          {isActive && isPlaying ? (
            <PlayingBars />
          ) : (
            <svg viewBox="0 0 24 24" fill="#fff" width="12" height="12">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </div>
      </div>
    </div>
    <div
      style={{
        fontSize: "12px",
        fontWeight: 700,
        marginTop: "7px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        color: isActive ? "var(--accent)" : "var(--text)",
      }}
    >
      {title}
    </div>
    <div
      style={{
        fontSize: "10px",
        color: "var(--text3)",
        fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
        marginTop: "2px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {sub}
    </div>
  </div>
);

const TrackRow: React.FC<{
  index?: number | string;
  song: Song | any;
  isActive?: boolean;
  isPlaying?: boolean;
  onClick: () => void;
  showPlays?: boolean;
  showTime?: boolean;
}> = ({ index, song, isActive, isPlaying, onClick, showPlays, showTime }) => (
  <div
    onClick={onClick}
    style={{
      display: "grid",
      gridTemplateColumns:
        index !== undefined ? "28px 36px 1fr auto" : "36px 1fr auto",
      alignItems: "center",
      gap: "10px",
      padding: "8px 10px",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "background 0.12s",
      background: isActive ? "rgba(124,106,245,0.08)" : "transparent",
      border: "1px solid",
      borderColor: isActive ? "rgba(124,106,245,0.2)" : "transparent",
    }}
    onMouseEnter={(e) => {
      if (!isActive) e.currentTarget.style.background = "var(--surface2)";
    }}
    onMouseLeave={(e) => {
      if (!isActive) e.currentTarget.style.background = "transparent";
    }}
  >
    {index !== undefined && (
      <div
        style={{
          fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
          fontSize: "10px",
          color: isActive ? "var(--accent)" : "var(--text3)",
          textAlign: "center",
        }}
      >
        {isActive && isPlaying ? <PlayingBars /> : index}
      </div>
    )}
    <SongArt
      song={song}
      artwork={song.thumbnail}
      videoId={song.video_id || song.videoId}
      size={36}
      radius={6}
    />
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          color: isActive ? "var(--accent2)" : "var(--text)",
        }}
      >
        {song.title}
      </div>
      <div
        style={{
          fontSize: "10px",
          color: "var(--text3)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          marginTop: "1px",
        }}
      >
        {song.artist}
      </div>
    </div>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "2px",
        flexShrink: 0,
      }}
    >
      {showTime && (
        <span
          style={{
            fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
            fontSize: "10px",
            color: "var(--text3)",
          }}
        >
          {song.dur}
        </span>
      )}
      {showPlays && (song.plays ?? 0) > 0 && (
        <span
          style={{
            fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
            fontSize: "9px",
            color: "var(--accent)",
            background: "rgba(124,106,245,0.1)",
            padding: "1px 5px",
            borderRadius: "20px",
          }}
        >
          {song.plays}×
        </span>
      )}
    </div>
  </div>
);

//  Main component

const HomePage: React.FC = () => {
  const { songs } = useLibraryStore();
  const { loading } = useLibrary();
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const navigate = useNavigate();

  const {
    items: recentlyPlayed,
    loading: recentlyPlayedLoading,
    loadRecentPlays,
  } = useRecentlyPlayedStore();
  const {
    trendingChart,
    weeklyChart,
    similarArtists,
    weeklyStats,
    heatmap,
    loadAll,
    allTimeStats,
  } = useHomeDataStore();

  useEffect(() => {
    loadRecentPlays();
  }, [songs, currentSong?.id]);

  //@ts-ignore
  const playSong = (song: Song, source: string, context?: any) => {
    logger.logUI("HomePage", "play_song", {
      songId: song.id,
      title: song.title.slice(0, 50),
      artist: song.artist,
      source: source,
    });
    setCurrentSong(song);
    setProgress(0);
  };

  // Converts a trending/chart track object to a Song and sets the full list as queue
  const playTrendingTrack = (track: any, allTracks?: any[]) => {
    if (!track.videoId) return;
    const song = trendingTrackToSong(track);

    if (allTracks?.length) {
      const queue = allTracks.filter((t) => t.videoId).map(trendingTrackToSong);
      useQueueStore.getState().setQueue(queue, song, "library");
    }

    playSong(song, "trending", { trackId: track.id });
  };

  const handleNavigate = (path: string, from: string) => {
    logger.logUI("HomePage", "navigate", { from, to: path });
    navigate(path);
  };

  const handleArtistClick = (artistName: string) => {
    logger.logUI("HomePage", "artist_click", { artist: artistName });
    navigate(`/artists/${encodeURIComponent(artistName)}`);
  };

  const handleAlbumClick = (album: any) => {
    logger.logUI("HomePage", "album_click", {
      albumId: album.id,
      name: album.title.slice(0, 50),
      artist: album.artist,
    });
    navigate("/albums", { state: { selectedAlbum: album } });
  };

  const topPlayed = useMemo(
    () =>
      [...songs]
        .filter((s) => (s.plays ?? 0) > 0)
        .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0))
        .slice(0, 8),
    [songs],
  );
  const quickPicks = useMemo(() => shuffle(songs).slice(0, 8), [songs]);
  const likedSongsPreview = useMemo(
    () => songs.filter((s) => s.liked).slice(0, 8),
    [songs],
  );

  const [topArtists, setTopArtists] = useState<
    { name: string; plays: number }[]
  >([]);
  const [recentlyViewedAlbums, setRecentlyViewedAlbums] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<Song[]>([]);
  const [shuffledNewReleases, setShuffledNewReleases] = useState<Song[]>([]);
  const [lastfmKey, setLastfmKey] = useState("");
  const [lastfmUser, setLastfmUser] = useState("");

  const topLocalArtist = useMemo(() => topArtist(songs), [songs]);

  useEffect(() => {
    if (newReleases.length > 0)
      setShuffledNewReleases(shuffle([...newReleases]));
  }, [newReleases]);
  useEffect(() => {
    if (newReleases.length === 0) return;
    const interval = setInterval(() => {
      setShuffledNewReleases(shuffle([...newReleases]));
    }, 240000);
    return () => clearInterval(interval);
  }, [newReleases]);

  useEffect(() => {
    tauriCommands.getSetting("listenbrainz_user").then((user) => {
      if (user) {
        tauriCommands
          .fetchListenbrainzStats(user)
          .then((json) => {
            const data = JSON.parse(json);
            setTopArtists(
              data.payload?.artists?.map((a: any) => ({
                name: a.artist_name,
                plays: a.listen_count,
              })) || [],
            );
          })
          .catch(() => {});
      }
    });
    tauriCommands
      .getSetting("lastfm_api_key")
      .then((val: string | null) => setLastfmKey(val || ""))
      .catch(() => {});
    tauriCommands
      .getSetting("lastfm_user")
      .then((val: string | null) => setLastfmUser(val || ""))
      .catch(() => {});
  }, [songs]);

  useEffect(() => {
    loadAll(lastfmKey, lastfmUser, topLocalArtist);
  }, [lastfmKey, lastfmUser, topLocalArtist]);
  useEffect(() => {
    setRecentlyViewedAlbums(loadRecentlyViewedAlbums());
  }, [songs]);

  useEffect(() => {
    tauriCommands.getSavedArtists().then((artists) => {
      if (!artists?.length) return;
      const allCachedSongs: Song[] = [];
      for (const artist of artists) {
        const cacheKey = `kyma_artist_songs_${artist.name}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const data = JSON.parse(cached);
            if (data.songs?.length) allCachedSongs.push(...data.songs);
          } catch {}
        }
      }
      const localMatches = songs.filter((s) =>
        artists.some((a: any) =>
          s.artist?.toLowerCase().includes(a.name.toLowerCase()),
        ),
      );
      const combined = [...localMatches, ...allCachedSongs];
      const seen = new Set<string>();
      const unique = combined.filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
      setNewReleases(shuffle(unique).slice(0, 8));
    });
  }, [songs]);

  const stats = useMemo(() => {
    const localOnly = songs.filter((s) => s.source !== "youtube");
    return {
      total: localOnly.length,
      hours: totalListeningHours(localOnly),
      artist: topArtist(localOnly),
      liked: songs.filter((s) => s.liked).length,
    };
  }, [songs]);

  // Build a Song array from recently played entries for queue use
  const recentlyPlayedAsSongs: Song[] = useMemo(
    () =>
      recentlyPlayed.slice(0, 10).map((e) => ({
        id: e.track_id || e.id,
        path: e.path || "",
        title: e.title,
        artist: e.artist,
        album: e.album,
        duration: e.duration_secs || 0,
        genre: null,
        year: null,
        track_number: null,
        artwork: e.thumbnail,
        source: e.source as any,
        videoId: e.video_id,
        dur: "",
        emoji: "🎵",
        grad: "linear-gradient(135deg, var(--accent), var(--accent2))",
        bpm: 0,
        key: "—",
        plays: 0,
        liked: false,
      })),
    [recentlyPlayed],
  );

  const greeting = getGreeting();
  const mood = getMood(new Date().getHours());
  const moodPicks = useMemo(() => {
    const pool = songs.filter((s) => s.duration);
    if (mood === "chill")
      return shuffle(pool.filter((s) => (s.duration ?? 0) < 240)).slice(0, 8);
    if (mood === "energetic")
      return shuffle(
        pool.filter((s) => (s.duration ?? 0) < 300 && (s.bpm ?? 0) > 100),
      ).slice(0, 8);
    if (mood === "focus") {
      const artistKeys = Object.keys(localStorage).filter((k) =>
        k.startsWith("kyma_artist_songs_"),
      );
      const cachedSongs: any[] = [];
      for (const key of artistKeys) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          if (data.songs?.length) cachedSongs.push(...data.songs);
        } catch {}
      }
      const allSongs = [...pool, ...cachedSongs];
      const filtered = allSongs.filter((s) => {
        const dur = s.duration ?? 0;
        if (dur < 180 || dur > 600) return false;
        const title = (s.title || "").toLowerCase();
        const exclude = [
          "live",
          "remix",
          "party",
          "club",
          "mix",
          "bass",
          "drop",
        ];
        if (exclude.some((w) => title.includes(w))) return false;
        return true;
      });
      if (filtered.length < 8) {
        return shuffle([
          ...filtered,
          ...shuffle(allSongs).slice(0, 8 - filtered.length),
        ]).slice(0, 8);
      }
      return shuffle(filtered).slice(0, 8);
    }
    return shuffle(pool).slice(0, 8);
  }, [songs, mood]);

  const moodConfig = {
    energetic: { label: "Energy Boost", color: "#f59e0b", icon: "⚡" },
    chill: { label: "Late Night Vibes", color: "#818cf8", icon: "🌙" },
    focus: { label: "Deep Focus", color: "#34d399", icon: "🎯" },
  };
  const becauseYouLiked = useMemo(() => {
    const liked = songs.filter((s) => s.liked);
    if (!liked.length) return null;
    const seed = liked[Math.floor(Math.random() * liked.length)];
    const similar = songs
      .filter((s) => s.artist === seed.artist && s.id !== seed.id)
      .slice(0, 8);
    return similar.length > 0 ? { seed, similar } : null;
  }, [songs]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div className="ap-spinner" />
        <div
          style={{
            color: "var(--text2)",
            fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
            fontSize: 11,
          }}
        >
          Loading your library...
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div
        className="song-list-pane"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          height: "100%",
        }}
      >
        <div style={{ fontSize: 48 }}>🎵</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          Your library is empty
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>
          Scan a folder from the Library tab to get started
        </div>
      </div>
    );
  }

  return (
    <div className="song-list-pane" style={{ height: "100%" }}>
      <style>{`
        @keyframes barBounce { 0%,100%{transform:scaleY(0.15)} 50%{transform:scaleY(1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .hp-section { animation: fadeUp 0.4s ease both; }
        .card-overlay:hover { background: rgba(0,0,0,0.45) !important; }
        .card-overlay:hover .card-play-btn { opacity: 1 !important; transform: scale(1) !important; }
      `}</style>

      <div style={{ width: "100%" }}>
        {/* HERO */}
        <div
          style={{
            padding: "3rem 1rem 2rem",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "end",
            gap: "2rem",
            borderBottom: "1px solid var(--border)",
            marginBottom: "2.5rem",
            animation: "fadeUp 0.5s ease both",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
                fontSize: "9px",
                letterSpacing: "0.22em",
                color: "var(--accent)",
                textTransform: "uppercase",
                marginBottom: "0.7rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "1px",
                  background: "var(--accent)",
                }}
              />
              {greeting.text}
            </div>
            <h1
              style={{
                fontSize: "clamp(2.4rem, 6vw, 4.5rem)",
                fontWeight: 900,
                lineHeight: 1.1, // Increased from 0.92 to prevent clipping
                letterSpacing: "-0.03em",
                color: "var(--text)",
                fontFamily: "var(--font-family-base, 'Syne', sans-serif)",
                margin: 0,
                overflow: "visible", // Add this
              }}
            >
              What are
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(90deg, var(--accent), var(--accent2))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  display: "inline-block",
                  padding: "0.1em 0 0.15em 0", // More padding on bottom for question mark
                  margin: "-0.05em 0", // Negative margin to compensate visually
                  lineHeight: 1.2,
                }}
              >
                we playing
              </span>
            </h1>
            <div
              style={{
                fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
                fontSize: "10px",
                color: "var(--text3)",
                marginTop: "1rem",
                letterSpacing: "0.04em",
              }}
            >
              {weeklyStats
                ? `${weeklyStats.total_listens} plays`
                : `${stats.total} songs · ${stats.liked} liked`}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { val: stats.total, lbl: "Songs", color: "var(--accent)" },
              {
                val: allTimeStats
                  ? `${Math.floor(allTimeStats.total_hours)}h`
                  : `${stats.hours}h`,
                lbl: "Listened",
                color: "var(--accent2)",
              },
              { val: stats.liked, lbl: "Liked", color: "#f472b6" },
            ].map(({ val, lbl, color }) => (
              <div
                key={lbl}
                style={{
                  padding: "12px 16px",
                  textAlign: "center",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  minWidth: "72px",
                }}
              >
                <div
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 900,
                    color,
                    lineHeight: 1,
                    fontFamily: "var(--font-family-base, 'Syne', sans-serif)",
                  }}
                >
                  {val}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
                    fontSize: "8px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--text3)",
                    marginTop: "4px",
                  }}
                >
                  {lbl}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TRENDING NOW */}
        {trendingChart.length > 0 && (
          <div
            className="hp-section"
            style={{ marginBottom: "2rem", animationDelay: "0.07s" }}
          >
            <SectionHeader label="🔥 Trending Now" sub="Deezer chart" />
            <CardRow>
              {trendingChart.map((t: any) => (
                <MediaCard
                  key={t.id}
                  title={t.title}
                  sub={t.artist}
                  art={t.artwork_url}
                  emoji="🎵"
                  badge={`#${t.position}`}
                  isActive={currentSong?.id === `yt-${t.videoId}`}
                  isPlaying={isPlaying}
                  onClick={() => playTrendingTrack(t, trendingChart)}
                  width={140}
                />
              ))}
            </CardRow>
          </div>
        )}

        {/* SIMILAR ARTISTS */}
        {similarArtists.length > 0 && (
          <div
            className="hp-section"
            style={{ marginBottom: "2rem", animationDelay: "0.1s" }}
          >
            <SectionHeader
              label={`🔗 Fans also like`}
              sub={`similar to ${topLocalArtist}`}
            />
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {similarArtists.map((a: any) => (
                <div
                  key={a.name}
                  onClick={() => handleArtistClick(a.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px 8px 8px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "40px",
                    cursor: "pointer",
                    transition: "border-color 0.15s, transform 0.15s",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--surface2)",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {a.image_url ? (
                      <img
                        src={a.image_url}
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
                  <span>{a.name}</span>
                  <span
                    style={{
                      fontFamily:
                        "var(--font-family-mono, 'DM Mono', monospace)",
                      fontSize: "9px",
                      color: "var(--text3)",
                    }}
                  >
                    {a.match_score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LISTENING PATTERN */}
        {heatmap.length > 0 && (
          <div
            className="hp-section"
            style={{ marginBottom: "2rem", animationDelay: "0.08s" }}
          >
            <SectionHeader label="🎧 Listening Pattern" sub="last 30 days" />
            <ListeningLineChart heatmap={heatmap} />
          </div>
        )}

        {/* WEEKLY CHART */}
        {weeklyChart.length > 0 && (
          <div
            className="hp-section"
            style={{ marginBottom: "2rem", animationDelay: "0.12s" }}
          >
            <SectionHeader label="📊 Your Weekly Chart" sub="Last.fm" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px",
              }}
            >
              {weeklyChart.map((t: any) => (
                <TrackRow
                  key={`${t.artist}-${t.title}`}
                  index={String(t.rank).padStart(2, "0")}
                  song={{
                    id: `lfm-${t.rank}`,
                    title: t.title,
                    artist: t.artist,
                    artwork: null,
                    videoId: null,
                    dur: "",
                    emoji: "🎵",
                    grad: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    bpm: 0,
                    key: "—",
                    plays: 0,
                    liked: false,
                    genre: null,
                    year: null,
                    track_number: null,
                    source: "youtube",
                    path: "",
                  }}
                  onClick={() => playTrendingTrack(t, weeklyChart)}
                  showPlays={false}
                  showTime={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* QUICK PICKS + RECENTLY PLAYED */}
        <div
          className="hp-section"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginBottom: "2rem",
            animationDelay: "0.15s",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "16px",
            }}
          >
            <SectionHeader label="Quick Picks" sub="shuffled" />
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {quickPicks.slice(0, 5).map((s) => (
                <TrackRow
                  key={s.id}
                  song={s}
                  isActive={currentSong?.id === s.id}
                  isPlaying={isPlaying}
                  onClick={() => {
                    useQueueStore.getState().setQueue(quickPicks, s, "library");
                    playSong(s, "quick_picks");
                  }}
                  showTime
                />
              ))}
            </div>
          </div>
          {recentlyPlayedLoading ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 120,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  className="ap-spinner ap-spinner--sm"
                  style={{ margin: "0 auto 8px" }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-family-mono, 'DM Mono', monospace)",
                    fontSize: "10px",
                    color: "var(--text3)",
                  }}
                >
                  Loading recent plays…
                </div>
              </div>
            </div>
          ) : recentlyPlayed.length > 0 ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "16px",
              }}
            >
              <SectionHeader label="Recently Played" sub="History" />
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {recentlyPlayed.slice(0, 5).map((entry, i) => {
                  const songObj: Song = {
                    id: entry.track_id || entry.id,
                    title: entry.title,
                    artist: entry.artist,
                    album: entry.album,
                    duration: entry.duration_secs || 0,
                    artwork: entry.thumbnail,
                    source: entry.source as any,
                    path: entry.path || "",
                    videoId: entry.video_id,
                    dur: "",
                    emoji: "🎵",
                    grad: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    bpm: 0,
                    key: "—",
                    plays: 0,
                    liked: false,
                    genre: null,
                    year: null,
                    track_number: null,
                  };
                  return (
                    <div
                      key={entry.id || `${entry.track_id}-${i}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "36px 1fr auto",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "background 0.12s",
                      }}
                      onClick={() => {
                        useQueueStore
                          .getState()
                          .setQueue(recentlyPlayedAsSongs, songObj, "library");
                        playSong(songObj, "recently_played");
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--surface2)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <SongArt
                        artwork={entry.thumbnail}
                        videoId={entry.video_id}
                        emoji="🎵"
                        grad="linear-gradient(135deg, var(--accent), var(--accent2))"
                        size={36}
                        radius={6}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {entry.title}
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "var(--text3)",
                            marginTop: "1px",
                          }}
                        >
                          {entry.artist}
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily:
                            "var(--font-family-mono, 'DM Mono', monospace)",
                          fontSize: "9px",
                          color: "var(--text3)",
                          flexShrink: 0,
                        }}
                      >
                        {(() => {
                          if (!entry.played_at) return "";
                          const ts =
                            typeof entry.played_at === "number"
                              ? entry.played_at * 1000
                              : new Date(entry.played_at).getTime();
                          return getTimeAgo(ts);
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            likedSongsPreview.length > 0 && (
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "16px",
                }}
              >
                <SectionHeader
                  label="❤ Liked"
                  sub="songs you love"
                  action={{
                    label: "See all",
                    onClick: () =>
                      handleNavigate("/liked", "home_liked_section"),
                  }}
                />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 0 }}
                >
                  {likedSongsPreview.slice(0, 5).map((s) => (
                    <TrackRow
                      key={s.id}
                      song={s}
                      isActive={currentSong?.id === s.id}
                      isPlaying={isPlaying}
                      onClick={() => {
                        useQueueStore
                          .getState()
                          .setQueue(likedSongsPreview, s, "library");
                        playSong(s, "liked_section");
                      }}
                      showTime
                    />
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* MOOD PICKS */}
        {moodPicks.length > 0 && (
          <div
            className="hp-section"
            style={{ marginBottom: "2rem", animationDelay: "0.2s" }}
          >
            <SectionHeader
              label={`${moodConfig[mood].icon} ${moodConfig[mood].label}`}
              sub="for right now"
            />
            <CardRow>
              {moodPicks.map((s) => (
                <MediaCard
                  key={s.id}
                  title={s.title}
                  sub={s.artist}
                  art={s.artwork || undefined}
                  emoji={s.emoji}
                  grad={s.grad}
                  videoId={s.videoId}
                  isActive={currentSong?.id === s.id}
                  isPlaying={isPlaying}
                  onClick={() => {
                    useQueueStore.getState().setQueue(moodPicks, s, "library");
                    playSong(s, "mood_picks");
                  }}
                />
              ))}
            </CardRow>
          </div>
        )}

        {/* RECENTLY VIEWED ALBUMS */}
        {recentlyViewedAlbums.length > 0 && (
          <div
            className="hp-section"
            style={{ marginBottom: "2rem", animationDelay: "0.25s" }}
          >
            <SectionHeader
              label="Recently Viewed"
              sub="albums"
              action={{
                label: "Browse",
                onClick: () => handleNavigate("/albums", "home_recent_albums"),
              }}
            />
            <CardRow>
              {recentlyViewedAlbums.map((album: any) => (
                <MediaCard
                  key={album.id}
                  title={album.title}
                  sub={album.artist}
                  art={album.cover_url}
                  emoji="💿"
                  onClick={() => handleAlbumClick(album)}
                  width={130}
                />
              ))}
            </CardRow>
          </div>
        )}

        {/* MOST PLAYED */}
        {topPlayed.length > 0 && (
          <div
            className="hp-section"
            style={{ marginBottom: "2rem", animationDelay: "0.3s" }}
          >
            <SectionHeader label="Most Played" sub="all-time" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px",
              }}
            >
              {topPlayed.map((s, i) => (
                <TrackRow
                  key={s.id}
                  index={String(i + 1).padStart(2, "0")}
                  song={s}
                  isActive={currentSong?.id === s.id}
                  isPlaying={isPlaying}
                  onClick={() => {
                    useQueueStore.getState().setQueue(topPlayed, s, "library");
                    playSong(s, "most_played");
                  }}
                  showPlays
                  showTime
                />
              ))}
            </div>
          </div>
        )}

        {/* NEW FOR YOU */}
        {newReleases.length > 0 && (
          <div
            className="hp-section"
            style={{ marginBottom: "2rem", animationDelay: "0.35s" }}
          >
            <SectionHeader label="New For You" sub="from followed artists" />
            <CardRow>
              {shuffledNewReleases.map((s) => (
                <MediaCard
                  key={s.id}
                  title={s.title}
                  sub={s.artist}
                  art={s.artwork || undefined}
                  emoji={s.emoji}
                  grad={s.grad}
                  videoId={s.videoId}
                  isActive={currentSong?.id === s.id}
                  isPlaying={isPlaying}
                  onClick={() => {
                    useQueueStore
                      .getState()
                      .setQueue(shuffledNewReleases, s, "library");
                    playSong(s, "new_for_you");
                  }}
                />
              ))}
            </CardRow>
          </div>
        )}

        {/* BECAUSE YOU LIKED */}
        {becauseYouLiked && (
          <div
            className="hp-section"
            style={{ marginBottom: "2rem", animationDelay: "0.4s" }}
          >
            <SectionHeader
              label="Because you liked"
              sub={becauseYouLiked.seed.title}
            />
            <CardRow>
              {becauseYouLiked.similar.map((s) => (
                <MediaCard
                  key={s.id}
                  title={s.title}
                  sub={s.artist}
                  art={s.artwork || undefined}
                  emoji={s.emoji}
                  grad={s.grad}
                  videoId={s.videoId}
                  isActive={currentSong?.id === s.id}
                  isPlaying={isPlaying}
                  onClick={() => {
                    useQueueStore
                      .getState()
                      .setQueue(becauseYouLiked.similar, s, "library");
                    playSong(s, "because_you_liked");
                  }}
                />
              ))}
            </CardRow>
          </div>
        )}

        {/* TOP ARTISTS */}
        {topArtists.length > 0 && (
          <div
            className="hp-section"
            style={{ marginBottom: "2rem", animationDelay: "0.45s" }}
          >
            <SectionHeader label="Top Artists" sub="this week" />
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {topArtists.map((a, i) => (
                <div
                  key={i}
                  onClick={() => handleArtistClick(a.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "7px 14px 7px 8px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "40px",
                    cursor: "pointer",
                    transition: "border-color 0.15s, transform 0.15s",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "var(--surface2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                    }}
                  >
                    🎤
                  </div>
                  <span>{a.name}</span>
                  <span
                    style={{
                      fontFamily:
                        "var(--font-family-mono, 'DM Mono', monospace)",
                      fontSize: "9px",
                      color: "var(--text3)",
                    }}
                  >
                    {a.plays}×
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LIKED SONGS */}
        {recentlyPlayed.length > 0 && likedSongsPreview.length > 0 && (
          <div
            className="hp-section"
            style={{ marginBottom: "2rem", animationDelay: "0.5s" }}
          >
            <SectionHeader
              label="❤ Liked Songs"
              sub="songs you love"
              action={{
                label: "See all",
                onClick: () => handleNavigate("/liked", "home_liked_songs"),
              }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px",
              }}
            >
              {likedSongsPreview.map((s) => (
                <TrackRow
                  key={s.id}
                  song={s}
                  isActive={currentSong?.id === s.id}
                  isPlaying={isPlaying}
                  onClick={() => {
                    useQueueStore
                      .getState()
                      .setQueue(likedSongsPreview, s, "library");
                    playSong(s, "liked_songs_section");
                  }}
                  showTime
                />
              ))}
            </div>
          </div>
        )}

        <div style={{ height: "32px" }} />
      </div>
    </div>
  );
};

export default HomePage;
