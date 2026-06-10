import { Song } from "../entities/Song";

export interface ISongRepository {
  getAllSongs(): Promise<Song[]>;
  getSongById(id: string): Promise<Song | null>;
  searchSongs(query: string): Promise<Song[]>;
  getSongsByGenre(genre: string): Promise<Song[]>;
  getSongsByArtist(artist: string): Promise<Song[]>;
  getSongsByAlbum(album: string): Promise<Song[]>;
}
