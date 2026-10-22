// Kyma_Frontend/src/presentation/pages/Home/components/BecauseYouLiked.tsx
import React from "react";
import { Song } from "../../../../core/entities/Song";
import SectionHeader from "../sub-components/SectionHeader";
import CardRow from "../sub-components/CardRow";
import MediaCard from "../sub-components/MediaCard";

interface BecauseYouLikedProps {
  becauseYouLiked: { seed: Song; similar: Song[] } | null;
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, source: string) => void;
  onSetQueue: (songs: Song[], start: Song) => void;
}

const BecauseYouLiked: React.FC<BecauseYouLikedProps> = ({
  becauseYouLiked,
  currentSong,
  isPlaying,
  onPlaySong,
  onSetQueue,
}) => {
  if (!becauseYouLiked) return null;

  return (
    <div
      className="hp-section"
      style={{ marginBottom: 0, animationDelay: "0.4s" }}
    >
      <SectionHeader
        label="Because you liked"
        sub={becauseYouLiked.seed.title}
      />
      <CardRow>
        {becauseYouLiked.similar.map((s) => (
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
              onSetQueue(becauseYouLiked.similar, s);
              onPlaySong(s, "because_you_liked");
            }}
          />
        ))}
      </CardRow>
    </div>
  );
};

export default BecauseYouLiked;
