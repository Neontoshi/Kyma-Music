import React from "react";
import SectionCard from "../components/SectionCard";
import SectionHeader from "../components/SectionHeader";
import SettingRow from "../components/SettingRow";
import Toggle from "../components/Toggle";

interface LibrarySectionProps {
  autoScan: boolean;
  setAutoScan: (v: boolean) => void;
  autoScanInterval: number;
  setAutoScanInterval: (v: number) => void;
  scanFolders: string[];
  onAddScanFolder: (folder: string) => void;
  onRemoveScanFolder: (folder: string) => void;
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
  transition: "border-color 0.2s",
};

const LibrarySection: React.FC<LibrarySectionProps> = ({
  autoScan,
  setAutoScan,
  autoScanInterval,
  setAutoScanInterval,
  scanFolders,
  onAddScanFolder,
  onRemoveScanFolder,
}) => {
  const addScanFolder = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Music Folder",
      });
      if (selected && typeof selected === "string") {
        onAddScanFolder(selected);
      }
    } catch (err) {
      console.error("Error opening dialog:", err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <SectionCard>
        <SectionHeader
          icon="◧"
          title="Library"
          desc="Music folders & scanning"
          accent="rgba(74,222,128,0.08)"
        />
        <div style={{ padding: "4px 24px 12px" }}>
          <SettingRow
            label="Auto-scan Library"
            desc="Watch folders for new music"
            control={
              <Toggle
                checked={autoScan}
                onChange={setAutoScan}
                setting="autoScan"
              />
            }
          />
          {autoScan && (
            <SettingRow
              label="Scan Interval"
              desc="Hours between automatic scans"
              control={
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
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
                borderRadius: "var(--radius-md)",
                color: "var(--accent2)",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "'DM Mono', monospace",
                letterSpacing: "0.03em",
              }}
            >
              + Add folder
            </button>
          </div>

          {scanFolders.length === 0 ? (
            <div
              style={{
                padding: "20px",
                borderRadius: "var(--radius-md)",
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
                    borderRadius: "var(--radius-md)",
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
                    }}
                  >
                    {folder}
                  </span>
                  <button
                    onClick={() => onRemoveScanFolder(folder)}
                    style={{
                      padding: "5px 10px",
                      background: "rgba(248,113,113,0.08)",
                      border: "1px solid rgba(248,113,113,0.15)",
                      borderRadius: "var(--radius-sm)",
                      color: "#f87171",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontFamily: "'DM Mono', monospace",
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
  );
};

export default LibrarySection;
