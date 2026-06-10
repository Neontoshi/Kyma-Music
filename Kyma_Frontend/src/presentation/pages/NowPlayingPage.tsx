import React from "react";
import NowPlayingPanel from "../components/Player/NowPlayingPanel";

const NowPlayingPage: React.FC = () => (
  <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
    <NowPlayingPanel showLyrics={true} />
  </div>
);

export default NowPlayingPage;
