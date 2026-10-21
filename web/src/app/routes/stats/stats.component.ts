import {Component, Inject, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {HttpClient} from "@angular/common/http";
import {RouterLink} from "@angular/router";
import {MatIconModule} from "@angular/material/icon";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {map} from "rxjs";
import {BaseResponse} from "../../models/base-response";
import {Song} from "../../models/song";
import {MediaController} from "../../services/media.controller";
import {NavigationHistory} from "../../services/navigation-history.service";
import {BottomBarService, mainNavItems, NAV_ME} from "../../services/bottom-bar.service";

type CountedSong = Song & {plays: number, downloads: number};

interface Stats {
  totals: {songs: number, chants: number, artists: number, plays: number, downloads: number};
  topPlayed: CountedSong[];
  topDownloaded: CountedSong[];
  artists: {id: string, name: string, plays: number, downloads: number, songs: number}[];
}

/** Catalogue size and what people listen to: plays and downloads the app counts. */
@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule]
})
export class StatsComponent implements OnInit {
  stats?: Stats;
  failed = false;

  constructor(
    @Inject('BASE_URL') private baseUrl: string,
    private http: HttpClient,
    private bottomBarService: BottomBarService,
    public mediaController: MediaController,
    public history: NavigationHistory
  ) {
  }

  ngOnInit() {
    this.bottomBarService.setItems(mainNavItems(NAV_ME));
    this.http.get<BaseResponse<Stats>>(this.baseUrl + '/stats').pipe(map(response => response.body))
      .subscribe({next: stats => this.stats = stats, error: () => this.failed = true});
  }

  /** Bar length as a share of the longest bar in its list. */
  width(value: number, items: {plays?: number, downloads?: number}[], key: 'plays' | 'downloads'): number {
    const max = Math.max(...items.map(item => item[key] ?? 0), 1);
    return value / max * 100;
  }

  play(list: CountedSong[], song: CountedSong) {
    this.mediaController.playList = list;
    this.mediaController.play(song);
  }
}
