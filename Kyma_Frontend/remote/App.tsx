import React from "react";
import { useWebSocket, PlayerState } from "./hook/useWebSocket";
import WaveCanvas from "./components/WaveCanvas";
import AlbumArt from "./components/AlbumArt";
import TrackInfo from "./components/TrackInfo";
import SeekBar from "./components/SeekBar";
import Controls from "./components/Controls";
import VolumeSlider from "./components/VolumeSlider";

const App: React.FC = () => {
  const { state, send, status } = useWebSocket();

  return (
    <>
      <WaveCanvas />
      <div className="content">
        <AlbumArt
          emoji={state.artwork ? undefined : "🎵"}
          artwork={state.artwork}
        />
        <TrackInfo
          title={state.title || "Not Playing"}
          artist={state.artist || "Open Kyma on desktop"}
          album={state.album}
        />
        <SeekBar
          position={state.position}
          duration={state.duration}
          onSeek={(pct) => send("seek", pct)}
        />
        <Controls
          isPlaying={state.is_playing}
          onPrev={() => send("prev")}
          onToggle={() => send("toggle")}
          onNext={() => send("next")}
        />
        <VolumeSlider
          volume={state.volume ?? 70}
          onVolumeChange={(v) => send("volume", v)}
        />
        <div className={`status ${status === "Connected" ? "connected" : ""}`}>
          {status}
        </div>
      </div>
    </>
  );
};

export default App;
