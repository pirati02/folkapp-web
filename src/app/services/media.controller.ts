import { Injectable } from "@angular/core";
import { Song } from "../models/song";
import { RepeatType } from "../models/repeate.type";
import { BehaviorSubject } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class MediaController {
    private repeatKey = '__repeate_key';
    public selectedSong?: Song;
    isPlaying: boolean = false;
    playList: Song[] = [];
    private currentIndex = 0;

    private audioElement?: HTMLAudioElement;
    public selectedSongChanged$: BehaviorSubject<Song> = new BehaviorSubject<Song>(this.selectedSong!);

    constructor() {
        setTimeout(() => {
            this.audioElement = document.getElementById('audio-element') as HTMLAudioElement;
            this.audioElement?.addEventListener("ended", () => {
                const repeateType = this.getRepeatType();
                switch(repeateType){
                    case "repeat": break;
                    case "repeat_one": {
                        this.audioElement?.load();
                        break;
                    }
                    case "repeat_on": {
                        if(this.currentIndex == this.playList.length - 1){
                            this.currentIndex = 0;
                        } else {
                            this.currentIndex++;
                        }
                        const newSong = this.playList[this.currentIndex];
                        this.play(newSong); 
                        this.selectedSongChanged$.next(newSong);
                        break;
                    }
                }
            });
        }, 100);
    }
 
    play(song: Song) {
        this.selectedSong = song;
        this.currentIndex = this.playList.indexOf(song);
        this.isPlaying = true;
    }

    pause() {
        this.audioElement?.pause();
        this.isPlaying = false;
    }

    resume() {
        this.audioElement?.play();
        this.isPlaying = true;
    }

    changeRepeateType(): RepeatType {
        const repeateType = (localStorage.getItem(this.repeatKey) as any as RepeatType) || 'repeat';
        let nextRepeatType: RepeatType;
        switch(repeateType){
           case 'repeat': nextRepeatType = 'repeat_one'; break;
           case 'repeat_on': nextRepeatType = 'repeat'; break;
           case 'repeat_one': nextRepeatType = 'repeat_on'; break;
        }
        localStorage.setItem(this.repeatKey, nextRepeatType.toString());
        return nextRepeatType;
    }

    getRepeatType(): RepeatType {
        return (localStorage.getItem(this.repeatKey) as any as RepeatType) || 'repeat';
    }
}