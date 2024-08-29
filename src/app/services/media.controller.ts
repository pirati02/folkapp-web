import { Injectable } from "@angular/core";
import { Song } from "../models/song";

@Injectable({
    providedIn: 'root'
})
export class MediaController {
    
    public selectedSong?: Song;
    playList: Song[] = [];

    play(song: Song) {
        this.selectedSong = song;
    }
}