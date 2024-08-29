import { Component } from "@angular/core";
import { Artist } from "../../models/artist";
import { map, tap } from "rxjs";
import { Song } from "../../models/song";
import { SongsService } from "../../services/songs.service";
import { SongType } from "../../models/song-type";
import { MediaController } from "../../services/media.controller";
import { ActivatedRoute, Router } from "@angular/router";
import { ArtistsService } from "../../services/artists.service";

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
    }

    loadSongs() {
        const response = this.songService.songsByArtistId(this.artist?.id!);
        response.pipe(
            map(items => {
                this.songs = items.songs;
                this.loading = false;
            })
        ).subscribe();

        response.pipe(
            map(items => this.chants = items.chants)
        ).subscribe();
    }

    filterSongs(songType: SongType) {
        this.songType = songType;
    }

    selectSong(song: Song) {
        this.songs.filter(item => item.id != song.id)
            .forEach(item => item.isSelected = false);
        this.chants.filter(item => item.id != song.id)
            .forEach(item => item.isSelected = false);

        song!.isSelected = true;
        this.selectedSong = song!;

        const playList = this.songType == SongType.Song ? this.songs : this.chants;
        this.mediaController.playList = playList;
        this.mediaController.play(song);
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
}