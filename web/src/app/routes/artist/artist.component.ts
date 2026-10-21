import {Component, DestroyRef, OnInit} from "@angular/core";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {Artist} from "../../models/artist";
import {combineLatest, finalize, forkJoin} from "rxjs";
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
    bottomBarItems: BottomBarItem[] = [
        <BottomBarItem>{
            id: SongType.Song,
            icon: 'music_note',
            title: 'სიმღერები',
            isSelected: true,
            isVisible: true
        },
        <BottomBarItem>{
            id: SongType.Chant,
            icon: 'music_note',
            title: 'საგალობლები',
            isSelected: false,
            isVisible: true
        }
    ]

    get visibleSongs(): Song[] {
        return this.songType == SongType.Song ? this.songs : this.chants;
    }

    constructor(
        public router: Router,
        public mediaController: MediaController,
        private artistService: ArtistsService,
        private songService: SongsService,
        private route: ActivatedRoute,
        private bottomBarService: BottomBarService,
        private destroyRef: DestroyRef
    ) {
    }

    ngOnInit(): void {
        this.bottomBarService.setItems(this.bottomBarItems);
        this.bottomBarService.selectItem$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(item => this.showType(item.id));

        combineLatest([this.route.params, this.route.queryParams])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(([params, query]) => this.load(params['id'], query['song']));
    }

    selectSong(song: Song) {
        this.mediaController.playList = this.visibleSongs;
        this.mediaController.selectedArtist = this.artist;
        this.mediaController.play(song);
    }

    private load(artistId: string, sharedSongId?: string) {
        this.loading = true;
        forkJoin({
            artist: this.artistService.artistById(artistId),
            lists: this.songService.songsByArtistId(artistId)
        })
            .pipe(finalize(() => this.loading = false))
            .subscribe(({artist, lists}) => {
                this.artist = artist;
                this.songs = lists.songs;
                this.chants = lists.chants;
                this.bottomBarItems[0].isVisible = this.songs.length > 0;
                this.bottomBarItems[1].isVisible = this.chants.length > 0;

                const shared = [...this.songs, ...this.chants].find(song => song.id == sharedSongId);
                const current = this.mediaController.selectedSong;
                const focus = shared ?? [...this.songs, ...this.chants].find(song => song.id == current?.id);
                this.showType(focus?.songType ?? (this.songs.length ? SongType.Song : SongType.Chant));

                if (shared && shared.id != current?.id) {
                    // Opened from a shared link: ready to play, but browsers only start audio after a tap.
                    this.mediaController.playList = this.visibleSongs;
                    this.mediaController.selectedArtist = artist;
                    this.mediaController.prepare(shared);
                }
                if (focus) {
                    setTimeout(() => document.getElementById('song-' + focus.id)?.scrollIntoView({block: 'center'}));
                }
            });
    }

    private showType(type: SongType) {
        this.songType = type;
        this.bottomBarItems.forEach(item => item.isSelected = item.id == type);
        this.bottomBarService.setItems([...this.bottomBarItems]);
    }

    get showEmptyListText(): boolean {
        return !this.loading && this.visibleSongs.length == 0;
    }
}
