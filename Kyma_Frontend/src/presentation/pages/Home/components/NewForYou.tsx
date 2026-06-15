// Kyma_Frontend/src/presentation/pages/Home/components/NewForYou.tsx
import React from "react";
import { Song } from "../../../../core/entities/Song";
import SectionHeader from "../sub-components/SectionHeader";
import CardRow from "../sub-components/CardRow";
import MediaCard from "../sub-components/MediaCard";

interface NewForYouProps {
  shuffledNewReleases: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, source: string) => void;
  onSetQueue: (songs: Song[], start: Song) => void;
}

const NewForYou: React.FC<NewForYouProps> = ({
  shuffledNewReleases,
  currentSong,
  isPlaying,
  onPlaySong,
  onSetQueue,
}) => {
  if (shuffledNewReleases.length === 0) return null;

  return (
    <div
      className="hp-section"
      style={{ marginBottom: "2rem", animationDelay: "0.35s" }}
    >
      <SectionHeader label="New For You" sub="from followed artists" />
      <CardRow>
        {shuffledNewReleases.map((s) => (
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
              onSetQueue(shuffledNewReleases, s);
              onPlaySong(s, "new_for_you");
            }}
          />
        ))}
      </CardRow>
    </div>
  );
};

export default NewForYou;
