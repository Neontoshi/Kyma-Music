import React from "react";

interface SectionCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const SectionCard: React.FC<SectionCardProps> = ({ children, style }) => (
  <div className="settings-card" style={style}>
    {children}
  </div>
);

export default SectionCard;
