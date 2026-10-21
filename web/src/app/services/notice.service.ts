import {Injectable} from "@angular/core";

/** A short message shown above the player for a moment, e.g. "link copied". */
@Injectable({providedIn: 'root'})
export class NoticeService {
  message?: string;
  private timer?: ReturnType<typeof setTimeout>;

  show(message: string) {
    this.message = message;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.message = undefined, 2500);
  }
}
