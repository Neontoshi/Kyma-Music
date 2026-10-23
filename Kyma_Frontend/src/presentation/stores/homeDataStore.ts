import { create } from "zustand";
import { tauriCommands } from "../../services/tauriBridge";

interface HomeDataState {
  trendingChart: any[];
  weeklyChart: any[];
  similarArtists: any[];
  weeklyStats: any;
  allTimeStats: any;
  heatmap: any[];
  loading: boolean;
  loaded: boolean;
  lastfmLoadedSignature: string;
  lastfmLoadingSignature: string | null;
  loadAll: (
    lastfmKey: string,
    lastfmUser: string,
    topLocalArtist: string,
  ) => Promise<void>;
}

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 3000;
let localLoadPromise: Promise<void> | null = null;

async function resolveTrendingTracks(tracks: any[]): Promise<any[]> {
  return Promise.all(
    tracks.map(async (track: any) => {
      try {
        const results = await tauriCommands.searchYoutube(
          `${track.artist} - ${track.title} official audio`,
        );
        if (results && results.length > 0)
          return {
            ...track,
            videoId: results[0].id,
            duration_secs: results[0].duration_secs || track.duration_secs,
            duration_str: results[0].duration_str || "",
            thumbnail: results[0].thumbnail || track.artwork_url,
          };
      } catch {}
      return track;
    }),
  );
}

export const useHomeDataStore = create<HomeDataState>((set, get) => ({
  trendingChart: [],
  weeklyChart: [],
  similarArtists: [],
  weeklyStats: null,
  allTimeStats: null,
  heatmap: [],
  loading: false,
  loaded: false,
  lastfmLoadedSignature: "",
  lastfmLoadingSignature: null,

  loadAll: async (lastfmKey, lastfmUser, topLocalArtist) => {
    const signature = `${lastfmKey}\u0000${lastfmUser}\u0000${topLocalArtist}`;
    const state = get();

    if (state.loaded && state.lastfmLoadedSignature === signature) return;
    if (state.lastfmLoadingSignature === signature) return;

    set({ loading: true });

    const runLocalLoad = async () => {
      if (get().loaded) return;
      if (!localLoadPromise) {
        localLoadPromise = (async () => {
          // Deezer chart — retry until all tracks have videoId
          try {
            const data = (await tauriCommands.getDeezerChart()) as any;
            const tracks = (data || []).slice(0, 10);

            let resolved = await resolveTrendingTracks(tracks);
            let attempt = 0;

            while (attempt < MAX_RETRIES) {
              const missing = resolved.filter((t) => !t.videoId);
              if (missing.length === 0) break;

              await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));

              const retried = await resolveTrendingTracks(missing);
              const retriedMap = new Map(retried.map((t) => [t.id, t]));
              resolved = resolved.map((t) =>
                !t.videoId && retriedMap.has(t.id) ? retriedMap.get(t.id) : t,
              );
              attempt++;
            }

            set({ trendingChart: resolved.filter((t) => !!t.videoId) });
          } catch {}

          // Local weekly stats
          try {
            const stats = (await tauriCommands.getWeeklyStats()) as any;
            set({ weeklyStats: stats });
          } catch {}

          // Local all-time stats
          try {
            const allTime = (await tauriCommands.getAllTimeStats()) as any;
            set({ allTimeStats: allTime });
          } catch {}

          // Local heatmap
          try {
            const data = (await tauriCommands.getHeatmap()) as any;
            set({ heatmap: data || [] });
          } catch {}

          set({ loaded: true });
        })();
      }

      try {
        await localLoadPromise;
      } finally {
        localLoadPromise = null;
      }
    };

    await runLocalLoad();

    if (get().lastfmLoadedSignature === signature) {
      set({ loading: false });
      return;
    }

    set({ lastfmLoadingSignature: signature });

    // Last.fm weekly chart
    if (lastfmKey && lastfmUser) {
      try {
        const data = (await tauriCommands.getLastfmWeeklyChart(
          lastfmUser,
          lastfmKey,
        )) as any;
        const tracks = (data || []).slice(0, 10);
        const resolved = await Promise.all(
          tracks.map(async (track: any) => {
            try {
              const results = await tauriCommands.searchYoutube(
                `${track.artist} - ${track.title} official audio`,
              );
              if (results && results.length > 0)
                return {
                  ...track,
                  videoId: results[0].id,
                  duration_secs: results[0].duration_secs || 210,
                  duration_str: results[0].duration_str || "",
                  artwork_url: results[0].thumbnail || "",
                };
            } catch {}
            return track;
          }),
        );
        set({ weeklyChart: resolved });
      } catch {}
    }

    // Last.fm similar artists
    if (lastfmKey && topLocalArtist && topLocalArtist !== "—") {
      try {
        const data = (await tauriCommands.getLastfmSimilarArtists(
          topLocalArtist,
          lastfmKey,
        )) as any;
        set({ similarArtists: (data || []).slice(0, 8) });
      } catch {}
    }

    set({
      lastfmLoadedSignature: signature,
      lastfmLoadingSignature: null,
      loading: false,
    });
  },
}));
