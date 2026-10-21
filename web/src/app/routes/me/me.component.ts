import {Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {MatIconModule} from "@angular/material/icon";
import {Song} from "../../models/song";
import {MediaController} from "../../services/media.controller";
import {LibraryService} from "../../services/library.service";
import {BottomBarService, mainNavItems, NAV_ME} from "../../services/bottom-bar.service";
import {SongListComponent} from "../../widgets/song-list/song-list.component";
import {OfflineService} from "../../services/offline.service";
import {map, Observable} from "rxjs";

/** The listener's own songs: favourites, downloads and recently played. */
@Component({
  selector: 'app-me',
  templateUrl: './me.component.html',
  styleUrls: ['./me.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, SongListComponent]
})
export class MeComponent implements OnInit {
  downloadedSongs$: Observable<Song[]>;
  downloadedSize$: Observable<string>;

  constructor(
    public library: LibraryService,
    public mediaController: MediaController,
    public offline: OfflineService,
    private bottomBarService: BottomBarService
  ) {
    this.downloadedSongs$ = offline.downloads$.pipe(map(items => items.map(item => item.song)));
    this.downloadedSize$ = offline.downloads$.pipe(
      map(items => items.reduce((sum, item) => sum + item.size, 0) / 1_000_000),
      map(megabytes => megabytes < 0.1 ? '< 0.1 მბ' : `${megabytes.toFixed(1)} მბ`)
    );
  }

  ngOnInit(): void {
    this.bottomBarService.setItems(mainNavItems(NAV_ME));
  }

  /** Plays `song` with `list` as what comes next. */
  play(list: Song[], song = list[0]) {
    this.mediaController.playList = list;
    this.mediaController.play(song);
  }
}
