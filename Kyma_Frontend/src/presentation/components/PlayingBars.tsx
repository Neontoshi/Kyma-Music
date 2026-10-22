import React from "react";

interface PlayingBarsProps {
  height?: number;
  color?: string;
}

const PlayingBars: React.FC<PlayingBarsProps> = ({
  height = 14,
  color = "var(--accent)",
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: "2px",
      height: `${height}px`,
      width: "14px",
    }}
  >
    {[0, 0.2, 0.4].map((delay, i) => (
      <div
        key={i}
        style={{
          width: "3px",
          background: color,
          borderRadius: "var(--radius-xs)",
          height: `${height}px`,
          animation: "barBounce 0.8s ease-in-out infinite",
          animationDelay: `${delay}s`,
        }}
      />
    ))}
  </div>
);

export default PlayingBars;
