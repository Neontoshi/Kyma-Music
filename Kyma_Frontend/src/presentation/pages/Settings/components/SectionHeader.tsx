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
  accent = "rgba(var(--accent-rgb),0.1)",
  badge,
}) => (
  <div className="settings-card-head">
    <div className="settings-card-icon" style={{ background: accent }}>
      {icon}
    </div>
    <div className="settings-card-head-copy">
      <div className="settings-card-title">{title}</div>
      <div className="settings-card-desc">{desc}</div>
    </div>
    {badge && <span className="settings-card-badge">{badge}</span>}
  </div>
);

export default SectionHeader;
