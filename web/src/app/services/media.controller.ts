import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {RepeatType} from '../models/repeate.type';
import {Song} from '../models/song';
import {MetricsService} from './metrics.service';
import {LibraryService} from './library.service';
import {OfflineService} from './offline.service';
import {LocalStore} from './local-store.service';
import {NoticeService} from './notice.service';

/** A play is counted once this much of a song has been heard, so skipped songs don't count. */
const PLAY_LOG_SECONDS = 30;
/** "Previous" restarts the song instead once this much of it has played. */
const RESTART_SECONDS = 3;

const SONG_KEY = 'selectedSong';
const PLAYLIST_KEY = 'selectedPlaylistKey';
const REPEAT_KEY = 'repeatType';
const SHUFFLE_KEY = 'folkapp.shuffle';
const POSITION_KEY = 'folkapp.position';

/** Pause after some minutes, or when the current song ends. */
export type SleepTimer = {minutes: number, endsAt: number} | {endOfSong: true};

@Injectable({providedIn: 'root'})
export class MediaController {
  private audio = new Audio();
  private positionTimer?: ReturnType<typeof setInterval>;
  private sleepTimeout?: ReturnType<typeof setTimeout>;
  private playLogged = false;
  /** The listener asked for this song to play (not just loaded), so a failure skips to the next. */
  private wantsToPlay = false;
  private failedInARow = 0;
  /** Where to continue a restored song from, once its length is known. */
  private resumeAt = 0;
  /** Songs played in shuffle mode, for "previous". */
  private shuffleHistory: Song[] = [];

  isPlaying = false;
  isInitialized = false;
  playList: Song[] = [];
  selectedSong?: Song;
  repeatType: RepeatType;
  shuffle: boolean;
  sleepTimer?: SleepTimer;
  positionUpdated$ = new BehaviorSubject<{ currentPos: number; maxPos: number }>({currentPos: 0, maxPos: 0});

  get currentIndex(): number {
    return this.playList.findIndex(item => item.id == this.selectedSong?.id);
  }

  constructor(
    private metrics: MetricsService,
    private library: LibraryService,
    private offline: OfflineService,
    private store: LocalStore,
    private notice: NoticeService
  ) {
    this.repeatType = store.get<RepeatType>(REPEAT_KEY, 'repeat');
    this.shuffle = store.get(SHUFFLE_KEY, false);

    this.audio.onplay = () => {
      this.isPlaying = true;
      this.startPositionUpdates();
      this.updatePlaybackState();
      if (this.selectedSong) {
        this.updateMediaMetadata(this.selectedSong);
      }
    };
    this.audio.onplaying = () => this.failedInARow = 0;
    this.audio.onpause = () => {
      this.isPlaying = false;
      this.stopPositionUpdates();
      this.updatePlaybackState();
      this.savePosition();
    };
    this.audio.onloadedmetadata = () => {
      if (this.resumeAt && this.resumeAt < this.audio.duration - 5) {
        this.audio.currentTime = this.resumeAt;
      }
      this.resumeAt = 0;
      this.emitPosition();
    };
    this.audio.ontimeupdate = () => {
      if (this.audio.currentTime >= PLAY_LOG_SECONDS) {
        this.logPlay();
      }
    };
    this.audio.onended = () => {
      this.logPlay(); // songs shorter than PLAY_LOG_SECONDS
      this.stopPositionUpdates();
      this.handleEnded();
    };
    this.audio.onerror = () => this.handleError();

    this.setUpMediaSession();
  }

  /** load + play a song */
  play(song: Song) {
    if (this.shuffle && this.selectedSong && this.selectedSong.id != song.id) {
      this.shuffleHistory.push(this.selectedSong);
    }
    this.prepare(song);
    this.wantsToPlay = true;
    this.library.addRecent(song);
    // Browsers refuse to start audio without a tap first; the play button still works then.
    this.audio.play().catch(() => this.isPlaying = false);
  }

  /** Loads a song into the player without starting it (a restored or shared song). */
  prepare(song: Song) {
    this.selectedSong = song;
    this.playLogged = false;
    this.wantsToPlay = false;
    this.audio.src = this.offline.playbackUrl(song);
    this.audio.load();
    this.positionUpdated$.next({currentPos: 0, maxPos: 0});
    this.isInitialized = true;

    this.store.set(SONG_KEY, song);
    this.store.set(PLAYLIST_KEY, this.playList);
  }

  pause() {
    this.audio.pause();
  }

  resume() {
    this.wantsToPlay = true;
    this.audio.play().catch(() => this.isPlaying = false);
  }

  togglePlay() {
    this.isPlaying ? this.pause() : this.resume();
  }

  /** The next song: in order, shuffled, or back to the start with repeat-all. */
  next() {
    const song = this.upNext(true);
    if (song) {
      this.play(song);
    }
  }

  /** Restarts the song if it has been playing a while, otherwise goes to the one before. */
  previous() {
    if (this.audio.currentTime > RESTART_SECONDS || !this.selectedSong) {
      this.seekTo(0);
      return;
    }
    const song = this.shuffle ? this.shuffleHistory.pop() : this.playList[this.currentIndex - 1];
    if (song) {
      const history = this.shuffleHistory;
      this.play(song);
      this.shuffleHistory = history; // going back must not add to the history
    } else {
      this.seekTo(0);
    }
  }

  seekTo(seconds: number) {
    if (this.audio.duration) {
      this.audio.currentTime = seconds;
    }
    this.emitPosition();
  }

  changeRepeatType(): RepeatType {
    if (this.repeatType === 'repeat') this.repeatType = 'repeat_one';
    else if (this.repeatType === 'repeat_one') this.repeatType = 'repeat_on';
    else this.repeatType = 'repeat';
    this.store.set(REPEAT_KEY, this.repeatType);
    return this.repeatType;
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    this.shuffleHistory = [];
    this.store.set(SHUFFLE_KEY, this.shuffle);
  }

  /** `minutes`, or 'end' for the end of this song, or nothing to cancel. */
  setSleepTimer(choice?: number | 'end') {
    clearTimeout(this.sleepTimeout);
    if (choice === undefined) {
      this.sleepTimer = undefined;
    } else if (choice === 'end') {
      this.sleepTimer = {endOfSong: true};
    } else {
      this.sleepTimer = {minutes: choice, endsAt: Date.now() + choice * 60_000};
      this.sleepTimeout = setTimeout(() => {
        this.sleepTimer = undefined;
        this.pause();
      }, choice * 60_000);
    }
  }

  /** Restores the last song, paused where it was left. */
  unveilLastSong() {
    const song = this.store.get<Song | null>(SONG_KEY, null);
    if (!song) {
      return;
    }
    this.playList = this.store.get<Song[]>(PLAYLIST_KEY, []);
    const saved = this.store.get<{id: string, time: number} | null>(POSITION_KEY, null);
    this.prepare(song);
    this.resumeAt = saved?.id == song.id ? saved.time : 0;
  }

  private upNext(manual: boolean): Song | undefined {
    const list = this.playList;
    if (!list.length) {
      return undefined;
    }
    if (this.shuffle && list.length > 1) {
      const others = list.filter(song => song.id != this.selectedSong?.id);
      return others[Math.floor(Math.random() * others.length)];
    }
    const next = list[this.currentIndex + 1];
    // At the end of the list, wrap around with repeat-all or when skipped by hand.
    return next ?? (this.repeatType === 'repeat_on' || manual ? list[0] : undefined);
  }

  private handleEnded() {
    if (this.sleepTimer && 'endOfSong' in this.sleepTimer) {
      this.sleepTimer = undefined;
      this.isPlaying = false;
      return;
    }
    if (this.repeatType === 'repeat_one' && this.selectedSong) {
      this.play(this.selectedSong);
      return;
    }
    // Without repeat the list plays through once (it used to stop after every song).
    const next = this.upNext(false);
    if (next) {
      this.play(next);
    } else {
      this.audio.currentTime = 0;
      this.isPlaying = false;
      this.emitPosition();
    }
  }

  private handleError() {
    if (!this.wantsToPlay || !this.selectedSong) {
      return; // a restored song that can't load yet; the play button will try again
    }
    this.isPlaying = false;
    this.failedInARow++;
    const offline = !navigator.onLine && !this.offline.isDownloaded(this.selectedSong.id);
    this.notice.show(offline ? 'ეს სიმღერა ინტერნეტის გარეშე არ ისმება' : `„${this.selectedSong.name}“ ვერ ჩაირთო`);
    // Skip to the next one, unless every song in the list has failed in a row.
    if (this.failedInARow < this.playList.length) {
      setTimeout(() => this.next(), 1500);
    }
  }

  private logPlay() {
    const song = this.selectedSong;
    if (this.playLogged || !song) {
      return;
    }
    this.playLogged = true;
    this.metrics.play(song.id);
  }

  private savePosition() {
    if (this.selectedSong) {
      this.store.set(POSITION_KEY, {id: this.selectedSong.id, time: Math.floor(this.audio.currentTime)});
    }
  }

  private emitPosition() {
    this.positionUpdated$.next({currentPos: this.audio.currentTime || 0, maxPos: this.audio.duration || 0});
    this.updatePositionState();
  }

  private startPositionUpdates() {
    this.stopPositionUpdates();
    let ticks = 0;
    this.positionTimer = setInterval(() => {
      this.emitPosition();
      if (++ticks % 10 == 0) {
        this.savePosition(); // every 5s, so a closed app reopens near where it was
      }
    }, 500);
  }

  private stopPositionUpdates() {
    clearInterval(this.positionTimer);
    this.positionTimer = undefined;
  }

  /** Lock screen, notification and headset controls. */
  private setUpMediaSession() {
    if (!('mediaSession' in navigator)) {
      return;
    }
    const session = navigator.mediaSession;
    session.setActionHandler('play', () => this.resume());
    session.setActionHandler('pause', () => this.pause());
    session.setActionHandler('previoustrack', () => this.previous());
    session.setActionHandler('nexttrack', () => this.next());
    try {
      session.setActionHandler('seekto', details => this.seekTo(details.seekTime ?? 0));
    } catch {
      // Older browsers don't support seeking from the lock screen.
    }
  }

  private updateMediaMetadata(song: Song) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.name,
        artist: song.artistName || '',
        album: 'FolkApp',
        artwork: [
          {src: new URL('icons/icon-192.png', document.baseURI).href, sizes: '192x192', type: 'image/png'},
          {src: new URL('icons/icon-512.png', document.baseURI).href, sizes: '512x512', type: 'image/png'}
        ]
      });
    }
  }

  private updatePlaybackState() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
    }
  }

  /** Progress bar on the lock screen and in the notification. */
  private updatePositionState() {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && this.audio.duration) {
      try {
        navigator.mediaSession.setPositionState({
          duration: this.audio.duration,
          playbackRate: 1.0,
          position: Math.min(this.audio.currentTime || 0, this.audio.duration)
        });
      } catch {
        // Some browsers don't support setPositionState.
      }
    }
  }
}
