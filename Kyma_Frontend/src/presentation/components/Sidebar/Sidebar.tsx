import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";
import { logger } from "../../../services/logger.ts";
import { tauriCommands } from "../../../services/tauriBridge.ts";

const SongsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const AlbumsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ArtistsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const LikedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);

const TrendingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const PodcastIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2a10 10 0 00-9.95 9h19.9A10 10 0 0012 2z" />
    <path d="M8 11h8v4a4 4 0 01-8 0v-4z" />
    <circle cx="12" cy="18" r="1" />
  </svg>
);


interface SidebarProps {
  className?: string;
  onOpen?: () => void;
  onClose?: () => void;
}

const EMOJIS = ["🎵", "🔥", "🌙", "⚡", "🌴", "💚", "🎸", "🎤", "🥁", "🎹"];

const MOODS = [
  { id: "chill", label: "chill", color: "var(--accent)" },
  { id: "hype", label: "hype", color: "#ff4d4d" },
  { id: "focus", label: "focus", color: "var(--accent3)" },
  { id: "sad", label: "sad", color: "#4da3ff" },
  { id: "romantic", label: "romantic", color: "#ff4d4d" },
  { id: "workout", label: "workout", color: "var(--accent)", textColor: "#0d0d0d" },
];

const slideStyle = (collapsed: boolean): React.CSSProperties => ({
  opacity: collapsed ? 0 : 1,
  visibility: collapsed ? "hidden" : "visible",
  whiteSpace: "nowrap",
  flexShrink: 0,
  transition: collapsed
    ? "opacity 0.14s ease, visibility 0s linear 0.14s"
    : "opacity 0.22s ease 0.1s, visibility 0s",
});

const Sidebar: React.FC<SidebarProps> = ({ className, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [playlists, setPlaylists] = React.useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newEmoji, setNewEmoji] = React.useState("🎵");
  const [newMood, setNewMood] = React.useState<string | null>(null);
  const [newPrivacy, setNewPrivacy] = React.useState<
    "private" | "public" | "collab"
  >("private");
  const [isCreating, setIsCreating] = React.useState(false);

  const navItems = [
    { path: "/for-you", label: "Made For You", icon: TrendingIcon },
    { path: "/songs", label: "Your Collection", icon: SongsIcon },
    { path: "/liked", label: "Liked Songs", icon: LikedIcon },
    { path: "/albums", label: "Albums", icon: AlbumsIcon },
    { path: "/artists", label: "Artists", icon: ArtistsIcon },
    { path: "/podcasts", label: "Podcasts", icon: PodcastIcon },
  ];

  React.useEffect(() => {
    tauriCommands
      .getPlaylists()
      .then((data) => setPlaylists(data || []))
      .catch(() => {});
  }, [location.pathname]);

  const refreshPlaylists = () => {
    tauriCommands
      .getPlaylists()
      .then((data) => setPlaylists(data || []))
      .catch(() => {});
  };

  const canCreate = newName.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate || isCreating) return;
    setIsCreating(true);
    logger.logUI("Sidebar", "create_playlist_start", {
      name: newName.trim(),
      mood: newMood,
    });
    try {
      await tauriCommands.createPlaylist(
        newName.trim(),
        newDesc.trim() || undefined,
        newEmoji,
        newMood || undefined,
        newPrivacy,
      );
      logger.logUI("Sidebar", "create_playlist_success", {
        name: newName.trim(),
      });
      setNewName("");
      setNewDesc("");
      setNewEmoji("🎵");
      setNewMood(null);
      setNewPrivacy("private");
      setShowCreateModal(false);
      refreshPlaylists();
    } catch (err) {
      logger.logError("Sidebar create_playlist_failed", {
        name: newName.trim(),
        error: err,
      });
      console.error("Failed to create playlist:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setShowCreateModal(false);
  };

  const handleNavigate = (path: string, label: string) => {
    logger.logUI("Sidebar", "navigate", {
      from: location.pathname,
      to: path,
      label,
    });
    navigate(path);
    if (onClose) {
      onClose();
    }
  };

  const handleToggleSidebar = () => {
    const willCollapse = !sidebarCollapsed;
    logger.logUI("Sidebar", willCollapse ? "collapse" : "expand", {});
    toggleSidebar();
  };

  const handleOpenCreateModal = () => {
    logger.logUI("Sidebar", "open_create_modal", {});
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    logger.logUI("Sidebar", "close_create_modal", {});
    setShowCreateModal(false);
  };

  const handlePlaylistClick = (playlistId: string, playlistName: string) => {
    logger.logUI("Sidebar", "playlist_click", {
      id: playlistId,
      name: playlistName,
    });
    navigate(`/playlists/${playlistId}`);
  };

  return (
    <aside
      className={`sidebar ${className || ""} ${sidebarCollapsed ? "sidebar--collapsed" : ""}`}
    >
      <div className="sidebar-top">
        <button
          type="button"
          className="sidebar-menu-btn"
          onClick={handleToggleSidebar}
          data-tooltip={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </svg>
        </button>
      </div>

      <div className="sidebar-scroll">
        <div className="nav-section">
          <div style={slideStyle(sidebarCollapsed)}>
            <button
              className="nav-label nav-label-link"
              onClick={() => handleNavigate("/library", "Library")}
            >
              Your Library
            </button>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.path}
                className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
                onClick={() => handleNavigate(item.path, item.label)}
                data-tooltip={sidebarCollapsed ? item.label : undefined}
                aria-label={item.label}
              >
                <Icon />
                <span style={slideStyle(sidebarCollapsed)}>{item.label}</span>
              </div>
            );
          })}
        </div>

          <div
            className="nav-section"
            style={slideStyle(sidebarCollapsed)}
            aria-hidden={sidebarCollapsed}
            >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0 8px",
                marginBottom: "8px",
                overflow: "hidden",
              }}
            >
              <div className="nav-label" style={{ marginBottom: 0 }}>
                Playlists
              </div>
              <div
                onClick={handleOpenCreateModal}
                className="sidebar-new-playlist-icon"
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "var(--radius-xs)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text3)",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text)";
                  e.currentTarget.style.background = "var(--surface2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text3)";
                  e.currentTarget.style.background = "transparent";
                }}
                data-tooltip="New Playlist"
                aria-label="New Playlist"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="14"
                  height="14"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
            </div>
            <div className="playlist-list">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="playlist-item"
                  onClick={() => handlePlaylistClick(pl.id, pl.name)}
                >
                  <span className="playlist-name">{pl.name}</span>
                </div>
              ))}
            </div>
          </div>
      </div>

      {showCreateModal && (
        <>
          <div
            className="playlist-modal-backdrop"
            onClick={handleCloseCreateModal}
          />
          <div
            className="playlist-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="playlist-modal-title"
            onKeyDown={handleKeyDown}
          >
            <div className="playlist-modal-glow" />
            <div className="playlist-modal-header">
              <div>
                <div className="playlist-modal-eyebrow">New collection</div>
                <h2 id="playlist-modal-title">Create playlist</h2>
              </div>
              <button
                type="button"
                className="playlist-modal-close"
                onClick={handleCloseCreateModal}
                aria-label="Close"
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

            <div className="playlist-modal-body">
              <div className="playlist-modal-preview">
                <div className="playlist-modal-cover">
                  <span>{newEmoji}</span>
                </div>
                <div className="playlist-modal-preview-copy">
                  <div className="playlist-modal-preview-label">Live preview</div>
                  <div className="playlist-modal-preview-name">
                    {newName.trim() || "Untitled playlist"}
                  </div>
                  <div className="playlist-modal-preview-desc">
                    {newDesc.trim() || "Your next favorite mix starts here."}
                  </div>
                </div>
              </div>

              <div className="playlist-modal-field">
                <label htmlFor="playlist-name">
                  Name
                </label>
                <input
                  id="playlist-name"
                  className="playlist-modal-input"
                  onKeyDown={(e) => e.stopPropagation()}
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My Awesome Playlist"
                  maxLength={60}
                />
              </div>

              <div className="playlist-modal-field">
                <label htmlFor="playlist-description">
                  Description <span>optional</span>
                </label>
                <textarea
                  id="playlist-description"
                  className="playlist-modal-input playlist-modal-textarea"
                  onKeyDown={(e) => e.stopPropagation()}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What's the vibe?"
                  rows={2}
                />
              </div>

              <div className="playlist-modal-field">
                <label>Cover</label>
                <div className="playlist-modal-emoji-grid">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className={`playlist-modal-emoji${newEmoji === e ? " active" : ""}`}
                      onClick={() => {
                        logger.logUI("Sidebar", "emoji_selected", { emoji: e });
                        setNewEmoji(e);
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="playlist-modal-field">
                <label>
                  Mood <span>optional</span>
                </label>
                <div className="playlist-modal-moods">
                  {MOODS.map((m) => {
                    const isActive = newMood === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={`playlist-modal-mood${isActive ? " active" : ""}`}
                        style={
                          {
                            "--mood-color": m.color,
                            "--mood-text": m.textColor || "#fff",
                          } as React.CSSProperties
                        }
                        onClick={() => {
                          logger.logUI("Sidebar", "mood_selected", {
                            mood: m.id,
                            active: !isActive,
                          });
                          setNewMood(isActive ? null : m.id);
                        }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="playlist-modal-footer">
              <button
                type="button"
                className="playlist-modal-cancel"
                onClick={handleCloseCreateModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="playlist-modal-create"
                onClick={handleCreate}
                disabled={!canCreate || isCreating}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  width="14"
                  height="14"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {isCreating ? "Creating…" : "Create playlist"}
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};

export default Sidebar;
