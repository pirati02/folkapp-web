const MONTHS = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
];

/** This device's date as `YYYY-MM-DD` (not UTC, which is a day behind in Georgia before 4am). */
export function localIsoDate(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "დღეს", "ხვალ", or e.g. "14 ოქტომბერი", for a `YYYY-MM-DD` date relative to `today`. */
export function relativeDayLabel(date: string, today: string): string {
  const days = (Date.parse(date) - Date.parse(today)) / 86_400_000;
  if (days === 0) return 'დღეს';
  if (days === 1) return 'ხვალ';
  const [, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}
