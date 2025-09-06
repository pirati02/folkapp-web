import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { SearchService } from "../../services/search.service";
import { SearchResult } from "../../models/search";
import { BottomBarItem } from "../../widgets/bottom-bar/bottom-bar.component";
import { Artist } from "../../models/artist";
import { Song } from "../../models/song";
import { MediaController } from "../../services/media.controller";
import { ArtistsService } from "../../services/artists.service";
import { finalize, tap } from "rxjs";
import { BottomBarService } from "../../services/bottom-bar.service";

enum TabType {
  ARTISTS = 1,
  SONGS = 2
}

@Component({
  selector: "app-search",
  templateUrl: "./search.component.html",
  styleUrls: ["./search.component.scss"]
})
export class SearchComponent implements OnInit {
  loading: boolean = false;
  bottomBarItems: BottomBarItem[] = [
    <BottomBarItem>{
      id: 1,
      icon: 'group',
      title: 'ანსამბლები',
      isSelected: true,
      isVisible: true
    },
    <BottomBarItem>{
      id: 2,
      icon: 'music_note',
      title: 'სიმღერები',
      isSelected: false,
      isVisible: true
    }
  ]
  tabType: TabType = TabType.ARTISTS;
  searchResult: SearchResult = <SearchResult>{
    artists: [],
    songs: []
  };

  constructor(
    protected router: Router,
    private mediaController: MediaController,
    private searchService: SearchService,
    private artistService: ArtistsService,
    private bottomBarService: BottomBarService
  ) {
  }

  ngOnInit(): void {
    this.bottomBarService.setItems(this.bottomBarItems);
    this.bottomBarService.selectItem$.subscribe(item => {
        this.tabType = item.id;
    });
  }

  get showEmptyListText(): boolean {
    return !this.loading
      && (this.tabType == TabType.ARTISTS && this.searchResult.artists.length == 0)
      || (this.tabType == TabType.SONGS && this.searchResult.songs.length == 0)
  }

  selectArtist(artist: Artist) {
    this.searchResult
      .artists.filter(item => item.id != artist.id)
      .forEach(item => item.isSelected = false);

    artist!.isSelected = true;
    this.router.navigateByUrl('/artist/' + artist.id);
  }

  selectSong(song: Song) {
    this.searchResult.songs.filter(item => item.id != song.id)
      .forEach(item => item.isSelected = false);

    song!.isSelected = true;
    this.mediaController.playList = this.searchResult.songs;
    this.artistService.artistById(song.artistId).pipe(
      tap(result => this.mediaController.selectedArtist = result)
    ).subscribe();
    this.mediaController.play(song);
  }

  onSearch($event: KeyboardEvent) {
    const value = ($event.target as HTMLInputElement).value;
    if (!value || value.length < 2) {
      return;
    }

    this.loading = true;
    this.searchService.search(value)
      .pipe(
        tap(result => this.searchResult = result),
        finalize(() => this.loading = false)
      )
      .subscribe();
  }
}
