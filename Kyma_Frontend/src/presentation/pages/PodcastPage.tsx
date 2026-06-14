import React, { useState, useEffect } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { useSystemStore } from "../stores/systemStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";

const CATEGORIES = [
  { label: "Comedy", query: "comedy podcast full episode 2025" },
  { label: "True Crime", query: "true crime podcast full episode" },
  { label: "Tech", query: "tech podcast full episode 2025" },
  { label: "Stoicism", query: "stoicism philosophy podcast full episode" },
  { label: "Self Help", query: "self improvement podcast full episode" },
  { label: "Relationships", query: "relationship advice podcast full episode" },
  { label: "Conspiracy", query: "conspiracy theory podcast full episode" },
  { label: "Scary Stories", query: "scary stories podcast full episode" },
  {
    label: "Space & Sci-Fi",
    query: "space universe aliens podcast full episode",
  },
  { label: "Money", query: "money finance podcast full episode 2025" },
  { label: "Gaming", query: "gaming podcast full episode" },
  { label: "Anime", query: "anime podcast full episode" },
];

const randomGradient = (seed: string) => {
  const hash = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 40, 160, 100, 10, 260, 320, 180];
  const h = hues[hash % hues.length];
  return `linear-gradient(135deg, hsl(${h}, 45%, 32%), hsl(${h + 30}, 38%, 18%))`;
};

const formatDuration = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
};

const PodcastPage: React.FC = () => {
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const { setQueue } = useQueueStore();
  const setError = usePlayerStore((s) => s.setError);
  const { ytdlpAvailable, ytdlpChecked } = useSystemStore();
  const [episodes, setEpisodes] = useState<Song[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!ytdlpAvailable) {
      if (ytdlpChecked) setLoading(false);
      return;
    }

    const query = searchQuery.trim()
      ? `${searchQuery} podcast full episode`
      : CATEGORIES[activeCategory].query;

    setLoading(true);
    setEpisodes([]);

    const timer = setTimeout(() => {
      tauriCommands
        .searchYoutube(query)
        .then((yt: any[]) => {
          const filtered = (yt || [])
            .filter((r: any) => {
              const dur = r.duration_secs;
              return dur && dur > 600;
            })
            .map((r: any) => ({
              id: `yt-${r.id}`,
              path: "",
              title: r.title,
              artist: r.artist,
              album: "Podcast",
              duration: r.duration_secs,
              genre: null,
              year: null,
              track_number: null,
              artwork: r.thumbnail,
              source: "youtube" as any,
              videoId: r.id,
              dur: formatDuration(r.duration_secs),
              emoji: "🎙️",
              grad: "linear-gradient(135deg, var(--accent), var(--accent2))",
              bpm: 0,
              key: "—",
              plays: 0,
              liked: false,
            }));
          setEpisodes(filtered);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load podcasts:", err);
          setError(
            "Couldn't load podcasts. Check your internet connection and try again.",
          );
          setLoading(false);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [activeCategory, searchQuery, ytdlpAvailable, ytdlpChecked, setError]);

  const handlePlay = (song: Song, _index: number) => {
    setQueue(episodes, song, "library");
    setCurrentSong(song);
    setProgress(0);
  };

  const currentSongId = currentSong?.id;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div className="pod-header">
        <div className="pod-eyebrow">Listen</div>
        <h1 className="pod-title">Podcasts</h1>
        <div className="pod-search">
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
            type="text"
            placeholder={
              ytdlpAvailable ? "Search podcasts..." : "yt-dlp required..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!ytdlpAvailable}
          />
        </div>
        <div className="pod-tape">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              className={`pod-chip${activeCategory === i ? " active" : ""}`}
              onClick={() => {
                if (!ytdlpAvailable) return;
                setActiveCategory(i);
                setSearchQuery("");
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {ytdlpChecked && !ytdlpAvailable && (
          <div
            style={{
              padding: "10px 16px",
              margin: "0.5rem 0",
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
            <span>⚠️</span> yt-dlp not installed. Podcasts unavailable. Run: pip
            install yt-dlp
          </div>
        )}
      </div>

      <div className="pod-content">
        {!ytdlpAvailable && ytdlpChecked ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 0",
              color: "var(--text3)",
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
            }}
          >
            Install yt-dlp to browse podcasts
          </div>
        ) : loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "2rem 0",
              color: "var(--text3)",
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
            }}
          >
            <div className="ap-spinner ap-spinner--sm" />
            Loading episodes...
          </div>
        ) : episodes.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 0",
              color: "var(--text3)",
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
            }}
          >
            No episodes found
          </div>
        ) : (
          <div>
            <div className="pod-track-header">
              <span className="pod-track-num">#</span>
              <span></span>
              <span>Episode</span>
              <span className="pod-track-dur">Duration</span>
            </div>
            {episodes.map((ep, i) => {
              const isActive = currentSongId === ep.id;
              return (
                <div
                  key={ep.id}
                  className={`pod-track-row${isActive ? " active" : ""}`}
                  onClick={() => handlePlay(ep, i)}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "var(--surface)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div className="pod-track-num">
                    {isActive && isPlaying ? "▶" : i + 1}
                  </div>
                  <div
                    className="pod-track-thumb"
                    style={{ background: ep.grad || randomGradient(ep.title) }}
                  >
                    {ep.artwork ? (
                      <img src={ep.artwork} alt="" />
                    ) : ep.videoId ? (
                      <img
                        src={`https://i.ytimg.com/vi/${ep.videoId}/default.jpg`}
                        alt=""
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      "🎙️"
                    )}
                  </div>
                  <div className="pod-track-info">
                    <div
                      className="pod-track-title"
                      style={{
                        color: isActive ? "var(--accent2)" : "var(--text)",
                      }}
                    >
                      {ep.title}
                    </div>
                    <div className="pod-track-artist">{ep.artist}</div>
                  </div>
                  <div className="pod-track-dur">{ep.dur}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PodcastPage;
