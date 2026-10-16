import {Component, OnInit} from "@angular/core";
import {Artist} from "../../models/artist";
import {finalize, map, mergeMap, skip, tap} from "rxjs";
import {Song} from "../../models/song";
import {SongsService} from "../../services/songs.service";
import {SongType} from "../../models/song.type";
import {MediaController} from "../../services/media.controller";
import {ActivatedRoute, Router} from "@angular/router";
import {ArtistsService} from "../../services/artists.service";
import {BottomBarItem} from "../../widgets/bottom-bar/bottom-bar.component";
import {BottomBarService} from "../../services/bottom-bar.service";

@Component({
    selector: 'app-artist',
    templateUrl: './artist.component.html',
    styleUrls: ['./artist.component.scss']
})
export class ArtistComponent implements OnInit {

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
        private mediaController: MediaController,
        private bottomBarService: BottomBarService
    ) {

    }

    ngOnInit(): void {
        this.route.params.pipe(tap(items => {
            const artistId = items["id"] as string;
            if (artistId) {
                this.loadAndSelectArtist(artistId);
                this.loadSongs().subscribe();
            }
        })).subscribe();

        this.selectedSong = this.mediaController.selectedSong;
        this.mediaController.selectedSongChanged$.pipe(
            skip(1),
            tap(newSong => {
                this.selectedSong = newSong;

                const song =
                    this.songs.find(item => item.id == newSong!.id) ||
                    this.chants.find(item => item.id == newSong!.id);
                if (!song) {
                    return;
                }
                this.selectSong(song!, false);
            })
        ).subscribe();
        this.bottomBarService.setItems(this.bottomBarItems);
    }

    loadSongs() {
        return this.songService.songsByArtistId(this.artist?.id!)
            .pipe(
                map(items => {
                    this.songs = items.songs;
                    this.chants = items.chants;

                    this.bottomBarItems[1].isVisible = this.chants.length > 0;
                    this.bottomBarItems[0].isVisible = this.songs.length > 0;
                    if (this.songs.length === 0) {
                        this.songType = 2;
                        this.bottomBarItems[1].isSelected = this.chants.length > 0;
                    }

                    if (!this.selectedSong) {
                        return;
                    }
                    const song = [...this.songs, ...this.chants].find(item => item.id == this.selectedSong!.id);
                    if (!song) {
                        return;
                    }
                    this.selectSong(song!, false);
                }),
                finalize(() => this.loading = false)
            );
    }

    selectSong(song: Song, play: boolean = true) {
        this.songs.filter(item => item.id != song.id)
            .forEach(item => item.isSelected = false);
        this.chants.filter(item => item.id != song.id)
            .forEach(item => item.isSelected = false);

        song!.isSelected = true;
        this.selectedSong = song!;

        if (play) {
          this.mediaController.playList = this.songType == SongType.Song ? this.songs : this.chants;
            this.mediaController.selectedArtist = this.artist;
            this.mediaController.play(song);
        }
    }

    private loadAndSelectArtist(id: string): void {
        this.artistService.artistById(id)
            .pipe(
                mergeMap((artist) => {
                    this.artist = artist;
                    return this.loadSongs();
                })
            )
            .subscribe()
    }

    get showEmptyListText(): boolean {
        return !this.loading
            && (this.songType == SongType.Song && this.songs.length == 0)
            || (this.songType == SongType.Chant && this.chants.length == 0)
    }
}
