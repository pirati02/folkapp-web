import {Song} from "./song";

export interface Holiday {
  id: string;
  title: string;
  /** `YYYY-MM-DD` */
  date: string;
  /** A fast begins that day (no songs); otherwise a feast. */
  kind: 'feast' | 'fast';
  /** Holidays entered with an image; feasts the server computes from the church calendar have none. */
  imagePath: string | null;
  /** For computed feasts: chants and songs whose names match the feast. */
  songs: Song[];
}

export interface Dashboard {
  /** The day the picks are for, `YYYY-MM-DD`. */
  date: string;
  /** Picked daily from the most played songs. */
  daySong: Song | null;
  dayChant: Song | null;
  /** Picked daily from the whole catalogue. */
  discoverSong: Song | null;
  /** Holidays from today through the next two weeks. */
  holidays: Holiday[];
}
