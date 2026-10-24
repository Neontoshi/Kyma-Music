import { useState, useEffect, useRef, useCallback } from "react";

export interface PlayerState {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: string;
  is_playing: boolean;
  position: number;
  duration: number;
  volume?: number;
  theme?: string;
}

const initialState: PlayerState = {
  is_playing: false,
  position: 0,
  duration: 0,
  volume: 70,
};

export function useWebSocket() {
  const [state, setState] = useState<PlayerState>(initialState);
  const [status, setStatus] = useState("Disconnected");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setStatus("Connected");
    ws.onclose = () => setStatus("Disconnected");

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "state") {
          setState({
            title: data.title,
            artist: data.artist,
            album: data.album,
            artwork: data.artwork,
            is_playing: data.is_playing,
            position: data.position,
            duration: data.duration,
            volume: data.volume,
            theme: data.theme,
          });
        }
      } catch {}
    };

    return () => ws.close();
  }, []);

  const send = useCallback((command: string, value?: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command, value }));
    }
  }, []);

  return { state, status, send };
}
