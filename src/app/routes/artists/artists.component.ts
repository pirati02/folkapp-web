import { Component, OnInit } from "@angular/core";
import { ArtistsService } from "../../services/artists.service";
import { tap } from "rxjs";
import { Artist } from "../../models/artist";
import { ArtistType } from "../../models/artist-type";
import { ActivatedRoute, Router } from "@angular/router";

interface MenuItem {
    title: string,
    link: string,
    id: number,
    isSelected: boolean
}

@Component({
    selector: 'app-artists',
    templateUrl: './artists.component.html',
    styleUrls: ['./artists.component.scss']
})
export class ArtistsComponent implements OnInit {
    menu: MenuItem[] = [
        <MenuItem>{
            id: 2,
            title: 'ანსამბლები',
            link: '/artists/2',
            isSelected: true
        },
        <MenuItem>{
            id: 1,
            title: 'ძველი ჩანაწერები',
            link: '/artists/1',
            isSelected: false
        }
    ]

    selectedMenuItem: MenuItem = this.menu[0];
    artists: Artist[] = [];
    private artistType: ArtistType = ArtistType.ARTIST;

    constructor(
        private artistsService: ArtistsService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.route.params.pipe(tap(items => {
            this.artistType = items["id"] || ArtistType.ARTIST;
            const menuItem = this.artistType == ArtistType.ARTIST ? this.menu[0] : this.menu[1];
            this.navigate(menuItem);
            this.loadArtists();
        })).subscribe();
    }

    ngOnInit(): void {
        this.loadArtists();
    }

    loadArtists(): void {
        this.artistsService.artistsByType(this.artistType)
            .subscribe(data => this.artists = data);
    }


    navigate(menuItem: MenuItem) {
        this.menu.forEach(item => item.isSelected = false);
        menuItem.isSelected = true;
        this.selectedMenuItem = menuItem;
        this.router.navigate([menuItem.link]);
    }

    selectArtist(artist: Artist): void {
        this.artists.filter(item => item.id != artist.id)
            .forEach(item => item.isSelected = false);

        artist!.isSelected = true;
        this.router.navigateByUrl('/artist/' + artist.id);
    }
}