import React from "react";

interface PlayingBarsProps {
  height?: number;
  color?: string;
}

const BAR_COUNT = 4;

const PlayingBars: React.FC<PlayingBarsProps> = ({
  height = 14,
  color = "var(--accent)",
}) => (
  <div
    className="playing-bars"
    style={{ height: `${height}px`, color }}
    aria-hidden="true"
  >
    {Array.from({ length: BAR_COUNT }, (_, index) => (
      <span
        key={index}
        className="playing-bar"
        style={{ "--bar-index": index } as React.CSSProperties}
      />
    ))}
  </div>
);

export default PlayingBars;
