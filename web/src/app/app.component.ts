import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { MediaController } from './services/media.controller';
import { MediaPlayerComponent } from './widgets/media-player/media-player.component';
import { BottomBarComponent } from './widgets/bottom-bar/bottom-bar.component';
import { NavigationHistory } from './services/navigation-history.service';
import { QueueComponent } from './widgets/queue/queue.component';
import { FullPlayerComponent } from './widgets/full-player/full-player.component';
import { BottomBarService } from './services/bottom-bar.service';
import { PlayerViewService } from './services/player-view.service';
import { NoticeService } from './services/notice.service';
import { OfflineService } from './services/offline.service';
import { InstallPromptComponent } from './widgets/install-prompt/install-prompt.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MediaPlayerComponent, BottomBarComponent, QueueComponent, FullPlayerComponent, InstallPromptComponent]
})
export class AppComponent {
  online = navigator.onLine;

  @HostListener('window:online') @HostListener('window:offline')
  updateOnline() {
    this.online = navigator.onLine;
  }

  constructor(
    mediaController: MediaController,
    public playerView: PlayerViewService,
    public notice: NoticeService,
    offline: OfflineService,
    _history: NavigationHistory, // created now so it sees the first navigation
    router: Router,
    bottomBar: BottomBarService
  ){
    mediaController.unveilLastSong();
    offline.messages$.subscribe(message => notice.show(message));
    // Going to another page, or any bottom-bar tap (some switch a list in place), closes the playlist.
    router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => playerView.close());
    bottomBar.selectItem$.subscribe(() => playerView.close());
  }
}
