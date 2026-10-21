import {Song} from "./song";

export interface Holiday {
  id: string;
  title: string;
  /** `YYYY-MM-DD` */
  date: string;
  imagePath: string;
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
