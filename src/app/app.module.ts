import { CommonModule } from "@angular/common";
import { provideHttpClient, withFetch, withJsonpSupport } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { ArtistsComponent } from "./routes/artists/artists.component";
import { RouterOutlet } from "@angular/router";
import { ArtistComponent } from "./routes/artist/artist.component";
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


@NgModule({
    providers: [
        provideHttpClient(withFetch(), withJsonpSupport())
    ],
    declarations: [
        ArtistsComponent,
        ArtistComponent
    ],
    imports: [
        CommonModule,
        RouterOutlet,
        MatIconModule,
        MatButtonModule,
        MatDividerModule,
        MatListModule,
        MatProgressSpinnerModule
    ]
})
export class AppModule {

}