// Kyma_Frontend/src/presentation/pages/Home/components/TrendingSection.tsx
import React from "react";
import SectionHeader from "../sub-components/SectionHeader";
import CardRow from "../sub-components/CardRow";
import MediaCard from "../sub-components/MediaCard";

interface TrendingSectionProps {
  trendingChart: any[];
  currentSong: any;
  isPlaying: boolean;
  onPlayTrending: (track: any, allTracks: any[]) => void;
}

const TrendingSection: React.FC<TrendingSectionProps> = ({
  trendingChart,
  currentSong,
  isPlaying,
  onPlayTrending,
}) => {
  if (trendingChart.length === 0) return null;

  return (
    <div
      className="hp-section"
      style={{ marginBottom: "2rem", animationDelay: "0.07s" }}
    >
      <SectionHeader label="🔥 Trending Now" sub="Deezer chart" />
      <CardRow>
        {trendingChart.map((t: any) => (
          <MediaCard
            key={t.id}
            title={t.title}
            sub={t.artist}
            art={t.artwork_url}
            emoji="🎵"
            badge={`#${t.position}`}
            isActive={currentSong?.id === `yt-${t.videoId}`}
            isPlaying={isPlaying}
            onClick={() => onPlayTrending(t, trendingChart)}
            width={140}
          />
        ))}
      </CardRow>
    </div>
  );
};

export default TrendingSection;
