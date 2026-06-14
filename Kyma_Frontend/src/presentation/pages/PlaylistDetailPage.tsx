import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";

const formatDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const formatTotalDuration = (songs: any[]) => {
  const total = songs.reduce((acc, s) => acc + (s.duration_secs || 0), 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
};

const randomGradient = () => {
  const hues = [280, 200, 340, 40, 160, 100, 10, 260];
  const h = hues[Math.floor(Math.random() * hues.length)];
  return `linear-gradient(135deg, hsl(${h}, 45%, 32%), hsl(${h + 30}, 38%, 18%))`;
};

const PlayingBars = () => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 14 }}>
    <div
      style={{
        width: 3,
        background: "var(--accent)",
        borderRadius: "var(--radius-xs)",
        animation: "barBounce 0.8s ease-in-out infinite",
        height: 14,
      }}
    />
    <div
      style={{
        width: 3,
        background: "var(--accent)",
        borderRadius: "var(--radius-xs)",
        animation: "barBounce 0.8s ease-in-out infinite",
        animationDelay: "0.15s",
        height: 14,
      }}
    />
    <div
      style={{
        width: 3,
        background: "var(--accent)",
        borderRadius: "var(--radius-xs)",
        animation: "barBounce 0.8s ease-in-out infinite",
        animationDelay: "0.3s",
        height: 14,
      }}
    />
  </div>
);

const PlaylistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<any[]>([]);
  const [playlist, setPlaylist] = useState<any>(null);
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const { setQueue } = useQueueStore();

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [data, playlists] = await Promise.all([
        tauriCommands.getPlaylistSongs(id!),
        tauriCommands.getPlaylists(),
      ]);
      setSongs(data || []);
      const pl = playlists.find((p: any) => p.id === id);
      if (pl) setPlaylist(pl);
    } catch (err) {
      console.error("Failed to load playlist:", err);
    }
  };

  const handlePlay = (_song: any, index: number) => {
    const songList: Song[] = songs.map((s) => ({
      id: s.song_id,
      path: s.path,
      title: s.title,
      artist: s.artist,
      album: s.album,
      duration: s.duration_secs,
      genre: null,
      year: null,
      track_number: null,
      artwork: s.thumbnail,
      source: s.source as any,
      videoId: s.video_id || undefined,
      dur: formatDuration(s.duration_secs),
      emoji: "🎵",
      grad: randomGradient(),
      bpm: 0,
      key: "—",
      plays: 0,
      liked: likedSongs.has(s.song_id),
    }));
    setQueue(songList, songList[index], "playlist");
    setCurrentSong(songList[index]);
    setProgress(0);
  };

  const handleRemove = async (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    try {
      await tauriCommands.removeFromPlaylist(id!, songId);
      loadData();
    } catch (err) {
      console.error("Failed to remove song:", err);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!confirm(`Delete "${playlist?.name}"?`)) return;
    try {
      await tauriCommands.removePlaylist(id!);
      navigate("/playlists");
    } catch (err) {
      console.error("Failed to delete playlist:", err);
    }
  };

  const toggleLike = (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    setLikedSongs((prev) => {
      const next = new Set(prev);
      next.has(songId) ? next.delete(songId) : next.add(songId);
      return next;
    });
  };

  const currentSongIndex = songs.findIndex(
    (s) => s.song_id === currentSong?.id,
  );

  return (
    <div className="ap-page">
      <div className="ap-container" style={{ paddingBottom: "6rem" }}>
        {/* Back + header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: "1.75rem",
            marginBottom: "1.5rem",
          }}
        >
          <button
            onClick={() => navigate("/playlists")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-pill)",
              color: "var(--text2)",
              fontFamily: "'Syne',sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
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
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Playlists
          </button>
        </div>

        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: "1.25rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="ap-page-eyebrow">
              {playlist?.description || "Playlist"}
            </div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1,
                margin: 0,
              }}
            >
              {playlist?.name || "Playlist"}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "var(--accent)",
                  lineHeight: 1,
                }}
              >
                {songs.length}
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 9,
                  color: "var(--text3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                tracks
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--text2)",
                  lineHeight: 1,
                }}
              >
                {formatTotalDuration(songs)}
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 9,
                  color: "var(--text3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                duration
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: "1.5rem",
          }}
        >
          <button
            onClick={() => songs.length > 0 && handlePlay(songs[0], 0)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 22px",
              background:
                "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none",
              borderRadius: "var(--radius-pill)",
              color: "#fff",
              fontFamily: "'Syne',sans-serif",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            Play All
          </button>
          <button
            onClick={handleDeletePlaylist}
            style={{
              padding: "9px 18px",
              borderRadius: "var(--radius-pill)",
              background: "transparent",
              border: "1px solid var(--red)",
              color: "var(--red)",
              fontFamily: "'Syne',sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Delete
          </button>
        </div>

        {/* Track list */}
        {songs.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 0",
              color: "var(--text3)",
              fontFamily: "'DM Mono',monospace",
              fontSize: 12,
            }}
          >
            No songs in this playlist
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr 140px 60px 70px",
                gap: 12,
                padding: "0 12px 8px",
                borderBottom: "1px solid var(--border)",
                marginBottom: 4,
                fontFamily: "'DM Mono',monospace",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text3)",
              }}
            >
              <span style={{ textAlign: "center" }}>#</span>
              <span>Title</span>
              <span>Album</span>
              <span style={{ textAlign: "right" }}>Time</span>
              <span />
            </div>

            {songs.map((song, i) => (
              <div
                key={song.song_id}
                onClick={() => handlePlay(song, i)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr 140px 60px 70px",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  border: "1px solid transparent",
                  background:
                    currentSongIndex === i
                      ? "rgba(124,106,245,0.07)"
                      : "transparent",
                  borderColor:
                    currentSongIndex === i
                      ? "rgba(124,106,245,0.18)"
                      : "transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (currentSongIndex !== i)
                    e.currentTarget.style.background = "var(--surface2)";
                }}
                onMouseLeave={(e) => {
                  if (currentSongIndex !== i)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 12,
                    color: "var(--text3)",
                    textAlign: "center",
                  }}
                >
                  {currentSongIndex === i && isPlaying ? (
                    <PlayingBars />
                  ) : (
                    i + 1
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--radius-sm)",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      background: randomGradient(),
                      overflow: "hidden",
                    }}
                  >
                    {song.thumbnail ? (
                      <img
                        src={song.thumbnail}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      "🎵"
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color:
                          currentSongIndex === i
                            ? "var(--accent2)"
                            : "var(--text)",
                      }}
                    >
                      {song.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text2)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: 1,
                      }}
                    >
                      {song.artist}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text3)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {song.album || "—"}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 11,
                    color: "var(--text3)",
                    textAlign: "right",
                  }}
                >
                  {formatDuration(song.duration_secs)}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 2,
                  }}
                >
                  <button
                    onClick={(e) => toggleLike(e, song.song_id)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      background: "none",
                      color: likedSongs.has(song.song_id)
                        ? "#f72585"
                        : "var(--text3)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      fill={
                        likedSongs.has(song.song_id) ? "currentColor" : "none"
                      }
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleRemove(e, song.song_id)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      background: "none",
                      color: "var(--text3)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistDetailPage;
