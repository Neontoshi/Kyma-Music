import { Song } from '../entities/Song';

export interface ILibraryRepository {
  scanFolder(path: string): Promise<Song[]>;
  getMetadata(filePath: string): Promise<Partial<Song>>;
  getAlbumArt(filePath: string): Promise<string | null>;
  getRecentSongs(limit: number): Promise<Song[]>;
}
