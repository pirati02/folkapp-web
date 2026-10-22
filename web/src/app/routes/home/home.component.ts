import {Component, HostListener, OnDestroy, OnInit} from "@angular/core";
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
export class HomeComponent implements OnInit, OnDestroy {
  loading = true;
  failed = false;
  dashboard?: Dashboard;
  picks: Pick[] = [];
  popular: Song[] = [];
  /** A feast shows this many of its songs until "all" is tapped. */
  readonly FEAST_PREVIEW = 5;
  expanded = new Set<string>();
  private midnightTimer?: ReturnType<typeof setTimeout>;

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

  ngOnDestroy(): void {
    clearTimeout(this.midnightTimer);
  }

  /** An installed app resumes where it was left, so the day's picks may be yesterday's. */
  @HostListener('document:visibilitychange')
  refreshIfStale() {
    if (document.visibilityState === 'visible' && this.dashboard && this.dashboard.date !== localIsoDate()) {
      this.load();
    }
  }

  load() {
    // Swapping in a new day's picks keeps the old ones on screen until they arrive.
    this.loading = !this.dashboard;
    this.failed = false;
    this.scheduleMidnightRefresh();
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
        this.failed = !this.dashboard;
        this.loading = false;
      }
    });
  }

  private scheduleMidnightRefresh() {
    clearTimeout(this.midnightTimer);
    const midnight = new Date();
    midnight.setHours(24, 0, 5, 0);
    this.midnightTimer = setTimeout(() => this.load(), midnight.getTime() - Date.now());
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
