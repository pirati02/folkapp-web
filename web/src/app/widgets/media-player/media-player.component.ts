import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {MatIconModule} from "@angular/material/icon";
import {MediaController} from "../../services/media.controller";
import {PlayerViewService} from "../../services/player-view.service";

/** The slim player above the bottom bar; tapping the song opens the full-screen player. */
@Component({
  selector: 'app-media-player',
  templateUrl: './media-player.component.html',
  styleUrls: ['./media-player.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule]
})
export class MediaPlayerComponent {
  constructor(public mediaController: MediaController, public playerView: PlayerViewService) {
  }

  get progress(): number {
    const {currentPos, maxPos} = this.mediaController.positionUpdated$.value;
    return maxPos ? currentPos / maxPos * 100 : 0;
  }
}
