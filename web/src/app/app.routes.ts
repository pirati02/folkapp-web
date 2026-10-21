import {inject} from '@angular/core';
import {ActivatedRouteSnapshot, Router, Routes} from '@angular/router';
import {catchError, map, of} from 'rxjs';
import {ArtistsComponent} from './routes/artists/artists.component';
import {ArtistComponent} from './routes/artist/artist.component';
import {SearchComponent} from "./routes/search/search.component";
import {SongsService} from './services/songs.service';

/** Shared song links land on /song/:id; open the song in its ensemble's list, or home if it's gone. */
const openSharedSong = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  return inject(SongsService).songById(route.params['id']).pipe(
    map(song => router.createUrlTree(['/artist', song.artistId], {queryParams: {song: song.id}})),
    catchError(() => of(router.createUrlTree(['/'])))
  );
};

export const routes: Routes = [
  {
    title: 'მთავარი',
    path: '',
    component: ArtistsComponent,
    pathMatch: 'full'
  },
  {
    title: 'მთავარი',
    path: 'artists/:id',
    component: ArtistsComponent
  },
  {
    title: 'ანსამბლი',
    path: 'artist/:id',
    component: ArtistComponent
  },
  {
    title: 'ძიება',
    path: 'search',
    component: SearchComponent
  },
  {
    path: 'song/:id',
    canActivate: [openSharedSong],
    children: []
  }
];
