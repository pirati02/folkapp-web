import {Component, DestroyRef, ElementRef, OnInit, ViewChild} from "@angular/core";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {ActivatedRoute, Router} from "@angular/router";
import {catchError, debounceTime, distinctUntilChanged, map, of, startWith, Subject, switchMap} from "rxjs";
import {SearchService} from "../../services/search.service";
import {SearchResult} from "../../models/search";
import {Artist} from "../../models/artist";
import {Song} from "../../models/song";
import {MediaController} from "../../services/media.controller";
import {ArtistsService} from "../../services/artists.service";
import {BottomBarService, mainNavItems} from "../../services/bottom-bar.service";
import {LocalStore} from "../../services/local-store.service";

const MIN_TERM_LENGTH = 2;
const RECENT_SEARCHES_KEY = 'folkapp.recentSearches';
const MAX_RECENT_SEARCHES = 8;

type SearchState =
  | {status: 'idle'}
  | {status: 'loading'}
  | {status: 'done', result: SearchResult}
  | {status: 'error'};

@Component({
  selector: "app-search",
  templateUrl: "./search.component.html",
  styleUrls: ["./search.component.scss"]
})
export class SearchComponent implements OnInit {
  @ViewChild('searchInput', {static: true}) searchInput!: ElementRef<HTMLInputElement>;

  term = '';
  state: SearchState = {status: 'idle'};
  recentSearches: string[] = [];
  private terms$ = new Subject<string>();

  constructor(
    protected router: Router,
    protected mediaController: MediaController,
    private route: ActivatedRoute,
    private searchService: SearchService,
    private artistService: ArtistsService,
    private bottomBarService: BottomBarService,
    private store: LocalStore,
    private destroyRef: DestroyRef
  ) {
  }

  ngOnInit(): void {
    this.bottomBarService.setItems(mainNavItems());
    this.recentSearches = this.store.get<string[]>(RECENT_SEARCHES_KEY, []);

    this.terms$.pipe(
      map(term => term.trim()),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        // Keeps the term in the address, so going back to search shows the same results.
        this.router.navigate([], {relativeTo: this.route, queryParams: {q: term || null}, replaceUrl: true}).then();
        if (term.length < MIN_TERM_LENGTH) {
          return of<SearchState>({status: 'idle'});
        }
        // switchMap drops the answer to an older term that arrives after a newer one.
        return this.searchService.search(term).pipe(
          map((result): SearchState => ({status: 'done', result})),
          catchError(() => of<SearchState>({status: 'error'})),
          startWith<SearchState>({status: 'loading'})
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(state => this.state = state);

    const initial = this.route.snapshot.queryParamMap.get('q') ?? '';
    this.term = initial;
    this.searchInput.nativeElement.value = initial;
    this.terms$.next(initial);
    if (!initial) {
      this.searchInput.nativeElement.focus();
    }
  }

  get result(): SearchResult | undefined {
    return this.state.status === 'done' ? this.state.result : undefined;
  }

  get isEmpty(): boolean {
    return !!this.result && this.result.artists.length == 0 && this.result.songs.length == 0;
  }

  onInput(value: string) {
    this.term = value;
    this.terms$.next(value);
  }

  onEnter() {
    this.rememberTerm();
    // Hides the phone keyboard so the results are visible.
    this.searchInput.nativeElement.blur();
  }

  useRecent(term: string) {
    this.searchInput.nativeElement.value = term;
    this.onInput(term);
  }

  clearTerm() {
    this.useRecent('');
    this.searchInput.nativeElement.focus();
  }

  clearRecent() {
    this.recentSearches = [];
    this.store.set(RECENT_SEARCHES_KEY, []);
  }

  selectArtist(artist: Artist) {
    this.rememberTerm();
    this.router.navigateByUrl('/artist/' + artist.id).then();
  }

  selectSong(song: Song) {
    this.rememberTerm();
    this.mediaController.playList = this.result?.songs ?? [song];
    this.artistService.artistById(song.artistId)
      .subscribe(artist => this.mediaController.selectedArtist = artist);
    this.mediaController.play(song);
  }

  private rememberTerm() {
    const term = this.term.trim();
    if (term.length < MIN_TERM_LENGTH) {
      return;
    }
    this.recentSearches = [term, ...this.recentSearches.filter(item => item != term)].slice(0, MAX_RECENT_SEARCHES);
    this.store.set(RECENT_SEARCHES_KEY, this.recentSearches);
  }
}
