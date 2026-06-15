import React, { useEffect, useRef, useState, useCallback } from "react";
import { usePlayerContext as usePlayer } from "../../hooks/PlayerContext";

// Types

interface LrcLine {
  time: number;
  text: string;
}

// ── LRCLib helpers ──

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

async function fetchLyrics(
  title: string,
  artist: string,
): Promise<LrcLine[] | null> {
  try {
    const res = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(title + " " + artist)}&track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data.find((d: any) => d.syncedLyrics) ?? data[0];
    if (!hit) return null;
    if (hit.syncedLyrics) return parseLRC(hit.syncedLyrics);
    if (hit.plainLyrics) {
      return hit.plainLyrics
        .split("\n")
        .filter(Boolean)
        .map((text: string, i: number) => ({ time: i * 4, text }));
    }
    return null;
  } catch {
    return null;
  }
}

// ── Auto-calibration ──

function autoCalibrateOffset(lines: LrcLine[], actualDuration: number): number {
  if (lines.length < 2 || actualDuration <= 0) return 0;

  const lastLrcTime = lines[lines.length - 1].time;
  const diff = actualDuration - lastLrcTime;

  // If difference is small (0.3s - 5s), it's likely an offset issue
  if (Math.abs(diff) > 0.3 && Math.abs(diff) < 5) {
    // Apply half the difference - conservative correction
    return Math.round(diff * 50) / 100; // Round to 2 decimal places
  }
  return 0;
}

// ── Component ──

const LyricsPane: React.FC = () => {
  const { currentSong, currentProgress } = usePlayer();

  const deferredProgress = currentProgress;
  const [lyrics, setLyrics] = useState<LrcLine[] | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "found" | "not_found"
  >("idle");
  const [activeIdx, setActiveIdx] = useState(0);

  // Lyrics offset - stored per song in localStorage
  const [offset, setOffset] = useState(0);
  const [showOffset, setShowOffset] = useState(false);
  const [isAutoCalibrated, setIsAutoCalibrated] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastSongId = useRef<string | null>(null);

  // Save offset when changed
  const saveOffset = useCallback((songId: string, value: number) => {
    localStorage.setItem(`lyrics_offset_${songId}`, value.toString());
    setOffset(value);
  }, []);

  // Adjust offset
  const adjustOffset = useCallback(
    (delta: number) => {
      if (!currentSong) return;
      const newOffset = Math.round((offset + delta) * 100) / 100;
      setIsAutoCalibrated(false); // User manually adjusted
      saveOffset(currentSong.id, newOffset);
    },
    [currentSong, offset, saveOffset],
  );

  // Fetch when song changes
  useEffect(() => {
    if (!currentSong) return;
    if (currentSong.id === lastSongId.current) return;
    lastSongId.current = currentSong.id;
    setLyrics(null);
    setActiveIdx(0);
    setStatus("loading");
    setIsAutoCalibrated(false);

    // Check if user has a manual offset
    const manualOffset = localStorage.getItem(
      `lyrics_offset_${currentSong.id}`,
    );
    const hasManual = manualOffset !== null;

    if (hasManual) {
      setOffset(parseFloat(manualOffset));
    } else {
      setOffset(0);
    }

    fetchLyrics(currentSong.title, currentSong.artist).then((lines) => {
      if (lines && lines.length > 0) {
        setLyrics(lines);
        setStatus("found");

        // Auto-calibrate if no manual offset exists
        if (!hasManual) {
          const songDuration = currentSong.duration || 0;
          const suggestedOffset = autoCalibrateOffset(lines, songDuration);
          if (Math.abs(suggestedOffset) > 0.2) {
            setOffset(suggestedOffset);
            setIsAutoCalibrated(true);
            // Don't save - user can override
          }
        }
      } else {
        setStatus("not_found");
      }
    });
  }, [currentSong?.id]);

  // Track active line with offset applied
  useEffect(() => {
    if (!lyrics || !currentSong) return;
    const elapsed = deferredProgress + offset;
    let idx = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= elapsed) idx = i;
      else break;
    }
    setActiveIdx(idx);
  }, [deferredProgress, lyrics, currentSong, offset]);

  // Scroll active line to center
  useEffect(() => {
    const timer = setTimeout(() => {
      lineRefs.current[activeIdx]?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 16);
    return () => clearTimeout(timer);
  }, [activeIdx]);

  // Keyboard shortcuts for offset
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!showOffset) return;
      if (e.key === "ArrowLeft") adjustOffset(-0.5);
      if (e.key === "ArrowRight") adjustOffset(0.5);
      if (e.key === "ArrowUp") adjustOffset(-0.1);
      if (e.key === "ArrowDown") adjustOffset(0.1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showOffset, adjustOffset]);

  if (!currentSong) {
    return (
      <div className="lyrics-pane">
        <div className="lyrics-empty">
          <div className="lyrics-empty-icon">🎵</div>
          <div className="lyrics-empty-text">Play a song to see lyrics</div>
        </div>
      </div>
    );
  }

  return (
    <div className="lyrics-pane">
      {/* Header */}
      <div className="lyrics-pane-header">
        <span className="lyrics-pane-label">Lyrics</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {status === "found" && (
            <button
              onClick={() => setShowOffset(!showOffset)}
              style={{
                background: showOffset
                  ? "var(--accent)"
                  : isAutoCalibrated
                    ? "rgba(74,222,128,0.15)"
                    : "var(--surface2)",
                border: isAutoCalibrated
                  ? "1px solid rgba(74,222,128,0.3)"
                  : "1px solid var(--border)",
                color: showOffset
                  ? "#fff"
                  : isAutoCalibrated
                    ? "#4ade80"
                    : "var(--text2)",
                borderRadius: "var(--radius-pill)",
                padding: "2px 10px",
                fontSize: 10,
                fontFamily: "var(--font-family-mono)",
                cursor: "pointer",
              }}
            >
              {isAutoCalibrated
                ? `Auto ${offset > 0 ? "+" : ""}${offset.toFixed(1)}s`
                : offset !== 0
                  ? `${offset > 0 ? "+" : ""}${offset.toFixed(1)}s`
                  : "Sync"}
            </button>
          )}
          <span className="lyrics-pane-source">lrclib.net</span>
        </div>
      </div>

      {/* Offset controls */}
      {showOffset && status === "found" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "var(--surface2)",
            borderBottom: "1px solid var(--border)",
            fontSize: 11,
            fontFamily: "var(--font-family-mono)",
            color: "var(--text2)",
            flexWrap: "wrap",
          }}
        >
          <span>Sync:</span>
          <button onClick={() => adjustOffset(-0.5)} style={offsetBtnStyle}>
            -0.5
          </button>
          <button onClick={() => adjustOffset(-0.1)} style={offsetBtnStyle}>
            -0.1
          </button>
          <span
            style={{
              color: "var(--accent2)",
              fontWeight: 600,
              minWidth: 45,
              textAlign: "center",
            }}
          >
            {offset > 0 ? "+" : ""}
            {offset.toFixed(1)}s
          </span>
          <button onClick={() => adjustOffset(0.1)} style={offsetBtnStyle}>
            +0.1
          </button>
          <button onClick={() => adjustOffset(0.5)} style={offsetBtnStyle}>
            +0.5
          </button>
          <button
            onClick={() => {
              if (currentSong) {
                saveOffset(currentSong.id, 0);
                setIsAutoCalibrated(false);
              }
            }}
            style={{ ...offsetBtnStyle, marginLeft: "auto" }}
          >
            Reset
          </button>
          {isAutoCalibrated && (
            <button
              onClick={() => {
                if (currentSong) {
                  saveOffset(currentSong.id, offset);
                  setIsAutoCalibrated(false);
                }
              }}
              style={{
                ...offsetBtnStyle,
                background: "rgba(74,222,128,0.15)",
                border: "1px solid rgba(74,222,128,0.3)",
                color: "#4ade80",
              }}
            >
              Keep
            </button>
          )}
        </div>
      )}

      {/* Scroll container */}
      <div className="lyrics-pane-scroll" ref={scrollRef}>
        {status === "loading" && (
          <div className="lyrics-pane-status">
            <div className="lyrics-pane-spinner" />
            <span>Fetching lyrics…</span>
          </div>
        )}

        {status === "not_found" && (
          <div className="lyrics-pane-status">
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🎙️</div>
            <span>No lyrics found</span>
            <span className="lyrics-pane-sub">
              "{currentSong.title}" by {currentSong.artist}
            </span>
          </div>
        )}

        {status === "found" && lyrics && (
          <div className="lyrics-pane-lines">
            <div className="lyrics-pane-spacer" />
            {lyrics.map((line, i) => (
              <div
                key={i}
                ref={(el) => (lineRefs.current[i] = el)}
                className={`lyrics-line ${
                  i === activeIdx
                    ? "active"
                    : i < activeIdx
                      ? "past"
                      : "upcoming"
                }`}
              >
                {line.text}
              </div>
            ))}
            <div className="lyrics-pane-spacer" />
          </div>
        )}
      </div>
    </div>
  );
};

const offsetBtnStyle: React.CSSProperties = {
  background: "var(--surface3)",
  border: "1px solid var(--border)",
  color: "var(--text2)",
  borderRadius: "var(--radius-xs)",
  padding: "2px 8px",
  fontSize: 10,
  fontFamily: "var(--font-family-mono)",
  cursor: "pointer",
};

export default LyricsPane;
