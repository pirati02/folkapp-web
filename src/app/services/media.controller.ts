import {Injectable} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import {RepeatType} from '../models/repeate.type';
import {Song} from '../models/song';
import {Artist} from '../models/artist';


@Injectable({providedIn: 'root'})
export class MediaController {
  private selectedSongKey = 'selectedSong';
  private selectedPlaylistKey = 'selectedPlaylistKey';
  private audio = new Audio();

  /** playback state */
  isPlaying = false;
  isInitialized = false;

  /** playlist + current song */
  playList: Song[] = [];
  selectedSong?: Song;
  selectedArtist?: Artist;

  /** state streams */
  selectedSongChanged$ = new Subject<Song>();
  repeatType: RepeatType = 'repeat'; // adjust your enum
  positionUpdated$ = new BehaviorSubject<{ currentPos: number; maxPos: number }>({
    currentPos: 0,
    maxPos: 0
  });

  constructor() {
    this.audio.onplay = () => {
      this.isPlaying = true;
    };
    this.audio.onpause = () => {
      this.isPlaying = false;
    };
    this.audio.onended = () => this.handleEnded();
  }

  /** load + play a song */
  play(song: Song) {
    this.selectedSong = song;
    this.audio.src = song.path;
    this.audio.load();
    this.audio.play();
    this.isInitialized = true;
    this.selectedSongChanged$.next(song);
    localStorage.setItem(this.selectedSongKey, JSON.stringify(song));
    localStorage.setItem(this.selectedPlaylistKey, JSON.stringify(this.playList));
  }

  pause() {
    this.audio.pause();
  }

  resume() {
    this.audio.play();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
  }

  /** user scrubbed the seek bar */
  seekTo(seconds: number) {
    if (this.audio.duration) {
      this.audio.currentTime = seconds;  // just move the playhead
    }

    this.positionUpdated$.next({
      currentPos: seconds,
      maxPos: this.audio.duration || 0
    });
  }

  /** repeat logic */
  getRepeatType(): RepeatType {
    return this.repeatType;
  }

  changeRepeatType(): RepeatType {
    // cycle through repeat types
    if (this.repeatType === 'repeat') this.repeatType = 'repeat_one';
    else if (this.repeatType === 'repeat_one') this.repeatType = 'repeat_on';
    else this.repeatType = 'repeat';

    return this.repeatType;
  }

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

  unveilLastSong() {
    const songString = localStorage.getItem(this.selectedSongKey);
    if (songString) {
      const song = JSON.parse(songString) as Song;
      this.playList = JSON.parse(localStorage.getItem(this.selectedPlaylistKey)!) as Song[];
      this.play(song);
      return true;
    }

    return false;
  }
}
