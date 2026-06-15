// Kyma_Frontend/src/presentation/pages/Home/components/LikedSongs.tsx
import React from "react";
import { Song } from "../../../../core/entities/Song";
import SectionHeader from "../sub-components/SectionHeader";
import TrackRow from "../sub-components/TrackRow";

interface LikedSongsProps {
  recentlyPlayed: any[];
  likedSongsPreview: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, source: string) => void;
  onSetQueue: (songs: Song[], start: Song) => void;
  onNavigate: (path: string, from: string) => void;
}

const LikedSongs: React.FC<LikedSongsProps> = ({
  recentlyPlayed,
  likedSongsPreview,
  currentSong,
  isPlaying,
  onPlaySong,
  onSetQueue,
  onNavigate,
}) => {
  if (recentlyPlayed.length === 0 || likedSongsPreview.length === 0)
    return null;

  return (
    <div
      className="hp-section"
      style={{ marginBottom: "2rem", animationDelay: "0.5s" }}
    >
      <SectionHeader
        label="❤ Liked Songs"
        sub="songs you love"
        action={{
          label: "See all",
          onClick: () => onNavigate("/liked", "home_liked_songs"),
        }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px",
        }}
      >
        {likedSongsPreview.map((s) => (
          <TrackRow
            key={s.id}
            song={s}
            isActive={currentSong?.id === s.id}
            isPlaying={isPlaying}
            onClick={() => {
              onSetQueue(likedSongsPreview, s);
              onPlaySong(s, "liked_songs_section");
            }}
            showTime
          />
        ))}
      </div>
    </div>
  );
};

export default LikedSongs;
