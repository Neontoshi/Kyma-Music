// Kyma_Frontend/src/presentation/pages/Home/sub-components/PlayingBars.tsx
import React from "react";

const PlayingBars: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-end",
      gap: "2px",
      height: "12px",
    }}
  >
    {[0, 0.2, 0.1].map((delay, i) => (
      <div
        key={i}
        style={{
          width: "3px",
          background: "var(--accent2)",
          borderRadius: "var(--radius-xs)",
          animation: "barBounce 0.7s ease-in-out infinite",
          animationDelay: `${delay}s`,
          height: "12px",
        }}
      />
    ))}
  </div>
);

export default PlayingBars;
