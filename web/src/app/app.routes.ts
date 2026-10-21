import {inject} from '@angular/core';
import {ActivatedRouteSnapshot, Router, Routes} from '@angular/router';
import {catchError, map, of} from 'rxjs';
import {ArtistsComponent} from './routes/artists/artists.component';
import {ArtistComponent} from './routes/artist/artist.component';
import {SongsService} from './services/songs.service';
import {HomeComponent} from './routes/home/home.component';

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
    component: HomeComponent,
    pathMatch: 'full'
  },
  {
    title: 'ანსამბლები',
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
    loadComponent: () => import('./routes/search/search.component').then(m => m.SearchComponent)
  },
  {
    title: 'ჩემი',
    path: 'me',
    loadComponent: () => import('./routes/me/me.component').then(m => m.MeComponent)
  },
  {
    title: 'სტატისტიკა',
    path: 'stats',
    loadComponent: () => import('./routes/stats/stats.component').then(m => m.StatsComponent)
  },
  {
    path: 'song/:id',
    canActivate: [openSharedSong],
    children: []
  }
];
