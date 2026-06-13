import React, { useState, useEffect } from "react";
import { tauriCommands } from "../../../services/tauriBridge";
import { useThemeStore } from "../../stores/themeStore";
import { usePlayerStore } from "../../stores/playerStore";
import { useFontStore } from "../../stores/fontStore";
import { useUpdater } from "../../hooks/useUpdater";
import { logger } from "../../../services/logger";
import { NavSection } from "./types";
import PlaybackSection from "./sections/PlaybackSection";
import LibrarySection from "./sections/LibrarySection";
import DownloadsSection from "./sections/DownloadsSection";
import AppearanceSection from "./sections/AppearanceSection";
import CastSection from "./sections/CastSection";
import IntegrationsSection from "./sections/IntegrationsSection";
import LogsSection from "./sections/LogsSection";
import UpdatesSection from "./sections/UpdatesSection";

const navItems: { id: NavSection; icon: string; label: string; sub: string }[] =
  [
    { id: "playback", icon: "⊕", label: "Playback", sub: "Audio behavior" },
    { id: "library", icon: "⊞", label: "Library", sub: "Folders & scan" },
    {
      id: "downloads",
      icon: "⊘",
      label: "Downloads",
      sub: "Quality & cleanup",
    },
    {
      id: "appearance",
      icon: "◈",
      label: "Appearance",
      sub: "Theme & display",
    },
    { id: "cast", icon: "⊛", label: "Kyma Cast", sub: "Remote control" },
    {
      id: "integrations",
      icon: "⊗",
      label: "Integrations",
      sub: "Last.fm · ListenBrainz",
    },
    { id: "logs", icon: "📋", label: "Logs", sub: "Debug & export" },
    {
      id: "updates",
      icon: "🔄",
      label: "Updates",
      sub: "Check for new version",
    },
  ];

const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<NavSection>("playback");
  const [saved, setSaved] = useState(false);
  const [localIP, setLocalIP] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy");

  // Player volume from store
  const playerVolume = usePlayerStore((s) => s.volume);
  const setPlayerVolume = usePlayerStore((s) => s.setVolume);
  const [defaultVolume, setDefaultVolume] = useState(playerVolume);

  // Font store
  const { selectedFont, setFont, saveToBackend } = useFontStore();

  // Updater
  const { updateAvailable, updateVersion, checking, checkForUpdates } =
    useUpdater();

  // State for all sections
  const [listenbrainzToken, setListenbrainzToken] = useState("");
  const [listenbrainzUser, setListenbrainzUser] = useState("");
  const [lastfmKey, setLastfmKey] = useState("");
  const [lastfmUser, setLastfmUser] = useState("");
  const [crossfade, setCrossfade] = useState(0);
  const [gapless, setGapless] = useState(true);
  const [audioQuality, setAudioQuality] = useState("high");
  const [scanFolders, setScanFolders] = useState<string[]>([]);
  const [autoScan, setAutoScan] = useState(false);
  const [autoScanInterval, setAutoScanInterval] = useState(24);
  const [downloadFolder, setDownloadFolder] = useState("");
  const [downloadQuality, setDownloadQuality] = useState("medium");
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(30);
  const { theme, setTheme: setThemeStore } = useThemeStore();
  const [localTheme, setLocalTheme] = useState(theme);
  const [fontSize, setFontSize] = useState("medium");
  const [logFilePath, setLogFilePath] = useState("");

  useEffect(() => {
    setDefaultVolume(playerVolume);
  }, [playerVolume]);

  useEffect(() => {
    loadSettings();
    detectLocalIP();
  }, []);

  const loadSettings = async () => {
    const token = await tauriCommands.getSetting("listenbrainz_token");
    if (token) setListenbrainzToken(token);
    const user = await tauriCommands.getSetting("listenbrainz_user");
    if (user) setListenbrainzUser(user);
    const lfmKey = await tauriCommands.getSetting("lastfm_api_key");
    if (lfmKey) setLastfmKey(lfmKey);
    const lfmUser = await tauriCommands.getSetting("lastfm_user");
    if (lfmUser) setLastfmUser(lfmUser);
    const vol = await tauriCommands.getSetting("default_volume");
    const volNum = vol ? parseInt(vol) : 70;
    setDefaultVolume(volNum);
    setPlayerVolume(volNum);
    const cf = await tauriCommands.getSetting("crossfade");
    if (cf) setCrossfade(parseInt(cf));
    const gp = await tauriCommands.getSetting("gapless");
    setGapless(gp !== "false");
    const aq = await tauriCommands.getSetting("audio_quality");
    if (aq) setAudioQuality(aq);
    const sf = await tauriCommands.getSetting("scan_folders");
    if (sf) setScanFolders(JSON.parse(sf));
    const asc = await tauriCommands.getSetting("auto_scan");
    setAutoScan(asc === "true");
    const asi = await tauriCommands.getSetting("auto_scan_interval");
    if (asi) setAutoScanInterval(parseInt(asi));
    const df = await tauriCommands.getSetting("download_folder");
    if (df) setDownloadFolder(df);
    const dq = await tauriCommands.getSetting("download_quality");
    if (dq) setDownloadQuality(dq);
    const ac = await tauriCommands.getSetting("auto_cleanup");
    setAutoCleanup(ac === "true");
    const cd = await tauriCommands.getSetting("cleanup_days");
    if (cd) setCleanupDays(parseInt(cd));
    const t = await tauriCommands.getSetting("theme");
    if (t) setLocalTheme(t);
    const fs = await tauriCommands.getSetting("font_size");
    if (fs) setFontSize(fs);
    const logPath = await tauriCommands.getLogFilePath();
    setLogFilePath(logPath);
  };

  const detectLocalIP = async () => {
    try {
      const ip = await tauriCommands.getLocalIP();
      setLocalIP(ip);
      const QRCode = (await import("qrcode")).default;
      const url = `http://${ip}:1421`;
      const qr = await QRCode.toDataURL(url, { width: 200, margin: 1 });
      setQrDataUrl(qr);
    } catch {
      setLocalIP("Unable to detect IP");
    }
  };

  const handleSave = async () => {
    logger.logUI("SettingsPage", "save_settings", {
      defaultVolume,
      audioQuality,
      autoScan,
      theme: localTheme,
      fontSize,
      selectedFont,
    });

    await tauriCommands.setSetting("default_volume", defaultVolume.toString());
    await tauriCommands.setSetting("listenbrainz_token", listenbrainzToken);
    await tauriCommands.setSetting("listenbrainz_user", listenbrainzUser);
    await tauriCommands.setSetting("lastfm_api_key", lastfmKey);
    await tauriCommands.setSetting("lastfm_user", lastfmUser);
    await tauriCommands.setSetting("crossfade", crossfade.toString());
    await tauriCommands.setSetting("gapless", gapless.toString());
    await tauriCommands.setSetting("audio_quality", audioQuality);
    await tauriCommands.setSetting("scan_folders", JSON.stringify(scanFolders));
    await tauriCommands.setSetting("auto_scan", autoScan.toString());
    await tauriCommands.setSetting(
      "auto_scan_interval",
      autoScanInterval.toString(),
    );
    await tauriCommands.setSetting("download_folder", downloadFolder);
    await tauriCommands.setSetting("download_quality", downloadQuality);
    await tauriCommands.setSetting("auto_cleanup", autoCleanup.toString());
    await tauriCommands.setSetting("cleanup_days", cleanupDays.toString());
    await tauriCommands.setSetting("theme", localTheme);
    setThemeStore(localTheme);
    await tauriCommands.setSetting("font_size", fontSize);
    await saveToBackend();

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSectionChange = (section: NavSection) => {
    logger.logUI("SettingsPage", "tab_change", {
      from: activeSection,
      to: section,
    });
    setActiveSection(section);
  };

  const handleFontChange = (fontValue: string) => {
    logger.logUI("SettingsPage", "font_change", {
      from: selectedFont,
      to: fontValue,
    });
    setFont(fontValue);
  };

  const handleScanFolderAdd = (folder: string) => {
    if (!scanFolders.includes(folder)) {
      setScanFolders([...scanFolders, folder]);
    }
  };

  const handleScanFolderRemove = (folder: string) => {
    setScanFolders(scanFolders.filter((f) => f !== folder));
  };

  const handleDownloadFolderSelect = (folder: string) => {
    setDownloadFolder(folder);
  };

  return (
    <div
      className="song-list-pane"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: 0,
        background: "transparent",
      }}
    >
      {/* Top Header Bar */}
      <div style={{ padding: "28px 32px 0", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "10px",
            marginBottom: "28px",
          }}
        >
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "var(--text)",
              fontFamily: "'Syne', sans-serif",
              margin: 0,
              lineHeight: 1,
            }}
          >
            Settings
          </h1>
          <span
            style={{
              fontSize: "10px",
              fontFamily: "'DM Mono', monospace",
              color: "var(--text3)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              paddingBottom: "2px",
            }}
          >
            Kyma
          </span>
        </div>

        {/* Pill Nav */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            padding: "4px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "14px",
            marginBottom: "0",
            overflowX: "auto",
          }}
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSectionChange(item.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "1px",
                  padding: "9px 14px",
                  borderRadius: "10px",
                  border: "none",
                  background: isActive
                    ? "rgba(124,106,245,0.18)"
                    : "transparent",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  flexShrink: 0,
                  outline: "none",
                  boxShadow: isActive
                    ? "inset 0 0 0 1px rgba(124,106,245,0.3)"
                    : "none",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "var(--accent2)" : "var(--text2)",
                    fontFamily: "'Syne', sans-serif",
                    letterSpacing: "-0.01em",
                    lineHeight: 1,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: "9px",
                    fontFamily: "'DM Mono', monospace",
                    color: isActive ? "rgba(192,132,252,0.7)" : "var(--text3)",
                    letterSpacing: "0.03em",
                  }}
                >
                  {item.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          background: "rgba(255,255,255,0.05)",
          margin: "0 32px",
          marginTop: "20px",
        }}
      />

      {/* Scrollable Content */}
      <div
        key={activeSection}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 32px 0",
        }}
      >
        {activeSection === "playback" && (
          <PlaybackSection
            defaultVolume={defaultVolume}
            setDefaultVolume={setDefaultVolume}
            setPlayerVolume={setPlayerVolume}
            crossfade={crossfade}
            setCrossfade={setCrossfade}
            gapless={gapless}
            setGapless={setGapless}
            audioQuality={audioQuality}
            setAudioQuality={setAudioQuality}
          />
        )}
        {activeSection === "library" && (
          <LibrarySection
            autoScan={autoScan}
            setAutoScan={setAutoScan}
            autoScanInterval={autoScanInterval}
            setAutoScanInterval={setAutoScanInterval}
            scanFolders={scanFolders}
            onAddScanFolder={handleScanFolderAdd}
            onRemoveScanFolder={handleScanFolderRemove}
          />
        )}
        {activeSection === "downloads" && (
          <DownloadsSection
            downloadFolder={downloadFolder}
            onSelectDownloadFolder={handleDownloadFolderSelect}
            downloadQuality={downloadQuality}
            setDownloadQuality={setDownloadQuality}
            autoCleanup={autoCleanup}
            setAutoCleanup={setAutoCleanup}
            cleanupDays={cleanupDays}
            setCleanupDays={setCleanupDays}
          />
        )}
        {activeSection === "appearance" && (
          <AppearanceSection
            selectedFont={selectedFont}
            onFontChange={handleFontChange}
            localTheme={localTheme}
            setLocalTheme={setLocalTheme}
            fontSize={fontSize}
            setFontSize={setFontSize}
          />
        )}
        {activeSection === "cast" && (
          <CastSection
            localIP={localIP}
            qrDataUrl={qrDataUrl}
            copyLabel={copyLabel}
            setCopyLabel={setCopyLabel}
          />
        )}
        {activeSection === "integrations" && (
          <IntegrationsSection
            listenbrainzToken={listenbrainzToken}
            setListenbrainzToken={setListenbrainzToken}
            listenbrainzUser={listenbrainzUser}
            setListenbrainzUser={setListenbrainzUser}
            lastfmKey={lastfmKey}
            setLastfmKey={setLastfmKey}
            lastfmUser={lastfmUser}
            setLastfmUser={setLastfmUser}
          />
        )}
        {activeSection === "logs" && <LogsSection logFilePath={logFilePath} />}
        {activeSection === "updates" && (
          <UpdatesSection
            updateAvailable={updateAvailable}
            updateVersion={updateVersion}
            checking={checking}
            checkForUpdates={checkForUpdates}
          />
        )}

        {/* Save Row - Only show for non-logs/updates sections */}
        {activeSection !== "logs" && activeSection !== "updates" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "24px 0 36px",
              marginTop: "4px",
            }}
          >
            <button
              onClick={handleSave}
              style={{
                padding: "12px 32px",
                background: saved
                  ? "linear-gradient(135deg, rgba(74,222,128,0.2), rgba(74,222,128,0.1))"
                  : "linear-gradient(135deg, #7c6af5, #c084fc)",
                border: saved
                  ? "1px solid rgba(74,222,128,0.35)"
                  : "1px solid rgba(124,106,245,0.4)",
                borderRadius: "12px",
                color: saved ? "#4ade80" : "#fff",
                cursor: "pointer",
                fontFamily: "'Syne', sans-serif",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                boxShadow: saved
                  ? "0 0 20px rgba(74,222,128,0.15)"
                  : "0 4px 20px rgba(124,106,245,0.35)",
              }}
            >
              {saved ? "✓  Saved" : "Save settings"}
            </button>
            {saved && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#4ade80",
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: "0.06em",
                  opacity: 0.8,
                }}
              >
                All changes persisted.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
