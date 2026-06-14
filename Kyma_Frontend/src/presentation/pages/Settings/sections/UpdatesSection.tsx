import React from "react";
import SectionCard from "../components/SectionCard";
import SectionHeader from "../components/SectionHeader";
import { logger } from "../../../../services/logger";

interface UpdatesSectionProps {
  updateAvailable: boolean;
  updateVersion: string;
  updateUrl: string;
  updateNotes: string;
  checking: boolean;
  downloading: boolean;
  downloadProgress: number;
  checkForUpdates: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
}

const UpdatesSection: React.FC<UpdatesSectionProps> = ({
  updateAvailable,
  updateVersion,
  //@ts-ignore
  updateUrl,
  updateNotes,
  checking,
  downloading,
  downloadProgress,
  checkForUpdates,
  downloadAndInstall,
}) => {
  const [error, setError] = React.useState("");

  const handleUpdate = async () => {
    setError("");
    try {
      logger.logUI("UpdatesSection", "start_install", {
        version: updateVersion,
      });
      await downloadAndInstall();
    } catch (e) {
      const message = String(e);
      setError(message);
      logger.logUI("UpdatesSection", "install_error", { error: message });
    }
  };

  const handleCheck = async () => {
    setError("");
    try {
      logger.logUI("UpdatesSection", "manual_check");
      await checkForUpdates();
    } catch (e) {
      const message = String(e);
      setError(message);
      logger.logUI("UpdatesSection", "check_error", { error: message });
    }
  };

  // Get current version - update this or get from backend
  const currentVersion = "1.1.1";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <SectionCard>
        <SectionHeader
          icon="🔄"
          title="Software Updates"
          desc="Check for new versions"
          accent="rgba(74,222,128,0.1)"
          badge={
            downloading
              ? "Downloading..."
              : updateAvailable
                ? "Update Available"
                : "Up to Date"
          }
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
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-family-mono)",
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
                fontFamily: "var(--font-family-base)",
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              Kyma v{currentVersion}
            </div>
            {updateAvailable && (
              <>
                <div
                  style={{
                    marginTop: "12px",
                    padding: "8px 12px",
                    background: "rgba(74,222,128,0.12)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "12px",
                    color: "#4ade80",
                    fontFamily: "var(--font-family-mono)",
                  }}
                >
                  ✨ Version {updateVersion} is available!
                </div>
                {updateNotes && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "11px",
                      color: "var(--text2)",
                      fontFamily: "var(--font-family-mono)",
                      maxHeight: "120px",
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.5,
                    }}
                  >
                    {updateNotes}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Download Progress Bar */}
          {downloading && (
            <div
              style={{
                marginBottom: "16px",
                padding: "12px 16px",
                background: "rgba(124,106,245,0.08)",
                border: "1px solid rgba(124,106,245,0.2)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  fontSize: "11px",
                  fontFamily: "var(--font-family-mono)",
                  color: "var(--text2)",
                }}
              >
                <span>Downloading update...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "6px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "var(--radius-xs)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${downloadProgress}%`,
                    height: "100%",
                    background:
                      "linear-gradient(90deg, var(--accent), var(--accent2))",
                    borderRadius: "var(--radius-xs)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              style={{
                marginBottom: "16px",
                padding: "10px 14px",
                background: "rgba(255,107,53,0.1)",
                border: "1px solid rgba(255,107,53,0.25)",
                borderRadius: "var(--radius-md)",
                fontSize: "11px",
                fontFamily: "var(--font-family-mono)",
                color: "#ff6b35",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {updateAvailable ? (
            <button
              onClick={handleUpdate}
              disabled={downloading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                width: "100%",
                padding: "14px 18px",
                background: downloading
                  ? "rgba(255,255,255,0.05)"
                  : "linear-gradient(135deg, #4ade80, #22c55e)",
                border: "none",
                borderRadius: "var(--radius-lg)",
                cursor: downloading ? "wait" : "pointer",
                color: downloading ? "var(--text3)" : "#fff",
                fontFamily: "var(--font-family-base)",
                fontSize: "14px",
                fontWeight: 600,
                opacity: downloading ? 0.7 : 1,
              }}
            >
              {downloading ? (
                <>
                  <div
                    className="ap-spinner ap-spinner--sm"
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "var(--accent)",
                    }}
                  />
                  <span>Downloading & Installing...</span>
                </>
              ) : (
                <>
                  <span>⬇️</span>
                  <span>Download & Install Update</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleCheck}
              disabled={checking}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                width: "100%",
                padding: "14px 18px",
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none",
                borderRadius: "var(--radius-lg)",
                cursor: checking ? "wait" : "pointer",
                color: "#fff",
                fontFamily: "var(--font-family-base)",
                fontSize: "14px",
                fontWeight: 600,
                opacity: checking ? 0.6 : 1,
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
              ) : (
                <>
                  <span>✅</span>
                  <span>Check for Updates</span>
                </>
              )}
            </button>
          )}

          {!updateAvailable && !checking && (
            <div
              style={{
                marginTop: "16px",
                padding: "8px 12px",
                textAlign: "center",
                fontSize: "10px",
                color: "var(--text3)",
                fontFamily: "var(--font-family-mono)",
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
              borderRadius: "var(--radius-md)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-family-mono)",
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
                fontFamily: "var(--font-family-mono)",
                lineHeight: 1.5,
              }}
            >
              Updates are checked automatically when you launch Kyma. You can
              also manually check here. When an update is available, it will be
              downloaded and installed automatically.
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default UpdatesSection;
