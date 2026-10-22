// Kyma_Frontend/src/presentation/pages/Home/helpers/trendingTrackToSong.ts
import { Song } from "../../../../core/entities/Song";
import { makeSong } from "../../../../lib/song";

function trendingTrackToSong(t: any): Song {
  return makeSong({
    id: `yt-${t.videoId}`,
    title: t.title,
    artist: t.artist,
    album: t.album || "Trending",
    duration: t.duration_secs || 0,
    artwork: t.artwork_url || t.thumbnail,
    source: "youtube",
    videoId: t.videoId,
    dur: t.duration_str || "",
    emoji: "🔥",
  });
}

export default trendingTrackToSong;
