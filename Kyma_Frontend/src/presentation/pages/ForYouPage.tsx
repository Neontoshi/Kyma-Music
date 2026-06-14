import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSystemStore } from "../stores/systemStore";
import { tauriCommands } from "../../services/tauriBridge";
import { usePlayerStore } from "../stores/playerStore";

const ALL_GENRES = [
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
  "gospel",
  "latin",
  "afrobeats",
  "k-pop",
  "indie",
  "alternative",
];

const randomGradient = (seed: string) => {
  const hash = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 40, 160, 100, 10, 260, 320, 180];
  const h = hues[hash % hues.length];
  return `linear-gradient(135deg, hsl(${h}, 45%, 32%), hsl(${h + 30}, 38%, 18%))`;
};

const ForYouPage: React.FC = () => {
  const navigate = useNavigate();
  const setError = usePlayerStore((s) => s.setError);
  const { ytdlpAvailable } = useSystemStore();
  const [addedGenres, setAddedGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genreArtists, setGenreArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("kyma-added-genres");
      if (stored) setAddedGenres(JSON.parse(stored));
    } catch {}
  }, []);

  const saveGenres = (genres: string[]) => {
    setAddedGenres(genres);
    localStorage.setItem("kyma-added-genres", JSON.stringify(genres));
  };

  const addGenre = (genre: string) => {
    if (!addedGenres.includes(genre)) saveGenres([...addedGenres, genre]);
  };

  const removeGenre = (genre: string) => {
    saveGenres(addedGenres.filter((g) => g !== genre));
  };

  const filteredGenres = searchQuery
    ? addedGenres.filter((g) =>
        g.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : addedGenres;

  const availableGenres = addSearchQuery
    ? ALL_GENRES.filter(
        (g) =>
          g.toLowerCase().includes(addSearchQuery.toLowerCase()) &&
          !addedGenres.includes(g),
      )
    : ALL_GENRES.filter((g) => !addedGenres.includes(g));

  const loadGenreArtists = async (genre: string) => {
    setSelectedGenre(genre);
    setLoading(true);
    setGenreArtists([]);
    try {
      const data = (await tauriCommands.getDeezerGenreArtists(genre)) as any[];
      const seen = new Set<number>();
      const unique = (data || []).filter((a: any) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
      setGenreArtists(unique);
    } catch (err) {
      console.error("Failed to load genre artists:", err);
      setError("Couldn't load artists for this genre. Try again later.");
      setGenreArtists([]);
    }
    setLoading(false);
  };

  if (selectedGenre) {
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
          className="ap-detail"
          style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
        >
          <div className="ap-detail-inner">
            <button className="ap-back" onClick={() => setSelectedGenre(null)}>
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
              For You
            </button>
            <div
              className="ap-hero"
              style={{ background: randomGradient(selectedGenre) }}
            >
              <div className="ap-hero-noise" />
              <div className="ap-hero-content">
                <div
                  className="ap-hero-avatar"
                  style={{
                    background: randomGradient(selectedGenre + "_inner"),
                  }}
                >
                  <span>🎵</span>
                </div>
                <div className="ap-hero-meta">
                  <div className="ap-hero-eyebrow">Genre</div>
                  <h1
                    className="ap-hero-name"
                    style={{ textTransform: "capitalize" }}
                  >
                    {selectedGenre}
                  </h1>
                  <div className="ap-hero-stats">
                    <div className="ap-stat">
                      <span className="ap-stat-val">{genreArtists.length}</span>
                      <span className="ap-stat-lbl">Artists</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="ap-hero-actions">
                <button
                  className="ap-unfollow"
                  onClick={() => {
                    removeGenre(selectedGenre);
                    setSelectedGenre(null);
                  }}
                >
                  Remove Genre
                </button>
              </div>
            </div>
            <div style={{ marginTop: "2rem" }}>
              {loading ? (
                <div className="ap-loading">
                  <div className="ap-spinner" />
                  <p>Loading artists…</p>
                </div>
              ) : genreArtists.length === 0 ? (
                <div className="ap-loading">
                  <p>No artists found</p>
                </div>
              ) : (
                <div className="ap-grid">
                  {genreArtists.map((artist: any, idx: number) => (
                    <div
                      key={artist.id}
                      className="ap-card"
                      onClick={() =>
                        navigate(`/artists/${encodeURIComponent(artist.name)}`)
                      }
                      style={{ animationDelay: `${idx * 0.03}s` }}
                    >
                      <div
                        className="ap-card-avatar"
                        style={{ background: randomGradient(artist.name) }}
                      >
                        {artist.picture_medium ? (
                          <img
                            src={artist.picture_medium}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              position: "absolute",
                              inset: 0,
                            }}
                          />
                        ) : (
                          <span>🎤</span>
                        )}
                        <div className="ap-card-overlay">
                          <svg
                            viewBox="0 0 24 24"
                            fill="white"
                            width="20"
                            height="20"
                          >
                            <polygon points="5,3 19,12 5,21" />
                          </svg>
                        </div>
                      </div>
                      <div className="ap-card-info">
                        <div className="ap-card-name">{artist.name}</div>
                        <div className="ap-card-meta">
                          {artist.nb_fan
                            ? `${(artist.nb_fan / 1000).toFixed(0)}K fans`
                            : "Deezer"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              borderRadius: "var(--radius-md)",
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
            <span>⚠️</span> yt-dlp not installed. Streaming unavailable.
          </div>
        )}
        <div className="ap-page-header-top">
          <div>
            <div className="ap-page-eyebrow">Discovery</div>
            <h1 className="ap-page-title">
              For You{" "}
              {filteredGenres.length > 0 && (
                <span className="ap-page-count">{filteredGenres.length}</span>
              )}
            </h1>
          </div>
          <div className="ap-page-controls">
            <div className="ap-search-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text3)"
                strokeWidth="2"
                width="13"
                height="13"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Filter genres…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="ap-add-btn"
              onClick={() => setShowAddModal(true)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                width="13"
                height="13"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Genre
            </button>
          </div>
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
        {addedGenres.length === 0 ? (
          <div className="ap-empty">
            <div className="ap-empty-icon">🎧</div>
            <div className="ap-empty-text">No genres added yet</div>
            <button
              className="ap-add-btn"
              style={{ marginTop: 16 }}
              onClick={() => setShowAddModal(true)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                width="13"
                height="13"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Genre
            </button>
          </div>
        ) : (
          <div className="ap-grid">
            {filteredGenres.map((genre, idx) => (
              <div
                key={genre}
                className="ap-card"
                onClick={() => loadGenreArtists(genre)}
                style={{ animationDelay: `${idx * 0.03}s` }}
              >
                <div
                  className="ap-card-avatar"
                  style={{ background: randomGradient(genre) }}
                >
                  <span>🎵</span>
                  <div className="ap-card-overlay">
                    <svg
                      viewBox="0 0 24 24"
                      fill="white"
                      width="20"
                      height="20"
                    >
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                </div>
                <div className="ap-card-info">
                  <div
                    className="ap-card-name"
                    style={{ textTransform: "capitalize" }}
                  >
                    {genre}
                  </div>
                  <div className="ap-card-meta">Top Artists</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showAddModal && (
        <>
          <div
            className="ap-modal-overlay"
            onClick={() => setShowAddModal(false)}
          />
          <div className="ap-modal">
            <div className="ap-modal-header">
              <div className="ap-modal-title-row">
                <h2 className="ap-modal-title">Add Genre</h2>
                <button
                  className="ap-modal-close"
                  onClick={() => setShowAddModal(false)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="14"
                    height="14"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="ap-modal-search-wrap">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text3)"
                  strokeWidth="2"
                  width="14"
                  height="14"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  placeholder="Search genres…"
                  value={addSearchQuery}
                  onChange={(e) => setAddSearchQuery(e.target.value)}
                  className="ap-modal-input"
                />
              </div>
            </div>
            <div className="ap-modal-results">
              {availableGenres.map((genre) => (
                <div key={genre} className="ap-modal-row">
                  <div className="ap-modal-artist-info">
                    <div
                      className="ap-modal-avatar"
                      style={{ background: randomGradient(genre) }}
                    >
                      🎵
                    </div>
                    <div>
                      <div
                        className="ap-modal-artist-name"
                        style={{ textTransform: "capitalize" }}
                      >
                        {genre}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      addGenre(genre);
                      setAddSearchQuery("");
                    }}
                    className="ap-follow-btn"
                  >
                    Add
                  </button>
                </div>
              ))}
              {addSearchQuery && availableGenres.length === 0 && (
                <div className="ap-modal-empty">No genres found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ForYouPage;
