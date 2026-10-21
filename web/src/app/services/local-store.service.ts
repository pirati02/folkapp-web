import {Injectable} from '@angular/core';

/**
 * JSON values kept on this device. Storage can be missing or full (private mode, blocked site
 * data), so reads fall back to a default and failed writes are ignored instead of breaking the app.
 */
@Injectable({providedIn: 'root'})
export class LocalStore {
  get<T>(key: string, fallback: T): T {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Nothing to do: the value just won't survive a reload.
    }
  }
}
