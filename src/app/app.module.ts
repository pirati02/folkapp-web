import { CommonModule } from "@angular/common";
import { provideHttpClient, withFetch, withJsonpSupport } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { ArtistsComponent } from "./routes/artists/artists.component";
import { RouterOutlet } from "@angular/router";
import { ArtistComponent } from "./routes/artist/artist.component";

@NgModule({
    providers: [
        provideHttpClient(withFetch(), withJsonpSupport())
    ],
    declarations:[
        ArtistsComponent,
        ArtistComponent
    ],
    imports:[
        CommonModule,
        RouterOutlet
    ]
})
export class AppModule{

}