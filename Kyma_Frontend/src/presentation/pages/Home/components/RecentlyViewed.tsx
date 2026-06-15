// Kyma_Frontend/src/presentation/pages/Home/components/RecentlyViewed.tsx
import React from "react";
import SectionHeader from "../sub-components/SectionHeader";
import CardRow from "../sub-components/CardRow";
import MediaCard from "../sub-components/MediaCard";

interface RecentlyViewedProps {
  recentlyViewedAlbums: any[];
  onAlbumClick: (album: any) => void;
  onNavigate: (path: string, from: string) => void;
}

const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
  recentlyViewedAlbums,
  onAlbumClick,
  onNavigate,
}) => {
  if (recentlyViewedAlbums.length === 0) return null;

  return (
    <div
      className="hp-section"
      style={{ marginBottom: "2rem", animationDelay: "0.25s" }}
    >
      <SectionHeader
        label="Recently Viewed"
        sub="albums"
        action={{
          label: "Browse",
          onClick: () => onNavigate("/albums", "home_recent_albums"),
        }}
      />
      <CardRow>
        {recentlyViewedAlbums.map((album: any) => (
          <MediaCard
            key={album.id}
            title={album.title}
            sub={album.artist}
            art={album.cover_url}
            emoji="💿"
            onClick={() => onAlbumClick(album)}
            width={130}
          />
        ))}
      </CardRow>
    </div>
  );
};

export default RecentlyViewed;
