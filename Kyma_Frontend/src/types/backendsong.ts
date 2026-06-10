// Mirrors the Rust Song struct exactly
export interface BackendSong {
  id: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds as f64
  genre: string | null;
  year: number | null;
  track_number: number | null;
  artwork: number[] | null;
}
