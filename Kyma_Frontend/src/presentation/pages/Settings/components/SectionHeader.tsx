import React from "react";

interface SectionHeaderProps {
  icon: string;
  title: string;
  desc: string;
  accent?: string;
  badge?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  desc,
  accent = "rgba(124,106,245,0.12)",
  badge,
}) => (
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
        borderRadius: "var(--radius-lg)",
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
          borderRadius: "var(--radius-pill)",
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

export default SectionHeader;
