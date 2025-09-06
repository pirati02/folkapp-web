import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { RepeatType } from '../models/repeate.type';
import { Song } from '../models/song';
import { Artist } from '../models/artist';
 

@Injectable({ providedIn: 'root' })
export class MediaController {
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
  timeUpdated$ = new BehaviorSubject<string>('00:00');

  constructor() {
    // Update position as audio plays
    this.audio.ontimeupdate = () => {
      const current = this.audio.currentTime;
      const duration = this.audio.duration || 0;

      this.positionUpdated$.next({ currentPos: current, maxPos: duration });
      this.timeUpdated$.next(this.formatTime(current));
    };

    this.audio.onplay = () => { this.isPlaying = true; };
    this.audio.onpause = () => { this.isPlaying = false; };
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
  }

  pause() { this.audio.pause(); }
  resume() { this.audio.play(); }

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

  /** total duration in seconds */
  getDuration(): number {
    return this.audio.duration || 0;
  }

  /** repeat logic */
  getRepeatType(): RepeatType {
    return this.repeatType;
  }

  changeRepeateType(): RepeatType {
    // cycle through repeat types
    if (this.repeatType === 'repeat') this.repeatType = 'repeat_one';
    else if (this.repeatType === 'repeat_one') this.repeatType = 'repeat_on';
    else this.repeatType = 'repeat';

    return this.repeatType;
  }

  /** called when track ends */
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

  private formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }
}
