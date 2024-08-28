import { Routes } from '@angular/router';
import { ArtistsComponent } from './routes/artists/artists.component';

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
    }
];
