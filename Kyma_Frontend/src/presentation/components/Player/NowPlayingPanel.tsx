import React, { useEffect, useRef, useState, useDeferredValue } from "react";
import { usePlayerContext as usePlayer } from "../../hooks/PlayerContext";
import { useLibraryStore } from "../../stores/libraryStore";
import { usePlayerStore } from "../../stores/playerStore";
import { Song } from "../../../core/entities/Song";
import { useQueueStore } from "../../stores/queueStore";
import { logger } from "../../../services/logger";

//  LRC types & helpers

interface LrcLine {
  time: number;
  text: string;
}

function parseLRC(lrc: string): LrcLine[] {
  const lines: LrcLine[] = [];
  const re = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  for (const raw of lrc.split("\n")) {
    const m = raw.match(re);
    if (!m) continue;
    const time =
      parseInt(m[1]) * 60 +
      parseInt(m[2]) +
      parseInt(m[3].padEnd(3, "0")) / 1000;
    const text = m[4].trim();
    if (text) lines.push({ time, text });
  }
  return lines;
}

//  Persistent lyrics cache ─

const LYRICS_CACHE_KEY = "kyma_lyrics_cache";

function loadLyricsCache(): Map<string, LrcLine[] | null> {
  try {
    const raw = localStorage.getItem(LYRICS_CACHE_KEY);
    if (!raw) return new Map();
    const parsed: [string, LrcLine[] | null][] = JSON.parse(raw);
    return new Map(parsed.filter(([, lyrics]) => lyrics !== null));
  } catch {
    return new Map();
  }
}

function saveLyricsCache(cache: Map<string, LrcLine[] | null>) {
  try {
    localStorage.setItem(
      LYRICS_CACHE_KEY,
      JSON.stringify(Array.from(cache.entries())),
    );
  } catch {}
}

const lyricsCache = loadLyricsCache();

async function fetchLyrics(
  title: string,
  artist: string,
  duration?: number,
  signal?: AbortSignal,
): Promise<LrcLine[] | null> {
  const cacheKey = `${title}::${artist}`;
  const cached = lyricsCache.get(cacheKey);
  if (cached) return cached;
  try {
    // Try direct lookup first — much faster than search
    const params = new URLSearchParams({
      track_name: title,
      artist_name: artist,
    });
    if (duration) params.set("duration", String(Math.round(duration)));

    const direct = await fetch(`https://lrclib.net/api/get?${params}`, {
      signal,
    });

    if (direct.ok) {
      const data = await direct.json();
      if (data.syncedLyrics) {
        const result = parseLRC(data.syncedLyrics);
        lyricsCache.set(cacheKey, result);
        saveLyricsCache(lyricsCache);
        return result;
      }
      if (data.plainLyrics) {
        const result = data.plainLyrics
          .split("\n")
          .filter(Boolean)
          .map((text: string, i: number) => ({ time: i * 4, text }));
        lyricsCache.set(cacheKey, result);
        saveLyricsCache(lyricsCache);
        return result;
      }
    }

    // Fall back to search if direct lookup missed
    const search = await fetch(
      `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
      { signal },
    );
    if (!search.ok) return null;
    const results = await search.json();
    const hit = results.find((d: any) => d.syncedLyrics) ?? results[0];
    if (!hit) return null;
    if (hit.syncedLyrics) {
      const result = parseLRC(hit.syncedLyrics);
      lyricsCache.set(cacheKey, result);
      saveLyricsCache(lyricsCache);
      return result;
    }
    if (hit.plainLyrics) {
      const result = hit.plainLyrics
        .split("\n")
        .filter(Boolean)
        .map((text: string, i: number) => ({ time: i * 4, text }));
      lyricsCache.set(cacheKey, result);
      saveLyricsCache(lyricsCache);
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

//  Props

interface NowPlayingPanelProps {
  showLyrics?: boolean;
}

//  Main Component

const NowPlayingPanel: React.FC<NowPlayingPanelProps> = ({
  showLyrics = false,
}) => {
  const { currentSong, currentProgress, isPlaying } = usePlayer();
  const { toggleLike } = useLibraryStore();
  const isLiked = useLibraryStore((s) => {
    const inStore = s.songs.find((x) => x.id === currentSong?.id);
    return inStore ? inStore.liked : (currentSong?.liked ?? false);
  });
  const { setCurrentSong, setProgress } = usePlayerStore();
  const { queue, currentIndex } = useQueueStore();

  const deferredProgress = useDeferredValue(currentProgress);

  const [lyrics, setLyrics] = useState<LrcLine[] | null>(null);
  const [lyricsStatus, setLyricsStatus] = useState<
    "idle" | "loading" | "found" | "not_found"
  >("idle");
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // 🔥 FIX #11: Proper AbortController cleanup on every dependency change
  useEffect(() => {
    if (!showLyrics || !currentSong) return;

    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    setLyrics(null);
    setActiveIdx(0);
    setLyricsStatus("loading");

    const controller = new AbortController();
    abortRef.current = controller;

    fetchLyrics(
      currentSong.title,
      currentSong.artist,
      currentSong.duration,
      controller.signal,
    )
      .then((lines) => {
        // 🔥 FIX #11: Check both aborted AND if this is still the current controller
        if (controller.signal.aborted || abortRef.current !== controller)
          return;
        if (lines && lines.length > 0) {
          setLyrics(lines);
          setLyricsStatus("found");
          logger.logUI("NowPlayingPanel", "lyrics_found", {
            songId: currentSong.id,
            title: currentSong.title.slice(0, 50),
            lineCount: lines.length,
          });
        } else {
          setLyricsStatus("not_found");
          logger.logUI("NowPlayingPanel", "lyrics_not_found", {
            songId: currentSong.id,
            title: currentSong.title.slice(0, 50),
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted && abortRef.current === controller) {
          setLyricsStatus("not_found");
        }
      });

    // 🔥 FIX #11: Cleanup function always aborts the current controller
    return () => {
      controller.abort();
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    };
  }, [currentSong?.id, showLyrics]);

  useEffect(() => {
    if (!lyrics || !currentSong) return;
    const elapsed = deferredProgress;
    let idx = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= elapsed) idx = i;
      else break;
    }
    setActiveIdx(idx);
  }, [deferredProgress, lyrics, currentSong]);

  useEffect(() => {
    const timer = setTimeout(() => {
      lineRefs.current[activeIdx]?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [activeIdx]);

  const handleLike = () => {
    if (!currentSong) return;
    logger.logUI("NowPlayingPanel", isLiked ? "unlike" : "like", {
      songId: currentSong.id,
      title: currentSong.title.slice(0, 50),
      artist: currentSong.artist,
      source: currentSong.source,
    });
    void toggleLike(currentSong.id, currentSong).catch((err) => {
      console.error("Failed to toggle like:", err);
    });
  };

  const handleClearQueue = (queueSongsLength: number) => {
    logger.logUI("NowPlayingPanel", "clear_queue", {
      queueSize: queueSongsLength,
    });
    if (confirm(`Clear ${queueSongsLength} songs from queue?`)) {
      useQueueStore.getState().clearQueue();
    }
  };

  //  Empty state

  if (!currentSong) {
    if (!showLyrics) return null;
    return (
      <div className="np-fullscreen np-fullscreen--empty">
        <div className="np-empty-lyrics">
          <div className="np-empty-lyrics-mark">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 5h16M4 10h10M4 15h13M4 20h7" />
              <path d="M19 14v5.5a2.5 2.5 0 11-2.5-2.5H19" />
            </svg>
          </div>
          <div className="np-lyrics-eyebrow">Lyrics</div>
          <h2>Lyrics live here</h2>
          <p>Play a song and Kyma will bring its words to life.</p>
        </div>
      </div>
    );
  }
  //  Queue

  const queueSongs = queue.slice(currentIndex + 1, currentIndex + 49);

  //  Song info column (shared between both modes)

  const songInfoCol = (
    <div className={showLyrics ? "np-info-col" : "np-info-col-inline"}>
      {/* Album Art */}
      <div className="np-art-wrap">
        <div className="np-art">
          {currentSong.artwork ? (
            <img
              src={currentSong.artwork}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "var(--radius)",
              }}
            />
          ) : currentSong.videoId ? (
            <img
              src={`https://i.ytimg.com/vi/${currentSong.videoId}/hqdefault.jpg`}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "var(--radius)",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span>{currentSong.emoji}</span>
          )}
          <div className="np-art-glow" />
        </div>
      </div>

      {/* Title + Like + Queue Button */}
      <div className="np-title-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="np-song-title">{currentSong.title}</div>
          <div className="np-song-artist">
            {currentSong.artist} · {currentSong.album}
          </div>
        </div>
        {(currentSong.source === "youtube" ||
          currentSong.source === "soundcloud") && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className={`np-like-btn ${isLiked ? "liked" : ""}`}
              onClick={handleLike}
            >
              <svg
                viewBox="0 0 24 24"
                fill={isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Queue */}
      <div className="queue-next">
        <div className="queue-head">
          <div className="queue-label">
            Up Next
            {queueSongs.length > 0 && (
              <span className="queue-count">{queueSongs.length}</span>
            )}
          </div>
          {queueSongs.length > 0 && (
            <button
              className="queue-clear-btn"
              onClick={() => handleClearQueue(queueSongs.length)}
            >
              Clear all
            </button>
          )}
        </div>
        <hr className="divider" />
        {queueSongs.length === 0 ? (
          <div className="queue-empty">
            <span className="queue-empty-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                width="18"
                height="18"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
                <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
                <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
              </svg>
            </span>
            Queue is empty
          </div>
        ) : (
          queueSongs.map((song, idx) => (
            <QueueItem
              key={`${song.id}-${idx}`}
              song={song}
              setCurrentSong={setCurrentSong}
              setProgress={setProgress}
            />
          ))
        )}
      </div>
    </div>
  );

  //  Narrow panel mode (no lyrics)

  if (!showLyrics) {
    return (
      <div className="now-playing-panel">
        <div className="np-panel-head">
          <div className="np-panel-eyebrow">
            <span
              className={`np-panel-pulse ${isPlaying ? "playing" : ""}`}
              aria-hidden="true"
            />
            Now playing
          </div>
          <span className="np-panel-status">
            {isPlaying ? "Playing" : "Paused"}
          </span>
        </div>
        {songInfoCol}
      </div>
    );
  }

  //  Full-screen mode (with lyrics)

  return (
    <div className="np-fullscreen">
      <div className="np-lyrics-ambient" aria-hidden="true">
        {currentSong.artwork ? (
          <img src={currentSong.artwork} alt="" />
        ) : currentSong.videoId ? (
          <img
            src={`https://i.ytimg.com/vi/${currentSong.videoId}/hqdefault.jpg`}
            alt=""
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="np-lyrics-ambient-emoji">{currentSong.emoji}</span>
        )}
        <div className="np-lyrics-ambient-veil" />
        <div className="np-lyrics-ambient-grid" />
      </div>

      {/* Left: Lyrics */}
      <div className="np-lyrics-col">
        <div className="np-lyrics-header">
          <div className="np-lyrics-head-copy">
            <div className="np-lyrics-eyebrow">Now singing</div>
            <div className="np-lyrics-trackline">
              <span className="np-lyrics-label">Lyrics</span>
              <span className="np-lyrics-track">
                {currentSong.title}
                <i>·</i>
                {currentSong.artist}
              </span>
            </div>
          </div>
          <div className="np-lyrics-head-meta">
            {lyricsStatus === "loading" && (
              <span className="np-lyrics-badge muted">Syncing…</span>
            )}
            {lyricsStatus === "found" && (
              <span className="np-lyrics-badge">Synced · lrclib.net</span>
            )}
            {lyricsStatus === "found" && lyrics && lyrics.length > 0 && (
              <span className="np-lyrics-position">
                {activeIdx + 1}
                <i>/</i>
                {lyrics.length}
              </span>
            )}
          </div>
          {lyricsStatus === "found" && lyrics && lyrics.length > 0 && (
            <div className="np-lyrics-progress" aria-hidden="true">
              <span
                style={{
                  width: `${((activeIdx + 1) / lyrics.length) * 100}%`,
                }}
              />
            </div>
          )}
        </div>

        {lyricsStatus === "not_found" && (
          <div className="np-lyrics-fallback">
            <div className="np-lyrics-fallback-stage">
              <div className="np-lyrics-vinyl" aria-hidden="true">
                <div className="np-lyrics-vinyl-art">
                  {currentSong.artwork ? (
                    <img src={currentSong.artwork} alt="" />
                  ) : currentSong.videoId ? (
                    <img
                      src={`https://i.ytimg.com/vi/${currentSong.videoId}/hqdefault.jpg`}
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{currentSong.emoji}</span>
                  )}
                </div>
              </div>
              <span className="np-lyrics-vinyl-glow" aria-hidden="true" />
            </div>
            <div className="np-lyrics-fallback-copy">
              <div className="np-lyrics-eyebrow">Now playing</div>
              <h3>{currentSong.title}</h3>
              <p>
                No synced lyrics found for this track. Sit back and enjoy the
                music.
              </p>
            </div>
          </div>
        )}

        <div
          className="np-lyrics-scroll"
          ref={scrollRef}
          key={currentSong.id}
          style={{ display: lyricsStatus === "not_found" ? "none" : undefined }}
        >
          {lyricsStatus === "loading" && (
            <div className="np-lyrics-status">
              <div className="ap-spinner ap-spinner--sm" />
              <span>Fetching lyrics…</span>
            </div>
          )}

          {lyricsStatus === "found" && lyrics && (
            <div className="np-lyrics-lines">
              {lyrics.map((line, i) => (
                <div
                  key={i}
                  ref={(el) => (lineRefs.current[i] = el)}
                  className={`np-lyric-line ${
                    i === activeIdx
                      ? "active"
                      : i < activeIdx
                        ? "past"
                        : "upcoming"
                  }`}
                  onClick={() => setProgress(line.time)}
                  title="Jump to this line"
                >
                  {line.text}
                </div>
              ))}
              <div className="np-lyrics-spacer" />
            </div>
          )}
        </div>
      </div>

      {/* Right: Song Info */}
      {songInfoCol}
    </div>
  );
};

//  Queue Item
const QueueItem: React.FC<{
  song: Song;
  setCurrentSong: (song: Song) => void;
  setProgress: (progress: number) => void;
}> = ({ song, setCurrentSong, setProgress }) => {
  const { removeFromQueue, queue, setIndex } = useQueueStore();

  const handlePlayFromQueue = (idx: number) => {
    logger.logUI("NowPlayingPanel", "play_from_queue", {
      songId: song.id,
      title: song.title.slice(0, 50),
      position: idx,
    });
    if (idx !== -1) setIndex(idx);
    setCurrentSong(song);
    setProgress(0);
  };

  const handleRemoveFromQueue = (songId: string, songTitle: string) => {
    logger.logUI("NowPlayingPanel", "remove_from_queue", {
      songId,
      title: songTitle.slice(0, 50),
    });
    removeFromQueue(songId);
  };

  return (
    <div className="queue-item">
      <div
        className="q-art"
        onClick={() => {
          const idx = queue.findIndex((s) => s.id === song.id);
          handlePlayFromQueue(idx);
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
              borderRadius: "var(--radius-sm)",
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
              borderRadius: "var(--radius-sm)",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span style={{ fontSize: "20px" }}>{song.emoji}</span>
        )}
      </div>

      <div
        className="q-info"
        onClick={() => {
          const idx = queue.findIndex((s) => s.id === song.id);
          handlePlayFromQueue(idx);
        }}
      >
        <div
          className="q-name"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {song.title}
          </span>
          {song.queueTag === "next" && (
            <span
              style={{
                fontSize: "8px",
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: "var(--radius-xs)",
                background: "var(--accent)",
                color: "#fff",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                flexShrink: 0,
                lineHeight: "14px",
              }}
            >
              Next
            </span>
          )}
        </div>
        <div className="q-artist">{song.artist}</div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontFamily: "'Inter', sans-serif",
            color: "var(--text3)",
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--accent)";
            e.currentTarget.style.background = "rgba(var(--accent-rgb),0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text3)";
            e.currentTarget.style.background = "none";
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default React.memo(NowPlayingPanel);
