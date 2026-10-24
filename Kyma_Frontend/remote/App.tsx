import React, { useEffect } from "react";
import { useWebSocket } from "./hook/useWebSocket";
import { applyRemoteTheme, getRemoteTheme } from "./theme";
import WaveCanvas from "./components/WaveCanvas";
import AlbumArt from "./components/AlbumArt";
import TrackInfo from "./components/TrackInfo";
import SeekBar from "./components/SeekBar";
import Controls from "./components/Controls";
import VolumeSlider from "./components/VolumeSlider";

const App: React.FC = () => {
  const { state, send, status } = useWebSocket();
  const connected = status === "Connected";
  const theme = getRemoteTheme(state.theme);

  useEffect(() => {
    applyRemoteTheme(state.theme);
  }, [state.theme]);

  return (
    <>
      <WaveCanvas
        accentRgb={theme.colors["--accent-rgb"]}
        accent2Rgb={theme.colors["--accent2-rgb"]}
      />
      <div className="remote-glow" aria-hidden="true" />
      <main className="content">
        <header className="remote-head">
          <div className="brand">
            <span className="brand-mark">K</span>
            <div className="brand-copy">
              <span className="brand-eyebrow">Kyma</span>
              <span className="brand-name">Cast Remote</span>
            </div>
          </div>
          <div className={`status-pill ${connected ? "connected" : ""}`}>
            <span className="status-dot" />
            {connected ? "Live" : "Offline"}
          </div>
        </header>

        <div className="art-wrap">
          <AlbumArt
            emoji={state.artwork ? undefined : "🎵"}
            artwork={state.artwork}
          />
        </div>

        <TrackInfo
          title={state.title || "Nothing playing"}
          artist={state.artist || "Open Kyma on desktop"}
          album={state.album}
        />

        <div className="progress-block">
          <SeekBar
            position={state.position}
            duration={state.duration}
            onSeek={(pct) => send("seek", pct)}
          />
        </div>

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

        <footer className="remote-foot">
          {connected
            ? "Controlling Kyma on desktop"
            : "Waiting for desktop connection"}
        </footer>
      </main>
    </>
  );
};

export default App;
