import React from "react";
import SectionCard from "../components/SectionCard";
import SectionHeader from "../components/SectionHeader";

interface UpdatesSectionProps {
  updateAvailable: boolean;
  updateVersion: string;
  checking: boolean;
  checkForUpdates: () => Promise<void>;
}

const UpdatesSection: React.FC<UpdatesSectionProps> = ({
  updateAvailable,
  updateVersion,
  checking,
  checkForUpdates,
}) => {
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
            onClick={checkForUpdates}
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
              color: "#fff",
              fontFamily: "'Syne', sans-serif",
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
              also manually check here. Updates will be downloaded and installed
              automatically.
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default UpdatesSection;
