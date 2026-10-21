import {Component, OnInit} from "@angular/core";
import {CommonModule} from "@angular/common";
import {RouterLink} from "@angular/router";
import {MatIconModule} from "@angular/material/icon";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {forkJoin} from "rxjs";
import {Dashboard, Holiday} from "../../models/dashboard";
import {Song} from "../../models/song";
import {DashboardService} from "../../services/dashboard.service";
import {MediaController} from "../../services/media.controller";
import {BottomBarService, mainNavItems, NAV_HOME} from "../../services/bottom-bar.service";
import {SongListComponent} from "../../widgets/song-list/song-list.component";
import {localIsoDate, relativeDayLabel} from "../../shared/dates";

const POPULAR_COUNT = 10;

interface Pick {
  label: string;
  song: Song;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule, SongListComponent]
})
export class HomeComponent implements OnInit {
  loading = true;
  failed = false;
  dashboard?: Dashboard;
  picks: Pick[] = [];
  popular: Song[] = [];
  /** A feast shows this many of its songs until "all" is tapped. */
  readonly FEAST_PREVIEW = 5;
  expanded = new Set<string>();

  constructor(
    public mediaController: MediaController,
    private dashboardService: DashboardService,
    private bottomBarService: BottomBarService
  ) {
  }

  ngOnInit(): void {
    this.bottomBarService.setItems(mainNavItems(NAV_HOME));
    this.load();
  }

  load() {
    this.loading = true;
    this.failed = false;
    forkJoin({
      dashboard: this.dashboardService.dashboard(localIsoDate()),
      popular: this.dashboardService.popular(POPULAR_COUNT)
    }).subscribe({
      next: ({dashboard, popular}) => {
        this.dashboard = dashboard;
        this.popular = popular;
        this.picks = [
          {label: 'დღის სიმღერა', song: dashboard.daySong},
          {label: 'დღის საგალობელი', song: dashboard.dayChant},
          {label: 'აღმოაჩინე', song: dashboard.discoverSong}
        ].filter((pick): pick is Pick => !!pick.song);
        this.loading = false;
      },
      error: () => {
        this.failed = true;
        this.loading = false;
      }
    });
  }

  dayLabel(holiday: Holiday): string {
    return relativeDayLabel(holiday.date, this.dashboard!.date);
  }

  /** Plays `song` with `list` as what comes next. */
  play(list: Song[], song = list[0]) {
    this.mediaController.playList = list;
    this.mediaController.play(song);
  }

  playPick(pick: Pick) {
    this.play(this.picks.map(item => item.song), pick.song);
  }

  hideImage(event: Event) {
    // The calendar icon behind it shows instead.
    (event.target as HTMLElement).style.display = 'none';
  }
}
