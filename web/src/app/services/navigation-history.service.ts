import {Injectable} from "@angular/core";
import {NavigationEnd, Router} from "@angular/router";
import {filter} from "rxjs";

/** Remembers the page before the current one, so close buttons can return to it. */
@Injectable({providedIn: 'root'})
export class NavigationHistory {
  private current?: string;
  private previous?: string;

  constructor(private router: Router) {
    router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        // A changed query (e.g. typing in search) is still the same page.
        if (this.current && pathOf(this.current) !== pathOf(event.urlAfterRedirects)) {
          this.previous = this.current;
        }
        this.current = event.urlAfterRedirects;
      });
  }

  /** Goes to the previous page, or `fallback` when the app was opened on this one. */
  back(fallback = '/') {
    this.router.navigateByUrl(this.previous ?? fallback).then();
  }
}

const pathOf = (url: string) => url.split(/[?#]/)[0];
