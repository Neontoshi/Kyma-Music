// Kyma_Frontend/src/presentation/pages/Home/helpers/trendingTrackToSong.ts
import { Song } from "../../../../core/entities/Song";

function trendingTrackToSong(t: any): Song {
  return {
    id: `yt-${t.videoId}`,
    path: "",
    title: t.title,
    artist: t.artist,
    album: t.album || "Trending",
    duration: t.duration_secs || 0,
    genre: null,
    year: null,
    track_number: null,
    artwork: t.artwork_url || t.thumbnail,
    source: "youtube" as any,
    videoId: t.videoId,
    dur: t.duration_str || "",
    emoji: "🔥",
    grad: "linear-gradient(135deg, var(--accent), var(--accent2))",
    bpm: 0,
    key: "—",
    plays: 0,
    liked: false,
  };
}

export default trendingTrackToSong;
