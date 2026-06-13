import React from "react";
import SectionCard from "../components/SectionCard";
import SectionHeader from "../components/SectionHeader";

interface CastSectionProps {
  localIP: string;
  qrDataUrl: string;
  copyLabel: string;
  setCopyLabel: (label: string) => void;
}

const CastSection: React.FC<CastSectionProps> = ({
  localIP,
  qrDataUrl,
  copyLabel,
  setCopyLabel,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <SectionCard>
        <SectionHeader
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
  );
};

export default CastSection;
