import React from "react";

interface SettingRowProps {
  label: string;
  desc: string;
  control: React.ReactNode;
  last?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  label,
  desc,
  control,
  last,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      padding: "14px 0",
      borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)",
    }}
  >
    <div>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "var(--text)",
          fontFamily: "'Syne', sans-serif",
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "var(--text3)",
          fontFamily: "'DM Mono', monospace",
          marginTop: "2px",
          letterSpacing: "0.02em",
        }}
      >
        {desc}
      </div>
    </div>
    <div style={{ flexShrink: 0 }}>{control}</div>
  </div>
);

export default SettingRow;
