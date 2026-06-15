// Kyma_Frontend/src/presentation/pages/Home/components/MoodPicks.tsx
import React from "react";
import { Song } from "../../../../core/entities/Song";
import SectionHeader from "../sub-components/SectionHeader";
import CardRow from "../sub-components/CardRow";
import MediaCard from "../sub-components/MediaCard";

interface MoodPicksProps {
  moodPicks: Song[];
  moodConfig: {
    [key: string]: { label: string; color: string; icon: string };
  };
  mood: "energetic" | "chill" | "focus";
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, source: string) => void;
  onSetQueue: (songs: Song[], start: Song) => void;
}

const MoodPicks: React.FC<MoodPicksProps> = ({
  moodPicks,
  moodConfig,
  mood,
  currentSong,
  isPlaying,
  onPlaySong,
  onSetQueue,
}) => {
  if (moodPicks.length === 0) return null;

  return (
    <div
      className="hp-section"
      style={{ marginBottom: "2rem", animationDelay: "0.2s" }}
    >
      <SectionHeader
        label={`${moodConfig[mood].icon} ${moodConfig[mood].label}`}
        sub="for right now"
      />
      <CardRow>
        {moodPicks.map((s) => (
          <MediaCard
            key={s.id}
            title={s.title}
            sub={s.artist}
            art={s.artwork || undefined}
            emoji={s.emoji}
            grad={s.grad}
            videoId={s.videoId}
            isActive={currentSong?.id === s.id}
            isPlaying={isPlaying}
            onClick={() => {
              onSetQueue(moodPicks, s);
              onPlaySong(s, "mood_picks");
            }}
          />
        ))}
      </CardRow>
    </div>
  );
};

export default MoodPicks;
