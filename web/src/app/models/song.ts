import { SongType } from "./song.type";

export interface Song {
  id: string;
  name: string;
  songType: SongType;
  artistName: string;
  artistId: string;
  path: string;
  isSelected: boolean;
}