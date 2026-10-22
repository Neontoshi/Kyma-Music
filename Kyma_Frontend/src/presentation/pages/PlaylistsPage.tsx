import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { tauriCommands } from "../../services/tauriBridge";
import { usePlayerStore } from "../stores/playerStore";
import { randomGradient } from "../../lib/gradients";

const PlaylistsPage: React.FC = () => {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const setError = usePlayerStore((s) => s.setError);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const data = await tauriCommands.getPlaylists();
      setPlaylists(data || []);
    } catch (err) {
      console.error("Failed to load playlists:", err);
      setError("Couldn't load your playlists. Please try again.");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter((playlist) =>
      playlist.name?.toLowerCase().includes(q),
    );
  }, [playlists, query]);

  return (
    <div className="playlist-page">
      <div className="playlist-inner">
        <header className="artist-collection-header playlist-collection-header">
          <div className="artist-collection-copy">
            <div className="artist-collection-eyebrow">
              <span className="artist-collection-dot" />
              Collection
            </div>
            <h1 className="artist-collection-title">Playlists</h1>
            <p className="artist-collection-subtitle">
              {playlists.length} playlist{playlists.length === 1 ? "" : "s"} ·
              Handpicked by you
            </p>
          </div>
          {playlists.length > 0 && (
            <div className="artist-collection-controls">
              <div className="ap-search-wrap playlist-search">
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
                  placeholder="Filter playlists…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          )}
        </header>

        {filtered.length === 0 ? (
          <div className="playlist-empty">
            <div className="playlist-empty-art">
              <span>♪</span>
            </div>
            <h2>{query ? "No playlists found" : "No playlists yet"}</h2>
            <p>
              {query
                ? "Try a different playlist name."
                : "Use the + next to Playlists in the sidebar to create your first one."}
            </p>
          </div>
        ) : (
          <div className="playlist-grid">
            {filtered.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                className="playlist-card"
                onClick={() => navigate(`/playlists/${playlist.id}`)}
              >
                <div
                  className="playlist-card-art"
                  style={{ background: randomGradient(playlist.name) }}
                >
                  <span className="playlist-card-emoji">
                    {playlist.emoji || "♪"}
                  </span>
                  <span className="playlist-card-play">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      width="13"
                      height="13"
                    >
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </span>
                </div>
                <div className="playlist-card-info">
                  <span className="playlist-card-name">{playlist.name}</span>
                  <span className="playlist-card-meta">
                    {playlist.song_count ?? 0} songs · Playlist
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistsPage;
