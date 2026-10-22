// Kyma_Frontend/src/presentation/pages/Home/HomePage.tsx
import React, { useMemo, useEffect, useState } from "react";
import { useLibraryStore } from "../../stores/libraryStore";
import { usePlayerStore } from "../../stores/playerStore";
import { Song } from "../../../core/entities/Song";
import { tauriCommands } from "../../../services/tauriBridge";
import { useNavigate } from "react-router-dom";
import { useLibrary } from "../../hooks/useLibrary";
import { useRecentlyPlayedStore } from "../../stores/recentlyPlayedStore";
import { useHomeDataStore } from "../../stores/homeDataStore";
import { useQueueStore } from "../../stores/queueStore";
import { logger } from "../../../services/logger";
import { useUpdater } from "../../hooks/useUpdater";
import { useSystemStore } from "../../stores/systemStore";
import { makeSong } from "../../../lib/song";

// Section components
import HeroSection from "./components/HeroSection";
import TrendingSection from "./components/TrendingSection";
import SimilarArtists from "./components/SimilarArtists";
import ListeningPattern from "./components/ListeningPattern";
import WeeklyChart from "./components/WeeklyChart";
import QuickPicks from "./components/QuickPicks";
import MoodPicks from "./components/MoodPicks";
import RecentlyViewed from "./components/RecentlyViewed";
import MostPlayed from "./components/MostPlayed";
import NewForYou from "./components/NewForYou";
import BecauseYouLiked from "./components/BecauseYouLiked";
import TopArtists from "./components/TopArtists";
import LikedSongs from "./components/LikedSongs";

// Helpers
import shuffle from "./helpers/shuffle";
import { totalListeningHours, topArtist } from "./helpers/stats";
import { getGreeting, getMood } from "./helpers/greetings";
import trendingTrackToSong from "./helpers/trendingTrackToSong";

const RECENTLY_VIEWED_KEY = "kyma_recently_viewed_albums";

function loadRecentlyViewedAlbums(): any[] {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? JSON.parse(raw).slice(0, 6) : [];
  } catch {
    return [];
  }
}

const HomePage: React.FC = () => {
  const { songs } = useLibraryStore();
  const { loading } = useLibrary();
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const navigate = useNavigate();
  const { ytdlpOutdated, ytdlpVersion, updateYtdlp } = useSystemStore();

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
  const { updateAvailable, updateVersion, downloadAndInstall } = useUpdater();

  useEffect(() => {
    loadRecentPlays();
  }, [songs, currentSong?.id]);

  const playSong = (song: Song, source: string) => {
    logger.logUI("HomePage", "play_song", {
      songId: song.id,
      title: song.title.slice(0, 50),
      artist: song.artist,
      source: source,
    });
    setCurrentSong(song);
    setProgress(0);
  };

  const playTrendingTrack = (track: any, allTracks?: any[]) => {
    if (!track.videoId) return;
    const song = trendingTrackToSong(track);

    if (allTracks?.length) {
      const queue = allTracks.filter((t) => t.videoId).map(trendingTrackToSong);
      useQueueStore.getState().setQueue(queue, song, "library");
    }

    playSong(song, "trending");
  };

  const handleSetQueue = (songs: Song[], startSong: Song) => {
    useQueueStore.getState().setQueue(songs, startSong, "library");
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

  const recentlyPlayedAsSongs: Song[] = useMemo(
    () =>
      recentlyPlayed.slice(0, 10).map((e) =>
        makeSong({
          id: e.track_id || e.id,
          path: e.path || "",
          title: e.title,
          artist: e.artist,
          album: e.album,
          duration: e.duration_secs || 0,
          artwork: e.thumbnail,
          source: e.source as any,
          videoId: e.video_id,
          dur: "",
        }),
      ),
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
          gap: 16,
          height: "100%",
        }}
      >
        <div style={{ fontSize: 64 }}>🎵</div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: "var(--font-family-base)",
          }}
        >
          Welcome to Kyma
        </div>
        <div
          style={{
            fontSize: 14,
            color: "var(--text2)",
            textAlign: "center",
            maxWidth: 400,
            lineHeight: 1.6,
          }}
        >
          Your music library is empty. Let's get started by adding your music
          folder.
        </div>
        <div
          style={{
            marginTop: 8,
            padding: "16px 24px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            maxWidth: 360,
            width: "100%",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-family-mono)",
              fontSize: 10,
              color: "var(--text3)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Quick Setup
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { step: "1", text: "Click the", action: "Settings", icon: "⚙️" },
              { step: "2", text: "Select the", action: "Library", icon: "📂" },
              { step: "3", text: "Click", action: "Add Folder", icon: "➕" },
              {
                step: "4",
                text: "Choose your music folder and start listening!",
                icon: "🎧",
              },
            ].map(({ step, text, action, icon }) => (
              <div
                key={step}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "var(--radius-circle)",
                    background: "var(--accent)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {step}
                </span>
                <span style={{ color: "var(--text2)" }}>
                  {text}{" "}
                  <span style={{ color: "var(--accent2)", fontWeight: 600 }}>
                    {action}
                  </span>
                </span>
                <span style={{ marginLeft: "auto", opacity: 0.6 }}>{icon}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => navigate("/settings")}
          style={{
            marginTop: 4,
            padding: "10px 28px",
            background:
              "linear-gradient(135deg, var(--accent), var(--accent2))",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: "#fff",
            fontFamily: "var(--font-family-base)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Open Settings
        </button>
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
        <HeroSection
          greeting={greeting}
          stats={stats}
          weeklyStats={weeklyStats}
          allTimeStats={allTimeStats}
          updateAvailable={updateAvailable}
          updateVersion={updateVersion}
          onUpdateClick={downloadAndInstall}
          ytdlpOutdated={ytdlpOutdated}
          ytdlpVersion={ytdlpVersion}
          onUpdateYtdlp={updateYtdlp}
        />

        <TrendingSection
          trendingChart={trendingChart}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlayTrending={playTrendingTrack}
        />

        <SimilarArtists
          similarArtists={similarArtists}
          topLocalArtist={topLocalArtist}
          onArtistClick={handleArtistClick}
        />

        <ListeningPattern heatmap={heatmap} />

        <WeeklyChart
          weeklyChart={weeklyChart}
          onPlayTrending={playTrendingTrack}
        />

        <QuickPicks
          quickPicks={quickPicks}
          recentlyPlayed={recentlyPlayed}
          recentlyPlayedLoading={recentlyPlayedLoading}
          recentlyPlayedAsSongs={recentlyPlayedAsSongs}
          likedSongsPreview={likedSongsPreview}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlaySong={playSong}
          onSetQueue={handleSetQueue}
          onNavigate={handleNavigate}
        />

        <MoodPicks
          moodPicks={moodPicks}
          moodConfig={moodConfig}
          mood={mood}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlaySong={playSong}
          onSetQueue={handleSetQueue}
        />

        <RecentlyViewed
          recentlyViewedAlbums={recentlyViewedAlbums}
          onAlbumClick={handleAlbumClick}
          onNavigate={handleNavigate}
        />

        <MostPlayed
          topPlayed={topPlayed}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlaySong={playSong}
          onSetQueue={handleSetQueue}
        />

        <NewForYou
          shuffledNewReleases={shuffledNewReleases}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlaySong={playSong}
          onSetQueue={handleSetQueue}
        />

        <BecauseYouLiked
          becauseYouLiked={becauseYouLiked}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlaySong={playSong}
          onSetQueue={handleSetQueue}
        />

        <TopArtists topArtists={topArtists} onArtistClick={handleArtistClick} />

        <LikedSongs
          recentlyPlayed={recentlyPlayed}
          likedSongsPreview={likedSongsPreview}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlaySong={playSong}
          onSetQueue={handleSetQueue}
          onNavigate={handleNavigate}
        />

        <div style={{ height: "32px" }} />
      </div>
    </div>
  );
};

export default HomePage;
