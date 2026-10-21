/**
 * Georgian Orthodox feasts and fasts, computed so the home page has them without anyone entering
 * dates. Fixed days are given in the civil (Gregorian) calendar, as the Georgian Church keeps the
 * Julian calendar 13 days behind; movable ones are counted from Orthodox Easter. Checked against
 * orthodoxy.ge (2026) and sasoeba.ge (2027); see test/church-calendar.test.ts.
 *
 * Each feast lists name fragments of its chants and songs in the catalogue (matched with ILIKE),
 * and fragments to leave out where a word is shared with another feast.
 */
export interface Feast {
  key: string;
  title: string;
  /** `YYYY-MM-DD` */
  date: string;
  /** A fast begins that day; it has no songs. */
  kind: 'feast' | 'fast';
  songs: { include: string[]; exclude?: string[] };
}

type FeastRule = Omit<Feast, 'date' | 'kind' | 'songs'> & {
  kind?: Feast['kind'];
  songs?: Feast['songs'];
} & ({ month: number; day: number } | { daysFromEaster: number });

const RULES: FeastRule[] = [
  // Fixed
  {
    key: 'christmas', title: 'ქრისტეშობა', month: 1, day: 7,
    songs: { include: ['შობის', 'შობამან', 'ალილო', 'ქალწული დღეს', 'საიდუმლო უცხო'], exclude: ['ჭონა'] },
  },
  { key: 'circumcision', title: 'წინადაცვეთა', month: 1, day: 14, songs: { include: ['წინადაცვეთ', 'ბასილ'] } },
  { key: 'theophany-eve', title: 'ნათლისღების წინა დღე', kind: 'fast', month: 1, day: 18 },
  { key: 'theophany', title: 'ნათლისღება', month: 1, day: 19, songs: { include: ['ნათლისღ', 'იორდან'] } },
  { key: 'nino', title: 'ნინოობა', month: 1, day: 27, songs: { include: ['ნინოს'] } },
  { key: 'presentation', title: 'მირქმა', month: 2, day: 15, songs: { include: ['აწ განუტევე'] } },
  { key: 'autocephaly', title: 'ავტოკეფალიის აღდგენის დღე', month: 3, day: 25 },
  { key: 'annunciation', title: 'ხარება', month: 4, day: 7, songs: { include: ['ხარების'] } },
  { key: 'george-spring', title: 'გიორგობა', month: 5, day: 6, songs: { include: ['გიორგის'] } },
  {
    key: 'andrew-georgia', title: 'წილხვდომილობა, ანდრიაობა', month: 5, day: 12,
    songs: { include: ['ანდრია', 'წილხვდომილ'] },
  },
  { key: 'nino-arrival', title: 'ნინოს საქართველოში შემოსვლა', month: 6, day: 1, songs: { include: ['ნინოს'] } },
  { key: 'john-nativity', title: 'იოანე ნათლისმცემლის შობა', month: 7, day: 7, songs: { include: ['ნათლისმცემ'] } },
  {
    key: 'peter-paul', title: 'პეტრე-პავლობა', month: 7, day: 12,
    songs: { include: ['პეტრე', 'პავლე', 'მოციქულთა თავნო'] },
  },
  { key: 'svetitskhovloba-summer', title: 'სვეტიცხოვლობა', month: 7, day: 13, songs: { include: ['სვეტიცხოვ'] } },
  { key: 'ilia', title: 'ილიაობა', month: 8, day: 2, songs: { include: ['ილიას', 'ელიას'] } },
  { key: 'dormition-fast', title: 'მარიამობის მარხვა', kind: 'fast', month: 8, day: 14 },
  { key: 'transfiguration', title: 'ფერისცვალება', month: 8, day: 19, songs: { include: ['მთასა ზედა', 'ფერისცვალ'] } },
  { key: 'dormition', title: 'მარიამობა', month: 8, day: 28, songs: { include: ['მიძინებ', 'მარიამობ'] } },
  { key: 'beheading', title: 'იოანე ნათლისმცემლის თავისკვეთა', month: 9, day: 11, songs: { include: ['ნათლისმცემ'] } },
  { key: 'theotokos-nativity', title: 'ღვთისმშობლის შობა', month: 9, day: 21, songs: { include: ['შობა შენი'] } },
  { key: 'ketevan', title: 'ქეთევან დედოფლის ხსენება', month: 9, day: 26, songs: { include: ['ქეთევან'] } },
  {
    key: 'exaltation', title: 'ჯვართამაღლება', month: 9, day: 27,
    songs: { include: ['ჯვარსა შენსა', 'ჯვარსა ზედა ამაღლებ'] },
  },
  { key: 'svetitskhovloba', title: 'მცხეთობა - სვეტიცხოვლობა', month: 10, day: 14, songs: { include: ['სვეტიცხოვ', 'მცხეთ'] } },
  { key: 'archangels', title: 'მთავარანგელოზთა კრება', month: 11, day: 21, songs: { include: ['მთავარანგელოზ', 'მიქაელ'] } },
  { key: 'george-autumn', title: 'გიორგობა', month: 11, day: 23, songs: { include: ['გიორგის'] } },
  { key: 'nativity-fast', title: 'ქრისტეშობის მარხვა', kind: 'fast', month: 11, day: 28 },
  { key: 'entry', title: 'ღვთისმშობლის ტაძრად მიყვანება', month: 12, day: 4, songs: { include: ['ტაძრად'] } },
  { key: 'andrew', title: 'ანდრიაობა', month: 12, day: 13, songs: { include: ['ანდრია'] } },

  // Movable, from Orthodox Easter
  { key: 'cheesefare', title: 'ყველიერი', kind: 'fast', daysFromEaster: -55 },
  { key: 'shio', title: 'შიო მღვიმელის ხსენება', daysFromEaster: -52, songs: { include: ['შიო მღვიმ'] } },
  { key: 'great-lent', title: 'დიდი მარხვა', kind: 'fast', daysFromEaster: -48 },
  { key: 'lazarus', title: 'ლაზარეს შაბათი', daysFromEaster: -8, songs: { include: ['ლაზარეს'] } },
  { key: 'palm-sunday', title: 'ბზობა', daysFromEaster: -7, songs: { include: ['ბზობ'] } },
  { key: 'holy-thursday', title: 'დიდი ხუთშაბათი', daysFromEaster: -3, songs: { include: ['სერობ'] } },
  {
    key: 'good-friday', title: 'დიდი პარასკევი', daysFromEaster: -2,
    songs: { include: ['ჯვარსა', 'ავაზაკ', 'ვნებ'], exclude: ['ამაღლებ'] },
  },
  { key: 'holy-saturday', title: 'დიდი შაბათი', daysFromEaster: -1, songs: { include: ['შთახედ'] } },
  {
    key: 'easter', title: 'აღდგომა', daysFromEaster: 0,
    songs: { include: ['აღდგომ', 'აღსდგა', 'აღდგა', 'ჭონა', 'ანგელოზი ღაღადებს'] },
  },
  {
    key: 'myrrhbearers', title: 'მენელსაცხებლე დედები, თამარობა', daysFromEaster: 14,
    songs: { include: ['მენელსაცხებ', 'თამარ დედ', 'თამარ მეფ'] },
  },
  {
    key: 'ascension', title: 'ამაღლება', daysFromEaster: 39,
    songs: { include: ['ამაღლ'], exclude: ['ჯვარსა', 'აღამაღლებ'] },
  },
  { key: 'david-gareji', title: 'მამადავითობა', daysFromEaster: 46, songs: { include: ['დავით გარეჯ', 'მამადავით'] } },
  { key: 'pentecost', title: 'სულთმოფენობა', daysFromEaster: 49, songs: { include: ['სულთმოფენ', 'მეუფეო ზეცათა'] } },
  { key: 'trinity', title: 'სულიწმიდის დღე, სამებობა', daysFromEaster: 50, songs: { include: ['სამებ'] } },
  { key: 'all-saints', title: 'ყოველთა წმიდათა', daysFromEaster: 56, songs: { include: ['ყოველთა წმიდათა'] } },
  { key: 'apostles-fast', title: 'პეტრე-პავლობის მარხვა', kind: 'fast', daysFromEaster: 57 },
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

/** The feasts and fast starts from `from` through `days` days later (both `YYYY-MM-DD`), in date order. */
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
        feasts.push({
          key: rule.key,
          title: rule.title,
          date: iso(new Date(time)),
          kind: rule.kind ?? 'feast',
          songs: rule.songs ?? { include: [] },
        });
      }
    }
  }
  return feasts.sort((a, b) => a.date.localeCompare(b.date));
}
