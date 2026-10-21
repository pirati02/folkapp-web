import {HttpClient} from "@angular/common/http";
import {Inject, Injectable} from "@angular/core";
import {map, Observable} from "rxjs";
import {Song} from "../models/song";
import {BaseResponse} from "../models/base-response";

@Injectable({
  providedIn: 'root'
})
export class SongsService {

  constructor(
    @Inject('BASE_URL') private baseUrl: string,
    private httpClient: HttpClient
  ) {

  }

  songsByArtistId(id: string): Observable<{
    songs: Song[],
    chants: Song[]
  }> {
    return this.httpClient.get<BaseResponse<{
      songs: Song[],
      chants: Song[]
    }>>(this.baseUrl + '/songs/' + id + '/all').pipe(
      map(data => data.body)
    );
  }

  songById(id: string): Observable<Song> {
    return this.httpClient.get<BaseResponse<Song>>(this.baseUrl + '/songs/' + id).pipe(
      map(data => data.body)
    );
  }

  /** Counts a play; play counts drive the popular lists. */
  logPlay(id: string): Observable<unknown> {
    return this.httpClient.put(this.baseUrl + '/songs/' + id + '/log', {logType: 0});
  }

  share(id: string): Observable<string> {
    return this.httpClient.get<BaseResponse<string>>(this.baseUrl + '/songs/' + id + '/share').pipe(
      map(data => data.body)
    );
  }
}
