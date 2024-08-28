import { CommonModule } from "@angular/common";
import { provideHttpClient, withFetch, withJsonpSupport } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { ArtistsComponent } from "./routes/artists/artists.component";
import { AppComponent } from "./app.component";
import { RouterOutlet } from "@angular/router";

@NgModule({
    providers: [
        provideHttpClient(withFetch(), withJsonpSupport())
    ],
    declarations:[
        ArtistsComponent
    ],
    imports:[
        CommonModule,
        RouterOutlet
    ]
})
export class AppModule{

}