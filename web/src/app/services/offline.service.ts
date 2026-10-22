import {Inject, Injectable} from "@angular/core";
import {BehaviorSubject, Subject} from "rxjs";
import {Song} from "../models/song";
import {LocalStore} from "./local-store.service";
import {MetricsService} from "./metrics.service";

/** Must match AUDIO_CACHE in public/sw.js, which plays the files from it. */
const AUDIO_CACHE = 'folkapp-audio-v1';
const DOWNLOADS_KEY = 'folkapp.downloads';
/** Songs downloaded at the same time; the API streams them from Google Drive, which is slow. */
const PARALLEL_DOWNLOADS = 2;

export interface DownloadedSong {
  song: Song;
  /** Bytes. */
  size: number;
}

/**
 * Saves songs on the device for offline listening: the file goes into the browser's Cache
 * Storage under the song's stream URL, and the service worker (public/sw.js) plays it from there.
 */
@Injectable({providedIn: 'root'})
export class OfflineService {
  /** Needs Cache Storage and a service worker (production builds over https or localhost). */
  readonly supported = typeof caches !== 'undefined' && 'serviceWorker' in navigator;

  readonly downloads$: BehaviorSubject<DownloadedSong[]>;
  /** Songs being downloaded: id → progress 0–1, or -1 while the size is unknown. */
  readonly active$ = new BehaviorSubject<Record<string, number>>({});
  /** Messages for the listener, e.g. a failed download. */
  readonly messages$ = new Subject<string>();

  private queue: Song[] = [];
  private running = 0;

  constructor(
    @Inject('BASE_URL') private baseUrl: string,
    private store: LocalStore,
    private metrics: MetricsService
  ) {
    this.downloads$ = new BehaviorSubject(store.get<DownloadedSong[]>(DOWNLOADS_KEY, []));
  }

  isDownloaded(id: string): boolean {
    return this.downloads$.value.some(item => item.song.id == id);
  }

  isPending(id: string): boolean {
    return id in this.active$.value || this.queue.some(song => song.id == id);
  }

  /** What the player should load: downloaded songs are marked so the service worker answers them. */
  playbackUrl(song: Song): string {
    if (!this.supported || !this.isDownloaded(song.id)) {
      return song.path;
    }
    return song.path + (song.path.includes('?') ? '&' : '?') + 'offline=1';
  }

  download(song: Song) {
    this.downloadAll([song]);
  }

  downloadAll(songs: Song[]) {
    if (!this.supported) {
      return;
    }
    const added = songs.filter(song => !this.isDownloaded(song.id) && !this.isPending(song.id));
    this.queue.push(...added);
    this.setProgress(...added.map(song => [song.id, 0] as const));
    this.next();
  }

  async remove(id: string) {
    const item = this.downloads$.value.find(download => download.song.id == id);
    if (item) {
      await caches.open(AUDIO_CACHE).then(cache => cache.delete(item.song.path)).catch(() => {});
    }
    this.saveList(this.downloads$.value.filter(download => download.song.id != id));
  }

  async removeAll() {
    await caches.delete(AUDIO_CACHE).catch(() => {});
    this.saveList([]);
  }

  private next() {
    while (this.running < PARALLEL_DOWNLOADS && this.queue.length) {
      const song = this.queue.shift()!;
      this.running++;
      this.fetchSong(song)
        .catch(error => {
          this.messages$.next(error?.name === 'QuotaExceededError'
            ? 'მოწყობილობაზე ადგილი აღარ არის'
            : `„${song.name}“ ვერ გადმოიწერა`);
        })
        .finally(() => {
          this.running--;
          this.clearProgress(song.id);
          this.next();
        });
    }
  }

  private async fetchSong(song: Song) {
    const response = await fetch(`${this.baseUrl}/songs/${song.id}/file`);
    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Read it in chunks so the list can show progress.
    const total = Number(response.headers.get('content-length')) || 0;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      chunks.push(chunk.value);
      received += chunk.value.length;
      this.setProgress([song.id, total ? received / total : -1]);
    }

    const type = response.headers.get('content-type') || 'audio/mpeg';
    const blob = new Blob(chunks, {type});
    const cache = await caches.open(AUDIO_CACHE);
    await cache.put(song.path, new Response(blob, {
      headers: {'Content-Type': type, 'Content-Length': String(blob.size)}
    }));

    const {id, name, songType, artistName, artistId, path} = song;
    this.saveList([...this.downloads$.value, {song: <Song>{id, name, songType, artistName, artistId, path}, size: blob.size}]);
    this.metrics.download(song.id);
    // Downloads are lost if the browser clears the site's data; ask it not to.
    navigator.storage?.persist?.().catch(() => {});
  }

  private saveList(list: DownloadedSong[]) {
    this.store.set(DOWNLOADS_KEY, list);
    this.downloads$.next(list);
  }

  private setProgress(...entries: (readonly [string, number])[]) {
    this.active$.next({...this.active$.value, ...Object.fromEntries(entries)});
  }

  private clearProgress(id: string) {
    const {[id]: _, ...rest} = this.active$.value;
    this.active$.next(rest);
  }
}
