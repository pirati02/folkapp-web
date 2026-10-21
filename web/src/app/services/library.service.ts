import {Injectable} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import {Song} from "../models/song";
import {LocalStore} from "./local-store.service";

const FAVORITES_KEY = 'folkapp.favorites';
const RECENT_KEY = 'folkapp.recent';
const MAX_RECENT = 50;

/**
 * The listener's own songs, kept on this device (there are no accounts): favourites and recently
 * played. Each song is stored whole, so these lists show without the network.
 */
@Injectable({providedIn: 'root'})
export class LibraryService {
  readonly favorites$: BehaviorSubject<Song[]>;
  readonly recent$: BehaviorSubject<Song[]>;

  constructor(private store: LocalStore) {
    this.favorites$ = new BehaviorSubject(store.get<Song[]>(FAVORITES_KEY, []));
    this.recent$ = new BehaviorSubject(store.get<Song[]>(RECENT_KEY, []));
  }

  isFavorite(id: string): boolean {
    return this.favorites$.value.some(song => song.id == id);
  }

  toggleFavorite(song: Song) {
    const favorites = this.favorites$.value;
    const next = this.isFavorite(song.id)
      ? favorites.filter(item => item.id != song.id)
      : [snapshot(song), ...favorites];
    this.save(this.favorites$, FAVORITES_KEY, next);
    if (next.length > favorites.length) {
      // Safari may clear a site's data after a week unused unless the browser is asked to keep it.
      navigator.storage?.persist?.().catch(() => {});
    }
  }

  addRecent(song: Song) {
    const next = [snapshot(song), ...this.recent$.value.filter(item => item.id != song.id)].slice(0, MAX_RECENT);
    this.save(this.recent$, RECENT_KEY, next);
  }

  clearRecent() {
    this.save(this.recent$, RECENT_KEY, []);
  }

  private save(subject: BehaviorSubject<Song[]>, key: string, songs: Song[]) {
    this.store.set(key, songs);
    subject.next(songs);
  }
}

/** Only the song's own fields, not list state such as `isSelected`. */
function snapshot({id, name, songType, artistName, artistId, path}: Song): Song {
  return <Song>{id, name, songType, artistName, artistId, path};
}
