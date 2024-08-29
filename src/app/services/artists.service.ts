import { HttpClient } from "@angular/common/http";
import { Inject, Injectable } from "@angular/core";
import { ArtistType } from "../models/artist-type";
import { Artist } from "../models/artist";
import { map, Observable } from "rxjs";
import { BaseResponse } from "../models/base-response";

@Injectable({
    providedIn: 'root'
})
export class ArtistsService {
    constructor(
        @Inject('BASE_URL') private baseUrl: string,
        private httpClient: HttpClient
    ){
        
    }

    artistsByType(type: ArtistType): Observable<Artist[]> { 
        return this.httpClient.get<BaseResponse<Artist[]>>(this.baseUrl + '/Artists/' + type + '/all').pipe(
            map(data => data.body)
        );
    }

    artistById(id: string):  Observable<Artist> { 
        return this.httpClient.get<BaseResponse<Artist>>(this.baseUrl + '/Artists/' + id).pipe(
            map(data => data.body)
        );
    }
}