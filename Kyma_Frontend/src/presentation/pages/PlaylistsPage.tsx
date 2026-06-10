import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { tauriCommands } from "../../services/tauriBridge";
import { usePlayerStore } from "../stores/playerStore";

const PlaylistsPage: React.FC = () => {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const navigate = useNavigate();
  const setError = usePlayerStore((s) => s.setError);
  const setMessage = usePlayerStore((s) => s.setMessage);

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

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await tauriCommands.createPlaylist(
        newName.trim(),
        newDesc.trim() || undefined,
      );
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      setMessage(`Playlist "${newName.trim()}" created`);
      setTimeout(() => setMessage(null), 2000);
      loadPlaylists();
    } catch (err) {
      console.error("Failed to create playlist:", err);
      setError(
        "Couldn't create playlist. Please check the name and try again.",
      );
    }
  };

  return (
    <div className="song-list-pane">
      <div className="section-header">
        <div>
          <div className="section-title">Playlists</div>
          <div className="section-sub">{playlists.length} playlists</div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "10px 20px",
            background: "var(--accent)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            color: "#fff",
            cursor: "pointer",
            fontFamily: "'Syne', sans-serif",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          + New Playlist
        </button>
      </div>

      {showCreate && (
        <div
          style={{
            background: "var(--surface2)",
            borderRadius: "var(--radius)",
            padding: "20px",
            marginBottom: "20px",
            border: "1px solid var(--border)",
          }}
        >
          <input
            type="text"
            placeholder="Playlist name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text)",
              fontSize: "14px",
              marginBottom: "12px",
              outline: "none",
              fontFamily: "'Syne', sans-serif",
            }}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text)",
              fontSize: "13px",
              marginBottom: "12px",
              outline: "none",
              fontFamily: "'Syne', sans-serif",
            }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleCreate}
              style={{
                padding: "8px 20px",
                background: "var(--accent)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                color: "#fff",
                cursor: "pointer",
                fontFamily: "'Syne', sans-serif",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              style={{
                padding: "8px 20px",
                background: "var(--surface3)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text2)",
                cursor: "pointer",
                fontFamily: "'Syne', sans-serif",
                fontSize: "12px",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {playlists.length === 0 ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "var(--text3)",
          }}
        >
          No playlists yet. Create your first playlist!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => navigate(`/playlists/${pl.id}`)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "16px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                transition: "background 0.12s",
                background: "var(--surface2)",
                border: "1px solid transparent",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--border2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "transparent")
              }
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "var(--radius-sm)",
                  background:
                    "linear-gradient(135deg, var(--accent), var(--accent2))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flexShrink: 0,
                }}
              >
                🎵
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>
                  {pl.name}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text3)",
                    marginTop: "2px",
                  }}
                >
                  {pl.song_count} songs
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaylistsPage;
