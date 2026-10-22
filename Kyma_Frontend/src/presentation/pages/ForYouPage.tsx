import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSystemStore } from "../stores/systemStore";
import { tauriCommands } from "../../services/tauriBridge";
import { usePlayerStore } from "../stores/playerStore";
import { randomGradient } from "../../lib/gradients";

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
      <div className="foryou-page">
        <div className="foryou-ambient" aria-hidden="true" />
        <div className="foryou-inner">
          <button
            className="foryou-back"
            onClick={() => setSelectedGenre(null)}
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
            Made For You
          </button>

          <section className="foryou-detail-hero">
            <div
              className="foryou-detail-art"
              style={{ background: randomGradient(selectedGenre) }}
            >
              <span aria-hidden="true">♪</span>
            </div>
            <div className="foryou-detail-copy">
              <span className="foryou-eyebrow">Genre spotlight</span>
              <h1>{selectedGenre}</h1>
              <p>
                The artists defining {selectedGenre} right now, picked from your
                personal genre mix.
              </p>
              <div className="foryou-detail-stats">
                <div>
                  <strong>{genreArtists.length}</strong>
                  <span>Artists</span>
                </div>
                <div>
                  <strong>Top</strong>
                  <span>Deezer picks</span>
                </div>
              </div>
              <button
                className="foryou-remove-btn"
                onClick={() => {
                  removeGenre(selectedGenre);
                  setSelectedGenre(null);
                }}
              >
                Remove genre
              </button>
            </div>
            <div className="foryou-hero-mark" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
                <span key={bar} />
              ))}
            </div>
          </section>

          <div className="foryou-section-head">
            <div>
              <span className="foryou-eyebrow">Line-up</span>
              <h2>Artists in {selectedGenre}</h2>
            </div>
            <span className="foryou-section-meta">
              {loading ? "Loading…" : `${genreArtists.length} results`}
            </span>
          </div>

          {loading ? (
            <div className="foryou-artist-grid">
              {Array.from({ length: 8 }).map((_, index) => (
                <div className="foryou-artist-skeleton" key={index}>
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : genreArtists.length === 0 ? (
            <div className="foryou-empty">
              <div className="foryou-empty-icon">🎧</div>
              <h3>No artists found</h3>
              <p>Try another genre or check back in a moment.</p>
              <button
                className="foryou-add-btn"
                onClick={() => setSelectedGenre(null)}
              >
                Browse genres
              </button>
            </div>
          ) : (
            <div className="foryou-artist-grid">
              {genreArtists.map((artist: any, idx: number) => (
                <article
                  key={artist.id}
                  className="foryou-artist-card"
                  onClick={() =>
                    navigate(`/artists/${encodeURIComponent(artist.name)}`)
                  }
                  style={{ animationDelay: `${idx * 0.03}s` }}
                >
                  <div
                    className="foryou-artist-art"
                    style={{ background: randomGradient(artist.name) }}
                  >
                    {artist.picture_medium ? (
                      <img src={artist.picture_medium} alt="" />
                    ) : (
                      <span aria-hidden="true">🎤</span>
                    )}
                    <div className="foryou-artist-play" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    </div>
                  </div>
                  <h3>{artist.name}</h3>
                  <p>
                    {artist.nb_fan
                      ? `${(artist.nb_fan / 1000).toFixed(0)}K fans`
                      : "Deezer artist"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="foryou-page">
      <div className="foryou-ambient" aria-hidden="true" />
      <div className="foryou-inner">
        {!ytdlpAvailable && (
          <div className="foryou-warning">
            <span className="foryou-warning-icon">⚠</span>
            <div>
              <strong>Streaming is unavailable</strong>
              <small>
                Install yt-dlp to play tracks. Genre discovery still works.
              </small>
            </div>
          </div>
        )}

        <section className="foryou-hero">
          <div className="foryou-hero-copy">
            <span className="foryou-eyebrow">Made for you</span>
            <h1>
              Your genres, <span>tuned in.</span>
            </h1>
            <p>
              Choose the sounds you love and Kyma turns them into a personal
              lane of artists, ready to explore.
            </p>
            <div className="foryou-hero-stats">
              <div>
                <strong>{addedGenres.length}</strong>
                <span>Genres</span>
              </div>
              <div>
                <strong>{ALL_GENRES.length}</strong>
                <span>To discover</span>
              </div>
            </div>
          </div>
          <div className="foryou-hero-mark" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
              <span key={bar} />
            ))}
          </div>
        </section>

        <div className="foryou-toolbar">
          <div className="foryou-search">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Filter your genres…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="foryou-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear filter"
              >
                ✕
              </button>
            )}
          </div>
          <button
            className="foryou-add-btn"
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
            Add genre
          </button>
        </div>

        <div className="foryou-section-head">
          <div>
            <span className="foryou-eyebrow">Your mix</span>
            <h2>Genres you follow</h2>
          </div>
          <span className="foryou-section-meta">
            {filteredGenres.length} of {addedGenres.length}
          </span>
        </div>

        {addedGenres.length === 0 ? (
          <div className="foryou-empty">
            <div className="foryou-empty-icon">🎧</div>
            <h3>Your mix is empty</h3>
            <p>Add a few genres and we’ll surface the artists behind them.</p>
            <button
              className="foryou-add-btn"
              onClick={() => setShowAddModal(true)}
            >
              Add your first genre
            </button>
          </div>
        ) : filteredGenres.length === 0 ? (
          <div className="foryou-empty">
            <div className="foryou-empty-icon">🔍</div>
            <h3>No genres match “{searchQuery}”</h3>
            <p>Try a different search or add a new genre.</p>
            <button
              className="foryou-add-btn"
              onClick={() => setSearchQuery("")}
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div className="foryou-genre-grid">
            {filteredGenres.map((genre, idx) => (
              <article
                key={genre}
                className="foryou-genre-card"
                onClick={() => loadGenreArtists(genre)}
                style={{ animationDelay: `${idx * 0.03}s` }}
              >
                <div
                  className="foryou-genre-art"
                  style={{ background: randomGradient(genre) }}
                >
                  <span className="foryou-genre-note" aria-hidden="true">
                    ♪
                  </span>
                  <button
                    className="foryou-genre-remove"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeGenre(genre);
                    }}
                    aria-label={`Remove ${genre}`}
                    title={`Remove ${genre}`}
                  >
                    ✕
                  </button>
                  <div className="foryou-genre-overlay">
                    <span>Explore artists</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                </div>
                <h3>{genre}</h3>
                <p>Top artists</p>
              </article>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <>
          <div
            className="foryou-modal-overlay"
            onClick={() => setShowAddModal(false)}
          />
          <div className="foryou-modal" role="dialog" aria-modal="true">
            <div className="foryou-modal-head">
              <div>
                <span className="foryou-eyebrow">Discover</span>
                <h2>Add a genre</h2>
              </div>
              <button
                className="foryou-modal-close"
                onClick={() => setShowAddModal(false)}
                aria-label="Close"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="15"
                  height="15"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="foryou-modal-search">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
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
              />
            </div>
            <div className="foryou-modal-results">
              {availableGenres.map((genre) => (
                <div key={genre} className="foryou-modal-row">
                  <div
                    className="foryou-modal-art"
                    style={{ background: randomGradient(genre) }}
                  >
                    ♪
                  </div>
                  <div className="foryou-modal-name">{genre}</div>
                  <button
                    className="foryou-modal-add"
                    onClick={() => {
                      addGenre(genre);
                      setAddSearchQuery("");
                    }}
                  >
                    Add
                  </button>
                </div>
              ))}
              {addSearchQuery && availableGenres.length === 0 && (
                <div className="foryou-modal-empty">No genres found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ForYouPage;
