import React, { useEffect, useState, useRef } from "react";
import SongRow from "../components/Library/SongRow";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { useLibraryStore } from "../stores/libraryStore";
import { useSystemStore } from "../stores/systemStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";

const MUSIC_EMOJIS = [
  "🎵", "🎶", "🎧", "🎼", "🎹", "🎸", "🎤", "🥁", "🎺", "🎷", "🪕", "🎻", "💿", "📻", "🔊", "🎙️",
];
const randomEmoji = () =>
  MUSIC_EMOJIS[Math.floor(Math.random() * MUSIC_EMOJIS.length)];

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\(.*?(official.*?|video|audio|lyrics|lyric|hd|hq|explicit|clean|visualizer|music).*?\)/gi, "")
    .replace(/\s*\[.*?(official.*?|video|audio|lyrics|hd|hq).*?\]/gi, "")
    .replace(/\s*\|\s*.*$/, "")
    .replace(/\s*-\s*$/, "")
    .trim();
}

const TRENDING_QUERIES = [
  { label: "Hot Right Now", query: "top english hits 2025 2026 official audio", scQuery: "top english hits 2025" },
  { label: "New Music", query: "new english song 2025 2026 official video", scQuery: "new english music 2025" },
  { label: "Hip Hop", query: "american hip hop 2025 2026 official video", scQuery: "american hip hop 2025" },
  { label: "Pop", query: "english pop 2025 2026 official audio vevo", scQuery: "english pop 2025" },
  { label: "Electronic", query: "english electronic music 2025 2026 official", scQuery: "english electronic 2025" },
  { label: "R&B", query: "american rnb 2025 2026 official audio", scQuery: "american rnb soul 2025" },
  { label: "Country", query: "american country music 2025 2026 official video", scQuery: "american country 2025" },
  { label: "Latin", query: "latin pop english 2025 2026 official video", scQuery: "latin pop 2025" },
  { label: "Afrobeats", query: "afrobeats english 2025 2026 official video", scQuery: "afrobeats english 2025" },
  { label: "Rock", query: "english rock 2025 2026 official audio", scQuery: "english rock band 2025" },
];

const randomGradient = (seed: string) => {
  const hash = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 40, 160, 100, 10, 260, 320, 180];
  const h = hues[hash % hues.length];
  return `linear-gradient(135deg, hsl(${h}, 45%, 32%), hsl(${h + 40}, 38%, 18%))`;
};

const SkeletonCard = ({ index }: { index: number }) => (
  <div className="ex-skeleton" style={{ animationDelay: `${index * 0.04}s` }}>
    <div className="ex-skeleton-img" />
    <div className="ex-skeleton-body">
      <div className="ex-skeleton-line" style={{ width: "72%" }} />
      <div className="ex-skeleton-line" style={{ width: "48%", marginTop: "6px" }} />
    </div>
  </div>
);

const ExplorePage: React.FC = () => {
  const { currentSong, setCurrentSong, setProgress } = usePlayerStore();
  const { setQueue } = useQueueStore();
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const { ytdlpAvailable } = useSystemStore();
  const [ytResults, setYtResults] = useState<Song[]>([]);
  const [scResults, setScResults] = useState<Song[]>([]);
  const [activeQuery, setActiveQuery] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sourceTab, setSourceTab] = useState<"youtube" | "soundcloud">("youtube");
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (ytdlpAvailable) {
      setYtResults([]);
      setScResults([]);
      setLoading(true);
      loadTrending(activeQuery);
    }
  }, [activeQuery, ytdlpAvailable]);

  const loadTrending = async (queryIndex: number) => {
    if (!ytdlpAvailable) return;
    const requestId = ++requestIdRef.current;
    try {
      const { query, scQuery } = TRENDING_QUERIES[queryIndex];
      const [yt, sc] = await Promise.all([
        tauriCommands.searchYoutube(query),
        tauriCommands.searchSoundcloud(scQuery),
      ]);
      if (requestId !== requestIdRef.current) return;

      const ytMapped = (yt || []).map((r: any) => ({
        id: `yt-${r.id}`, path: "", title: cleanTitle(r.title), artist: r.artist,
        album: "YouTube", duration: r.duration_secs, genre: null, year: null,
        track_number: null, artwork: r.thumbnail, source: "youtube" as any,
        videoId: r.id, dur: r.duration_str, emoji: "▶️",
        grad: "linear-gradient(135deg, var(--accent), var(--accent2))",
        bpm: 0, key: "—", plays: 0, liked: false,
      }));

      const scMapped = (sc || []).map((r: any) => ({
        id: `sc-${r.id}`, path: "", title: cleanTitle(r.title), artist: r.artist,
        album: "SoundCloud", duration: r.duration_secs, genre: null, year: null,
        track_number: null, artwork: r.thumbnail, source: "soundcloud" as any,
        videoId: r.id, dur: r.duration_str, emoji: randomEmoji(),
        grad: "linear-gradient(135deg, var(--accent), var(--accent2))",
        bpm: 0, key: "—", plays: 0, liked: false,
      }));

      setYtResults(ytMapped);
      setScResults(scMapped);
    } catch (err) {
      console.error("Failed to load trending:", err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const allSongs = sourceTab === "youtube" ? ytResults : scResults;

  const handlePlay = (song: Song, _index: number) => {
    setQueue(allSongs, song, "library");
    setCurrentSong(song);
    setProgress(0);
  };

  const handlePlayAll = () => {
    if (allSongs.length > 0) handlePlay(allSongs[0], 0);
  };

  const handleLike = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    const isSC = song.source === "soundcloud";
    try {
      if (isSC) {
        const result = await tauriCommands.toggleLikeSoundcloud({
          trackId: song.id, title: song.title, artist: song.artist,
          album: song.album || "SoundCloud", durationSecs: song.duration || 0,
          thumbnail: song.artwork || "", videoId: song.videoId, path: song.path || "",
        });
        song.liked = result;
      } else {
        toggleLike(song.id, song.liked ? undefined : song);
        await tauriCommands.toggleLike({ trackId: song.id });
        if (!song.liked) {
          await tauriCommands.saveLikedSong({
            id: song.id, title: song.title, artist: song.artist,
            album: song.album || "", durationSecs: song.duration || 0,
            thumbnail: song.artwork || "", videoId: song.videoId,
            source: song.source || "youtube", path: song.path || "",
          });
        }
      }
      setYtResults([...ytResults]);
      setScResults([...scResults]);
    } catch (err) {
      console.error("Failed to toggle like:", err);
      toggleLike(song.id);
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="ex-header">
        {!ytdlpAvailable && (
          <div style={{ padding: "10px 16px", marginBottom: 12, borderRadius: 8, background: "rgba(255,170,50,0.08)", border: "1px solid rgba(255,170,50,0.2)", color: "#ffaa33", fontFamily: "'DM Mono',monospace", fontSize: 11, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠️</span> yt-dlp not installed. Streaming features unavailable. Run: pip install yt-dlp
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
            <button className={`ex-toggle-btn${viewMode === "list" ? " active" : ""}`} onClick={() => setViewMode("list")} title="List view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button className={`ex-toggle-btn${viewMode === "grid" ? " active" : ""}`} onClick={() => setViewMode("grid")} title="Grid view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
          </div>
        </div>
        <div className="ex-tape">
          {TRENDING_QUERIES.map((q, i) => (
            <button key={q.query} className={`ex-chip${activeQuery === i ? " active" : ""}`} onClick={() => { if (!ytdlpAvailable) return; setActiveQuery(i); }}>
              {q.label}
            </button>
          ))}
        </div>
        <div className="ex-source-tabs">
          <button className={`ex-source-tab${sourceTab === "youtube" ? " active" : ""}`} onClick={() => { if (!ytdlpAvailable) return; setSourceTab("youtube"); }}>
            YouTube ({ytResults.length})
          </button>
          <button className={`ex-source-tab${sourceTab === "soundcloud" ? " active" : ""}`} onClick={() => { if (!ytdlpAvailable) return; setSourceTab("soundcloud"); }}>
            SoundCloud ({scResults.length})
          </button>
        </div>
        {!loading && allSongs.length > 0 && (
          <div className="ex-strip">
            <button className="ex-play-circle" onClick={handlePlayAll}>
              <svg viewBox="0 0 24 24" fill="#fff" width="16" height="16" style={{ marginLeft: "2px" }}>
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </button>
            <div>
              <div className="ex-strip-title">{TRENDING_QUERIES[activeQuery].label}</div>
              <div className="ex-strip-count">{allSongs.length} tracks</div>
            </div>
          </div>
        )}
      </div>

      <div className="ex-content">
        {!ytdlpAvailable ? (
          <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text3)", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>
            Install yt-dlp to explore trending music
          </div>
        ) : loading ? (
          <div className="ex-grid" style={{ marginTop: "1rem" }}>
            {Array.from({ length: 16 }).map((_, i) => <SkeletonCard key={i} index={i} />)}
          </div>
        ) : viewMode === "grid" ? (
          <div className="ex-grid">
            {allSongs.map((song, idx) => {
              const isActive = currentSong?.id === song.id;
              const isYt = song.source !== "soundcloud";
              return (
                <div key={song.id} className={`ex-card${isActive ? " is-active" : ""}`} style={{ animationDelay: `${idx * 0.022}s` }} onClick={() => handlePlay(song, idx)}>
                  <button className="ex-like-btn" onClick={(e) => handleLike(e, song)} title={song.liked ? "Unlike" : "Like"} style={{ color: song.liked ? "#ff4466" : "rgba(255,255,255,0.7)" }}>
                    <svg viewBox="0 0 24 24" fill={song.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </button>
                  <span className={`ex-card-badge ${isYt ? "yt" : "sc"}`}>{isYt ? "YT" : "SC"}</span>
                  <div className="ex-card-art" style={{ background: song.grad || randomGradient(song.title) }}>
                    {song.artwork ? (
                      <img src={song.artwork} alt="" loading="lazy" />
                    ) : song.videoId && isYt ? (
                      <img src={`https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`} alt="" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : song.emoji}
                    <div className="ex-card-overlay">
                      {isActive ? (
                        <div className="ex-card-bars">
                          {[0, 0.15, 0.3].map((d, bi) => (
                            <div key={bi} className="ex-bar" style={{ height: "16px", animation: "exBarBounce 0.75s ease-in-out infinite", animationDelay: `${d}s` }} />
                          ))}
                        </div>
                      ) : (
                        <div className="ex-card-play-btn">
                          <svg viewBox="0 0 24 24" fill="#fff" width="16" height="16" style={{ marginLeft: "2px" }}>
                            <polygon points="5,3 19,12 5,21" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ex-card-info">
                    <div className="ex-card-title" style={{ color: isActive ? "var(--accent2)" : "var(--text)" }}>{song.title}</div>
                    <div className="ex-card-artist">{song.artist}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {allSongs.map((song, idx) => (
              <SongRow key={song.id} song={song} index={idx} isCurrent={currentSong?.id === song.id} onPlay={() => handlePlay(song, idx)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
