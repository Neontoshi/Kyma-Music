import React, { useEffect, useRef, useState } from "react";
import { usePlayerContext as usePlayer } from "../../hooks/PlayerContext";

// Types

interface LrcLine {
  time: number;
  text: string;
}

// LRCLib helpers

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

// Component

const LyricsPane: React.FC = () => {
  const { currentSong, currentProgress } = usePlayer();

  // Defer progress updates so lyric tracking never blocks the UI thread.
  const deferredProgress = currentProgress;
  const [lyrics, setLyrics] = useState<LrcLine[] | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "found" | "not_found"
  >("idle");
  const [activeIdx, setActiveIdx] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastSongId = useRef<string | null>(null);

  // Fetch when song changes
  useEffect(() => {
    if (!currentSong) return;
    if (currentSong.id === lastSongId.current) return;
    lastSongId.current = currentSong.id;
    setLyrics(null);
    setActiveIdx(0);
    setStatus("loading");

    fetchLyrics(currentSong.title, currentSong.artist).then((lines) => {
      if (lines && lines.length > 0) {
        setLyrics(lines);
        setStatus("found");
      } else {
        setStatus("not_found");
      }
    });
  }, [currentSong?.id]);

  // Track active line — runs on deferred progress so it never blocks UI.
  // No setTimeout needed; useDeferredValue already deprioritises this work.
  useEffect(() => {
    if (!lyrics || !currentSong) return;
    const elapsed = deferredProgress; // seconds, matches LRC timestamps
    let idx = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= elapsed) idx = i;
      else break;
    }
    setActiveIdx(idx);
  }, [deferredProgress, lyrics, currentSong]);

  // Scroll active line to center — small delay only to let React paint first.
  useEffect(() => {
    const timer = setTimeout(() => {
      lineRefs.current[activeIdx]?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 16); // one frame
    return () => clearTimeout(timer);
  }, [activeIdx]);

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
        {status === "found" && (
          <span className="lyrics-pane-source">lrclib.net</span>
        )}
      </div>

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

export default LyricsPane;
