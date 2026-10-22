import { Song } from "../core/entities/Song";
import { formatDuration } from "./formatTime";

export const DEFAULT_SONG_GRAD =
  "linear-gradient(135deg, var(--accent), var(--accent2))";

export type SongSeed = Partial<Song> & Pick<Song, "id" | "title" | "artist">;

/**
 * Builds a UI `Song` with sensible defaults so call sites only specify what
 * actually differs. Fields provided in `seed` always win.
 */
export function makeSong(seed: SongSeed): Song {
  return {
    path: "",
    album: "",
    duration: 0,
    genre: null,
    year: null,
    track_number: null,
    artwork: null,
    dur: formatDuration(seed.duration ?? 0),
    emoji: "🎵",
    grad: DEFAULT_SONG_GRAD,
    bpm: 0,
    key: "—",
    plays: 0,
    liked: false,
    ...seed,
  };
}
