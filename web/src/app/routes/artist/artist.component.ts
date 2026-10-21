import {Component, DestroyRef, OnInit} from "@angular/core";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {Artist} from "../../models/artist";
import {combineLatest, finalize, forkJoin} from "rxjs";
import {Song} from "../../models/song";
import {SongSort, SongsService} from "../../services/songs.service";
import {NavigationHistory} from "../../services/navigation-history.service";
import {ArtistType} from "../../models/artist.type";
import {OfflineService} from "../../services/offline.service";
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
    sort: SongSort = 'name';
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
        private history: NavigationHistory,
        public offline: OfflineService,
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

    close() {
        const type = this.artist?.artistType == 'oldRecordings' ? ArtistType.OLD_RECORDINGS : ArtistType.ARTIST;
        this.history.back('/artists/' + type);
    }

    changeSort(sort: SongSort) {
        if (sort == this.sort || !this.artist) {
            return;
        }
        this.sort = sort;
        this.songService.songsByArtistId(this.artist.id, sort).subscribe(lists => {
            this.songs = lists.songs;
            this.chants = lists.chants;
        });
    }

    selectSong(song: Song) {
        this.mediaController.playList = this.visibleSongs;
        this.mediaController.play(song);
    }

    /** e.g. "32 სიმღერა · 8 საგალობელი" */
    get countsLabel(): string {
        return [
            this.songs.length ? `${this.songs.length} სიმღერა` : '',
            this.chants.length ? `${this.chants.length} საგალობელი` : ''
        ].filter(Boolean).join(' · ');
    }

    playAll() {
        if (this.mediaController.shuffle) {
            this.mediaController.toggleShuffle();
        }
        this.selectSong(this.visibleSongs[0]);
    }

    shuffleAll() {
        if (!this.mediaController.shuffle) {
            this.mediaController.toggleShuffle();
        }
        const songs = this.visibleSongs;
        this.selectSong(songs[Math.floor(Math.random() * songs.length)]);
    }

    private load(artistId: string, sharedSongId?: string) {
        this.loading = true;
        forkJoin({
            artist: this.artistService.artistById(artistId),
            lists: this.songService.songsByArtistId(artistId, this.sort)
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

    /** Label of the download-all button for the songs shown. */
    get downloadLabel(): string {
        const songs = this.visibleSongs;
        const downloaded = songs.filter(song => this.offline.isDownloaded(song.id)).length;
        if (downloaded == songs.length) {
            return 'გადმოწერილია';
        }
        if (songs.some(song => this.offline.isPending(song.id))) {
            return `გადმოიწერება ${downloaded}/${songs.length}`;
        }
        return 'ყველას გადმოწერა';
    }

    downloadAll() {
        this.offline.downloadAll(this.visibleSongs);
    }

    get showEmptyListText(): boolean {
        return !this.loading && this.visibleSongs.length == 0;
    }
}
