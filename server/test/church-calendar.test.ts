import { describe, expect, it } from 'vitest';
import { feastsBetween, orthodoxEaster } from '../src/church-calendar.js';

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

  it('lists fixed and movable feasts in a window, including its last day', () => {
    expect(feastsBetween('2025-05-25', 14).map((feast) => `${feast.date} ${feast.title}`)).toEqual([
      '2025-05-29 ამაღლება',
      '2025-06-08 სულთმოფენობა',
    ]);
    expect(feastsBetween('2026-10-01', 13)).toEqual([expect.objectContaining({ key: 'svetitskhovloba', date: '2026-10-14' })]);
  });
});
