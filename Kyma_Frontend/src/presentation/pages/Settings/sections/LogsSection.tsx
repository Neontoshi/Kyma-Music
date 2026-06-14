import React, { useState } from "react";
import { tauriCommands } from "../../../../services/tauriBridge";
import { logger } from "../../../../services/logger";
import SectionCard from "../components/SectionCard";
import SectionHeader from "../components/SectionHeader";

interface LogsSectionProps {
  logFilePath: string;
}

const LogsSection: React.FC<LogsSectionProps> = ({ logFilePath }) => {
  const [isExportingLogs, setIsExportingLogs] = useState(false);

  const exportLogs = async () => {
    logger.logUI("SettingsPage", "export_logs", {});
    setIsExportingLogs(true);
    try {
      const logs = await tauriCommands.readLogs(5000);
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
      console.log("=== LOG PREVIEW ===\n", logs);
      alert(`Last 200 lines of logs:\n\n${logs.slice(-2000)}`);
    } catch (error) {
      console.error("Failed to read logs:", error);
      alert("Failed to read logs.");
    } finally {
      setIsExportingLogs(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <SectionCard>
        <SectionHeader
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
              borderRadius: "var(--radius-lg)",
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
                borderRadius: "var(--radius-md)",
              }}
            >
              {logFilePath || "Loading..."}
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
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
                borderRadius: "var(--radius-lg)",
                cursor: isExportingLogs ? "wait" : "pointer",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span style={{ fontSize: "20px" }}>💾</span>
                <span
                  style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
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
                borderRadius: "var(--radius-lg)",
                cursor: isExportingLogs ? "wait" : "pointer",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span style={{ fontSize: "20px" }}>📋</span>
                <span
                  style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
                >
                  Copy Logs to Clipboard
                </span>
              </span>
              <span style={{ fontSize: "12px", color: "var(--text3)" }}>→</span>
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
                borderRadius: "var(--radius-lg)",
                cursor: isExportingLogs ? "wait" : "pointer",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span style={{ fontSize: "20px" }}>🔍</span>
                <span
                  style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
                >
                  Preview Last 200 Lines
                </span>
              </span>
              <span style={{ fontSize: "12px", color: "var(--text3)" }}>→</span>
            </button>
          </div>

          <div
            style={{
              marginTop: "20px",
              padding: "12px 16px",
              background: "rgba(255,107,53,0.05)",
              border: "1px solid rgba(255,107,53,0.15)",
              borderRadius: "var(--radius-md)",
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
  );
};

export default LogsSection;
