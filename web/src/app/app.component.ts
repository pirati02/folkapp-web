import { CommonModule } from '@angular/common';
import {Component, HostListener} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { QueueComponent } from './widgets/queue/queue.component';
import { BottomBarService } from './services/bottom-bar.service';
import { RouterOutlet } from '@angular/router';
import { MediaController } from './services/media.controller';
import { MediaPlayerComponent } from './widgets/media-player/media-player.component';
import { BottomBarComponent } from './widgets/bottom-bar/bottom-bar.component';
import { NavigationHistory } from './services/navigation-history.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MediaPlayerComponent, BottomBarComponent, QueueComponent]
})
export class AppComponent {
  online = navigator.onLine;
  /** The playlist, opened from the player over the current page. */
  queueOpen = false;

  @HostListener('window:online') @HostListener('window:offline')
  updateOnline() {
    this.online = navigator.onLine;
  }

  constructor(
    public mediaController: MediaController,
    _history: NavigationHistory, // created now so it sees the first navigation
    router: Router,
    bottomBar: BottomBarService
  ){
    // Going to another page, or any bottom-bar tap (some switch a list in place), closes the playlist.
    router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => this.queueOpen = false);
    bottomBar.selectItem$.subscribe(() => this.queueOpen = false);
  }
}
