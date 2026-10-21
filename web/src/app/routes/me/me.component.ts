import {Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {MatIconModule} from "@angular/material/icon";
import {Song} from "../../models/song";
import {MediaController} from "../../services/media.controller";
import {LibraryService} from "../../services/library.service";
import {BottomBarService, mainNavItems, NAV_ME} from "../../services/bottom-bar.service";
import {SongListComponent} from "../../widgets/song-list/song-list.component";

/** The listener's own songs: favourites and recently played. */
@Component({
  selector: 'app-me',
  templateUrl: './me.component.html',
  styleUrls: ['./me.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, SongListComponent]
})
export class MeComponent implements OnInit {
  constructor(
    public library: LibraryService,
    public mediaController: MediaController,
    private bottomBarService: BottomBarService
  ) {
  }

  ngOnInit(): void {
    this.bottomBarService.setItems(mainNavItems(NAV_ME));
  }

  /** Plays `song` with `list` as what comes next. */
  play(list: Song[], song = list[0]) {
    this.mediaController.playList = list;
    this.mediaController.selectedArtist = undefined;
    this.mediaController.play(song);
  }
}
