import { Song } from './Song';

export interface Album {
  name: string;
  artist: string;
  songs: Song[];
  artwork?: string;
  year?: number;
}
