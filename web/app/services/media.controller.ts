import {Injectable} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import {RepeatType} from '../models/repeate.type';
import {Song} from '../models/song';
import {Artist} from '../models/artist';

@Injectable({providedIn: 'root'})
export class MediaController {
  private selectedSongKey = 'selectedSong';
  private selectedPlaylistKey = 'selectedPlaylistKey';
  private repeatTypeKey = 'repeatType';

  private audio = new Audio();
  private positionTimer?: any;

  /** playback state */
  isPlaying = false;
  isInitialized = false;

  /** playlist + current song */
  playList: Song[] = [];
  selectedSong?: Song;
  selectedArtist?: Artist;

  /** state streams */
  selectedSongChanged$ = new Subject<Song>();
  repeatType: RepeatType = 'repeat';
  positionUpdated$ = new BehaviorSubject<{ currentPos: number; maxPos: number }>({
    currentPos: 0,
    maxPos: 0
  });

  get currentIndex(): number {
    return this.playList.findIndex(item => item.id == this.selectedSong?.id);
  }

  get playerPosition(): number {
    return this.audio.currentTime || 0;
  }

  constructor() {
    this.audio.onplay = () => {
      this.isPlaying = true;
      this.updatePlaybackState();
    };
    this.audio.onpause = () => {
      this.isPlaying = false;
      this.updatePlaybackState();
    };
    this.audio.onended = () => this.handleEnded();
  }

  /** load + play a song */
  play(song: Song) {
    this.selectedSong = song;
    this.audio.src = song.path;
    this.audio.load();
    this.audio.play().then();

    this.audio.onplay = () => {
      this.isPlaying = true;
      this.startPositionUpdates();
      this.updatePlaybackState();
      this.updateMediaMetadata(song);
    };

    this.audio.onpause = () => {
      this.isPlaying = false;
      this.stopPositionUpdates();
      this.updatePlaybackState();
    };

    this.audio.onended = () => {
      this.stopPositionUpdates();
      this.handleEnded();
    };

    this.isInitialized = true;
    this.selectedSongChanged$.next(song);

    localStorage.setItem(this.selectedSongKey, JSON.stringify(song));
    localStorage.setItem(this.selectedPlaylistKey, JSON.stringify(this.playList));
  }

  pause() {
    this.audio.pause();
    this.updatePlaybackState();
  }

  resume() {
    this.audio.play();
    this.updatePlaybackState();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    this.updatePlaybackState();
  }

  /** user scrubbed the seek bar */
  seekTo(seconds: number) {
    if (this.audio.duration) {
      this.audio.currentTime = seconds;
    }

    this.positionUpdated$.next({
      currentPos: seconds,
      maxPos: this.audio.duration || 0
    });

    this.updatePositionState();
  }

  /** repeat logic */
  getRepeatType(): RepeatType {
    return this.repeatType;
  }

  changeRepeatType(): RepeatType {
    if (this.repeatType === 'repeat') this.repeatType = 'repeat_one';
    else if (this.repeatType === 'repeat_one') this.repeatType = 'repeat_on';
    else this.repeatType = 'repeat';

    this.cacheRepeatType(this.repeatType);
    return this.repeatType;
  }

  unveilLastSong() {
    const songString = localStorage.getItem(this.selectedSongKey);
    if (songString) {
      const song = JSON.parse(songString) as Song;
      this.selectedSong = song;
      this.playList = JSON.parse(localStorage.getItem(this.selectedPlaylistKey)!) as Song[];
      this.play(song);
      return true;
    }
    return false;
  }

  loadRepeatMode() {
    this.repeatType = (localStorage.getItem(this.repeatTypeKey) as RepeatType) || 'repeat';
  }

  cacheRepeatType(repeatType: RepeatType) {
    localStorage.setItem(this.repeatTypeKey, repeatType);
  }

  /** handle end of song */
  private handleEnded() {
    if (this.repeatType === 'repeat_one' && this.selectedSong) {
      this.play(this.selectedSong);
    } else if (this.repeatType === 'repeat_on') {
      const idx = this.playList.indexOf(this.selectedSong!);
      const next = this.playList[(idx + 1) % this.playList.length];
      this.play(next);
    } else {
      this.stop();
    }
  }

  private startPositionUpdates() {
    this.stopPositionUpdates();
    this.positionTimer = setInterval(() => {
      this.positionUpdated$.next({
        currentPos: this.audio.currentTime,
        maxPos: this.audio.duration || 0
      });
      this.updatePositionState();
    }, 500);
  }

  private stopPositionUpdates() {
    if (this.positionTimer) {
      clearInterval(this.positionTimer);
      this.positionTimer = undefined;
    }
  }

  /** Update metadata (shown on lock screen / car / etc.) */
  private updateMediaMetadata(song: Song) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.name,
        artist: song.artistName || '',
        // @ts-ignore
        album: song['albumName'] || '',
        artwork: [
          {
            // @ts-ignore
            src: song['coverPath'] || 'assets/default-cover.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      });
    }
  }

  /** Sync current playback state */
  private updatePlaybackState() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
    }
  }

  /** Sync progress bar in system media UI (Android lock screen, etc.) */
  private updatePositionState() {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: this.audio.duration || 0,
          playbackRate: 1.0,
          position: this.audio.currentTime || 0
        });
      } catch {
        // Some browsers may not support setPositionState
      }
    }
  }
}
