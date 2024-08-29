import { HttpClient } from "@angular/common/http";
import { Inject, Injectable } from "@angular/core";
import { map, Observable, tap } from "rxjs";
import { Song } from "../models/song";
import { BaseResponse } from "../models/base-response";

@Injectable({
    providedIn: 'root'
})
export class SongsService {

    constructor(
        @Inject('BASE_URL') private baseUrl: string,
        private httpClient: HttpClient
    ){
        
    }

    songsByArtistId(id: string): Observable<{ 
        songs: Song[],
        chants: Song[]
    }> {
        return this.httpClient.get<BaseResponse<{ 
            songs: Song[],
            chants: Song[]
        }>>(this.baseUrl + '/Songs/' + id + '/all').pipe(
            map(data => data.body)
        );
    }
}