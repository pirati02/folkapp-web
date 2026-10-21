import { beforeEach, expect, it } from 'vitest';
import { createTestApp, ids } from './helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;
beforeEach(async () => {
  ctx = await createTestApp();
});

it('serves the dashboard for a date', async () => {
  const response = await ctx.app.inject('/dashboard?date=2026-10-14');
  const body = response.json().body;

  expect(body.daySong).toMatchObject({ id: ids.chakrulo });
  expect(body.dayChant).toMatchObject({ id: ids.shenXarVenaxi });
  expect(body.holidayItems).toEqual([
    {
      title: 'სვეტიცხოვლობა',
      imagePath: `https://api.test/holidays/${ids.holiday}/image`,
      holidaySongs: [expect.objectContaining({ id: ids.shenXarVenaxi })],
    },
  ]);

  const image = await ctx.app.inject(`/holidays/${ids.holiday}/image`);
  expect(image.statusCode).toBe(200);
  expect(image.body).toBe('images:holidays/svetitskhovloba.png');

  const otherDay = await ctx.app.inject('/dashboard?date=2026-10-15');
  expect(otherDay.json().body.holidayItems).toEqual([]);
});
