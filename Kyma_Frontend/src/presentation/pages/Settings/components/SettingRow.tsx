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
  <div className={`settings-row ${last ? "last" : ""}`}>
    <div className="settings-row-copy">
      <div className="settings-row-label">{label}</div>
      <div className="settings-row-desc">{desc}</div>
    </div>
    <div className="settings-row-control">{control}</div>
  </div>
);

export default SettingRow;
