import React from "react";

interface Props {
  emoji?: string;
  artwork?: string;
}

const AlbumArt: React.FC<Props> = ({ emoji = "🎵", artwork }) => (
  <div className="art">
    {artwork ? (
      <img src={artwork} alt="" className="art-img" />
    ) : (
      <span>{emoji}</span>
    )}
  </div>
);

export default AlbumArt;
