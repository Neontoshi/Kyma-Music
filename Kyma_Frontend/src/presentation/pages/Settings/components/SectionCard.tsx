import React from "react";

interface SectionCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const SectionCard: React.FC<SectionCardProps> = ({ children, style }) => (
  <div
    style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "16px",
      overflow: "hidden",
      backdropFilter: "blur(12px)",
      ...style,
    }}
  >
    {children}
  </div>
);

export default SectionCard;
