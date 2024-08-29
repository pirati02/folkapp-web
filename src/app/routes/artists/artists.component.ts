import { Component, OnInit } from "@angular/core";
import { ArtistsService } from "../../services/artists.service";
import { map, Observable, of, subscribeOn, take, tap } from "rxjs";
import { Artist } from "../../models/artist";
import { ArtistType } from "../../models/artist-type";
import { ActivatedRoute } from "@angular/router";

@Component({
    selector: 'app-artists',
    templateUrl: './artists.component.html',
    styleUrls: ['./artists.component.scss']
})
export class ArtistsComponent implements OnInit {

    artists: Artist[] = [];
    private artistType: ArtistType = ArtistType.ARTIST;
    selectedArtist: Artist | null = null;

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
        this.artistsService.artistsByType(this.artistType)
            .subscribe(data => this.artists = data);
    }

    selectArtist(artist: Artist){
        this.artists.filter(item => item.id != artist.id)
                    .forEach(item => item.isSelected = false);
 
        artist!.isSelected = true;
        this.selectedArtist = artist!;
    }
}