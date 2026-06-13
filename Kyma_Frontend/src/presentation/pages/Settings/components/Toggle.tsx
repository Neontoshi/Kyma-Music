import React from "react";
import { logger } from "../../../../services/logger";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  setting?: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, setting }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => {
      logger.logUI("Settings", "toggle_click", { setting, newState: !checked });
      onChange(!checked);
    }}
    style={{
      position: "relative",
      width: "44px",
      height: "24px",
      borderRadius: "99px",
      background: checked
        ? "linear-gradient(135deg, #7c6af5, #c084fc)"
        : "rgba(255,255,255,0.06)",
      border: checked
        ? "1px solid rgba(124,106,245,0.5)"
        : "1px solid rgba(255,255,255,0.1)",
      cursor: "pointer",
      transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
      flexShrink: 0,
      outline: "none",
      boxShadow: checked ? "0 0 12px rgba(124,106,245,0.35)" : "none",
    }}
  >
    <span
      style={{
        position: "absolute",
        top: "3px",
        left: checked ? "23px" : "3px",
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        background: checked ? "#fff" : "rgba(255,255,255,0.3)",
        transition: "left 0.25s cubic-bezier(0.4,0,0.2,1), background 0.25s",
        boxShadow: checked ? "0 2px 6px rgba(0,0,0,0.4)" : "none",
      }}
    />
  </button>
);

export default Toggle;
