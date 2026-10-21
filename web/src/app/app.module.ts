import {CommonModule} from "@angular/common";
import {provideHttpClient, withFetch, withJsonpSupport} from "@angular/common/http";
import {NgModule} from "@angular/core";
import {ArtistsComponent} from "./routes/artists/artists.component";
import {RouterLink, RouterOutlet} from "@angular/router";
import {ArtistComponent} from "./routes/artist/artist.component";
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatDividerModule} from '@angular/material/divider';
import {MatListModule} from '@angular/material/list';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { BottomBarComponent } from "./widgets/bottom-bar/bottom-bar.component";
import { MediaPlayerComponent } from "./widgets/media-player/media-player.component";
import { SongListComponent } from "./widgets/song-list/song-list.component";


@NgModule({
  providers: [
    provideHttpClient(withFetch(), withJsonpSupport())
  ],
  declarations: [
    ArtistsComponent,
    ArtistComponent
  ],
  imports: [
    BottomBarComponent,
    MediaPlayerComponent,
    SongListComponent,
    CommonModule,
    RouterOutlet,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatListModule,
    MatProgressSpinnerModule,
    RouterLink
  ]
})
export class AppModule {

}
