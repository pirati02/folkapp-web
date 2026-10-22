import {Inject, Injectable} from '@angular/core';
import {LocalStore} from './local-store.service';

const METRICS_KEY = 'folkapp.metrics';
/** Counts are sent this often, and whenever the app goes to the background. */
const SEND_INTERVAL_MS = 60_000;

/** Song id → how many times, counted since the last batch the server accepted. */
interface Counts {
  plays: Record<string, number>;
  downloads: Record<string, number>;
}

/**
 * Counts plays and downloads on this device and sends them to the server in batches, so none are
 * lost while offline or while the free-plan server wakes up. The counts drive the popular lists
 * and the songs of the day.
 */
@Injectable({providedIn: 'root'})
export class MetricsService {
  private sending = false;

  constructor(
    @Inject('BASE_URL') private baseUrl: string,
    private store: LocalStore
  ) {
    setInterval(() => this.send(), SEND_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.send();
      }
    });
    window.addEventListener('online', () => this.send());
  }

  play(songId: string) {
    this.add('plays', songId);
  }

  download(songId: string) {
    this.add('downloads', songId);
  }

  private add(kind: keyof Counts, songId: string) {
    const counts = this.pending();
    counts[kind][songId] = (counts[kind][songId] ?? 0) + 1;
    this.store.set(METRICS_KEY, counts);
  }

  private async send() {
    const batch = this.pending();
    if (this.sending || !navigator.onLine || isEmpty(batch)) {
      return;
    }
    this.sending = true;
    // Counts made while this batch is on its way start the next one.
    this.store.set(METRICS_KEY, emptyCounts());
    try {
      // fetch rather than HttpClient: `keepalive` lets the batch finish after the page is closed.
      const response = await fetch(this.baseUrl + '/songs/metrics', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(batch),
        keepalive: true
      });
      // A 4xx batch would fail the same way every time, so only a server error is retried.
      if (response.status >= 500) {
        this.restore(batch);
      }
    } catch {
      this.restore(batch);
    } finally {
      this.sending = false;
    }
  }

  /** Puts an unsent batch back, adding it to anything counted meanwhile. */
  private restore(batch: Counts) {
    const counts = this.pending();
    for (const kind of ['plays', 'downloads'] as const) {
      for (const [songId, count] of Object.entries(batch[kind])) {
        counts[kind][songId] = (counts[kind][songId] ?? 0) + count;
      }
    }
    this.store.set(METRICS_KEY, counts);
  }

  private pending(): Counts {
    const counts = this.store.get<Partial<Counts>>(METRICS_KEY, {});
    return {plays: counts.plays ?? {}, downloads: counts.downloads ?? {}};
  }
}

function emptyCounts(): Counts {
  return {plays: {}, downloads: {}};
}

function isEmpty(counts: Counts): boolean {
  return !Object.keys(counts.plays).length && !Object.keys(counts.downloads).length;
}
