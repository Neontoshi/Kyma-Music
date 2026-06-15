// Kyma_Frontend/src/presentation/pages/Home/helpers/stats.ts
import { Song } from "../../../../core/entities/Song";

function totalListeningHours(songs: Song[]): number {
  return Math.floor(
    songs.reduce((acc, s) => acc + (s.duration ?? 0) * (s.plays ?? 0), 0) /
      3600,
  );
}

function topArtist(songs: Song[]): string {
  const counts: Record<string, number> = {};
  for (const s of songs) {
    counts[s.artist] = (counts[s.artist] ?? 0) + (s.plays ?? 0);
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
}

export { totalListeningHours, topArtist };
