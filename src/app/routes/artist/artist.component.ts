import { Component } from "@angular/core";
import { Artist } from "../../models/artist";
import { map, skip, tap } from "rxjs";
import { Song } from "../../models/song";
import { SongsService } from "../../services/songs.service";
import { SongType } from "../../models/song.type";
import { MediaController } from "../../services/media.controller";
import { ActivatedRoute, Router } from "@angular/router";
import { ArtistsService } from "../../services/artists.service";
import { BottomBarItem } from "../../widgets/bottom-bar/bottom-bar.component";

@Component({
    selector: 'app-artist',
    templateUrl: './artist.component.html',
    styleUrls: ['./artist.component.scss']
})
export class ArtistComponent {

    loading = true;
    artist?: Artist;
    songs: Song[] = [];
    chants: Song[] = [];
    songType: SongType = SongType.Song;
    selectedSong?: Song;
    bottomBarItems: BottomBarItem[] = [
        <BottomBarItem>{
            id: 1,
            icon: 'music_note',
            title: 'სიმღერები',
            isSelected: true,
            isVisible: true
        },
        <BottomBarItem>{
            id: 2,
            icon: 'music_note',
            title: 'საგალობლები',
            isSelected: false,
            isVisible: true
        }
    ]
    constructor(
        public router: Router,
        private artistService: ArtistsService,
        private songService: SongsService,
        private route: ActivatedRoute,
        private mediaController: MediaController
    ) {
        this.route.params.pipe(tap(items => {
            const artistId = items["id"] as string;
            if (artistId) {
                this.loadAndSelectArtist(artistId);
                this.loadSongs();
            }
        })).subscribe();

        this.selectedSong = mediaController.selectedSong;
        mediaController.selectedSongChanged$.pipe(
            skip(1),
            tap(newSong => {
                this.selectedSong = newSong;

                const song = 
                    this.songs.find(item => item.id == newSong!.id) ||
                    this.chants.find(item => item.id == newSong!.id);
                if(!song) {
                   return;
                }
                this.selectSong(song!, false);
            })
        ).subscribe();
    }

    loadSongs() {
        const response = this.songService.songsByArtistId(this.artist?.id!);
        response.pipe(
            map(items => {
                this.songs = items.songs;
                this.bottomBarItems[0].isVisible = this.songs.length > 0;
                this.loading = false;
                if(!this.selectedSong){
                    return;
                }
                const song = this.songs.find(item => item.id == this.selectedSong!.id);
                if(!song) {
                   return;
                }
                this.selectSong(song!, false);
            })
        ).subscribe();

        response.pipe(
            map(items => {
                this.chants = items.chants;
                this.bottomBarItems[1].isVisible = this.chants.length > 0;
                if(this.songs.length  === 0){
                    this.songType = 2;
                    this.bottomBarItems[1].isSelected = this.chants.length > 0;
                }
                if(!this.selectedSong){
                    return;
                }
                const song = this.chants.find(item => item.id == this.selectedSong!.id);
                if(!song) {
                   return;
                }
                this.selectSong(song!, false);
            })
        ).subscribe();
    }

    filterSongs(songType: SongType) {
        this.songType = songType;
    }

    selectSong(song: Song, play: boolean = true) {
        this.songs.filter(item => item.id != song.id)
            .forEach(item => item.isSelected = false);
        this.chants.filter(item => item.id != song.id)
            .forEach(item => item.isSelected = false);

        song!.isSelected = true;
        this.selectedSong = song!;

        if(play) {
            const playList = this.songType == SongType.Song ? this.songs : this.chants;
            this.mediaController.playList = playList;
            this.mediaController.selectedArtist = this.artist;
            this.mediaController.play(song);
        }
    }

    private loadAndSelectArtist(id: string): void {
        this.artistService.artistById(id)
            .subscribe(data => {
                this.artist = data;
                this.loadSongs();
            })
    }

    get showEmptyListText(): boolean {
        return !this.loading
            && (this.songType == SongType.Song && this.songs.length == 0)
            || (this.songType == SongType.Chant && this.chants.length == 0)
    }

    changeSongType(item: BottomBarItem) {
        this.songType = item.id;
    }
}