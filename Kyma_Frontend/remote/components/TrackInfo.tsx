import React from "react";

interface Props {
  title: string;
  artist: string;
  album?: string;
}

const TrackInfo: React.FC<Props> = ({ title, artist, album }) => (
  <div className="track-info">
    <div className="title">{title}</div>
    <div className="artist">{artist}</div>
    {album && <div className="album">{album}</div>}
  </div>
);

export default TrackInfo;
