import { beforeEach, expect, it } from 'vitest';
import { createTestApp, ids } from './helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;
beforeEach(async () => {
  ctx = await createTestApp();
});

const dashboard = async (date: string) => (await ctx.app.inject(`/dashboard?date=${date}`)).json().body;

it('serves the day’s picks and the holidays of the next two weeks', async () => {
  const body = await dashboard('2026-10-10');

  expect(body.date).toBe('2026-10-10');
  expect(body.daySong).toMatchObject({ songType: 1 });
  expect(body.dayChant).toMatchObject({ id: ids.shenXarVenaxi });
  expect(body.discoverSong).toEqual(expect.objectContaining({ id: expect.any(String), path: expect.any(String) }));
  expect(body.holidays).toEqual([
    {
      id: ids.holiday,
      title: 'სვეტიცხოვლობა',
      date: '2026-10-14',
      imagePath: `https://api.test/holidays/${ids.holiday}/image`,
      songs: [expect.objectContaining({ id: ids.shenXarVenaxi })],
    },
  ]);

  // Past holidays and ones more than two weeks away are left out.
  expect((await dashboard('2026-10-15')).holidays).toEqual([]);
  expect((await dashboard('2026-09-29')).holidays).toEqual([]);
});

it('keeps the picks for a whole day and changes them between days', async () => {
  const first = await dashboard('2026-10-10');
  const again = await dashboard('2026-10-10');
  expect([again.daySong.id, again.discoverSong.id]).toEqual([first.daySong.id, first.discoverSong.id]);

  const days = await Promise.all(
    Array.from({ length: 10 }, (_, day) => dashboard(`2026-11-${String(day + 1).padStart(2, '0')}`)),
  );
  expect(new Set(days.map((body) => body.daySong.id)).size).toBeGreaterThan(1);
  expect(new Set(days.map((body) => body.discoverSong.id)).size).toBeGreaterThan(1);
});

it('serves holiday images with a cache lifetime', async () => {
  const image = await ctx.app.inject(`/holidays/${ids.holiday}/image`);
  expect(image.statusCode).toBe(200);
  expect(image.body).toBe('images:holidays/svetitskhovloba.png');
  expect(image.headers['cache-control']).toBe('public, max-age=86400');
});
