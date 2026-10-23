import React, { useState, useEffect, useRef } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { useSystemStore } from "../stores/systemStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";
import { makeSong } from "../../lib/song";

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
  pop: "#ff4d4d",
  rock: "#ff4d4d",
  jazz: "#ff4d4d",
  classical: "var(--accent)",
  electronic: "#4da3ff",
  "hip hop": "var(--accent)",
  "r&b": "#ff4d4d",
  country: "var(--accent2)",
  reggae: "var(--accent3)",
  blues: "#60a5fa",
  metal: "#ffffff",
  punk: "#ff4d4d",
  folk: "var(--accent)",
  soul: "#ff4d4d",
  funk: "#ff4d4d",
  disco: "#ffffff",
  house: "var(--accent2)",
  techno: "#4da3ff",
  trance: "var(--accent)",
  ambient: "#4da3ff",
  "drum and bass": "#ff4d4d",
  dubstep: "var(--accent)",
  lofi: "var(--accent2)",
  chillout: "#4da3ff",
  lounge: "#ff8080",
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
    loadPopular();
    loadSaved();
    checkRecording();
  }, []);

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
      const radioSong: Song = makeSong({
      id: `radio-${station.id}`,
      path: station.url,
      title: station.name,
      artist: `${station.genre || "Radio"} · ${station.bitrate || ""}`,
      album: station.country || "Internet Radio",
      genre: station.genre || null,
      source: "local",
      dur: "Live",
      emoji: "📻",
    });
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
        className={`radio-station-row${isActive ? " active" : ""}`}
        onClick={() => handlePlayStation(station)}
      >
        <div className="radio-station-indicator">
          {isActive && isPlaying ? (
            <div className="radio-bars">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <span
              className="radio-station-dot"
              style={{ background: genreColor }}
            />
          )}
        </div>

        <div className="radio-station-info">
          <div className="radio-station-name">{station.name}</div>
          <div className="radio-station-meta">
            {station.genre && (
              <span
                className="radio-genre"
                style={{ color: genreColor, borderColor: `color-mix(in srgb, ${genreColor} 20%, transparent)` }}
              >
                {station.genre}
              </span>
            )}
            {station.country && <span>{station.country}</span>}
          </div>
        </div>

        {station.bitrate && (
          <div className="radio-bitrate">{station.bitrate}</div>
        )}

        <div className={`radio-live${isActive ? " active" : ""}`}>
          <span />
          LIVE
        </div>

        <div
          className="radio-station-actions"
          onClick={(e) => e.stopPropagation()}
        >
          {isActive && ytdlpAvailable && (
            <button
              type="button"
              className={`radio-action${isThisRecording ? " recording" : ""}`}
              onClick={(e) => handleToggleRecord(e, station.url)}
              title={recording ? "Stop recording" : "Record station"}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill={isThisRecording ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="6" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className={`radio-action${saved ? " saved" : ""}`}
            onClick={(e) =>
              saved
                ? handleRemoveStation(e, station.id)
                : handleSaveStation(e, station)
            }
            title={saved ? "Remove station" : "Save station"}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill={saved ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const stationHeading = activeGenre
    ? `${activeGenre} stations`
    : searchQuery
      ? `Results for “${searchQuery}”`
      : "Popular stations";

  return (
    <div className="radio-page">
      <div className="radio-header-wrap">
        <div className="radio-header-inner">
          <header className="artist-collection-header radio-collection-header">
            <div className="artist-collection-copy">
              <div className="artist-collection-eyebrow">
                <span className="artist-collection-dot" />
                Streaming
              </div>
              <h1 className="artist-collection-title">Radio</h1>
              <p className="artist-collection-subtitle">
                {activeGenre
                  ? `${activeGenre} stations`
                  : searchQuery
                    ? `Search results for “${searchQuery}”`
                    : `${stations.length} stations · Always live`}
              </p>
            </div>
            <div className="artist-collection-controls">
              {recording && (
                <div className="radio-recording-pill">
                  <span className="radio-recording-dot" />
                  REC · {recordingName}
                </div>
              )}
              <div className="ap-search-wrap radio-search">
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="var(--text3)"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search stations…"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
          </header>

          {!ytdlpAvailable && (
            <div className="radio-warning">
              <span>⚠️</span> yt-dlp not installed. Radio is unavailable. Run:{" "}
              <code>pip install yt-dlp</code>
            </div>
          )}

          <div className="radio-filters">
            <button
              type="button"
              className={`radio-chip${!activeGenre && !searchQuery ? " active" : ""}`}
              onClick={() => {
                setActiveGenre(null);
                setSearchQuery("");
                loadPopular();
              }}
            >
              Popular
            </button>
            {GENRES.map((genre) => (
              <button
                key={genre}
                type="button"
                className={`radio-chip${activeGenre === genre ? " active" : ""}`}
                onClick={() => handleGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="radio-scroll">
        <div className="radio-scroll-inner">
          {savedStations.length > 0 && (
            <section className="artist-all-songs radio-stations-panel">
              <div className="artist-section-head">
                <h2>Saved stations</h2>
                <span>{savedStations.length}</span>
              </div>
              <div className="radio-station-list">
                {savedStations.map((station) =>
                  renderStationRow(station, true),
                )}
              </div>
            </section>
          )}

          <section className="artist-all-songs radio-stations-panel">
            <div className="artist-section-head">
              <h2>{stationHeading}</h2>
              {!loading && <span>{stations.length}</span>}
            </div>
            {loading ? (
              <div className="radio-loading">
                <div className="ap-spinner ap-spinner--sm" />
                <span>Loading stations…</span>
              </div>
            ) : stations.length === 0 ? (
              <div className="radio-empty">
                <div className="radio-empty-icon">📻</div>
                <h3>No stations found</h3>
                <p>Try another genre or search for a different station.</p>
              </div>
            ) : (
              <div className="radio-station-list">
                {stations.map((station) =>
                  renderStationRow(station, isSaved(station.id)),
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default RadioPage;
