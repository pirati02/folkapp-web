import {Component, OnInit} from "@angular/core";
import {MediaController} from "../../services/media.controller";
import {RepeatType} from "../../models/repeate.type";
import {MatIconModule} from "@angular/material/icon";
import {CommonModule} from "@angular/common";
import {SongsService} from "../../services/songs.service";

@Component({
  selector: 'app-media-player',
  templateUrl: './media-player.component.html',
  styleUrls: ['./media-player.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule]
})
export class MediaPlayerComponent implements OnInit {

  repeatType?: RepeatType;

  get canShare(): boolean {
    return !!navigator.share;
  }

  constructor(
    public mediaController: MediaController,
    private songsService: SongsService
  ) {
  }

  ngOnInit() {
    this.mediaController.loadRepeatMode();
    this.mediaController.unveilLastSong();
    this.repeatType = this.mediaController.getRepeatType();


    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.mediaController.resume());
      navigator.mediaSession.setActionHandler('pause', () =>  this.mediaController.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
    }
  }

  playOrPause() {
    if (this.mediaController.isPlaying) {
      this.mediaController.pause();
      return;
    }

    this.mediaController.resume();
  }

  changeRepeatType() {
    this.repeatType = this.mediaController.changeRepeatType();
  }

  playNext() {
    const currentIndex = this.mediaController.currentIndex;
    if (currentIndex > -1) {
      const song = this.mediaController.playList[currentIndex + 1];
      if (song) {
        this.mediaController.play(song);
        this.mediaController.selectedSongChanged$.next(song);
      }
    }
  }

  playPrevious() {
    const currentIndex = this.mediaController.currentIndex;
    if (currentIndex > -1) {
      const song = this.mediaController.playList[currentIndex - 1];
      if (song) {
        this.mediaController.play(song);
        this.mediaController.selectedSongChanged$.next(song);
      }
    }
  }

  rewind(event: Event) {
    const input = event.target as HTMLInputElement;
    const newPosition = Number(input.value);
    this.mediaController.seekTo(newPosition);
  }

  share() {
    const song = this.mediaController.selectedSong!;
    this.songsService.share(song.id).subscribe(shortUrl => {
      navigator.share({
        title: song.name,
        text: song.name + ' ' + song.artistName,
        url: shortUrl
      })
        .then(() => console.log('Shared successfully!'))
        .catch((error) => console.error('Share failed:', error));
    })
  }
}
