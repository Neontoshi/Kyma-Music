// Kyma_Frontend/src/presentation/pages/Home/components/WeeklyChart.tsx
import React from "react";
import SectionHeader from "../sub-components/SectionHeader";
import TrackRow from "../sub-components/TrackRow";
import { makeSong } from "../../../../lib/song";

interface WeeklyChartProps {
  weeklyChart: any[];
  onPlayTrending: (track: any, allTracks: any[]) => void;
}

const WeeklyChart: React.FC<WeeklyChartProps> = ({
  weeklyChart,
  onPlayTrending,
}) => {
  if (weeklyChart.length === 0) return null;

  return (
    <div
      className="hp-section"
      style={{ marginBottom: 0, animationDelay: "0.12s" }}
    >
      <SectionHeader label="📊 Your Weekly Chart" sub="Last.fm" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px",
        }}
      >
        {weeklyChart.map((t: any) => (
          <TrackRow
            key={`${t.artist}-${t.title}`}
            index={String(t.rank).padStart(2, "0")}
            song={makeSong({
              id: `lfm-${t.rank}`,
              title: t.title,
              artist: t.artist,
              videoId: undefined,
              dur: "",
              source: "youtube",
            })}
            onClick={() => onPlayTrending(t, weeklyChart)}
            showPlays={false}
            showTime={false}
          />
        ))}
      </div>
    </div>
  );
};

export default WeeklyChart;
