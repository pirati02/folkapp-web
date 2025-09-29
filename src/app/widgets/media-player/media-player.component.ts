import {Component, OnInit} from "@angular/core";
import {MediaController} from "../../services/media.controller";
import {RepeatType} from "../../models/repeate.type";
import {MatIconModule} from "@angular/material/icon";
import {CommonModule} from "@angular/common";

@Component({
  selector: 'app-media-player',
  templateUrl: './media-player.component.html',
  styleUrls: ['./media-player.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule]
})
export class MediaPlayerComponent implements OnInit {

  repeatType?: RepeatType;

  constructor(
    public mediaController: MediaController
  ) {
  }

  ngOnInit() {
    this.mediaController.loadRepeatMode();
    this.mediaController.unveilLastSong();
    this.repeatType = this.mediaController.getRepeatType();
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
}
