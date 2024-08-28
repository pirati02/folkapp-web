import { Component, OnInit } from "@angular/core";
import { ArtistsService } from "../../services/artists.service";
import { Observable, of, tap } from "rxjs";
import { Artist } from "../../models/artist";
import { ArtistType } from "../../models/artist.type";
import { ActivatedRoute, Route, Router } from "@angular/router";

@Component({
    selector: 'app-artists',
    templateUrl: './artists.component.html',
    styleUrls: ['./artists.component.scss']
})
export class ArtistsComponent implements OnInit {

    artists$: Observable<Artist[]> = of([]);
    private artistType: ArtistType = ArtistType.ARTIST;
    selectedArtist?: Artist;

    constructor(
        private artistsService: ArtistsService,
        private route: ActivatedRoute
    ) {
        this.route.params.pipe(tap(items => {
            this.artistType = items["id"];
            if(this.artistType) {
                this.loadArtists();
            }
        })).subscribe();
    }

    ngOnInit(): void {
        this.loadArtists();
    }

    loadArtists(){
        this.artists$ = this.artistsService.artistsByType(this.artistType);
    }
}