// src/presentation/hooks/useResolveAndPlay.ts
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";
import { formatDuration } from "../../lib/formatTime";

let resolveGeneration = 0;

export const cancelPendingResolve = () => {
  resolveGeneration += 1;
};

export const resolveAndPlaySong = async (song: Song) => {
  const generation = ++resolveGeneration;
  const { setCurrentSong, setProgress } = usePlayerStore.getState();

  // Already resolved — play directly
  if (song.videoId) {
    setCurrentSong(song);
    setProgress(0);
    return;
  }

  tauriCommands.stopPlayback().catch(() => {});

  usePlayerStore.setState({
    currentSong: {
      ...song,
      id: `__resolving__${song.id}`,
      path: "__resolving__",
      videoId: undefined,
    },
    isLoading: true,
    isPlaying: false,
    currentProgress: 0,
    duration: 0,
    buffered: 0,
  });

  try {
    const results = await tauriCommands.searchYoutube(
      `${song.artist} - ${song.title}`,
      5,
    );
    if (generation !== resolveGeneration) return;

    if (results?.length) {
      song.videoId = results[0].id;
      if (results[0].duration_secs) {
        song.duration = results[0].duration_secs;
        song.dur = formatDuration(results[0].duration_secs);
      }

      // Update the song in the queue so it's resolved for future next/prev
      const queueState = useQueueStore.getState();
      const updatedQueue = queueState.queue.map((q) =>
        q.id === song.id ? song : q,
      );
      queueState.setQueue(updatedQueue, song, "library");

      if (generation !== resolveGeneration) return;

      setCurrentSong(song);
      setProgress(0);
    } else if (generation === resolveGeneration) {
      usePlayerStore.setState({ isLoading: false, currentSong: null });
    }
  } catch (err) {
    console.error("Failed to resolve track:", err);
    if (generation === resolveGeneration) {
      usePlayerStore.setState({ isLoading: false, currentSong: null });
    }
  }
};
