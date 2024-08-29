import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import { Artist } from "../../models/artist";
import { map } from "rxjs";
import { Song } from "../../models/song";
import { SongsService } from "../../services/songs.service";
import { SongType } from "../../models/song-type";
import { MediaController } from "../../services/media.controller";

@Component({
    selector: 'app-artist',
    templateUrl: './artist.component.html',
    styleUrls: ['./artist.component.scss']
})
export class ArtistComponent implements OnChanges {
    
    @Input() artist?: Artist;
    songs: Song[] = [];
    chants: Song[] = [];
    songType: SongType = SongType.Song;
    selectedSong?: Song;

    constructor(
        private songService: SongsService,
        private mediaController: MediaController
    ){
        
    }
    ngOnChanges(changes: SimpleChanges): void {
        this.loadSongs();
    }
 
    loadSongs(){
        const response = this.songService.songsByArtistId(this.artist?.id!);
        response.pipe(
            map(items => this.songs = items.songs)
        ).subscribe();

        response.pipe(
            map(items => this.chants = items.chants)
        ).subscribe();
    }

    filterSongs(songType: SongType) {
        this.songType = songType;
    }

    selectSong(song: Song){
        this.songs.filter(item => item.id != song.id)
                  .forEach(item => item.isSelected = false);
        this.chants.filter(item => item.id != song.id)
                  .forEach(item => item.isSelected = false);

        song!.isSelected = true;
        this.selectedSong = song!;

        const playList = this.songType == SongType.Song ? this.songs: this.chants;
        this.mediaController.playList = playList;
        this.mediaController.play(song);
    }
}