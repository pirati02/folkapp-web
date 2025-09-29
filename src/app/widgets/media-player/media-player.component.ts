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

  private repeatTypeKey = 'repeatType';

  repeatType?: RepeatType;

  constructor(
    public mediaController: MediaController
  ) {
    this.repeatType = mediaController.getRepeatType();
  }

  ngOnInit() {
    this.repeatType = localStorage.getItem(this.repeatTypeKey) as RepeatType || "repeat";
    this.mediaController.unveilLastSong();
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
    localStorage.setItem(this.repeatTypeKey, this.repeatType);
  }

  playNext() {
    const currentIndex = this.mediaController.playList.indexOf(this.mediaController.selectedSong!);
    if (currentIndex > -1) {
      const song = this.mediaController.playList[currentIndex + 1];
      if (song) {
        this.mediaController.play(song);
        this.mediaController.selectedSongChanged$.next(song);
      }
    }
  }

  playPrevious() {
    const currentIndex = this.mediaController.playList.indexOf(this.mediaController.selectedSong!);
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
