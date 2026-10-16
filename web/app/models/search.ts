import {Song} from "./song";
import {Artist} from "./artist";

export interface SearchResult {
  artists: Artist[]
  songs: Song[]
}
