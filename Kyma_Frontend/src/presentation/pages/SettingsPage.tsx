import React, { useState, useEffect } from "react";
import { tauriCommands } from "../../services/tauriBridge";
import { useThemeStore } from "../stores/themeStore";
import { usePlayerStore } from "../stores/playerStore";
import { themes } from "../stores/themeDefs";
import QRCode from "qrcode";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "../../services/logger";
import { useFontStore, FONT_OPTIONS } from "../stores/fontStore";
import { useUpdater } from "../hooks/useUpdater";

//  Types
type NavSection =
  | "playback"
  | "library"
  | "downloads"
  | "appearance"
  | "cast"
  | "integrations"
  | "logs"
  | "updates";

//  Custom Toggle Component
const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => {
      logger.logUI("SettingsPage", "toggle_click", {
        setting: "toggle",
        newState: !checked,
      });
      onChange(!checked);
    }}
    style={{
      position: "relative",
      width: "44px",
      height: "24px",
      borderRadius: "99px",
      background: checked
        ? "linear-gradient(135deg, #7c6af5, #c084fc)"
        : "rgba(255,255,255,0.06)",
      border: checked
        ? "1px solid rgba(124,106,245,0.5)"
        : "1px solid rgba(255,255,255,0.1)",
      cursor: "pointer",
      transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
      flexShrink: 0,
      outline: "none",
      boxShadow: checked ? "0 0 12px rgba(124,106,245,0.35)" : "none",
    }}
  >
    <span
      style={{
        position: "absolute",
        top: "3px",
        left: checked ? "23px" : "3px",
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        background: checked ? "#fff" : "rgba(255,255,255,0.3)",
        transition: "left 0.25s cubic-bezier(0.4,0,0.2,1), background 0.25s",
        boxShadow: checked ? "0 2px 6px rgba(0,0,0,0.4)" : "none",
      }}
    />
  </button>
);

//  Custom Slider Component
const Slider: React.FC<{
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  unit?: string;
}> = ({ value, min, max, step = 1, onChange, label, unit }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontFamily: "'DM Mono', monospace",
            color: "var(--text3)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "13px",
            fontFamily: "'DM Mono', monospace",
            color: "var(--accent2)",
            fontWeight: 600,
            letterSpacing: "0.03em",
          }}
        >
          {value}
          {unit}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: "6px",
          borderRadius: "99px",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: `${pct}%`,
            height: "100%",
            borderRadius: "99px",
            background: "linear-gradient(90deg, #7c6af5, #c084fc)",
            transition: "width 0.1s",
            boxShadow: "0 0 8px rgba(124,106,245,0.4)",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          style={{
            position: "absolute",
            inset: "-6px 0",
            width: "100%",
            height: "18px",
            opacity: 0,
            cursor: "pointer",
            margin: 0,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${pct}%`,
            transform: "translate(-50%, -50%)",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "#fff",
            boxShadow:
              "0 0 0 3px rgba(124,106,245,0.5), 0 2px 8px rgba(0,0,0,0.5)",
            pointerEvents: "none",
            transition: "left 0.1s",
          }}
        />
      </div>
    </div>
  );
};

//  Select Component
const StyledSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <div style={{ position: "relative" }}>
    <select
      value={value}
      onChange={(e) => {
        logger.logUI("SettingsPage", "select_change", {
          setting: "select",
          from: value,
          to: e.target.value,
        });
        onChange(e.target.value);
      }}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        padding: "9px 34px 9px 14px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px",
        color: "var(--text)",
        fontSize: "13px",
        fontFamily: "'DM Mono', monospace",
        cursor: "pointer",
        outline: "none",
        transition: "border-color 0.2s",
        letterSpacing: "0.02em",
      }}
    >
      {options.map((o) => (
        <option
          key={o.value}
          value={o.value}
          style={{ background: "var(--surface)" }}
        >
          {o.label}
        </option>
      ))}
    </select>
    <svg
      style={{
        position: "absolute",
        right: "10px",
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
        color: "var(--text3)",
      }}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
    >
      <path
        d="M2 4l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

//  SettingRow Component
const SettingRow: React.FC<{
  label: string;
  desc: string;
  control: React.ReactNode;
  last?: boolean;
}> = ({ label, desc, control, last }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      padding: "14px 0",
      borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)",
    }}
  >
    <div>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "var(--text)",
          fontFamily: "'Syne', sans-serif",
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "var(--text3)",
          fontFamily: "'DM Mono', monospace",
          marginTop: "2px",
          letterSpacing: "0.02em",
        }}
      >
        {desc}
      </div>
    </div>
    <div style={{ flexShrink: 0 }}>{control}</div>
  </div>
);

//  Section Card
const SectionCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "16px",
      overflow: "hidden",
      backdropFilter: "blur(12px)",
      ...style,
    }}
  >
    {children}
  </div>
);

//  Section Header
const SectionHead: React.FC<{
  icon: string;
  title: string;
  desc: string;
  accent?: string;
  badge?: string;
}> = ({ icon, title, desc, accent = "rgba(124,106,245,0.12)", badge }) => (
  <div
    style={{
      padding: "20px 24px 18px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      alignItems: "center",
      gap: "14px",
    }}
  >
    <div
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "12px",
        background: accent,
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: "15px",
          fontWeight: 700,
          color: "var(--text)",
          fontFamily: "'Syne', sans-serif",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          marginBottom: "3px",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "var(--text3)",
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.04em",
        }}
      >
        {desc}
      </div>
    </div>
    {badge && (
      <span
        style={{
          fontSize: "9px",
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.1em",
          padding: "4px 10px",
          borderRadius: "99px",
          background: "rgba(74,222,128,0.1)",
          color: "#4ade80",
          border: "1px solid rgba(74,222,128,0.2)",
          textTransform: "uppercase",
        }}
      >
        {badge}
      </span>
    )}
  </div>
);

//  Nav Items
const navItems: {
  id: NavSection;
  icon: string;
  label: string;
  sub: string;
}[] = [
  { id: "playback", icon: "⊕", label: "Playback", sub: "Audio behavior" },
  { id: "library", icon: "⊞", label: "Library", sub: "Folders & scan" },
  { id: "downloads", icon: "⊘", label: "Downloads", sub: "Quality & cleanup" },
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
  { id: "updates", icon: "🔄", label: "Updates", sub: "Check for new version" },
];

//  Main Component
const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<NavSection>("playback");

  // Player volume from store
  const playerVolume = usePlayerStore((s) => s.volume);
  const setPlayerVolume = usePlayerStore((s) => s.setVolume);
  const [defaultVolume, setDefaultVolume] = useState(playerVolume);

  // Font store
  const { selectedFont, setFont, saveToBackend } = useFontStore();

  // Updater
  const { updateAvailable, updateVersion, checking, checkForUpdates } =
    useUpdater();

  // API Settings
  const [listenbrainzToken, setListenbrainzToken] = useState("");
  const [listenbrainzUser, setListenbrainzUser] = useState("");
  const [lastfmKey, setLastfmKey] = useState("");
  const [lastfmUser, setLastfmUser] = useState("");

  // Playback Settings
  const [crossfade, setCrossfade] = useState(0);
  const [gapless, setGapless] = useState(true);
  const [audioQuality, setAudioQuality] = useState("high");

  // Library Settings
  const [scanFolders, setScanFolders] = useState<string[]>([]);
  const [autoScan, setAutoScan] = useState(false);
  const [autoScanInterval, setAutoScanInterval] = useState(24);

  // Download Settings
  const [downloadFolder, setDownloadFolder] = useState("");
  const [downloadQuality, setDownloadQuality] = useState("medium");
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(30);

  // UI Settings
  const { theme, setTheme: setThemeStore } = useThemeStore();
  const [localTheme, setLocalTheme] = useState(theme);
  const [fontSize, setFontSize] = useState("medium");

  // Logs
  const [isExportingLogs, setIsExportingLogs] = useState(false);
  const [logFilePath, setLogFilePath] = useState("");
  //@ts-ignore
  const [logPreview, setLogPreview] = useState("");

  const [saved, setSaved] = useState(false);
  const [localIP, setLocalIP] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy");

  // Keep slider in sync with player volume
  useEffect(() => {
    setDefaultVolume(playerVolume);
  }, [playerVolume]);

  useEffect(() => {
    tauriCommands.getSetting("listenbrainz_token").then((v) => {
      if (v) setListenbrainzToken(v);
    });
    tauriCommands.getSetting("listenbrainz_user").then((v) => {
      if (v) setListenbrainzUser(v);
    });
    tauriCommands
      .getSetting("lastfm_api_key")
      .then((v) => setLastfmKey(v || ""));
    tauriCommands.getSetting("lastfm_user").then((v) => setLastfmUser(v || ""));
    tauriCommands.getSetting("default_volume").then((v) => {
      const vol = v ? parseInt(v) : 70;
      setDefaultVolume(vol);
      // Also set player volume to saved value
      setPlayerVolume(vol);
      invoke("set_volume", { level: vol / 100 }).catch(console.error);
    });
    tauriCommands
      .getSetting("crossfade")
      .then((v) => setCrossfade(v ? parseInt(v) : 0));
    tauriCommands.getSetting("gapless").then((v) => setGapless(v !== "false"));
    tauriCommands
      .getSetting("audio_quality")
      .then((v) => setAudioQuality(v || "high"));
    tauriCommands
      .getSetting("scan_folders")
      .then((v) => setScanFolders(v ? JSON.parse(v) : []));
    tauriCommands
      .getSetting("auto_scan")
      .then((v) => setAutoScan(v === "true"));
    tauriCommands
      .getSetting("auto_scan_interval")
      .then((v) => setAutoScanInterval(v ? parseInt(v) : 24));
    tauriCommands
      .getSetting("download_folder")
      .then((v) => setDownloadFolder(v || ""));
    tauriCommands
      .getSetting("download_quality")
      .then((v) => setDownloadQuality(v || "medium"));
    tauriCommands
      .getSetting("auto_cleanup")
      .then((v) => setAutoCleanup(v === "true"));
    tauriCommands
      .getSetting("cleanup_days")
      .then((v) => setCleanupDays(v ? parseInt(v) : 30));
    tauriCommands.getSetting("theme").then((v) => {
      if (v) setLocalTheme(v);
    });
    tauriCommands
      .getSetting("font_size")
      .then((v) => setFontSize(v || "medium"));

    // Load log info
    tauriCommands
      .getLogFilePath()
      .then((path) => {
        setLogFilePath(path);
      })
      .catch(console.error);

    detectLocalIP();
  }, []);

  const detectLocalIP = async () => {
    try {
      const ip = await tauriCommands.getLocalIP();
      setLocalIP(ip);
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

    // Save font preference to backend via store
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

  const handleManualUpdateCheck = async () => {
    logger.logUI("SettingsPage", "manual_update_check", {});
    await checkForUpdates();
  };

  const exportLogs = async () => {
    logger.logUI("SettingsPage", "export_logs", {});
    setIsExportingLogs(true);
    try {
      const logs = await tauriCommands.readLogs(5000);

      // Use browser download instead of file system
      const blob = new Blob([logs], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kyma_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.log`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("Logs exported successfully!");
    } catch (error) {
      console.error("Failed to export logs:", error);
      alert("Failed to export logs. See console for details.");
    } finally {
      setIsExportingLogs(false);
    }
  };

  const copyLogsToClipboard = async () => {
    logger.logUI("SettingsPage", "copy_logs", {});
    setIsExportingLogs(true);
    try {
      const logs = await tauriCommands.readLogs(1000);
      await navigator.clipboard.writeText(logs);
      alert("Logs copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy logs:", error);
      alert("Failed to copy logs.");
    } finally {
      setIsExportingLogs(false);
    }
  };

  const viewLogs = async () => {
    logger.logUI("SettingsPage", "view_logs", {});
    setIsExportingLogs(true);
    try {
      const logs = await tauriCommands.readLogs(200);
      setLogPreview(logs);
      // You could open a modal here, but for now just show in console
      console.log("=== LOG PREVIEW ===\n", logs);
      alert(`Last 200 lines of logs:\n\n${logs.slice(-2000)}`);
    } catch (error) {
      console.error("Failed to read logs:", error);
      alert("Failed to read logs.");
    } finally {
      setIsExportingLogs(false);
    }
  };

  const addScanFolder = async () => {
    logger.logUI("SettingsPage", "add_scan_folder", {});
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Music Folder",
      });
      if (
        selected &&
        typeof selected === "string" &&
        !scanFolders.includes(selected)
      ) {
        setScanFolders([...scanFolders, selected]);
      }
    } catch (err) {
      console.error("Error opening dialog:", err);
    }
  };

  const selectDownloadFolder = async () => {
    logger.logUI("SettingsPage", "select_download_folder", {});
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Download Folder",
      });
      if (selected && typeof selected === "string") {
        setDownloadFolder(selected);
      }
    } catch (err) {
      console.error("Error opening dialog:", err);
    }
  };

  const removeScanFolder = (folder: string) => {
    logger.logUI("SettingsPage", "remove_scan_folder", { folder });
    setScanFolders(scanFolders.filter((f) => f !== folder));
  };

  //  Styled Input
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    color: "var(--text)",
    fontFamily: "'DM Mono', monospace",
    fontSize: "12px",
    outline: "none",
    boxSizing: "border-box",
    letterSpacing: "0.03em",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "11px",
    fontFamily: "'DM Mono', monospace",
    color: "var(--text3)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "7px",
  };

  //  Section Panels
  const panels: Record<NavSection, React.ReactNode> = {
    playback: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <SectionCard>
          <SectionHead
            icon="▶"
            title="Playback"
            desc="Audio engine & behavior"
            accent="rgba(124,106,245,0.1)"
          />
          <div style={{ padding: "4px 24px 12px" }}>
            <div
              style={{
                paddingTop: "12px",
                paddingBottom: "16px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <Slider
                label="Default Volume"
                value={defaultVolume}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => {
                  setDefaultVolume(v);
                  setPlayerVolume(v);
                  invoke("set_volume", { level: v / 100 }).catch(console.error);
                }}
              />
            </div>
            <div
              style={{
                paddingTop: "16px",
                paddingBottom: "16px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <Slider
                label="Crossfade"
                value={crossfade}
                min={0}
                max={12}
                unit="s"
                onChange={setCrossfade}
              />
            </div>
            <SettingRow
              label="Gapless Playback"
              desc="Eliminate silence between tracks"
              control={<Toggle checked={gapless} onChange={setGapless} />}
            />
            <SettingRow
              label="Audio Quality"
              desc="Streaming bitrate preference"
              last
              control={
                <StyledSelect
                  value={audioQuality}
                  onChange={setAudioQuality}
                  options={[
                    { value: "low", label: "Low — 96 kbps" },
                    { value: "medium", label: "Medium — 160 kbps" },
                    { value: "high", label: "High — 320 kbps" },
                    { value: "lossless", label: "Lossless — FLAC" },
                  ]}
                />
              }
            />
          </div>
        </SectionCard>
      </div>
    ),

    library: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <SectionCard>
          <SectionHead
            icon="◧"
            title="Library"
            desc="Music folders & scanning"
            accent="rgba(74,222,128,0.08)"
          />
          <div style={{ padding: "4px 24px 12px" }}>
            <SettingRow
              label="Auto-scan Library"
              desc="Watch folders for new music"
              control={<Toggle checked={autoScan} onChange={setAutoScan} />}
            />
            {autoScan && (
              <SettingRow
                label="Scan Interval"
                desc="Hours between automatic scans"
                control={
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={autoScanInterval}
                      onChange={(e) =>
                        setAutoScanInterval(parseInt(e.target.value))
                      }
                      style={{
                        ...inputStyle,
                        width: "72px",
                        textAlign: "center",
                        padding: "9px 8px",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text3)",
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      hr
                    </span>
                  </div>
                }
              />
            )}
          </div>
        </SectionCard>

        <SectionCard>
          <div style={{ padding: "20px 24px 16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text)",
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  Scan Folders
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text3)",
                    fontFamily: "'DM Mono', monospace",
                    marginTop: "2px",
                  }}
                >
                  {scanFolders.length} director
                  {scanFolders.length === 1 ? "y" : "ies"} indexed
                </div>
              </div>
              <button
                onClick={addScanFolder}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  background: "rgba(124,106,245,0.12)",
                  border: "1px solid rgba(124,106,245,0.25)",
                  borderRadius: "10px",
                  color: "var(--accent2)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: "0.03em",
                  transition: "all 0.15s",
                }}
              >
                + Add folder
              </button>
            </div>

            {scanFolders.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px dashed rgba(255,255,255,0.07)",
                  textAlign: "center",
                  color: "var(--text3)",
                  fontSize: "12px",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                No folders added yet
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                {scanFolders.map((folder, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 14px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: "10px",
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>📂</span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: "12px",
                        fontFamily: "'DM Mono', monospace",
                        color: "var(--text2)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {folder}
                    </span>
                    <button
                      onClick={() => removeScanFolder(folder)}
                      style={{
                        padding: "5px 10px",
                        background: "rgba(248,113,113,0.08)",
                        border: "1px solid rgba(248,113,113,0.15)",
                        borderRadius: "7px",
                        color: "#f87171",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontFamily: "'DM Mono', monospace",
                        transition: "all 0.15s",
                        flexShrink: 0,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    ),

    downloads: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <SectionCard>
          <SectionHead
            icon="↓"
            title="Downloads"
            desc="YouTube & SoundCloud quality"
            accent="rgba(255,107,53,0.1)"
          />
          <div style={{ padding: "16px 24px 20px" }}>
            <label style={labelStyle}>Download Folder</label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <div
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontFamily: "'DM Mono', monospace",
                  color: downloadFolder ? "var(--text2)" : "var(--text3)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {downloadFolder || "No folder selected"}
              </div>
              <button
                onClick={selectDownloadFolder}
                style={{
                  padding: "10px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "var(--text2)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 500,
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
              >
                Browse
              </button>
            </div>

            <SettingRow
              label="Download Quality"
              desc="Audio bitrate for saved files"
              control={
                <StyledSelect
                  value={downloadQuality}
                  onChange={setDownloadQuality}
                  options={[
                    { value: "low", label: "Low — 128 kbps" },
                    { value: "medium", label: "Medium — 192 kbps" },
                    { value: "high", label: "High — 320 kbps" },
                  ]}
                />
              }
            />
            <SettingRow
              label="Auto-cleanup"
              desc="Delete old downloaded tracks"
              control={
                <Toggle checked={autoCleanup} onChange={setAutoCleanup} />
              }
            />
            {autoCleanup && (
              <SettingRow
                label="Retention Period"
                desc="Days before auto-deleting"
                last
                control={
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={cleanupDays}
                      onChange={(e) => setCleanupDays(parseInt(e.target.value))}
                      style={{
                        ...inputStyle,
                        width: "72px",
                        textAlign: "center",
                        padding: "9px 8px",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text3)",
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      days
                    </span>
                  </div>
                }
              />
            )}
          </div>
        </SectionCard>
      </div>
    ),

    appearance: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <SectionCard>
          <SectionHead
            icon="◈"
            title="Appearance"
            desc="Theme & display preferences"
            accent="rgba(192,132,252,0.1)"
          />
          <div style={{ padding: "12px 24px 20px" }}>
            {/* Font Selection */}
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  fontSize: "10px",
                  fontFamily: "'DM Mono', monospace",
                  color: "var(--text3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>🔤</span> Font Family
              </div>
              <StyledSelect
                value={selectedFont}
                onChange={handleFontChange}
                options={FONT_OPTIONS}
              />
              <div
                className="font-preview-text"
                style={{
                  marginTop: "8px",
                  padding: "8px 12px",
                  background: "var(--surface2)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--text2)",
                  transition: "font-family 0.2s ease",
                  fontFamily: FONT_OPTIONS.find((f) => f.value === selectedFont)
                    ?.fontFamily,
                }}
              >
                The quick brown fox jumps over the lazy dog — 1234567890
              </div>
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "9px",
                  color: "var(--text3)",
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: "0.03em",
                }}
              >
                Preview:{" "}
                <span
                  style={{
                    fontFamily: FONT_OPTIONS.find(
                      (f) => f.value === selectedFont,
                    )?.fontFamily,
                  }}
                >
                  Aa Bb Cc
                </span>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              {/*  Dark Themes  */}
              <div
                style={{
                  fontSize: "10px",
                  fontFamily: "'DM Mono', monospace",
                  color: "var(--text3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>🌙</span> Dark Themes
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                  gap: "8px",
                  marginBottom: "20px",
                }}
              >
                {themes
                  .filter((t) => t.mode === "dark")
                  .map((t) => {
                    const isActive = localTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          logger.logUI("SettingsPage", "theme_change", {
                            from: localTheme,
                            to: t.id,
                          });
                          setLocalTheme(t.id);
                          setThemeStore(t.id);
                        }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "6px",
                          padding: "10px 8px",
                          borderRadius: "12px",
                          border: isActive
                            ? "2px solid var(--accent)"
                            : "1px solid rgba(255,255,255,0.08)",
                          background: isActive
                            ? "rgba(124,106,245,0.1)"
                            : "rgba(255,255,255,0.03)",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          outline: "none",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${t.colors["--accent"]}, ${t.colors["--accent2"]})`,
                            border: `3px solid ${t.colors["--surface2"]}`,
                            boxShadow: isActive
                              ? `0 0 12px ${t.colors["--accent"]}80`
                              : "none",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "10px",
                            fontFamily: "'DM Mono', monospace",
                            color: isActive ? "var(--accent2)" : "var(--text2)",
                            fontWeight: isActive ? 600 : 400,
                            textAlign: "center",
                            lineHeight: 1.2,
                          }}
                        >
                          {t.name}
                        </span>
                      </button>
                    );
                  })}
              </div>

              {/*  Light Themes  */}
              <div
                style={{
                  fontSize: "10px",
                  fontFamily: "'DM Mono', monospace",
                  color: "var(--text3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>☀️</span> Light Themes
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                  gap: "8px",
                }}
              >
                {themes
                  .filter((t) => t.mode === "light")
                  .map((t) => {
                    const isActive = localTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          logger.logUI("SettingsPage", "theme_change", {
                            from: localTheme,
                            to: t.id,
                          });
                          setLocalTheme(t.id);
                          setThemeStore(t.id);
                        }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "6px",
                          padding: "10px 8px",
                          borderRadius: "12px",
                          border: isActive
                            ? "2px solid var(--accent)"
                            : "1px solid rgba(255,255,255,0.08)",
                          background: isActive
                            ? "rgba(124,106,245,0.1)"
                            : "rgba(255,255,255,0.03)",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          outline: "none",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${t.colors["--accent"]}, ${t.colors["--accent2"]})`,
                            border: `3px solid ${t.colors["--surface2"]}`,
                            boxShadow: isActive
                              ? `0 0 12px ${t.colors["--accent"]}80`
                              : "none",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "10px",
                            fontFamily: "'DM Mono', monospace",
                            color: isActive ? "var(--accent2)" : "var(--text2)",
                            fontWeight: isActive ? 600 : 400,
                            textAlign: "center",
                            lineHeight: 1.2,
                          }}
                        >
                          {t.name}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
            <SettingRow
              label="Font Size"
              desc="Interface text scale"
              control={
                <StyledSelect
                  value={fontSize}
                  onChange={(v) => {
                    logger.logUI("SettingsPage", "font_size_change", {
                      from: fontSize,
                      to: v,
                    });
                    setFontSize(v);
                  }}
                  options={[
                    { value: "small", label: "Small" },
                    { value: "medium", label: "Medium" },
                    { value: "large", label: "Large" },
                  ]}
                />
              }
            />
          </div>
        </SectionCard>
      </div>
    ),

    cast: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <SectionCard>
          <SectionHead
            icon="⊛"
            title="Kyma Cast"
            desc="Remote control via local network"
            accent="rgba(124,106,247,0.1)"
            badge="Active"
          />
          <div style={{ padding: "24px" }}>
            <div
              style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}
            >
              {/* QR Code */}
              <div
                style={{
                  width: "110px",
                  height: "110px",
                  borderRadius: "14px",
                  background: "#ffffff",
                  padding: "8px",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)",
                }}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "6px",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "rgba(0,0,0,0.05)",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "9px",
                        color: "#888",
                        textAlign: "center",
                        fontFamily: "monospace",
                      }}
                    >
                      Generating…
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text2)",
                    lineHeight: 1.6,
                    marginBottom: "14px",
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: "0.02em",
                  }}
                >
                  Scan with your phone to control Kyma. Both devices must be on
                  the same WiFi network.
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontFamily: "'DM Mono', monospace",
                      color: "var(--accent2)",
                      flex: 1,
                      letterSpacing: "0.04em",
                    }}
                  >
                    http://{localIP || "…"}:1421
                  </span>
                  <button
                    onClick={() => {
                      logger.logUI("SettingsPage", "copy_cast_url", {
                        ip: localIP,
                      });
                      navigator.clipboard.writeText(`http://${localIP}:1421`);
                      setCopyLabel("✓ Copied");
                      setTimeout(() => setCopyLabel("Copy"), 1500);
                    }}
                    style={{
                      background: copyLabel.includes("✓")
                        ? "rgba(74,222,128,0.12)"
                        : "rgba(124,106,245,0.12)",
                      border: copyLabel.includes("✓")
                        ? "1px solid rgba(74,222,128,0.25)"
                        : "1px solid rgba(124,106,245,0.25)",
                      borderRadius: "7px",
                      color: copyLabel.includes("✓")
                        ? "#4ade80"
                        : "var(--accent2)",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      padding: "5px 12px",
                      cursor: "pointer",
                      letterSpacing: "0.05em",
                      transition: "all 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    {copyLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    ),

    integrations: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Last.fm */}
        <SectionCard>
          <SectionHead
            icon="♪"
            title="Last.fm"
            desc="Scrobbling & recommendations"
            accent="rgba(214,62,62,0.1)"
          />
          <div style={{ padding: "20px 24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "12px 16px",
                background: "rgba(124,106,247,0.05)",
                border: "1px solid rgba(124,106,247,0.12)",
                borderRadius: "10px",
                marginBottom: "18px",
              }}
            >
              <span
                style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}
              >
                ✦
              </span>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text2)",
                  lineHeight: 1.6,
                  fontFamily: "'DM Mono', monospace",
                  margin: 0,
                  letterSpacing: "0.02em",
                }}
              >
                Powers personalized recommendations, similar artists, and weekly
                charts.{" "}
                <a
                  href="https://www.last.fm/api/account/create"
                  target="_blank"
                  rel="noopener"
                  style={{ color: "var(--accent2)", textDecoration: "none" }}
                >
                  Get a free API key →
                </a>
              </p>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div>
                <label style={labelStyle}>Username</label>
                <input
                  type="text"
                  value={lastfmUser}
                  onChange={(e) => setLastfmUser(e.target.value)}
                  placeholder="your_username"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>API Key</label>
                <input
                  type="text"
                  value={lastfmKey}
                  onChange={(e) => setLastfmKey(e.target.value)}
                  placeholder="Paste your Last.fm API key"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ListenBrainz */}
        <SectionCard>
          <SectionHead
            icon="◉"
            title="ListenBrainz"
            desc="Open-source scrobble tracking"
            accent="rgba(76,175,80,0.08)"
          />
          <div style={{ padding: "20px 24px" }}>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div>
                <label style={labelStyle}>Username</label>
                <input
                  type="text"
                  value={listenbrainzUser}
                  onChange={(e) => setListenbrainzUser(e.target.value)}
                  placeholder="your_username"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>User Token</label>
                <input
                  type="password"
                  value={listenbrainzToken}
                  onChange={(e) => setListenbrainzToken(e.target.value)}
                  placeholder="Paste your ListenBrainz user token"
                  style={inputStyle}
                />
                <span
                  style={{
                    display: "block",
                    marginTop: "7px",
                    fontSize: "10px",
                    fontFamily: "'DM Mono', monospace",
                    color: "var(--text3)",
                    letterSpacing: "0.03em",
                  }}
                >
                  Find your token at{" "}
                  <a
                    href="https://listenbrainz.org/profile/"
                    target="_blank"
                    rel="noopener"
                    style={{ color: "var(--accent)", textDecoration: "none" }}
                  >
                    listenbrainz.org/profile
                  </a>
                </span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    ),

    logs: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <SectionCard>
          <SectionHead
            icon="📋"
            title="Logs & Debug"
            desc="Export logs for troubleshooting"
            accent="rgba(255,107,53,0.15)"
          />
          <div style={{ padding: "20px 24px" }}>
            <div
              style={{
                marginBottom: "20px",
                padding: "12px 16px",
                background: "rgba(124,106,245,0.05)",
                border: "1px solid rgba(124,106,245,0.12)",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontFamily: "'DM Mono', monospace",
                  color: "var(--text3)",
                  marginBottom: "8px",
                  letterSpacing: "0.05em",
                }}
              >
                Log File Location
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontFamily: "'DM Mono', monospace",
                  color: "var(--accent2)",
                  wordBreak: "break-all",
                  background: "rgba(0,0,0,0.2)",
                  padding: "8px 12px",
                  borderRadius: "8px",
                }}
              >
                {logFilePath || "Loading..."}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <button
                onClick={exportLogs}
                disabled={isExportingLogs}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "14px 18px",
                  background: "rgba(124,106,245,0.1)",
                  border: "1px solid rgba(124,106,245,0.25)",
                  borderRadius: "12px",
                  cursor: isExportingLogs ? "wait" : "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!isExportingLogs) {
                    e.currentTarget.style.background = "rgba(124,106,245,0.2)";
                    e.currentTarget.style.borderColor = "rgba(124,106,245,0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(124,106,245,0.1)";
                  e.currentTarget.style.borderColor = "rgba(124,106,245,0.25)";
                }}
              >
                <span
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <span style={{ fontSize: "20px" }}>💾</span>
                  <span
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    Export Logs to File
                  </span>
                </span>
                <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                  {isExportingLogs ? "⏳ Exporting..." : "→"}
                </span>
              </button>

              <button
                onClick={copyLogsToClipboard}
                disabled={isExportingLogs}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "14px 18px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  cursor: isExportingLogs ? "wait" : "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!isExportingLogs) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
              >
                <span
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <span style={{ fontSize: "20px" }}>📋</span>
                  <span
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    Copy Logs to Clipboard
                  </span>
                </span>
                <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                  →
                </span>
              </button>

              <button
                onClick={viewLogs}
                disabled={isExportingLogs}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "14px 18px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "12px",
                  cursor: isExportingLogs ? "wait" : "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!isExportingLogs) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                }}
              >
                <span
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <span style={{ fontSize: "20px" }}>🔍</span>
                  <span
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    Preview Last 200 Lines
                  </span>
                </span>
                <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                  →
                </span>
              </button>
            </div>

            <div
              style={{
                marginTop: "20px",
                padding: "12px 16px",
                background: "rgba(255,107,53,0.05)",
                border: "1px solid rgba(255,107,53,0.15)",
                borderRadius: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontFamily: "'DM Mono', monospace",
                  color: "#ff6b35",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                📌 When reporting issues
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text2)",
                  fontFamily: "'DM Mono', monospace",
                  lineHeight: 1.5,
                }}
              >
                1. Click "Export Logs to File"
                <br />
                2. Save the .log file
                <br />
                3. Share it with the development team
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    ),

    updates: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <SectionCard>
          <SectionHead
            icon="🔄"
            title="Software Updates"
            desc="Check for new versions"
            accent="rgba(74,222,128,0.1)"
            badge={updateAvailable ? "Update Available" : "Up to Date"}
          />
          <div style={{ padding: "20px 24px" }}>
            <div
              style={{
                marginBottom: "20px",
                padding: "12px 16px",
                background: updateAvailable
                  ? "rgba(74,222,128,0.08)"
                  : "rgba(124,106,245,0.05)",
                border: updateAvailable
                  ? "1px solid rgba(74,222,128,0.25)"
                  : "1px solid rgba(124,106,245,0.12)",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontFamily: "'DM Mono', monospace",
                  color: "var(--text3)",
                  marginBottom: "8px",
                  letterSpacing: "0.05em",
                }}
              >
                Current Version
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                Kyma v1.0.0
              </div>
              {updateAvailable && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "8px 12px",
                    background: "rgba(74,222,128,0.12)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#4ade80",
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  ✨ Version {updateVersion} is ready to install!
                </div>
              )}
            </div>

            <button
              onClick={handleManualUpdateCheck}
              disabled={checking}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                width: "100%",
                padding: "14px 18px",
                background: updateAvailable
                  ? "linear-gradient(135deg, #4ade80, #22c55e)"
                  : "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none",
                borderRadius: "12px",
                cursor: checking ? "wait" : "pointer",
                transition: "all 0.2s",
                color: "#fff",
                fontFamily: "'Syne', sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                opacity: checking ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!checking && !updateAvailable) {
                  e.currentTarget.style.opacity = "0.9";
                }
              }}
              onMouseLeave={(e) => {
                if (!checking) {
                  e.currentTarget.style.opacity = "1";
                }
              }}
            >
              {checking ? (
                <>
                  <div
                    className="ap-spinner ap-spinner--sm"
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                    }}
                  />
                  <span>Checking for updates...</span>
                </>
              ) : updateAvailable ? (
                <>
                  <span>⬇️</span>
                  <span>Download & Install Update</span>
                </>
              ) : (
                <>
                  <span>✅</span>
                  <span>Check for Updates</span>
                </>
              )}
            </button>

            {!updateAvailable && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "8px 12px",
                  textAlign: "center",
                  fontSize: "10px",
                  color: "var(--text3)",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                You're running the latest version of Kyma.
              </div>
            )}

            <div
              style={{
                marginTop: "20px",
                padding: "12px 16px",
                background: "rgba(255,107,53,0.05)",
                border: "1px solid rgba(255,107,53,0.15)",
                borderRadius: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontFamily: "'DM Mono', monospace",
                  color: "#ff6b35",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                📌 About Updates
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text2)",
                  fontFamily: "'DM Mono', monospace",
                  lineHeight: 1.5,
                }}
              >
                Updates are checked automatically when you launch Kyma. You can
                also manually check here. Updates will be downloaded and
                installed automatically.
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    ),
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
      {/*  Top Header Bar  */}
      <div
        style={{
          padding: "28px 32px 0",
          flexShrink: 0,
        }}
      >
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

        {/*  Pill Nav  */}
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
                    transition: "color 0.2s",
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
                    transition: "color 0.2s",
                  }}
                >
                  {item.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/*  Divider  */}
      <div
        style={{
          height: "1px",
          background: "rgba(255,255,255,0.05)",
          margin: "0 32px",
          marginTop: "20px",
        }}
      />

      {/*  Scrollable Content  */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 32px 0",
        }}
      >
        {panels[activeSection]}

        {/*  Save Row - Only show for non-logs sections */}
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
                transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
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
