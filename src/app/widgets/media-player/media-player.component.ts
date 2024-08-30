import { Component } from "@angular/core";
import { MediaController } from "../../services/media.controller";

@Component({
    selector: 'app-media-player',
    templateUrl: './media-player.component.html',
    styleUrls: ['./media-player.component.scss']
})
export class MediaPlayerComponent {
    constructor(private mediaPlayerController: MediaController){
        
    }
}