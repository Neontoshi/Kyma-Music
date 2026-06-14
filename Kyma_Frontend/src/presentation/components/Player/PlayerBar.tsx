import React, { useState } from "react";
import { usePlayerContext as usePlayer } from "../../hooks/PlayerContext";
import VolumeControl from "./VolumeControl";
import ProgressSlider from "./ProgressSlider";
import Toast from "../Toast";
import { usePlayerStore } from "../../stores/playerStore";
import { useQueueStore } from "../../stores/queueStore";
import { Song } from "../../../core/entities/Song";
import { logger } from "../../../services/logger";

const PlayerBar: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    isShuffle,
    repeatMode,
    togglePlay,
    nextSong,
    prevSong,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();
  const isLoading = usePlayerStore((s) => s.isLoading);
  const { queue, currentIndex, removeFromQueue, clearQueue, setIndex } =
    useQueueStore();
  const [showQueueModal, setShowQueueModal] = useState(false);

  if (!currentSong) {
    return (
      <div
        className="player-bar"
        style={{ padding: "8px 20px", minHeight: "64px" }}
      >
        <div
          style={{
            flex: 1,
            textAlign: "center",
            color: "var(--text3)",
            fontSize: "13px",
          }}
        >
          Select a song to start playing
        </div>
        <Toast />
      </div>
    );
  }

  const getRepeatIcon = () => {
    if (repeatMode === 0) {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      );
    } else if (repeatMode === 1) {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: "var(--accent2)" }}
        >
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      );
    } else {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: "var(--accent2)" }}
        >
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    }
  };

  const handlePlaySong = (song: Song, idx: number) => {
    logger.logUI("PlayerBar", "play_from_queue", {
      songId: song.id,
      title: song.title.slice(0, 50),
      position: idx,
    });
    setIndex(idx);
    usePlayerStore.getState().setCurrentSong(song);
    usePlayerStore.getState().setProgress(0);
    setShowQueueModal(false);
  };

  const handleOpenQueue = () => {
    logger.logUI("PlayerBar", "open_queue_modal", { queueSize: queue.length });
    setShowQueueModal(true);
  };

  const handleCloseQueue = () => {
    logger.logUI("PlayerBar", "close_queue_modal", {});
    setShowQueueModal(false);
  };

  const handleClearQueue = async () => {
    const size = queue.length;
    logger.logUI("PlayerBar", "clear_queue_clicked", { queueSize: size });
    if (confirm("Clear entire queue?")) {
      logger.logUI("PlayerBar", "clear_queue_confirmed", { queueSize: size });
      await clearQueue();
    } else {
      logger.logUI("PlayerBar", "clear_queue_cancelled", {});
    }
  };

  const handleRemoveFromQueue = (songId: string, songTitle: string) => {
    logger.logUI("PlayerBar", "remove_from_queue", {
      songId,
      title: songTitle.slice(0, 50),
    });
    removeFromQueue(songId);
  };

  const handleToggleShuffle = () => {
    logger.logUI("PlayerBar", "toggle_shuffle", { newState: !isShuffle });
    toggleShuffle();
  };

  const handleToggleRepeat = () => {
    const newMode = (repeatMode + 1) % 3;
    const modeNames = ["off", "all", "one"];
    logger.logUI("PlayerBar", "toggle_repeat", {
      from: modeNames[repeatMode],
      to: modeNames[newMode],
    });
    toggleRepeat();
  };

  return (
    <div className="player-bar">
      <div className="player-left">
        <div className="player-song-thumb">
          <div
            className="song-thumb-inner"
            style={{
              position: "relative",
              overflow: "hidden",
            }}
          >
            {currentSong.artwork ? (
              <img
                src={currentSong.artwork}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  position: "absolute",
                  inset: 0,
                }}
              />
            ) : currentSong.videoId ? (
              <img
                src={`https://i.ytimg.com/vi/${currentSong.videoId}/default.jpg`}
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
              currentSong.emoji
            )}
          </div>
        </div>
        <div className="player-song-info">
          <div className="player-song-title">{currentSong.title}</div>
          <div className="player-song-artist">{currentSong.artist}</div>
        </div>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button
            className={`player-control-btn ${isShuffle ? "active" : ""}`}
            onClick={handleToggleShuffle}
            title="Shuffle"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
            </svg>
          </button>

          <button
            className="player-control-btn"
            onClick={prevSong}
            title="Previous"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="19,20 9,12 19,4" />
              <line x1="5" y1="19" x2="5" y2="5" />
            </svg>
          </button>

          <button className="player-play-btn" onClick={togglePlay}>
            {isLoading ? (
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
            ) : isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          <button
            className="player-control-btn"
            onClick={nextSong}
            title="Next"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="5,4 15,12 5,20" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>

          <button
            className={`player-control-btn ${repeatMode > 0 ? "active" : ""}`}
            onClick={handleToggleRepeat}
            title={
              repeatMode === 0
                ? "Repeat Off"
                : repeatMode === 1
                  ? "Repeat All"
                  : "Repeat One"
            }
          >
            {getRepeatIcon()}
          </button>
        </div>

        <div className="player-progress">
          <ProgressSlider />
        </div>
      </div>

      <div className="player-right">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Queue Button with Badge */}
          <button
            onClick={handleOpenQueue}
            style={{
              position: "relative",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text2)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              borderRadius: "var(--radius-pill)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface2)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text2)";
            }}
            title="View queue"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="18"
              height="18"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
          <VolumeControl />
        </div>
      </div>

      {/* Queue Modal */}
      {showQueueModal && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              zIndex: 9998,
            }}
            onClick={handleCloseQueue}
          />
          <div
            style={{
              position: "fixed",
              bottom: "80px",
              right: "20px",
              width: "400px",
              maxWidth: "calc(100vw - 40px)",
              maxHeight: "550px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              overflow: "hidden",
              zIndex: 9999,
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                Queue
              </h3>
              <div style={{ display: "flex", gap: "8px" }}>
                {queue.length > 0 && (
                  <button
                    onClick={handleClearQueue}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text3)",
                      cursor: "pointer",
                      fontSize: "12px",
                      padding: "4px 8px",
                      borderRadius: "var(--radius-sm)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,107,53,0.1)";
                      e.currentTarget.style.color = "var(--error)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "none";
                      e.currentTarget.style.color = "var(--text3)";
                    }}
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={handleCloseQueue}
                  style={{
                    background: "var(--surface2)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text2)",
                    cursor: "pointer",
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: "auto", maxHeight: "450px" }}>
              {queue.length === 0 ? (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "var(--text3)",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "12px",
                  }}
                >
                  Queue is empty
                  <div style={{ fontSize: "10px", marginTop: "8px" }}>
                    Add songs using the ⋮ menu
                  </div>
                </div>
              ) : (
                <>
                  {/*  NOW PLAYING  */}
                  {currentSong && (
                    <>
                      <div
                        style={{
                          padding: "10px 20px 6px",
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          letterSpacing: "0.1em",
                          color: "var(--accent)",
                          textTransform: "uppercase",
                        }}
                      >
                        Now Playing
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "10px 16px",
                          margin: "0 8px 4px",
                          background: "rgba(124,106,245,0.08)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid rgba(124,106,245,0.15)",
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "var(--radius-md)",
                            background:
                              currentSong.grad ||
                              "linear-gradient(135deg, var(--accent), var(--accent2))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            flexShrink: 0,
                            overflow: "hidden",
                          }}
                        >
                          {currentSong.artwork ? (
                            <img
                              src={currentSong.artwork}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : currentSong.videoId ? (
                            <img
                              src={`https://i.ytimg.com/vi/${currentSong.videoId}/default.jpg`}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            currentSong.emoji || "🎵"
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "var(--accent2)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {currentSong.title}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--text3)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {currentSong.artist}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            flexShrink: 0,
                          }}
                        >
                          {/* Animated playing indicator */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-end",
                              gap: "2px",
                              height: "12px",
                            }}
                          >
                            {[0, 0.2, 0.4].map((delay, i) => (
                              <div
                                key={i}
                                style={{
                                  width: "3px",
                                  background: "var(--accent)",
                                  borderRadius: "var(--radius-xs)",
                                  height: "12px",
                                  animation:
                                    "barBounce 0.8s ease-in-out infinite",
                                  animationDelay: `${delay}s`,
                                }}
                              />
                            ))}
                          </div>
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--accent)",
                              fontWeight: 600,
                              marginLeft: "4px",
                            }}
                          >
                            PLAYING
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/*  UP NEXT  */}
                  {queue.length > currentIndex + 1 && (
                    <>
                      <div
                        style={{
                          padding: "16px 20px 6px",
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          letterSpacing: "0.1em",
                          color: "var(--text3)",
                          textTransform: "uppercase",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>Up Next</span>
                        <span style={{ color: "var(--text3)" }}>
                          {Math.min(queue.length - (currentIndex + 1), 50)}{" "}
                          songs
                        </span>
                      </div>
                      {queue
                        .slice(currentIndex + 1, currentIndex + 51)
                        .map((song, idx) => {
                          const globalIdx = currentIndex + 1 + idx;
                          const isPlayNext = song.queueTag === "next";
                          return (
                            <div
                              key={`${song.id}-${globalIdx}`}
                              onClick={() => {
                                handlePlaySong(song, globalIdx);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "10px 16px",
                                margin: "0 8px",
                                cursor: "pointer",
                                transition: "background 0.1s",
                                borderRadius: "var(--radius-md)",
                                background: isPlayNext
                                  ? "rgba(124,106,245,0.06)"
                                  : "transparent",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = isPlayNext
                                  ? "rgba(124,106,245,0.12)"
                                  : "var(--surface2)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = isPlayNext
                                  ? "rgba(124,106,245,0.06)"
                                  : "transparent";
                              }}
                            >
                              <div
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "var(--radius-md)",
                                  background:
                                    song.grad ||
                                    "linear-gradient(135deg, var(--accent), var(--accent2))",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "14px",
                                  flexShrink: 0,
                                  overflow: "hidden",
                                }}
                              >
                                {song.artwork ? (
                                  <img
                                    src={song.artwork}
                                    alt=""
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : song.videoId ? (
                                  <img
                                    src={`https://i.ytimg.com/vi/${song.videoId}/default.jpg`}
                                    alt=""
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  song.emoji || "🎵"
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: 500,
                                      color: "var(--text)",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {song.title}
                                  </span>
                                  {isPlayNext && (
                                    <span
                                      style={{
                                        fontSize: "9px",
                                        fontWeight: 700,
                                        padding: "2px 6px",
                                        borderRadius: "var(--radius-xs)",
                                        background: "var(--accent)",
                                        color: "#fff",
                                        letterSpacing: "0.04em",
                                        textTransform: "uppercase",
                                        flexShrink: 0,
                                      }}
                                    >
                                      Next
                                    </span>
                                  )}
                                </div>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--text3)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {song.artist}
                                </div>
                              </div>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "var(--text3)",
                                  flexShrink: 0,
                                }}
                              >
                                {song.dur}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFromQueue(song.id, song.title);
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--text3)",
                                  cursor: "pointer",
                                  padding: "4px",
                                  borderRadius: "var(--radius-xs)",
                                  fontSize: "14px",
                                  flexShrink: 0,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "var(--error)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "var(--text3)";
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                    </>
                  )}

                  {/* Empty up next but has now playing */}
                  {queue.length <= currentIndex + 1 && currentSong && (
                    <div
                      style={{
                        padding: "24px 20px",
                        textAlign: "center",
                        color: "var(--text3)",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "12px",
                      }}
                    >
                      No songs up next
                      <div style={{ fontSize: "10px", marginTop: "4px" }}>
                        Add songs using the ⋮ menu
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      <Toast />
    </div>
  );
};

export default PlayerBar;
