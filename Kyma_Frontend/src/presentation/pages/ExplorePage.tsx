// Kyma_Frontend/src/presentation/pages/ExplorePage.tsx
import React, { useEffect, useState } from "react";
import SongRow from "../components/Library/SongRow";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { useLibraryStore } from "../stores/libraryStore";
import { useSystemStore } from "../stores/systemStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";
import { resolveAndPlaySong } from "../hooks/useResolveAndPlay";
import { useExplorePrefetch } from "../hooks/useExplorePrefetch";
import { formatDuration } from "../../lib/formatTime";
import { randomGradient } from "../../lib/gradients";
import { makeSong } from "../../lib/song";

const EXPLORE_CATEGORIES = [
  { label: "Trending", type: "chart" as const },
  { label: "Hip Hop", type: "playlist" as const, query: "hip hop hits" },
  { label: "Pop", type: "playlist" as const, query: "pop hits" },
  { label: "Electronic", type: "playlist" as const, query: "electronic dance" },
  { label: "R&B", type: "playlist" as const, query: "rnb hits" },
  { label: "Rock", type: "playlist" as const, query: "rock classics" },
  { label: "Latin", type: "playlist" as const, query: "latin hits" },
  { label: "Afrobeats", type: "playlist" as const, query: "afrobeats" },
  { label: "Country", type: "playlist" as const, query: "country hits" },
  { label: "Jazz", type: "playlist" as const, query: "jazz classics" },
];

const SkeletonCard = ({ index }: { index: number }) => (
  <div className="ex-skeleton" style={{ animationDelay: `${index * 0.04}s` }}>
    <div className="ex-skeleton-img" />
    <div className="ex-skeleton-body">
      <div className="ex-skeleton-line" style={{ width: "72%" }} />
      <div
        className="ex-skeleton-line"
        style={{ width: "48%", marginTop: "6px" }}
      />
    </div>
  </div>
);

const ExplorePage: React.FC = () => {
  const { currentSong } = usePlayerStore();
  const { setQueue } = useQueueStore();
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const { ytdlpAvailable } = useSystemStore();
  const [tracks, setTracks] = useState<Song[]>([]);
  const [activeQuery, setActiveQuery] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useExplorePrefetch(tracks);

  useEffect(() => {
    if (ytdlpAvailable) {
      setTracks([]);
      setLoading(true);
      loadCategory(activeQuery);
    }
  }, [activeQuery, ytdlpAvailable]);

  const loadCategory = async (queryIndex: number) => {
    if (!ytdlpAvailable) return;
    try {
      const category = EXPLORE_CATEGORIES[queryIndex];
      let deezerTracks: any[];

      if (category.type === "chart") {
        deezerTracks = await tauriCommands.getDeezerChart();
      } else {
        deezerTracks = await tauriCommands.getDeezerPlaylistTracks(
          category.query!,
        );
      }

      // Get liked song IDs from store
      const likedIds = useLibraryStore
        .getState()
        .songs.filter((s) => s.liked)
        .map((s) => s.id);

      const mapped: Song[] = (deezerTracks || []).map((t: any, i: number) =>
        makeSong({
          id: `dz-${t.id || i}`,
          title: t.title,
          artist: t.artist,
          album: t.album || category.label,
          duration: t.duration_secs,
          track_number: t.position || i + 1,
          artwork: t.artwork_url,
          source: "youtube",
          videoId: undefined,
          dur: formatDuration(t.duration_secs),
          grad: randomGradient(t.title),
          liked: likedIds.includes(`dz-${t.id || i}`),
        }),
      );

      setTracks(mapped);
    } catch (err) {
      console.error("Failed to load category:", err);
    } finally {
      setLoading(false);
    }
  };

  const resolveAndPlay = async (song: Song) => {
    setResolvingId(song.id);
    setQueue(tracks, song, "library");
    await resolveAndPlaySong(song);
    setResolvingId(null);
  };

  const handlePlay = (song: Song, _index: number) => {
    resolveAndPlay(song);
  };

  const handlePlayAll = async () => {
    if (tracks.length === 0) return;

    const firstUnresolved = tracks.find((t) => !t.videoId);
    if (firstUnresolved) {
      await resolveAndPlay(firstUnresolved);
    } else {
      handlePlay(tracks[0], 0);
    }
  };

  const handleLike = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    try {
      const newLiked = !song.liked;
      toggleLike(song.id, song.liked ? undefined : song);
      await tauriCommands.toggleLike({ trackId: song.id });

      // Update the specific song in tracks
      setTracks((prevTracks) =>
        prevTracks.map((t) =>
          t.id === song.id ? { ...t, liked: newLiked } : t,
        ),
      );
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div className="ex-header">
        {!ytdlpAvailable && (
          <div
            style={{
              padding: "10px 16px",
              marginBottom: 12,
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
            <span>⚠️</span> yt-dlp not installed. Streaming features
            unavailable. Run: pip install yt-dlp
          </div>
        )}
        <div className="ex-header-top">
          <div className="ex-header-left">
            <div className="ex-eyebrow">Discovery</div>
            <h1 className="ex-title">
              <span className="ex-title-dim">Explore</span>
              <span className="ex-title-accent">Trending</span>
            </h1>
          </div>
          <div className="ex-view-toggle">
            <button
              className={`ex-toggle-btn${viewMode === "list" ? " active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="13"
                height="13"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              className={`ex-toggle-btn${viewMode === "grid" ? " active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="13"
                height="13"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
          </div>
        </div>
        <div className="ex-tape">
          {EXPLORE_CATEGORIES.map((q, i) => (
            <button
              key={q.label}
              className={`ex-chip${activeQuery === i ? " active" : ""}`}
              onClick={() => {
                if (!ytdlpAvailable) return;
                setActiveQuery(i);
              }}
            >
              {q.label}
            </button>
          ))}
        </div>
        {!loading && tracks.length > 0 && (
          <div className="ex-strip">
            <button className="ex-play-circle" onClick={handlePlayAll}>
              <svg
                viewBox="0 0 24 24"
                fill="#fff"
                width="16"
                height="16"
                style={{ marginLeft: "2px" }}
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </button>
            <div>
              <div className="ex-strip-title">
                {EXPLORE_CATEGORIES[activeQuery].label}
              </div>
              <div className="ex-strip-count">{tracks.length} tracks</div>
            </div>
          </div>
        )}
      </div>

      <div className="ex-content">
        {!ytdlpAvailable ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 0",
              color: "var(--text3)",
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
            }}
          >
            Install yt-dlp to explore trending music
          </div>
        ) : loading ? (
          <div className="ex-grid" style={{ marginTop: "1rem" }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </div>
        ) : viewMode === "grid" ? (
          <div className="ex-grid">
            {tracks.map((song, idx) => {
              const isActive = currentSong?.id === song.id;
              const isResolving = resolvingId === song.id;
              return (
                <div
                  key={song.id}
                  className={`ex-card${isActive ? " is-active" : ""}`}
                  style={{ animationDelay: `${idx * 0.022}s` }}
                  onClick={() => handlePlay(song, idx)}
                >
                  <button
                    className="ex-like-btn"
                    onClick={(e) => handleLike(e, song)}
                    style={{
                      color: song.liked
                        ? "var(--accent2)"
                        : "rgba(255,255,255,0.7)",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill={song.liked ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      width="14"
                      height="14"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </button>
                  <div
                    className="ex-card-art"
                    style={{
                      background: song.grad || randomGradient(song.title),
                    }}
                  >
                    {song.artwork ? (
                      <img src={song.artwork} alt="" loading="lazy" />
                    ) : (
                      song.emoji
                    )}
                    <div className="ex-card-overlay">
                      {isResolving ? (
                        <div
                          className="ap-spinner ap-spinner--sm"
                          style={{ width: 20, height: 20 }}
                        />
                      ) : isActive ? (
                        <div className="ex-card-bars">
                          {[0, 0.15, 0.3].map((d, bi) => (
                            <div
                              key={bi}
                              className="ex-bar"
                              style={{
                                height: "16px",
                                animation:
                                  "exBarBounce 0.75s ease-in-out infinite",
                                animationDelay: `${d}s`,
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="ex-card-play-btn">
                          <svg
                            viewBox="0 0 24 24"
                            fill="#fff"
                            width="16"
                            height="16"
                            style={{ marginLeft: "2px" }}
                          >
                            <polygon points="5,3 19,12 5,21" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ex-card-info">
                    <div
                      className="ex-card-title"
                      style={{
                        color: isActive ? "var(--accent2)" : "var(--text)",
                      }}
                    >
                      {song.title}
                    </div>
                    <div className="ex-card-artist">{song.artist}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {tracks.map((song, idx) => (
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
      </div>
    </div>
  );
};

export default ExplorePage;
