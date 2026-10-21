import { describe, expect, it } from 'vitest';
import { feastsBetween, orthodoxEaster } from '../src/church-calendar.js';

const datesOf = (year: number) =>
  Object.fromEntries(feastsBetween(`${year}-01-01`, 364).map((feast) => [feast.key, feast.date]));

describe('church calendar', () => {
  it.each([
    [2024, '2024-05-05'],
    [2025, '2025-04-20'],
    [2026, '2026-04-12'],
    [2027, '2027-05-02'],
    [2030, '2030-04-28'],
  ])('puts Orthodox Easter %i on %s', (year, date) => {
    expect(orthodoxEaster(year)).toBe(date);
  });

  // Dates as published at orthodoxy.ge/calendar/2026 and sasoeba.ge/ka/kalendari/2027 (day pages).
  it.each([
    [2026, {
      'cheesefare': '2026-02-16', 'shio': '2026-02-19', 'great-lent': '2026-02-23', 'lazarus': '2026-04-04',
      'palm-sunday': '2026-04-05', 'good-friday': '2026-04-10', 'easter': '2026-04-12', 'myrrhbearers': '2026-04-26',
      'ascension': '2026-05-21', 'david-gareji': '2026-05-28', 'pentecost': '2026-05-31', 'trinity': '2026-06-01',
      'all-saints': '2026-06-07', 'apostles-fast': '2026-06-08', 'andrew-georgia': '2026-05-12', 'ketevan': '2026-09-26',
      'svetitskhovloba-summer': '2026-07-13', 'svetitskhovloba': '2026-10-14', 'archangels': '2026-11-21',
      'george-autumn': '2026-11-23', 'andrew': '2026-12-13',
    }],
    [2027, {
      'great-lent': '2027-03-15', 'lazarus': '2027-04-24', 'palm-sunday': '2027-04-25', 'holy-thursday': '2027-04-29',
      'good-friday': '2027-04-30', 'holy-saturday': '2027-05-01', 'easter': '2027-05-02', 'george-spring': '2027-05-06',
      'nino-arrival': '2027-06-01', 'ascension': '2027-06-10', 'david-gareji': '2027-06-17', 'pentecost': '2027-06-20',
      'apostles-fast': '2027-06-28', 'ketevan': '2027-09-26', 'svetitskhovloba': '2027-10-14',
    }],
  ])('matches the published %i calendar', (year, expected) => {
    expect(datesOf(year)).toMatchObject(expected);
  });

  it('lists feasts in a window, including its last day, and marks fasts', () => {
    expect(feastsBetween('2025-05-25', 14).map((feast) => `${feast.date} ${feast.title}`)).toEqual([
      '2025-05-29 ამაღლება',
      '2025-06-01 ნინოს საქართველოში შემოსვლა',
      '2025-06-05 მამადავითობა',
      '2025-06-08 სულთმოფენობა',
    ]);
    expect(feastsBetween('2026-11-25', 5)).toEqual([
      expect.objectContaining({ key: 'nativity-fast', date: '2026-11-28', kind: 'fast', songs: { include: [] } }),
    ]);
  });
});
