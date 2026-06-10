import React, { useState, useEffect } from "react";
import { Song } from "../../../core/entities/Song";
import { usePlayerStore } from "../../stores/playerStore";
import { useLibraryStore } from "../../stores/libraryStore";
import { tauriCommands } from "../../../services/tauriBridge";
import { useQueueStore } from "../../stores/queueStore";
import { logger } from "../../../services/logger";

interface Playlist {
  id: string;
  name: string;
}

const PlayingBars = () => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: "2px",
      height: "14px",
      width: "14px",
    }}
  >
    {[0, 0.2, 0.4].map((delay, i) => (
      <div
        key={i}
        style={{
          width: "3px",
          background: "var(--accent)",
          borderRadius: "1px",
          height: "14px",
          animation: "barBounce 0.8s ease-in-out infinite",
          animationDelay: `${delay}s`,
        }}
      />
    ))}
  </div>
);

interface SongRowProps {
  song: Song;
  index: number;
  isCurrent: boolean;
  onPlay: () => void;
}

const SongRow: React.FC<SongRowProps> = ({
  song,
  index,
  isCurrent,
  onPlay,
}) => {
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const setTriggerReload = useLibraryStore((s) => s.setTriggerReload);
  const likedIds = useLibraryStore(
    (s) => new Set(s.songs.filter((x) => x.liked).map((x) => x.id)),
  );
  const isLiked = likedIds.has(song.id) || song.liked;
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const currentProgress = usePlayerStore((s) => s.currentProgress);
  const currentSongId = usePlayerStore((s) => s.currentSong?.id);
  const setMessage = usePlayerStore((s) => s.setMessage);
  const setError = usePlayerStore((s) => s.setError);

  const isThisSongLoading = isLoading && currentSongId === song.id;
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isDownloaded, setIsDownloaded] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = React.useState(false);
  const [showQueueMenu, setShowQueueMenu] = React.useState(false);
  const [playlists, setPlaylists] = React.useState<Playlist[]>([]);
  const playlistMenuRef = React.useRef<HTMLDivElement>(null);
  const queueMenuRef = React.useRef<HTMLDivElement>(null);
  const isLikingRef = React.useRef(false);

  // State for downloads being disabled
  const [downloadsEnabled, setDownloadsEnabled] = useState<boolean | null>(
    null,
  );

  const isYouTube = song.source === "youtube";
  const isSoundCloud = song.source === "soundcloud";
  const isStreamable = isYouTube || isSoundCloud;

  // Check if downloads are enabled
  useEffect(() => {
    tauriCommands.getSetting("enable_downloads").then((value) => {
      setDownloadsEnabled(value === "true");
    });
  }, []);

  React.useEffect(() => {
    if (!song.videoId) return;
    const cached = localStorage.getItem(`dl-${song.videoId}`);
    if (cached === "true") setIsDownloaded(true);
  }, [song.videoId]);

  React.useEffect(() => {
    if (!showPlaylistMenu) return;
    tauriCommands
      .getPlaylists()
      .then((data: Playlist[]) => setPlaylists(data || []))
      .catch(() => {});
  }, [showPlaylistMenu]);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        playlistMenuRef.current &&
        !playlistMenuRef.current.contains(e.target as Node)
      ) {
        setShowPlaylistMenu(false);
      }
      if (
        queueMenuRef.current &&
        !queueMenuRef.current.contains(e.target as Node)
      ) {
        setShowQueueMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLikingRef.current) return;
    isLikingRef.current = true;
    logger.logUI("SongRow", isLiked ? "unlike" : "like", {
      songId: song.id,
      title: song.title.slice(0, 50),
      artist: song.artist,
      source: song.source,
    });
    try {
      toggleLike(song.id, song);
    } finally {
      isLikingRef.current = false;
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if downloads are disabled
    if (downloadsEnabled === false) {
      setMessage("Downloads are disabled. Enable them in Settings → Downloads");
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!song.videoId || isDownloading || isDownloaded || !isStreamable) return;
    logger.logUI("SongRow", "download_start", {
      songId: song.id,
      title: song.title.slice(0, 50),
      source: song.source,
      videoId: song.videoId,
    });
    setIsDownloading(true);
    try {
      if (isYouTube)
        await tauriCommands.downloadYoutube(song.videoId, song.title);
      else if (isSoundCloud)
        await tauriCommands.downloadSoundcloud(song.videoId, song.title);
      setIsDownloaded(true);
      localStorage.setItem(`dl-${song.videoId}`, "true");
      logger.logUI("SongRow", "download_success", {
        songId: song.id,
        title: song.title.slice(0, 50),
        source: song.source,
      });
      setMessage(`Downloaded "${song.title}"`);
      setTriggerReload();
    } catch (err) {
      logger.logError("SongRow download_failed", {
        songId: song.id,
        title: song.title.slice(0, 50),
        error: err,
      });
      console.error("Download failed:", err);
      setError(String(err));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAddToQueueEnd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.logUI("SongRow", "add_to_queue_end", {
      songId: song.id,
      title: song.title.slice(0, 50),
    });
    try {
      const queue = await tauriCommands.getQueue();
      const position = queue.length;
      await tauriCommands.addToQueueAtPosition(song, position);
      setMessage(`Added "${song.title}" to queue`);
      setTimeout(() => setMessage(null), 2000);
      setShowQueueMenu(false);
      await useQueueStore.getState()._hydrate();
    } catch (err) {
      logger.logError("SongRow add_to_queue_end_failed", {
        songId: song.id,
        title: song.title.slice(0, 50),
        error: err,
      });
      console.error("Failed to add to queue:", err);
      setError("Couldn't add song to queue. Try again.");
      setShowQueueMenu(false);
    }
  };

  const handleAddToQueueNext = async (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.logUI("SongRow", "add_to_queue_next", {
      songId: song.id,
      title: song.title.slice(0, 50),
    });
    try {
      const backendQueue = await tauriCommands.getQueue();
      const currentSongId = usePlayerStore.getState().currentSong?.id;
      const currentBackendIndex = currentSongId
        ? backendQueue.findIndex((s: Song) => s.id === currentSongId)
        : -1;
      const insertPosition =
        currentBackendIndex >= 0 ? currentBackendIndex + 1 : 0;
      await tauriCommands.addToQueueAtPosition(
        { ...song, queueTag: "next" },
        insertPosition,
      );
      setMessage(`"${song.title}" will play next`);
      setTimeout(() => setMessage(null), 2000);
      setShowQueueMenu(false);
      await useQueueStore.getState()._hydrate();
    } catch (err) {
      logger.logError("SongRow add_to_queue_next_failed", {
        songId: song.id,
        title: song.title.slice(0, 50),
        error: err,
      });
      console.error("Failed to add as next:", err);
      setError("Couldn't add song as next. Try again.");
      setShowQueueMenu(false);
    }
  };

  const handleAddToPlaylist = async (
    playlistId: string,
    playlistName: string,
  ) => {
    logger.logUI("SongRow", "add_to_playlist", {
      songId: song.id,
      title: song.title.slice(0, 50),
      playlistId,
      playlistName,
    });
    try {
      await tauriCommands.addToPlaylist(
        playlistId,
        song.id,
        song.title,
        song.artist,
        song.album || "",
        song.duration || 0,
        getPlaylistThumbnail(),
        song.source || "local",
        song.path || "",
        song.videoId || undefined,
      );
      setShowPlaylistMenu(false);
      setMessage(`Added to ${playlistName}`);
    } catch (err) {
      logger.logError("SongRow add_to_playlist_failed", {
        songId: song.id,
        title: song.title.slice(0, 50),
        playlistId,
        error: err,
      });
      console.error("Failed to add to playlist:", err);
    }
  };

  const handleDeleteSong = async (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.logUI("SongRow", "delete_song", {
      songId: song.id,
      title: song.title.slice(0, 50),
      source: song.source,
    });
    if (!confirm(`Delete "${song.title}"? This cannot be undone.`)) {
      logger.logUI("SongRow", "delete_cancelled", { songId: song.id });
      return;
    }
    try {
      await tauriCommands.deleteSong(song.id);
      logger.logUI("SongRow", "delete_success", {
        songId: song.id,
        title: song.title.slice(0, 50),
      });
      useLibraryStore.getState().setTriggerReload();
      usePlayerStore.getState().setMessage(`Deleted "${song.title}"`);
    } catch (err) {
      logger.logError("SongRow delete_failed", {
        songId: song.id,
        title: song.title.slice(0, 50),
        error: err,
      });
      console.error("Delete failed:", err);
      usePlayerStore.getState().setError(String(err));
    }
  };

  const renderThumb = (): React.ReactNode => {
    if (song.artwork)
      return (
        <img
          src={song.artwork}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "6px",
          }}
        />
      );
    if (isYouTube && song.videoId)
      return (
        <img
          src={`https://i.ytimg.com/vi/${song.videoId}/default.jpg`}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "6px",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      );
    return song.emoji ?? null;
  };

  const getPlaylistThumbnail = (): string => {
    if (song.artwork) return song.artwork;
    if (isYouTube && song.videoId)
      return `https://i.ytimg.com/vi/${song.videoId}/default.jpg`;
    return "";
  };

  // Determine if download button should be disabled
  const isDownloadDisabled = downloadsEnabled === false;
  const isDownloadButtonVisible = isStreamable && downloadsEnabled !== null;

  return (
    <div
      className={`song-row ${isCurrent ? "playing" : ""}`}
      onClick={onPlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="song-num">
        {isThisSongLoading ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="14"
            height="14"
            className="spinner"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              strokeDasharray="63"
              strokeDashoffset="21"
            />
          </svg>
        ) : isCurrent && isPlaying && currentProgress > 0 ? (
          <PlayingBars />
        ) : isHovered ? (
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        ) : (
          index + 1
        )}
      </div>
      <div className="song-thumb">
        <div className="song-thumb-inner" style={{ background: song.grad }}>
          {renderThumb()}
        </div>
      </div>
      <div className="song-info">
        <div className="song-name">
          {song.title}
          {isYouTube && <span className="yt-badge">YT</span>}
          {isSoundCloud && (
            <span className="yt-badge" style={{ background: "#ff5500" }}>
              SC
            </span>
          )}
        </div>
        <div className="song-artist">{song.artist}</div>
      </div>
      <div className="song-album">{song.album}</div>
      <div className="song-dur">{song.dur}</div>
      <div className="song-actions">
        {isStreamable && (
          <div
            className={`sm-btn ${isLiked ? "liked" : ""}`}
            onClick={handleLike}
            title={isLiked ? "Unlike" : "Like"}
          >
            <svg
              viewBox="0 0 24 24"
              fill={isLiked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </div>
        )}
        {isDownloadButtonVisible && (
          <div
            className={`sm-btn ${isDownloadDisabled ? "disabled" : ""}`}
            title={
              isDownloadDisabled
                ? "Downloads disabled. Enable in Settings → Downloads"
                : isDownloaded
                  ? "Downloaded"
                  : "Download"
            }
            onClick={handleDownload}
            style={{
              cursor: isDownloadDisabled ? "not-allowed" : "pointer",
              opacity: isDownloadDisabled ? 0.5 : 1,
              position: "relative",
            }}
          >
            {isDownloading ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="spinner"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  strokeDasharray="63"
                  strokeDashoffset="21"
                />
              </svg>
            ) : isDownloaded ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                color="var(--accent2)"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : isDownloadDisabled ? (
              // Show download icon with slash when disabled
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ opacity: 0.5 }}
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    width: "18px",
                    height: "2px",
                    background: "var(--error)",
                    transform: "rotate(-45deg)",
                    borderRadius: "1px",
                  }}
                />
              </div>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
          </div>
        )}
        <div
          className="sm-btn"
          title="Add to playlist"
          onMouseDown={(e) => {
            e.stopPropagation();
            logger.logUI("SongRow", "open_playlist_menu", { songId: song.id });
            setShowPlaylistMenu((prev) => !prev);
          }}
          style={{ position: "relative" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {showPlaylistMenu && (
            <div
              ref={playlistMenuRef}
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                zIndex: 100,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "4px",
                minWidth: "180px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
            >
              {playlists.length === 0 ? (
                <div
                  style={{
                    padding: "8px 12px",
                    fontSize: "11px",
                    color: "var(--text3)",
                  }}
                >
                  No playlists
                </div>
              ) : (
                playlists.map((pl) => (
                  <div
                    key={pl.id}
                    onMouseDown={async (e) => {
                      e.stopPropagation();
                      await handleAddToPlaylist(pl.id, pl.name);
                    }}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      fontSize: "12px",
                      color: "var(--text2)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--surface2)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {pl.name}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div
          className="sm-btn"
          title="More options"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            logger.logUI("SongRow", "open_queue_menu", { songId: song.id });
            setShowQueueMenu((prev) => !prev);
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          style={{ position: "relative" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="14"
            height="14"
          >
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="5" r="1" fill="currentColor" />
            <circle cx="12" cy="19" r="1" fill="currentColor" />
          </svg>

          {showQueueMenu && (
            <div
              ref={queueMenuRef}
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                zIndex: 100,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "4px",
                minWidth: "160px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                onMouseDown={handleAddToQueueEnd}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: "var(--text2)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--surface2)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="14"
                  height="14"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="19 15 21 17 19 19" />
                  <polyline points="5 15 3 17 5 19" />
                </svg>
                <span>Add to Queue (End)</span>
              </div>

              <div
                onMouseDown={handleAddToQueueNext}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: "var(--text2)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--surface2)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="14"
                  height="14"
                >
                  <polygon points="5,3 19,12 5,21" />
                  <path d="M12 5v14" />
                </svg>
                <span>Play Next</span>
              </div>
            </div>
          )}
        </div>

        {!isStreamable && (
          <div
            className="sm-btn"
            title="Delete song"
            onClick={handleDeleteSong}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(SongRow);
