import { Routes } from '@angular/router';
import { ArtistsComponent } from './routes/artists/artists.component';
import { ArtistComponent } from './routes/artist/artist.component';

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
    }
];
