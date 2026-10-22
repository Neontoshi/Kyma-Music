// Kyma_Frontend/src/presentation/pages/Home/components/MostPlayed.tsx
import React from "react";
import { Song } from "../../../../core/entities/Song";
import SectionHeader from "../sub-components/SectionHeader";
import TrackRow from "../sub-components/TrackRow";

interface MostPlayedProps {
  topPlayed: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, source: string) => void;
  onSetQueue: (songs: Song[], start: Song) => void;
}

const MostPlayed: React.FC<MostPlayedProps> = ({
  topPlayed,
  currentSong,
  isPlaying,
  onPlaySong,
  onSetQueue,
}) => {
  if (topPlayed.length === 0) return null;

  return (
    <div
      className="hp-section"
      style={{ marginBottom: 0, animationDelay: "0.3s" }}
    >
      <SectionHeader label="Most Played" sub="all-time" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px",
        }}
      >
        {topPlayed.map((s, i) => (
          <TrackRow
            key={s.id}
            index={String(i + 1).padStart(2, "0")}
            song={s}
            isActive={currentSong?.id === s.id}
            isPlaying={isPlaying}
            onClick={() => {
              onSetQueue(topPlayed, s);
              onPlaySong(s, "most_played");
            }}
            showPlays
            showTime
          />
        ))}
      </div>
    </div>
  );
};

export default MostPlayed;
