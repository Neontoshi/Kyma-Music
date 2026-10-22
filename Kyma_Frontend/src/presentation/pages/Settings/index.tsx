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
    { id: "playback", icon: "▶", label: "Playback", sub: "Audio behavior" },
    { id: "library", icon: "◧", label: "Library", sub: "Folders & scanning" },
    {
      id: "downloads",
      icon: "↓",
      label: "Downloads",
      sub: "Quality & cleanup",
    },
    {
      id: "appearance",
      icon: "◈",
      label: "Appearance",
      sub: "Theme & typography",
    },
    { id: "cast", icon: "◉", label: "Kyma Cast", sub: "Remote control" },
    {
      id: "integrations",
      icon: "◎",
      label: "Integrations",
      sub: "Last.fm · ListenBrainz",
    },
    { id: "logs", icon: "▤", label: "Logs", sub: "Debug & export" },
    {
      id: "updates",
      icon: "↻",
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
  const {
    selectedFont,
    fontSize,
    setFont,
    setFontSize,
    saveToBackend,
  } = useFontStore();

  // Updater
  const {
    updateAvailable,
    updateVersion,
    updateUrl,
    updateNotes,
    checking,
    downloading,
    downloadProgress,
    checkForUpdates,
    downloadAndInstall,
  } = useUpdater();

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
  const [downloadsEnabled, setDownloadsEnabled] = useState(false);
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(30);
  const { theme, setTheme: setThemeStore } = useThemeStore();
  const [localTheme, setLocalTheme] = useState(theme);
  const [logFilePath, setLogFilePath] = useState("");

  const activeMeta = navItems.find((item) => item.id === activeSection) ?? navItems[0];

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
    if (sf) {
      try {
        setScanFolders(JSON.parse(sf));
      } catch {
        setScanFolders([]);
      }
    }
    const asc = await tauriCommands.getSetting("auto_scan");
    setAutoScan(asc === "true");
    const asi = await tauriCommands.getSetting("auto_scan_interval");
    if (asi) setAutoScanInterval(parseInt(asi));
    const df = await tauriCommands.getSetting("download_folder");
    if (df) setDownloadFolder(df);
    const dq = await tauriCommands.getSetting("download_quality");
    if (dq) setDownloadQuality(dq);
    const de = await tauriCommands.getSetting("enable_downloads");
    setDownloadsEnabled(de === "true");
    const ac = await tauriCommands.getSetting("auto_cleanup");
    setAutoCleanup(ac === "true");
    const cd = await tauriCommands.getSetting("cleanup_days");
    if (cd) setCleanupDays(parseInt(cd));
    const t = await tauriCommands.getSetting("theme");
    if (t) setLocalTheme(t);
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
    await tauriCommands.setSetting(
      "enable_downloads",
      downloadsEnabled.toString(),
    );
    await tauriCommands.setSetting("auto_cleanup", autoCleanup.toString());
    await tauriCommands.setSetting("cleanup_days", cleanupDays.toString());
    await tauriCommands.setSetting("theme", localTheme);
    setThemeStore(localTheme);
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

  const handleDownloadsEnabledChange = async (enabled: boolean) => {
    setDownloadsEnabled(enabled);
    logger.logUI("SettingsPage", "downloads_enabled_change", { enabled });
    try {
      await tauriCommands.setSetting("enable_downloads", enabled.toString());
      window.dispatchEvent(
        new CustomEvent("kyma:downloads-enabled", { detail: enabled }),
      );
    } catch (error) {
      logger.logError("SettingsPage downloads_enabled_save_failed", {
        enabled,
        error,
      });
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-ambient" aria-hidden="true" />
      <div className="settings-shell">
        <aside className="settings-sidebar">
          <div className="settings-brand">
            <div className="settings-brand-mark">K</div>
            <div>
              <span className="settings-brand-eyebrow">Kyma</span>
              <h1>Settings</h1>
            </div>
          </div>
          <p className="settings-intro">
            Tune how Kyma sounds, looks, and connects to the rest of your setup.
          </p>

          <nav className="settings-nav" aria-label="Settings sections">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  className={`settings-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => handleSectionChange(item.id)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="settings-nav-icon">{item.icon}</span>
                  <span className="settings-nav-copy">
                    <span className="settings-nav-label">{item.label}</span>
                    <span className="settings-nav-sub">{item.sub}</span>
                  </span>
                  <span className="settings-nav-arrow">›</span>
                </button>
              );
            })}
          </nav>

          <div className="settings-sidebar-foot">
            <span className="settings-dot" />
            Preferences are stored locally
          </div>
        </aside>

        <main className="settings-main">
          <div className="settings-main-scroll">
            <header className="settings-head">
              <div>
                <div className="settings-breadcrumb">
                  Settings <span>/</span> {activeMeta.label}
                </div>
                <h2>{activeMeta.label}</h2>
                <p>{activeMeta.sub}</p>
              </div>
              <div className="settings-head-badge">
                <span className="settings-dot" />
                Local preferences
              </div>
            </header>

            <div className="settings-content" key={activeSection}>
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
                  downloadsEnabled={downloadsEnabled}
                  onDownloadsEnabledChange={handleDownloadsEnabledChange}
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
              {activeSection === "logs" && (
                <LogsSection logFilePath={logFilePath} />
              )}
              {activeSection === "updates" && (
                <UpdatesSection
                  updateAvailable={updateAvailable}
                  updateVersion={updateVersion}
                  updateUrl={updateUrl}
                  updateNotes={updateNotes}
                  checking={checking}
                  downloading={downloading}
                  downloadProgress={downloadProgress}
                  checkForUpdates={checkForUpdates}
                  downloadAndInstall={downloadAndInstall}
                />
              )}

              {activeSection !== "logs" && activeSection !== "updates" && (
                <div className="settings-savebar">
                  <div className="settings-save-copy">
                    <strong>{saved ? "All changes saved" : "Ready to save"}</strong>
                    <span>
                      {saved
                        ? "Your preferences have been persisted."
                        : "Review your changes, then save them to this device."}
                    </span>
                  </div>
                  <button
                    className={`settings-save-btn ${saved ? "saved" : ""}`}
                    onClick={handleSave}
                  >
                    {saved ? "✓ Saved" : "Save changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
