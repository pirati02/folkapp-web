import { Component } from "@angular/core";
import { MediaController } from "../../services/media.controller";
import { RepeatType } from "../../models/repeate.type";

@Component({
    selector: 'app-media-player',
    templateUrl: './media-player.component.html',
    styleUrls: ['./media-player.component.scss']
})
export class MediaPlayerComponent {

    repeatType?: RepeatType;
    
    constructor(
        public mediaController: MediaController
    ){
        this.repeatType = mediaController.getRepeatType();
    }

    playOrPause() {
        if(this.mediaController.isPlaying){
            this.mediaController.pause();
            return;
        }

        this.mediaController.resume();
    }

    changeRepeateType() {
        this.repeatType = this.mediaController.changeRepeateType()
    }
}