import React from "react";
import SectionCard from "../components/SectionCard";
import SectionHeader from "../components/SectionHeader";
import SettingRow from "../components/SettingRow";
import Toggle from "../components/Toggle";
import StyledSelect from "../components/StyledSelect";

interface DownloadsSectionProps {
  downloadFolder: string;
  onSelectDownloadFolder: (folder: string) => void;
  downloadQuality: string;
  setDownloadQuality: (v: string) => void;
  autoCleanup: boolean;
  setAutoCleanup: (v: boolean) => void;
  cleanupDays: number;
  setCleanupDays: (v: number) => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "var(--radius-md)",
  color: "var(--text)",
  fontFamily: "'DM Mono', monospace",
  fontSize: "12px",
  outline: "none",
  boxSizing: "border-box",
  letterSpacing: "0.03em",
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

const DownloadsSection: React.FC<DownloadsSectionProps> = ({
  downloadFolder,
  onSelectDownloadFolder,
  downloadQuality,
  setDownloadQuality,
  autoCleanup,
  setAutoCleanup,
  cleanupDays,
  setCleanupDays,
}) => {
  const selectDownloadFolder = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Download Folder",
      });
      if (selected && typeof selected === "string") {
        onSelectDownloadFolder(selected);
      }
    } catch (err) {
      console.error("Error opening dialog:", err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <SectionCard>
        <SectionHeader
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
                borderRadius: "var(--radius-md)",
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
                borderRadius: "var(--radius-md)",
                color: "var(--text2)",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "'Syne', sans-serif",
                fontWeight: 500,
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
              <Toggle
                checked={autoCleanup}
                onChange={setAutoCleanup}
                setting="autoCleanup"
              />
            }
          />
          {autoCleanup && (
            <SettingRow
              label="Retention Period"
              desc="Days before auto-deleting"
              last
              control={
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
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
  );
};

export default DownloadsSection;
