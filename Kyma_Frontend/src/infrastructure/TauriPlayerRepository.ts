import { IPlayerRepository } from "../core/repositories/IPlayerRepository";
import { Song } from "../core/entities/Song";
import { tauriCommands, tauriEvents } from "../services/tauriBridge";

export class TauriPlayerRepository implements IPlayerRepository {
  private volumeCache = 70;

  async play(song: Song): Promise<number> {
    return await tauriCommands.playTrack(song);
  }

  async pause(): Promise<void> {
    await tauriCommands.pausePlayback();
  }

  async resume(): Promise<void> {
    await tauriCommands.resumePlayback();
  }

  async stop(): Promise<void> {
    await tauriCommands.stopPlayback();
  }

  async seek(position: number): Promise<void> {
    await tauriCommands.seekTo(position);
  }

  async setVolume(volume: number): Promise<void> {
    this.volumeCache = volume;
    tauriCommands.setVolume(volume / 100).catch(console.error); // fire-and-forget
  }

  async getVolume(): Promise<number> {
    const volume = await tauriCommands.getVolume();
    this.volumeCache = volume * 100;
    return this.volumeCache;
  }

  async getCurrentPosition(): Promise<number> {
    const state = await tauriCommands.getPlaybackState();
    return state.position;
  }

  async getDuration(): Promise<number> {
    const state = await tauriCommands.getPlaybackState();
    return state.duration;
  }

  reset(): void {}

  onPlaybackUpdate(
    callback: (
      position: number,
      duration: number,
      isPlaying: boolean,
      trackId: number,
      buffered: number,
    ) => void,
  ): () => void {
    return tauriEvents.onPlaybackUpdate((data) => {
      callback(
        data.position,
        data.duration,
        data.is_playing,
        data.track_id,
        data.buffered ?? 1.0,
      );
    });
  }
}
