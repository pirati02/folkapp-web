import {Component, HostListener} from "@angular/core";
import {CommonModule} from "@angular/common";
import {Router} from "@angular/router";
import {MatIconModule} from "@angular/material/icon";
import {MediaController} from "../../services/media.controller";
import {PlayerViewService} from "../../services/player-view.service";
import {LibraryService} from "../../services/library.service";
import {OfflineService} from "../../services/offline.service";
import {SongsService} from "../../services/songs.service";
import {NoticeService} from "../../services/notice.service";
import {Song} from "../../models/song";
import {TimePipe} from "../../shared/time.pipe";

const REPEAT_LABELS: Record<string, string> = {
  repeat: 'გამეორება გამორთულია',
  repeat_one: 'ერთი სიმღერის გამეორება',
  repeat_on: 'სიის გამეორება'
};

/** The full-screen player, opened from the mini player. */
@Component({
  selector: 'app-full-player',
  templateUrl: './full-player.component.html',
  styleUrls: ['./full-player.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, TimePipe]
})
export class FullPlayerComponent {
  sleepMenuOpen = false;
  readonly sleepChoices: {label: string, value: number | 'end'}[] = [
    {label: '15 წუთში', value: 15},
    {label: '30 წუთში', value: 30},
    {label: '1 საათში', value: 60},
    {label: 'სიმღერის ბოლოს', value: 'end'}
  ];

  constructor(
    public mediaController: MediaController,
    public playerView: PlayerViewService,
    public library: LibraryService,
    public offline: OfflineService,
    private songsService: SongsService,
    private notice: NoticeService,
    private router: Router
  ) {
  }

  @HostListener('document:keydown.escape')
  close() {
    this.playerView.close();
  }

  get repeatLabel(): string {
    return REPEAT_LABELS[this.mediaController.repeatType];
  }

  /** What the sleep button says while a timer runs, e.g. "23 წთ". */
  get sleepLabel(): string | undefined {
    const timer = this.mediaController.sleepTimer;
    if (!timer) return undefined;
    if ('endOfSong' in timer) return 'ბოლოს';
    return `${Math.max(1, Math.ceil((timer.endsAt - Date.now()) / 60_000))} წთ`;
  }

  seek(event: Event) {
    this.mediaController.seekTo(Number((event.target as HTMLInputElement).value));
  }

  setSleep(choice?: number | 'end') {
    this.mediaController.setSleepTimer(choice);
    this.sleepMenuOpen = false;
    this.notice.show(choice === undefined ? 'ტაიმერი გამოირთო' : 'დაკვრა შეჩერდება ' +
      this.sleepChoices.find(item => item.value === choice)!.label);
  }

  openArtist(song: Song) {
    this.router.navigate(['/artist', song.artistId]).then();
    this.playerView.close();
  }

  toggleDownload(song: Song) {
    if (this.offline.isDownloaded(song.id)) {
      this.offline.remove(song.id).then(() => this.notice.show('წაიშალა მოწყობილობიდან'));
    } else if (!this.offline.isPending(song.id)) {
      this.offline.download(song);
      this.notice.show('გადმოიწერება…');
    }
  }

  share(song: Song) {
    this.songsService.share(song.id).subscribe({
      next: url => {
        if (navigator.share) {
          // Rejects when the person closes the share sheet; nothing to report then.
          navigator.share({title: song.name, text: song.name + ' — ' + song.artistName, url}).catch(() => {});
          return;
        }
        // Desktop browsers have no share sheet: copy the link instead.
        navigator.clipboard.writeText(url).then(
          () => this.notice.show('ბმული დაკოპირდა'),
          () => this.notice.show(url)
        );
      },
      error: () => this.notice.show('ბმულის შექმნა ვერ მოხერხდა')
    });
  }
}
