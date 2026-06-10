export interface Song {
  id: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  genre: string | null;
  year: number | null;
  track_number: number | null;
  artwork: string | null;
  // Source tracking
  source?: "local" | "youtube" | "soundcloud";
  videoId?: string;
  // UI-only fields
  dur: string;
  emoji: string;
  grad: string;
  bpm: number;
  key: string;
  plays: number;
  liked: boolean;
  queueTag?: "next" | undefined;
}

export interface PlaybackState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentProgress: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 0 | 1 | 2;
}
