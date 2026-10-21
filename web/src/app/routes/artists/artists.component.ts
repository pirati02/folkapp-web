import {Component} from "@angular/core";
import {ArtistsService} from "../../services/artists.service";
import {finalize, tap} from "rxjs";
import {Artist} from "../../models/artist";
import {ArtistType} from "../../models/artist.type";
import {ActivatedRoute, Router} from "@angular/router";
import {BottomBarService, mainNavItems} from "../../services/bottom-bar.service";

@Component({
  selector: 'app-artists',
  templateUrl: './artists.component.html',
  styleUrls: ['./artists.component.scss']
})
export class ArtistsComponent {
  loading: boolean = false;
  artists: Artist[] = [];
  private artistType: ArtistType = ArtistType.ARTIST;

  constructor(
    private artistsService: ArtistsService,
    private router: Router,
    private route: ActivatedRoute,
    private bottomBarService: BottomBarService
  ) {
    this.route.params.pipe(tap(items => {
      this.artistType = items["id"] || ArtistType.ARTIST;
      this.bottomBarService.setItems(mainNavItems(this.artistType));
      this.loadArtists();
    })).subscribe();
  }

  loadArtists(): void {
    this.loading = true;
    this.artistsService.artistsByType(this.artistType)
      .pipe(
        tap(data => this.artists = data.sort((a, b) => a.name.localeCompare(b.name))),
        finalize(() => this.loading = false)
      )
      .subscribe();
  }

  selectArtist(artist: Artist): void {
    this.artists.filter(item => item.id != artist.id)
      .forEach(item => item.isSelected = false);

    artist!.isSelected = true;
    this.router.navigateByUrl('/artist/' + artist.id).then();
  }
}
