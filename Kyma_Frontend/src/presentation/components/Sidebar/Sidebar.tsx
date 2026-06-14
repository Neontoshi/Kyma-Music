import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";
import { useUserStore } from "../../stores/userStore";
import { logger } from "../../../services/logger.ts";

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </svg>
);

const NowPlayingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10,8 16,12 10,16" />
  </svg>
);

const SongsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

const ExploreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const TrendingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const RadioIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
  </svg>
);

const PodcastIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2a10 10 0 00-9.95 9h19.9A10 10 0 0012 2z" />
    <path d="M8 11h8v4a4 4 0 01-8 0v-4z" />
    <circle cx="12" cy="18" r="1" />
  </svg>
);

const SettingsIcon = () => (
  <svg
    className="settings-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

interface SidebarProps {
  className?: string;
  onOpen?: () => void;
  onClose?: () => void;
}

const EMOJIS = ["🎵", "🔥", "🌙", "⚡", "🌴", "💜", "🎸", "🎤", "🥁", "🎹"];

const MOODS = [
  { id: "chill", label: "chill", color: "#7c6af5" },
  { id: "hype", label: "hype", color: "#ff6b35" },
  { id: "focus", label: "focus", color: "#1d9e75" },
  { id: "sad", label: "sad", color: "#378add" },
  { id: "romantic", label: "romantic", color: "#d4537e" },
  { id: "workout", label: "workout", color: "#c8f54a", textColor: "#0d0d0d" },
];

const slideStyle = (collapsed: boolean): React.CSSProperties => ({
  maxWidth: collapsed ? 0 : "200px",
  opacity: collapsed ? 0 : 1,
  overflow: "hidden",
  whiteSpace: "nowrap",
  flexShrink: 0,
  transition: collapsed
    ? "max-width 0.18s cubic-bezier(0.4, 0, 1, 1), opacity 0.12s ease"
    : "max-width 0.28s cubic-bezier(0, 0, 0.2, 1) 0.05s, opacity 0.2s ease 0.1s",
});

const Sidebar: React.FC<SidebarProps> = ({ className, onOpen, onClose }) => {
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
  const { displayName } = useUserStore();

  const navItems = [
    { path: "/", label: "Home", icon: HomeIcon },
    { path: "/nowplaying", label: "Now Playing", icon: NowPlayingIcon },
    { path: "/songs", label: "Songs", icon: SongsIcon },
    { path: "/search", label: "Search", icon: SearchIcon },
    { path: "/albums", label: "Albums", icon: AlbumsIcon },
    { path: "/artists", label: "Artists", icon: ArtistsIcon },
    { path: "/liked", label: "Liked", icon: LikedIcon },
  ];

  const discoverItems = [
    { path: "/explore", label: "Explore", Icon: ExploreIcon },
    { path: "/for-you", label: "For You", Icon: TrendingIcon },
    { path: "/radio", label: "Radio", Icon: RadioIcon },
    { path: "/podcasts", label: "Podcasts", Icon: PodcastIcon },
  ];

  React.useEffect(() => {
    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke("get_playlists").then((data: any) => setPlaylists(data || []));
    });
  }, [location.pathname]);

  const refreshPlaylists = () => {
    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke("get_playlists").then((data: any) => setPlaylists(data || []));
    });
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
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("create_playlist", {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        emoji: newEmoji,
        mood: newMood || undefined,
        privacy: newPrivacy,
      });
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
  };

  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed;
    logger.logUI("Sidebar", newState ? "expand" : "collapse", {});
    toggleSidebar();
    if (newState && onOpen) {
      onOpen();
    } else if (!newState && onClose) {
      onClose();
    }
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
      <div
        className="logo"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        <div style={slideStyle(sidebarCollapsed)}>
          <div className="logo-text">Kyma</div>
          <div className="logo-sub">Music</div>
        </div>
        <button
          onClick={handleToggleSidebar}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px",
            borderRadius: "var(--radius-sm)",
            transition: "all 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--surface2)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text3)";
          }}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
            style={{
              transform: sidebarCollapsed ? "rotate(180deg)" : "none",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <line x1="15" y1="6" x2="9" y2="12" />
            <line x1="9" y1="12" x2="15" y2="18" />
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <div className="nav-section">
          <div style={slideStyle(sidebarCollapsed)}>
            <div className="nav-label">Library</div>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.path}
                className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
                onClick={() => handleNavigate(item.path, item.label)}
                style={{
                  justifyContent: sidebarCollapsed ? "center" : undefined,
                  padding: sidebarCollapsed ? "12px 8px" : undefined,
                  gap: sidebarCollapsed ? 0 : undefined,
                }}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon />
                <span style={slideStyle(sidebarCollapsed)}>{item.label}</span>
              </div>
            );
          })}
        </div>

        <div className="nav-section">
          <div style={slideStyle(sidebarCollapsed)}>
            <div className="nav-label">Discover</div>
          </div>
          {discoverItems.map(({ path, label, Icon }) => (
            <div
              key={path}
              className={`nav-item ${location.pathname === path ? "active" : ""}`}
              onClick={() => handleNavigate(path, label)}
              style={{
                justifyContent: sidebarCollapsed ? "center" : undefined,
                padding: sidebarCollapsed ? "12px 8px" : undefined,
                gap: sidebarCollapsed ? 0 : undefined,
              }}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon />
              <span style={slideStyle(sidebarCollapsed)}>{label}</span>
            </div>
          ))}
          <div
            className={`nav-item ${location.pathname === "/audiobooks" ? "active" : ""}`}
            onClick={() => handleNavigate("/audiobooks", "Audiobooks")}
            style={{
              justifyContent: sidebarCollapsed ? "center" : undefined,
              padding: sidebarCollapsed ? "12px 8px" : undefined,
              gap: sidebarCollapsed ? 0 : undefined,
            }}
            title={sidebarCollapsed ? "Audiobooks" : undefined}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="18"
              height="18"
            >
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            <span style={slideStyle(sidebarCollapsed)}>Audiobooks</span>
          </div>
        </div>

        {!sidebarCollapsed && (
          <div className="nav-section">
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
                title="New Playlist"
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
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      flexShrink: 0,
                    }}
                  >
                    {pl.emoji || "🎵"}
                  </div>
                  <span className="playlist-name">{pl.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="user-profile" style={{ overflow: "hidden" }}>
        {sidebarCollapsed ? (
          <div
            className="user-settings"
            onClick={() => handleNavigate("/settings", "Settings")}
            style={{ margin: "0 auto" }}
          >
            <SettingsIcon />
          </div>
        ) : (
          <>
            <div className="user-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{displayName}</div>
              <div className="user-plan">Pro Plan</div>
            </div>
            <div
              className="user-settings"
              onClick={() => handleNavigate("/settings", "Settings")}
            >
              <SettingsIcon />
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <>
          <div
            onClick={handleCloseCreateModal}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(10px)",
              zIndex: 9998,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 9999,
              width: "460px",
              maxWidth: "90vw",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              fontFamily: "'Syne', sans-serif",
              boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
              animation: "modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
            onKeyDown={handleKeyDown}
          >
            <style>{`@keyframes modalIn { from { opacity: 0; transform: translate(-50%, calc(-50% + 12px)) scale(0.93); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }`}</style>
            <div style={{ padding: "28px 28px 0" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--surface2)",
                    border: "1px dashed var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: "28px", lineHeight: 1 }}>
                    {newEmoji}
                  </span>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      color: "var(--text3)",
                      marginTop: "4px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    cover
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "22px",
                          fontWeight: 800,
                          color: "var(--text)",
                          letterSpacing: "-0.03em",
                          lineHeight: 1,
                        }}
                      >
                        New Playlist
                      </div>
                      <div
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "11px",
                          color: "var(--text3)",
                          marginTop: "5px",
                          letterSpacing: "0.03em",
                        }}
                      >
                        Curate your perfect collection
                      </div>
                    </div>
                    <div
                      onClick={handleCloseCreateModal}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "var(--radius-md)",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "var(--text3)",
                        flexShrink: 0,
                        transition: "all 0.15s",
                      }}
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
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
                  >
                    {EMOJIS.map((e) => (
                      <div
                        key={e}
                        onClick={() => {
                          logger.logUI("Sidebar", "emoji_selected", {
                            emoji: e,
                          });
                          setNewEmoji(e);
                        }}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "var(--radius-md)",
                          background:
                            newEmoji === e
                              ? "rgba(124,106,245,0.15)"
                              : "var(--surface2)",
                          border:
                            newEmoji === e
                              ? "1px solid var(--accent)"
                              : "1px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "16px",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {e}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div
                style={{
                  height: "1px",
                  background: "var(--border)",
                  margin: "20px 0 0",
                }}
              />
            </div>
            <div
              style={{
                padding: "20px 28px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: "7px" }}
              >
                <label
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--text3)",
                  }}
                >
                  Name
                </label>
                <input
                  onKeyDown={(e) => e.stopPropagation()}
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My Awesome Playlist"
                  maxLength={60}
                  style={{
                    width: "100%",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text)",
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "14px",
                    fontWeight: 500,
                    padding: "12px 14px",
                    outline: "none",
                  }}
                />
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "7px" }}
              >
                <label
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--text3)",
                  }}
                >
                  Description <span style={{ opacity: 0.5 }}>(optional)</span>
                </label>
                <textarea
                  onKeyDown={(e) => e.stopPropagation()}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What's the vibe?"
                  rows={3}
                  style={{
                    width: "100%",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text)",
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "14px",
                    padding: "12px 14px",
                    outline: "none",
                    resize: "none",
                  }}
                />
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "7px" }}
              >
                <label
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--text3)",
                  }}
                >
                  Mood
                </label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {MOODS.map((m) => {
                    const isActive = newMood === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          logger.logUI("Sidebar", "mood_selected", {
                            mood: m.id,
                            active: !isActive,
                          });
                          setNewMood(isActive ? null : m.id);
                        }}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          letterSpacing: "0.05em",
                          padding: "5px 12px",
                          borderRadius: "var(--radius-pill)",
                          border: isActive
                            ? `1px solid ${m.color}`
                            : "1px solid var(--border)",
                          background: isActive ? m.color : "var(--surface2)",
                          color: isActive
                            ? m.textColor || "#fff"
                            : "var(--text3)",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          userSelect: "none",
                        }}
                      >
                        {m.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{ height: "1px", background: "var(--border)" }} />
            <div
              style={{
                padding: "16px 28px 24px",
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                onClick={handleCloseCreateModal}
                style={{
                  flex: 1,
                  padding: "13px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text2)",
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!canCreate || isCreating}
                style={{
                  flex: 2,
                  padding: "13px",
                  background: canCreate
                    ? "linear-gradient(135deg, var(--accent), var(--accent2))"
                    : "var(--surface3)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  color: canCreate ? "#fff" : "var(--text3)",
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: canCreate ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  letterSpacing: "-0.01em",
                  transition: "all 0.2s",
                  opacity: canCreate ? 1 : 0.5,
                }}
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
                Create Playlist
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};

export default Sidebar;
