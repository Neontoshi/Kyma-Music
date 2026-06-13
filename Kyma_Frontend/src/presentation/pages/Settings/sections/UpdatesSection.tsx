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
  checkForUpdates: () => Promise<void>;
}

const UpdatesSection: React.FC<UpdatesSectionProps> = ({
  updateAvailable,
  updateVersion,
  updateUrl,
  updateNotes,
  checking,
  checkForUpdates,
}) => {
  const handleUpdate = () => {
    logger.logUI("UpdatesSection", "download_update", {
      version: updateVersion,
      url: updateUrl,
    });
    window.open(updateUrl, "_blank");
  };

  const handleCheck = async () => {
    logger.logUI("UpdatesSection", "manual_check");
    await checkForUpdates();
  };

  // Get current version - you can also pass this as a prop
  const currentVersion = "1.1.0"; // Update this or get from backend

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <SectionCard>
        <SectionHeader
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
                    borderRadius: "8px",
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
                      borderRadius: "8px",
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

          {updateAvailable ? (
            <button
              onClick={handleUpdate}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                width: "100%",
                padding: "14px 18px",
                background: "linear-gradient(135deg, #4ade80, #22c55e)",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                color: "#fff",
                fontFamily: "var(--font-family-base)",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              <span>⬇️</span>
              <span>Download Update from GitHub</span>
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
                borderRadius: "12px",
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
              borderRadius: "10px",
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
              Updates are checked automatically on startup. When a new version
              is available, you'll be directed to the GitHub releases page to
              download and install it manually.
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default UpdatesSection;
