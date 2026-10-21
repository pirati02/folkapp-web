import {HttpClient} from "@angular/common/http";
import {Inject, Injectable} from "@angular/core";
import {map, Observable} from "rxjs";
import {BaseResponse} from "../models/base-response";
import {Dashboard} from "../models/dashboard";
import {Song} from "../models/song";

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(
    @Inject('BASE_URL') private baseUrl: string,
    private httpClient: HttpClient
  ) {
  }

  /** `date` is this device's today, `YYYY-MM-DD`. */
  dashboard(date: string): Observable<Dashboard> {
    return this.httpClient.get<BaseResponse<Dashboard>>(this.baseUrl + '/dashboard', {params: {date}}).pipe(
      map(data => data.body)
    );
  }

  popular(limit: number): Observable<Song[]> {
    return this.httpClient.get<BaseResponse<Song[]>>(this.baseUrl + '/songs/popular', {params: {limit}}).pipe(
      map(data => data.body)
    );
  }
}
