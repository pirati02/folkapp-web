import { Component, OnInit } from "@angular/core";
import { ArtistsService } from "../../services/artists.service";
import { tap } from "rxjs";
import { Artist } from "../../models/artist";
import { ArtistType } from "../../models/artist.type";
import { ActivatedRoute, Router } from "@angular/router";
import { BottomBarItem } from "../../widgets/bottom-bar/bottom-bar.component";
 
@Component({
    selector: 'app-artists',
    templateUrl: './artists.component.html',
    styleUrls: ['./artists.component.scss']
})
export class ArtistsComponent implements OnInit {
    bottomBarItems: BottomBarItem[] = [
        <BottomBarItem>{
            id: 2,
            icon: 'group',
            title: 'ანსამბლები',
            link: '/artists/2',
            isSelected: true,
            isVisible: true
        },
        <BottomBarItem>{
            id: 1,
            icon: 'system_update_alt',
            title: 'ძველი ჩანაწერები',
            link: '/artists/1',
            isSelected: false,
            isVisible: true
        }
    ]

    selectedBottomBarItem: BottomBarItem = this.bottomBarItems[0];
    artists: Artist[] = [];
    private artistType: ArtistType = ArtistType.ARTIST;

    constructor(
        private artistsService: ArtistsService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.route.params.pipe(tap(items => {
            this.artistType = items["id"] || ArtistType.ARTIST;
            const item = this.artistType == ArtistType.ARTIST 
                            ? this.bottomBarItems[0] 
                            : this.bottomBarItems[1];
            this.selectedBottomBarItem = item;
            this.loadArtists();
        })).subscribe();
    }

    ngOnInit(): void {
        this.loadArtists();
    }

    loadArtists(): void {
        this.artistsService.artistsByType(this.artistType)
            .subscribe(data => this.artists = data.sort((a, b) => a.name.localeCompare(b.name)));
    }

    selectArtist(artist: Artist): void {
        this.artists.filter(item => item.id != artist.id)
            .forEach(item => item.isSelected = false);

        artist!.isSelected = true;
        this.router.navigateByUrl('/artist/' + artist.id);
    }

    navigate(bottomBarItem: BottomBarItem) {
        this.router.navigate([bottomBarItem.link]);
    }
}