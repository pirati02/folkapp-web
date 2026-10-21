import {Inject, Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {map, Observable} from "rxjs";
import {SearchResult} from "../models/search";
import {BaseResponse} from "../models/base-response";

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  constructor(
    @Inject('BASE_URL') private baseUrl: string,
    private httpClient: HttpClient
  ) {

  }

  search(term: string): Observable<SearchResult> {
    return this.httpClient.get<BaseResponse<SearchResult>>(this.baseUrl + '/search/' + encodeURIComponent(term)).pipe(
      map(data => data.body)
    );
  }
}
