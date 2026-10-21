import {Injectable} from "@angular/core";

/** What the player shows besides the mini bar: the full-screen player or the playlist. */
export type PlayerView = 'closed' | 'full' | 'queue';

@Injectable({providedIn: 'root'})
export class PlayerViewService {
  view: PlayerView = 'closed';

  open(view: PlayerView) {
    this.view = view;
  }

  close() {
    this.view = 'closed';
  }

  toggle(view: PlayerView) {
    this.view = this.view === view ? 'closed' : view;
  }
}
