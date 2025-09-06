import { Component } from "@angular/core";
import { MediaController } from "../../services/media.controller";
import { RepeatType } from "../../models/repeate.type";
import { MatIconModule } from "@angular/material/icon";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-media-player',
    templateUrl: './media-player.component.html',
    styleUrls: ['./media-player.component.scss'],
    standalone: true,
    imports: [CommonModule, MatIconModule]
})
export class MediaPlayerComponent {

    isExpanded = false;
    repeatType?: RepeatType;

    get seconds(): string {
        let seconds = this.mediaController.getDuration();
        seconds %= 3600;
        let minutes = Math.floor(seconds / 60);
        let secs = Math.floor(seconds % 60);

        return [minutes, secs]
            .map(v => v < 10 ? '0' + v : v)
            .filter((v, i) => v !== '00' || i > 0)
            .join(':');
    }

    constructor(
        public mediaController: MediaController
    ) {
        this.repeatType = mediaController.getRepeatType();
    }

    playOrPause() {
        if (this.mediaController.isPlaying) {
            this.mediaController.pause();
            return;
        }

        this.mediaController.resume();
    }

    stop() {
        this.mediaController.stop();
    }

    changeRepeateType() {
        this.repeatType = this.mediaController.changeRepeateType()
    }

    expand() {
        if (this.mediaController.isPlaying) {
            this.isExpanded = true;
        }
    }
    playNext() {
        
    }
}