import React from "react";
import SectionCard from "../components/SectionCard";

interface IntegrationsSectionProps {
  listenbrainzToken: string;
  setListenbrainzToken: (v: string) => void;
  listenbrainzUser: string;
  setListenbrainzUser: (v: string) => void;
  lastfmKey: string;
  setLastfmKey: (v: string) => void;
  lastfmUser: string;
  setLastfmUser: (v: string) => void;
}

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

const IntegrationsSection: React.FC<IntegrationsSectionProps> = ({
  listenbrainzToken,
  setListenbrainzToken,
  listenbrainzUser,
  setListenbrainzUser,
  lastfmKey,
  setLastfmKey,
  lastfmUser,
  setLastfmUser,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Last.fm */}
      <SectionCard>
        <div style={{ padding: "20px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(214,62,62,0.1)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              ♪
            </div>
            <div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text)",
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                Last.fm
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text3)",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                Scrobbling & recommendations
              </div>
            </div>
          </div>

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
            <span style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>
              ✦
            </span>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text2)",
                lineHeight: 1.6,
                fontFamily: "'DM Mono', monospace",
                margin: 0,
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
        <div style={{ padding: "20px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(76,175,80,0.08)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              ◉
            </div>
            <div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text)",
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                ListenBrainz
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text3)",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                Open-source scrobble tracking
              </div>
            </div>
          </div>

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
  );
};

export default IntegrationsSection;
