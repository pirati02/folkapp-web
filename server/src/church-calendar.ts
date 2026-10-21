/**
 * Georgian Orthodox feasts, computed so the home page has them without anyone entering dates.
 * Fixed feasts are given in the civil (Gregorian) calendar, as the Georgian Church keeps the
 * Julian calendar 13 days behind; movable ones are counted from Orthodox Easter.
 *
 * Each feast lists name fragments of its chants and songs in the catalogue (matched with ILIKE),
 * and fragments to leave out where a word is shared with another feast.
 */
export interface Feast {
  key: string;
  title: string;
  /** `YYYY-MM-DD` */
  date: string;
  songs: { include: string[]; exclude?: string[] };
}

type FeastRule = Omit<Feast, 'date'> & ({ month: number; day: number } | { daysFromEaster: number });

const RULES: FeastRule[] = [
  {
    key: 'christmas', title: 'შობა', month: 1, day: 7,
    songs: { include: ['შობის', 'შობა შენი', 'შობამან', 'ალილო', 'ქალწული დღეს', 'საიდუმლო უცხო'], exclude: ['ჭონა'] },
  },
  { key: 'theophany', title: 'ნათლისღება', month: 1, day: 19, songs: { include: ['ნათლისღ', 'იორდან'] } },
  { key: 'nino', title: 'ნინოობა', month: 1, day: 27, songs: { include: ['ნინოს'] } },
  { key: 'presentation', title: 'მირქმა', month: 2, day: 15, songs: { include: ['აწ განუტევე'] } },
  { key: 'annunciation', title: 'ხარება', month: 4, day: 7, songs: { include: ['ხარების'] } },
  { key: 'george-spring', title: 'გიორგობა', month: 5, day: 6, songs: { include: ['გიორგის'] } },
  { key: 'transfiguration', title: 'ფერისცვალება', month: 8, day: 19, songs: { include: ['მთასა ზედა', 'ფერისცვალ'] } },
  { key: 'dormition', title: 'მარიამობა', month: 8, day: 28, songs: { include: ['მიძინებ', 'მარიამობ'] } },
  {
    key: 'exaltation', title: 'ჯვართამაღლება', month: 9, day: 27,
    songs: { include: ['ჯვარსა შენსა', 'ჯვარსა ზედა ამაღლებ'] },
  },
  { key: 'svetitskhovloba', title: 'სვეტიცხოვლობა', month: 10, day: 14, songs: { include: ['სვეტიცხოვ'] } },
  { key: 'george-autumn', title: 'გიორგობა', month: 11, day: 23, songs: { include: ['გიორგის'] } },
  { key: 'palm-sunday', title: 'ბზობა', daysFromEaster: -7, songs: { include: ['ბზობ'] } },
  {
    key: 'good-friday', title: 'წითელი პარასკევი', daysFromEaster: -2,
    songs: { include: ['ჯვარსა', 'ავაზაკ', 'ვნებ', 'შთახედ'], exclude: ['ამაღლებ'] },
  },
  {
    key: 'easter', title: 'აღდგომა', daysFromEaster: 0,
    songs: { include: ['აღდგომ', 'აღსდგა', 'აღდგა', 'ჭონა', 'ანგელოზი ღაღადებს'] },
  },
  { key: 'ascension', title: 'ამაღლება', daysFromEaster: 39, songs: { include: ['ამაღლ'], exclude: ['ჯვარსა', 'აღამაღლებ'] } },
  { key: 'pentecost', title: 'სულთმოფენობა', daysFromEaster: 49, songs: { include: ['სულთმოფენ', 'მეუფეო ზეცათა'] } },
];

const DAY_MS = 86_400_000;
const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Orthodox Easter in the civil calendar (Meeus' Julian algorithm + 13 days; valid 1900–2099). */
export function orthodoxEaster(year: number): string {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return iso(new Date(Date.UTC(year, month - 1, day) + 13 * DAY_MS));
}

/** The feasts from `from` through `days` days later (both `YYYY-MM-DD`), in date order. */
export function feastsBetween(from: string, days: number): Feast[] {
  const start = Date.parse(from);
  const end = start + days * DAY_MS;
  const year = new Date(start).getUTCFullYear();

  const feasts: Feast[] = [];
  // The window can cross into the next year.
  for (const y of [year, year + 1]) {
    const easter = Date.parse(orthodoxEaster(y));
    for (const rule of RULES) {
      const time = 'daysFromEaster' in rule ? easter + rule.daysFromEaster * DAY_MS : Date.UTC(y, rule.month - 1, rule.day);
      if (time >= start && time <= end) {
        feasts.push({ key: rule.key, title: rule.title, songs: rule.songs, date: iso(new Date(time)) });
      }
    }
  }
  return feasts.sort((a, b) => a.date.localeCompare(b.date));
}
