import { ISongRepository } from "../core/repositories/ISongRepository";
import { IPlayerRepository } from "../core/repositories/IPlayerRepository";
import { TauriSongRepository } from "./TauriSongRepository";
import { TauriPlayerRepository } from "./TauriPlayerRepository";

class ServiceProvider {
  private static instance: ServiceProvider;
  private songRepository: ISongRepository | null = null;
  private playerRepository: IPlayerRepository | null = null;

  static getInstance(): ServiceProvider {
    if (!ServiceProvider.instance) {
      ServiceProvider.instance = new ServiceProvider();
    }
    return ServiceProvider.instance;
  }

  getSongRepository(): ISongRepository {
    if (!this.songRepository) {
      this.songRepository = new TauriSongRepository();
    }
    return this.songRepository;
  }

  getPlayerRepository(): IPlayerRepository {
    if (!this.playerRepository) {
      this.playerRepository = new TauriPlayerRepository();
    }
    return this.playerRepository!;
  }
}

export const getSongRepository = () =>
  ServiceProvider.getInstance().getSongRepository();
export const getPlayerRepository = () =>
  ServiceProvider.getInstance().getPlayerRepository();
