import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatListModule} from '@angular/material/list';
import {MatDividerModule} from '@angular/material/divider';
import {Song} from '../../models/song';
import {HighlightPipe} from '../../shared/highlight.pipe';

/** A list of songs; the one playing is marked, and `highlight` emphasises a search term. */
@Component({
  selector: 'app-song-list',
  templateUrl: './song-list.component.html',
  styleUrls: ['./song-list.component.scss'],
  standalone: true,
  imports: [CommonModule, MatListModule, MatDividerModule, HighlightPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongListComponent {
  @Input() songs: Song[] = [];
  @Input() activeId?: string;
  @Input() highlight?: string | null;
  /** Show each song's ensemble under its name (for lists mixing ensembles, like search). */
  @Input() showArtist = false;
  @Output() songSelected = new EventEmitter<Song>();

  trackById = (_: number, song: Song) => song.id;
}
