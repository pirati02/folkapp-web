import { CommonModule } from '@angular/common';
import {Component} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MediaController } from './services/media.controller';
import { MediaPlayerComponent } from './widgets/media-player/media-player.component';
import { BottomBarComponent } from './widgets/bottom-bar/bottom-bar.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MediaPlayerComponent, BottomBarComponent]
})
export class AppComponent {

  constructor(
    public mediaController: MediaController
  ){
  }
}
