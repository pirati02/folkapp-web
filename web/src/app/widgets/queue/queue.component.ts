import {AfterViewInit, Component, ElementRef, EventEmitter, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {Song} from '../../models/song';
import {MediaController} from '../../services/media.controller';
import {SongListComponent} from '../song-list/song-list.component';

/** The songs the player goes through, opened from the player; tapping one plays it. */
@Component({
  selector: 'app-queue',
  templateUrl: './queue.component.html',
  styleUrls: ['./queue.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, SongListComponent]
})
export class QueueComponent implements AfterViewInit {
  @Output() closed = new EventEmitter<void>();

  constructor(public mediaController: MediaController, private element: ElementRef<HTMLElement>) {
  }

  get songs(): Song[] {
    const {playList, selectedSong} = this.mediaController;
    // A song restored without its list still shows on its own.
    return playList.length ? playList : selectedSong ? [selectedSong] : [];
  }

  ngAfterViewInit() {
    const id = this.mediaController.selectedSong?.id;
    this.element.nativeElement.querySelector('#song-' + id)?.scrollIntoView({block: 'center'});
  }

  play(song: Song) {
    this.mediaController.play(song);
  }
}
