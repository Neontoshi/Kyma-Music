import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import butterchurn from "butterchurn";
import { listen } from "@tauri-apps/api/event";

// Dynamically import presets to ensure they're included in production build
let presetsCache: Record<string, unknown> | null = null;
let presetNamesCache: string[] = [];

// Helper to load presets (handles different module formats)
async function loadPresets(): Promise<{
  presets: Record<string, unknown>;
  names: string[];
}> {
  console.log("[Butterchurn] Loading presets...");

  if (presetsCache && presetNamesCache.length > 0) {
    console.log(
      `[Butterchurn] Using cached presets: ${presetNamesCache.length}`,
    );
    return { presets: presetsCache, names: presetNamesCache };
  }

  try {
    const module = await import("butterchurn-presets");
    console.log("[Butterchurn] Module keys:", Object.keys(module));

    let presetsData = null;
    if (typeof module.getPresets === "function") {
      console.log("[Butterchurn] Found module.getPresets");
      presetsData = module.getPresets();
    } else if (
      module.default &&
      typeof module.default.getPresets === "function"
    ) {
      console.log("[Butterchurn] Found module.default.getPresets");
      presetsData = module.default.getPresets();
    } else if (
      module.butterchurnPresets &&
      typeof module.butterchurnPresets.getPresets === "function"
    ) {
      console.log("[Butterchurn] Found module.butterchurnPresets.getPresets");
      presetsData = module.butterchurnPresets.getPresets();
    }

    if (presetsData && typeof presetsData === "object") {
      presetsCache = presetsData;
      presetNamesCache = Object.keys(presetsData);
      console.log(`[Butterchurn] ✅ Loaded ${presetNamesCache.length} presets`);

      if (presetNamesCache.length === 0) {
        console.warn("[Butterchurn] ⚠️ No presets found");
      }
    } else {
      console.error(
        "[Butterchurn] ❌ Failed to load presets: invalid data shape",
        module,
      );
    }
  } catch (err) {
    console.error("[Butterchurn] ❌ Failed to load presets module:", err);
  }

  return { presets: presetsCache || {}, names: presetNamesCache };
}

interface AudioVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

function useVisualizer(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isPlaying: boolean,
  initialPreset?: string,
) {
  const isPlayingRef = useRef(isPlaying);
  const visualizerRef = useRef<any>(null);
  const freqDataRef = useRef<Uint8Array>(new Uint8Array(1024).fill(0));
  const waveDataRef = useRef<Uint8Array>(new Uint8Array(1024).fill(128));
  const animIdRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<Record<string, unknown>>({});
  const [presetNames, setPresetNames] = useState<string[]>([]);
  const [presetsLoaded, setPresetsLoaded] = useState(false);

  // Load presets on mount
  useEffect(() => {
    loadPresets()
      .then(({ presets: loadedPresets, names }) => {
        setPresets(loadedPresets);
        setPresetNames(names);
        setPresetsLoaded(true);
        console.log(`[Butterchurn] Loaded ${names.length} presets`);
      })
      .catch((err) => {
        console.error("[Butterchurn] Load error:", err);
      });
  }, []);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Resume AudioContext on first user interaction
  useEffect(() => {
    const resume = () => {
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume();
      }
    };
    document.addEventListener("click", resume);
    return () => document.removeEventListener("click", resume);
  }, []);

  const loadRandomPreset = useCallback(() => {
    if (!visualizerRef.current || presetNames.length === 0) {
      return;
    }

    const name = presetNames[Math.floor(Math.random() * presetNames.length)];
    const presetData = presets[name];

    if (presetData) {
      try {
        // If preset data is a string (URL/path), fetch the actual JSON
        if (
          typeof presetData === "string" &&
          (presetData.endsWith(".json") ||
            presetData.startsWith("http") ||
            presetData.startsWith("/"))
        ) {
          fetch(presetData)
            .then((res) => res.json())
            .then((data) => {
              visualizerRef.current.loadPreset(data, 2.0);
              setPresetName(name);
            })
            .catch((err) => {
              console.error("[Butterchurn] Failed to fetch preset JSON:", err);
            });
        } else {
          // Direct preset object
          visualizerRef.current.loadPreset(presetData, 2.0);
          setPresetName(name);
        }
      } catch (err) {
        console.error("[Butterchurn] Failed to load preset:", err);
      }
    }
  }, [presets, presetNames]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    analyser.getByteFrequencyData = (arr: Uint8Array) => {
      if (isPlayingRef.current && freqDataRef.current.some((v) => v > 0)) {
        arr.set(freqDataRef.current.subarray(0, arr.length));
      } else {
        arr.fill(0);
      }
    };
    analyser.getByteTimeDomainData = (arr: Uint8Array) => {
      if (isPlayingRef.current) {
        arr.set(waveDataRef.current.subarray(0, arr.length));
      } else {
        arr.fill(128);
      }
    };

    let unlisten: (() => void) | null = null;
    listen<{ bins: number[] }>("visualizer-data", (event) => {
      const bins = event.payload.bins;
      if (!bins || bins.length === 0) return;

      const freq = freqDataRef.current;
      const wave = waveDataRef.current;

      const ratio = freq.length / bins.length;
      for (let i = 0; i < freq.length; i++) {
        const raw = bins[Math.floor(i / ratio)];
        freq[i] = Math.min(255, raw + Math.floor(Math.random() * 10));
      }

      const now = Date.now() / 1000;
      for (let i = 0; i < wave.length; i++) {
        const t = (i / wave.length) * Math.PI * 2;
        const bass = bins[0] / 255;
        wave[i] =
          128 +
          Math.sin(t * 3 + now * 2) * 60 * bass +
          Math.sin(t * 7 + now * 4) * 30 * bass;
      }
    }).then((fn) => {
      unlisten = fn;
    });

    let initialized = false;

    const initViz = (w: number, h: number) => {
      if (initialized) return;
      initialized = true;
      canvas.width = w;
      canvas.height = h;
      const viz = butterchurn.createVisualizer(audioCtx, canvas, {
        width: w,
        height: h,
        pixelRatio: window.devicePixelRatio || 1,
      });
      visualizerRef.current = viz;

      if (presetNames.length > 0) {
        const name =
          initialPreset && presets[initialPreset]
            ? initialPreset
            : presetNames[Math.floor(Math.random() * presetNames.length)];
        const presetData = presets[name];
        if (presetData) {
          try {
            if (
              typeof presetData === "string" &&
              (presetData.endsWith(".json") ||
                presetData.startsWith("http") ||
                presetData.startsWith("/"))
            ) {
              fetch(presetData)
                .then((res) => res.json())
                .then((data) => {
                  viz.loadPreset(data, 0);
                  setPresetName(name);
                })
                .catch((err) =>
                  console.error(
                    "[Butterchurn] Failed to fetch initial preset:",
                    err,
                  ),
                );
            } else {
              viz.loadPreset(presetData, 0);
              setPresetName(name);
            }
          } catch (err) {
            console.error("[Butterchurn] Failed to load initial preset:", err);
          }
        }
      }
      viz.connectAudio(analyser);

      if (audioCtx.state === "suspended") audioCtx.resume();
    };

    const observer = new ResizeObserver((entries) => {
      const rw = entries[0]?.contentRect.width ?? canvas.offsetWidth;
      const rh = entries[0]?.contentRect.height ?? canvas.offsetHeight;
      if (rw === 0 || rh === 0) return;
      if (!initialized) {
        initViz(rw, rh);
      } else if (visualizerRef.current) {
        canvas.width = rw;
        canvas.height = rh;
        visualizerRef.current.setRendererSize(rw, rh);
      }
    });
    observer.observe(canvas);

    const render = () => {
      if (visualizerRef.current && isPlayingRef.current) {
        visualizerRef.current.render();
      }
      animIdRef.current = requestAnimationFrame(render);
    };
    animIdRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      observer.disconnect();
      unlisten?.();
      audioCtx.close().catch(() => {});
      audioCtxRef.current = null;
      visualizerRef.current = null;
    };
  }, [presets, presetNames, initialPreset]);

  return {
    presetName,
    loadRandomPreset,
    presetsLoaded,
    presetNames,
  };
}

const OverlayControls: React.FC<{
  presetName: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onNextPreset: () => void;
}> = ({ presetName, isFullscreen, onToggleFullscreen, onNextPreset }) => {
  const btnStyle: React.CSSProperties = {
    background: "rgba(10,10,15,0.8)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: "6px 14px",
    color: "var(--text2)",
    fontSize: 11,
    fontFamily: "'DM Mono', monospace",
    cursor: "pointer",
    backdropFilter: "blur(8px)",
  };

  return (
    <>
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          zIndex: 10,
          display: "flex",
          gap: 8,
        }}
      >
        <button onClick={onToggleFullscreen} style={btnStyle}>
          {isFullscreen ? "✕ Exit" : "⛶ Fullscreen"}
        </button>
        <button onClick={onNextPreset} style={btnStyle}>
          🎨 Next
        </button>
      </div>
      {presetName && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            zIndex: 10,
            color: "rgba(255,255,255,0.3)",
            fontSize: 10,
            fontFamily: "'DM Mono', monospace",
            maxWidth: "60%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            background: "rgba(0,0,0,0.4)",
            padding: "4px 8px",
            borderRadius: 12,
          }}
        >
          🎵 {presetName}
        </div>
      )}
    </>
  );
};

const FullscreenVisualizer: React.FC<{
  isPlaying: boolean;
  currentPreset: string;
  onPresetChange: (name: string) => void;
  onClose: () => void;
}> = ({ isPlaying, currentPreset, onPresetChange, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { presetName, loadRandomPreset } = useVisualizer(
    canvasRef,
    isPlaying,
    currentPreset,
  );

  useEffect(() => {
    if (presetName) onPresetChange(presetName);
  }, [presetName, onPresetChange]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000" }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
      <OverlayControls
        presetName={presetName}
        isFullscreen={true}
        onToggleFullscreen={onClose}
        onNextPreset={loadRandomPreset}
      />
    </div>,
    document.body,
  );
};

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { presetName, loadRandomPreset } = useVisualizer(canvasRef, isPlaying);
  const [sharedPreset, setSharedPreset] = useState("");

  useEffect(() => {
    if (presetName) setSharedPreset(presetName);
  }, [presetName]);

  return (
    <>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: "#000",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          className={className}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        />
        <OverlayControls
          presetName={presetName}
          isFullscreen={false}
          onToggleFullscreen={() => setIsFullscreen(true)}
          onNextPreset={loadRandomPreset}
        />
      </div>
      {isFullscreen && (
        <FullscreenVisualizer
          isPlaying={isPlaying}
          currentPreset={sharedPreset}
          onPresetChange={setSharedPreset}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </>
  );
};

export default AudioVisualizer;
