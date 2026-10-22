import {Injectable} from "@angular/core";
import {LocalStore} from "./local-store.service";
import {PlayerViewService} from "./player-view.service";

/** Chrome's install event; not in TypeScript's DOM types yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
}

/** 'native': the browser can install the app on a tap. 'ios': Safari can't, so we explain the Share menu. */
export type InstallKind = 'native' | 'ios';

const SEEN_KEY = 'installPromptSeen';
const SHOW_AFTER_MS = 8000; // let the listener look around first

/**
 * Suggests, once per device, installing the web app on a phone or tablet's home screen.
 * Skipped on desktops, when the app is already installed, and after it has been shown once.
 */
@Injectable({providedIn: 'root'})
export class InstallPromptService {
  kind?: InstallKind;
  private installEvent?: BeforeInstallPromptEvent;

  constructor(private store: LocalStore, private playerView: PlayerViewService) {
    if (store.get(SEEN_KEY, false) || isInstalled() || !isTouchDevice()) {
      return;
    }
    window.addEventListener('appinstalled', () => this.close());
    if (isIos()) {
      this.revealLater('ios');
      return;
    }
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault(); // we show our own card instead of the browser's banner
      this.installEvent = event as BeforeInstallPromptEvent;
      this.revealLater('native');
    }, {once: true});
  }

  async install() {
    const event = this.installEvent;
    this.close();
    await event?.prompt();
  }

  close() {
    this.kind = undefined;
    this.installEvent = undefined;
    this.store.set(SEEN_KEY, true);
  }

  private revealLater(kind: InstallKind) {
    setTimeout(() => {
      if (this.store.get(SEEN_KEY, false)) return;
      // Not over the full-screen player: wait until it's closed.
      if (this.playerView.view === 'full') return this.revealLater(kind);
      this.kind = kind;
      this.store.set(SEEN_KEY, true); // counts as shown even if the page is closed without an answer
    }, SHOW_AFTER_MS);
  }
}

function isInstalled(): boolean {
  return matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & {standalone?: boolean}).standalone === true;
}

function isTouchDevice(): boolean {
  return matchMedia('(pointer: coarse)').matches;
}

/** iPhones and iPads, including iPads that report themselves as a Mac. */
function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
