import {Component, OnInit} from "@angular/core";
import {MediaController} from "../../services/media.controller";
import {RepeatType} from "../../models/repeate.type";
import {MatIconModule} from "@angular/material/icon";
import {CommonModule} from "@angular/common";
import {SongsService} from "../../services/songs.service";
import {LibraryService} from "../../services/library.service";
import {OfflineService} from "../../services/offline.service";
import {Song} from "../../models/song";

@Component({
  selector: 'app-media-player',
  templateUrl: './media-player.component.html',
  styleUrls: ['./media-player.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule]
})
export class MediaPlayerComponent implements OnInit {

  repeatType?: RepeatType;
  /** Short message shown over the player, e.g. after copying a link. */
  notice?: string;
  private noticeTimer?: ReturnType<typeof setTimeout>;

  constructor(
    public mediaController: MediaController,
    private songsService: SongsService,
    public library: LibraryService,
    public offline: OfflineService
  ) {
    offline.messages$.subscribe(message => this.notify(message));
  }

  ngOnInit() {
    this.mediaController.loadRepeatMode();
    this.mediaController.unveilLastSong();
    this.repeatType = this.mediaController.getRepeatType();


    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.mediaController.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.mediaController.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
    }
  }

  toggleDownload(song: Song) {
    if (this.offline.isDownloaded(song.id)) {
      this.offline.remove(song.id).then(() => this.notify('წაიშალა მოწყობილობიდან'));
    } else if (!this.offline.isPending(song.id)) {
      this.offline.download(song);
      this.notify('გადმოიწერება…');
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
    if (this.mediaController.playerPosition > 3) {
      const song = this.mediaController.selectedSong;
      if (song) {
        this.mediaController.play(song);
        this.mediaController.selectedSongChanged$.next(song);
      }
      return;
    }

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
    this.songsService.share(song.id).subscribe({
      next: url => {
        if (navigator.share) {
          // Rejects when the person closes the share sheet; nothing to report then.
          navigator.share({title: song.name, text: song.name + ' — ' + song.artistName, url}).catch(() => {});
          return;
        }
        // Desktop browsers have no share sheet: copy the link instead.
        navigator.clipboard.writeText(url).then(
          () => this.notify('ბმული დაკოპირდა'),
          () => this.notify(url)
        );
      },
      error: () => this.notify('ბმულის შექმნა ვერ მოხერხდა')
    });
  }

  private notify(message: string) {
    this.notice = message;
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.notice = undefined, 2500);
  }
}
