import React, { useState, useEffect } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { useSystemStore } from "../stores/systemStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";

const CATEGORIES = [
  { label: "Fiction", query: "fiction audiobook full" },
  { label: "Sci-Fi", query: "science fiction audiobook full" },
  { label: "Fantasy", query: "fantasy audiobook full" },
  { label: "Mystery", query: "mystery thriller audiobook full" },
  { label: "Romance", query: "romance audiobook full" },
  { label: "Horror", query: "horror audiobook full" },
  { label: "Self Help", query: "self help audiobook full" },
  { label: "Business", query: "business audiobook full" },
  { label: "History", query: "history audiobook full" },
  { label: "Philosophy", query: "philosophy audiobook full" },
  { label: "Biography", query: "biography audiobook full" },
  { label: "Classics", query: "classic literature audiobook full" },
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

const AudiobooksPage: React.FC = () => {
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const { setQueue } = useQueueStore();
  const setError = usePlayerStore((s) => s.setError);
  const { ytdlpAvailable, ytdlpChecked } = useSystemStore();
  const [books, setBooks] = useState<Song[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!ytdlpAvailable) {
      if (ytdlpChecked) setLoading(false);
      return;
    }

    const query = searchQuery.trim()
      ? `${searchQuery} audiobook full`
      : CATEGORIES[activeCategory].query;

    setLoading(true);
    setBooks([]);

    const timer = setTimeout(() => {
      tauriCommands
        .searchYoutube(query)
        .then((yt: any[]) => {
          const filtered = (yt || [])
            .filter((r: any) => {
              const dur = r.duration_secs;
              return dur && dur > 1800;
            })
            .map((r: any) => ({
              id: `yt-${r.id}`,
              path: "",
              title: r.title,
              artist: r.artist,
              album: "Audiobook",
              duration: r.duration_secs,
              genre: null,
              year: null,
              track_number: null,
              artwork: r.thumbnail,
              source: "youtube" as any,
              videoId: r.id,
              dur: formatDuration(r.duration_secs),
              emoji: "📖",
              grad: "linear-gradient(135deg, var(--accent), var(--accent2))",
              bpm: 0,
              key: "—",
              plays: 0,
              liked: false,
            }));
          setBooks(filtered);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load audiobooks:", err);
          setError(
            "Couldn't load audiobooks. Check your internet connection and try again.",
          );
          setLoading(false);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [activeCategory, searchQuery, ytdlpAvailable, ytdlpChecked, setError]);

  const handlePlay = (song: Song, _index: number) => {
    setQueue(books, song, "library");
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
      <div className="ab-header">
        <div className="ab-eyebrow">Listen</div>
        <h1 className="ab-title">Audiobooks</h1>
        <div className="ab-search">
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
              ytdlpAvailable ? "Search audiobooks..." : "yt-dlp required..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!ytdlpAvailable}
          />
        </div>
        <div className="ab-tape">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              className={`ab-chip${activeCategory === i ? " active" : ""}`}
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
              borderRadius: 8,
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
            <span>⚠️</span> yt-dlp not installed. Audiobooks unavailable. Run:
            pip install yt-dlp
          </div>
        )}
      </div>

      <div className="ab-content">
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
            Install yt-dlp to browse audiobooks
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
            Loading audiobooks...
          </div>
        ) : books.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 0",
              color: "var(--text3)",
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
            }}
          >
            No audiobooks found
          </div>
        ) : (
          <div>
            <div className="ab-track-header">
              <span className="ab-track-num">#</span>
              <span></span>
              <span>Title</span>
              <span className="ab-track-dur">Duration</span>
            </div>
            {books.map((book, i) => {
              const isActive = currentSongId === book.id;
              return (
                <div
                  key={book.id}
                  className={`ab-track-row${isActive ? " active" : ""}`}
                  onClick={() => handlePlay(book, i)}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "var(--surface)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div className="ab-track-num">
                    {isActive && isPlaying ? "▶" : i + 1}
                  </div>
                  <div
                    className="ab-track-thumb"
                    style={{
                      background: book.grad || randomGradient(book.title),
                    }}
                  >
                    {book.artwork ? (
                      <img src={book.artwork} alt="" />
                    ) : book.videoId ? (
                      <img
                        src={`https://i.ytimg.com/vi/${book.videoId}/default.jpg`}
                        alt=""
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      "📖"
                    )}
                  </div>
                  <div className="ab-track-info">
                    <div
                      className="ab-track-title"
                      style={{
                        color: isActive ? "var(--accent2)" : "var(--text)",
                      }}
                    >
                      {book.title}
                    </div>
                    <div className="ab-track-artist">{book.artist}</div>
                  </div>
                  <div className="ab-track-dur">{book.dur}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudiobooksPage;
