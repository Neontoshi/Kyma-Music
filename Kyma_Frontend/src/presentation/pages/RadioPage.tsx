import React, { useState, useEffect, useRef } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { useSystemStore } from "../stores/systemStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";

const GENRES = [
  "pop",
  "rock",
  "jazz",
  "classical",
  "electronic",
  "hip hop",
  "r&b",
  "country",
  "reggae",
  "blues",
  "metal",
  "punk",
  "folk",
  "soul",
  "funk",
  "disco",
  "house",
  "techno",
  "trance",
  "ambient",
  "drum and bass",
  "dubstep",
  "lofi",
  "chillout",
  "lounge",
];

const GENRE_COLORS: Record<string, string> = {
  pop: "#f472b6",
  rock: "#fb923c",
  jazz: "#fbbf24",
  classical: "#a78bfa",
  electronic: "#38bdf8",
  "hip hop": "#c084fc",
  "r&b": "#f43f5e",
  country: "#86efac",
  reggae: "#4ade80",
  blues: "#60a5fa",
  metal: "#94a3b8",
  punk: "#fb7185",
  folk: "#a3e635",
  soul: "#f97316",
  funk: "#e879f9",
  disco: "#facc15",
  house: "#818cf8",
  techno: "#67e8f9",
  trance: "#c084fc",
  ambient: "#7dd3fc",
  "drum and bass": "#fb923c",
  dubstep: "#a78bfa",
  lofi: "#86efac",
  chillout: "#7dd3fc",
  lounge: "#f9a8d4",
};

const RadioPage: React.FC = () => {
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const { setQueue } = useQueueStore();
  const { ytdlpAvailable } = useSystemStore();
  const [stations, setStations] = useState<any[]>([]);
  const [savedStations, setSavedStations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordingName, setRecordingName] = useState("");
  const searchTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (ytdlpAvailable) {
      loadPopular();
      loadSaved();
      checkRecording();
    } else {
      setLoading(false);
    }
  }, [ytdlpAvailable]);

  const checkRecording = async () => {
    try {
      const active = await tauriCommands.isRecording();
      setRecording(active);
      if (active) setRecordingName(await tauriCommands.getRecordingName());
    } catch (err) {
      console.error("Failed to check recording:", err);
    }
  };

  const loadSaved = async () => {
    try {
      setSavedStations((await tauriCommands.getSavedStations()) || []);
    } catch (err) {
      console.error("Failed to load saved stations:", err);
    }
  };

  const loadPopular = async () => {
    if (!ytdlpAvailable) return;
    setLoading(true);
    try {
      setStations((await tauriCommands.getPopularStations()) || []);
    } catch (err) {
      console.error("Failed to load stations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setActiveGenre(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) {
      loadPopular();
      return;
    }
    searchTimeout.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        setStations((await tauriCommands.searchRadioStations(query)) || []);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleGenre = async (genre: string) => {
    if (!ytdlpAvailable) return;
    setSearchQuery("");
    setActiveGenre(genre);
    setLoading(true);
    try {
      setStations((await tauriCommands.getStationsByGenre(genre)) || []);
    } catch (err) {
      console.error("Genre search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStation = async (e: React.MouseEvent, station: any) => {
    e.stopPropagation();
    try {
      await tauriCommands.saveRadioStation(station);
      loadSaved();
    } catch (err) {
      console.error("Failed to save station:", err);
    }
  };

  const handleRemoveStation = async (
    e: React.MouseEvent,
    stationId: string,
  ) => {
    e.stopPropagation();
    try {
      await tauriCommands.removeRadioStation(stationId);
      loadSaved();
    } catch (err) {
      console.error("Failed to remove station:", err);
    }
  };

  const handleToggleRecord = async (
    e: React.MouseEvent,
    stationUrl: string,
  ) => {
    e.stopPropagation();
    try {
      setRecordingName(await tauriCommands.toggleRecording(stationUrl));
      setRecording(await tauriCommands.isRecording());
    } catch (err) {
      console.error("Recording failed:", err);
    }
  };

  const handlePlayStation = (station: any) => {
    if (!ytdlpAvailable) return;
    const radioSong: Song = {
      id: `radio-${station.id}`,
      path: station.url,
      title: station.name,
      artist: `${station.genre || "Radio"} · ${station.bitrate || ""}`,
      album: station.country || "Internet Radio",
      duration: 0,
      genre: station.genre || null,
      year: null,
      track_number: null,
      artwork: null,
      source: "local" as any,
      videoId: undefined,
      dur: "Live",
      emoji: "📻",
      grad: "linear-gradient(135deg, var(--accent), var(--accent2))",
      bpm: 0,
      key: "—",
      plays: 0,
      liked: false,
    };
    setQueue([radioSong], radioSong, "library");
    setCurrentSong(radioSong);
    setProgress(0);
  };

  const currentStationId = currentSong?.id?.startsWith("radio-")
    ? currentSong.id
    : null;
  const isSaved = (stationId: string) =>
    savedStations.some((s) => s.id === stationId);

  const renderStationRow = (station: any, saved: boolean) => {
    const isActive = currentStationId === `radio-${station.id}`;
    const isThisRecording = recording && isActive;
    const genreColor =
      GENRE_COLORS[station.genre?.toLowerCase()] || "var(--accent)";

    return (
      <div
        key={station.id}
        onClick={() => handlePlayStation(station)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 12px",
          borderRadius: 8,
          cursor: ytdlpAvailable ? "pointer" : "default",
          marginBottom: 1,
          opacity: ytdlpAvailable ? 1 : 0.5,
          background: isActive ? "rgba(124,106,245,0.07)" : "transparent",
          borderLeft: isActive
            ? "2px solid var(--accent)"
            : "2px solid transparent",
          transition: "background 0.12s",
        }}
        onMouseEnter={(e) => {
          if (!isActive && ytdlpAvailable)
            e.currentTarget.style.background = "var(--surface)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = "transparent";
        }}
      >
        <div
          style={{
            width: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isActive && isPlaying ? (
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 2,
                height: 12,
              }}
            >
              <span
                style={{
                  display: "block",
                  width: 2,
                  borderRadius: 1,
                  background: "var(--accent2)",
                  animation: "rBar1 0.8s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  display: "block",
                  width: 2,
                  borderRadius: 1,
                  background: "var(--accent2)",
                  animation: "rBar2 0.8s ease-in-out infinite 0.15s",
                }}
              />
              <span
                style={{
                  display: "block",
                  width: 2,
                  borderRadius: 1,
                  background: "var(--accent2)",
                  animation: "rBar3 0.8s ease-in-out infinite 0.3s",
                }}
              />
            </div>
          ) : (
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: genreColor,
                display: "block",
              }}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: isActive ? "var(--accent2)" : "var(--text)",
              marginBottom: 2,
            }}
          >
            {station.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {station.genre && (
              <span
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 8,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "1px 6px",
                  borderRadius: 3,
                  border: `1px solid ${genreColor}33`,
                  color: genreColor,
                }}
              >
                {station.genre}
              </span>
            )}
            {station.country && (
              <span
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 9,
                  color: "var(--text3)",
                }}
              >
                {station.country}
              </span>
            )}
          </div>
        </div>
        {station.bitrate && (
          <div
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 10,
              color: "var(--text3)",
              flexShrink: 0,
            }}
          >
            {station.bitrate}
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "'DM Mono',monospace",
            fontSize: 8,
            letterSpacing: "0.08em",
            color: "var(--text3)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: isActive ? "#4ade80" : "var(--text3)",
            }}
          />
          LIVE
        </div>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", gap: 2, flexShrink: 0 }}
        >
          {isActive && (
            <button
              onClick={(e) => handleToggleRecord(e, station.url)}
              title={recording ? "Stop" : "Record"}
              style={{
                width: 26,
                height: 26,
                borderRadius: 5,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isThisRecording
                  ? "rgba(255,68,68,0.1)"
                  : "transparent",
                color: isThisRecording ? "#ff4444" : "var(--text3)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill={isThisRecording ? "#ff4444" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="6" />
              </svg>
            </button>
          )}
          {saved ? (
            <button
              onClick={(e) => handleRemoveStation(e, station.id)}
              title="Remove"
              style={{
                width: 26,
                height: 26,
                borderRadius: 5,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                color: "var(--accent2)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="currentColor"
                stroke="none"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={(e) => handleSaveStation(e, station)}
              title="Save"
              style={{
                width: 26,
                height: 26,
                borderRadius: 5,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                color: "var(--text3)",
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
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: "1.5rem 2rem 1.25rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      >
        {!ytdlpAvailable && (
          <div
            style={{
              padding: "8px 16px",
              margin: "0 0 1rem",
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
            <span>⚠️</span> yt-dlp not installed. Radio unavailable. Run: pip
            install yt-dlp
          </div>
        )}
        <div className="ap-page-header-top">
          <div>
            <div className="ap-page-eyebrow">Streaming</div>
            <h1 className="ap-page-title">Radio</h1>
          </div>
          {recording && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 100,
                background: "rgba(255,60,60,0.08)",
                border: "1px solid rgba(255,60,60,0.2)",
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#ff3333",
                  animation: "recPulse 1s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 10,
                  color: "#ff4444",
                  letterSpacing: "0.06em",
                }}
              >
                REC · {recordingName}
              </span>
            </div>
          )}
        </div>
        <div className="ap-search-wrap" style={{ marginTop: "0.75rem" }}>
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
              ytdlpAvailable ? "Search stations..." : "yt-dlp required..."
            }
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            disabled={!ytdlpAvailable}
            style={{ width: "100%", fontSize: 12 }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginTop: "0.75rem",
          }}
        >
          <button
            onClick={() => {
              if (!ytdlpAvailable) return;
              loadPopular();
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 99,
              border: "1px solid var(--border)",
              background:
                !activeGenre && !searchQuery
                  ? "var(--accent)"
                  : "var(--surface)",
              color: !activeGenre && !searchQuery ? "#fff" : "var(--text2)",
              cursor: ytdlpAvailable ? "pointer" : "not-allowed",
              fontFamily: "'DM Mono',monospace",
              fontSize: 10,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              transition: "all 0.12s",
              opacity: ytdlpAvailable ? 1 : 0.5,
            }}
          >
            Popular
          </button>
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => handleGenre(genre)}
              style={{
                padding: "6px 14px",
                borderRadius: 99,
                border: "1px solid var(--border)",
                background:
                  activeGenre === genre ? "var(--accent)" : "var(--surface)",
                color: activeGenre === genre ? "#fff" : "var(--text2)",
                cursor: ytdlpAvailable ? "pointer" : "not-allowed",
                fontFamily: "'DM Mono',monospace",
                fontSize: 10,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                transition: "all 0.12s",
                opacity: ytdlpAvailable ? 1 : 0.5,
              }}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          padding: "0 2rem 6rem",
        }}
      >
        {savedStations.length > 0 && (
          <>
            <div
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 10,
                letterSpacing: "0.12em",
                color: "var(--text3)",
                textTransform: "uppercase",
                marginBottom: 8,
                marginTop: "1rem",
              }}
            >
              ♥ Saved Stations
            </div>
            <div style={{ marginBottom: 20 }}>
              {savedStations.map((s) => renderStationRow(s, true))}
            </div>
            <hr className="divider" style={{ margin: "0 0 20px" }} />
          </>
        )}
        {loading ? (
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
            Loading stations...
          </div>
        ) : stations.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 2rem",
              color: "var(--text3)",
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
            }}
          >
            {ytdlpAvailable
              ? "No stations found"
              : "Install yt-dlp to browse radio stations"}
          </div>
        ) : (
          <>
            <div
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 10,
                letterSpacing: "0.12em",
                color: "var(--text3)",
                textTransform: "uppercase",
                marginBottom: 8,
                marginTop: "1rem",
              }}
            >
              {activeGenre ? (
                <>▸ {activeGenre}</>
              ) : searchQuery ? (
                <>▸ Results for "{searchQuery}"</>
              ) : (
                <>▸ Popular Stations</>
              )}
            </div>
            {stations.map((s) => renderStationRow(s, isSaved(s.id)))}
          </>
        )}
        <style>{`@keyframes recPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @keyframes rBar1 { 0%,100%{height:4px} 50%{height:14px} }
          @keyframes rBar2 { 0%,100%{height:10px} 50%{height:4px} }
          @keyframes rBar3 { 0%,100%{height:6px} 50%{height:12px} }`}</style>
      </div>
    </div>
  );
};

export default RadioPage;
