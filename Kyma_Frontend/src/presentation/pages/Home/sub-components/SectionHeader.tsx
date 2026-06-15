// Kyma_Frontend/src/presentation/pages/Home/sub-components/SectionHeader.tsx
import React from "react";

interface SectionHeaderProps {
  label: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  sub,
  action,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "1rem",
    }}
  >
    <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
      <span
        style={{
          fontSize: "1.1rem",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "var(--text)",
          fontFamily: "var(--font-family-base)",
        }}
      >
        {label}
      </span>
      {sub && (
        <span
          style={{
            fontFamily: "var(--font-family-mono)",
            fontSize: "9px",
            color: "var(--text3)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {sub}
        </span>
      )}
    </div>
    {action && (
      <button
        onClick={action.onClick}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-family-mono)",
          fontSize: "9px",
          color: "var(--accent)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "4px 0",
          opacity: 0.8,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
      >
        {action.label} →
      </button>
    )}
  </div>
);

export default SectionHeader;
