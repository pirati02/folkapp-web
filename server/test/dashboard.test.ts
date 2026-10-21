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
      kind: 'feast',
      imagePath: `https://api.test/holidays/${ids.holiday}/image`,
      songs: [expect.objectContaining({ id: ids.shenXarVenaxi })],
    },
  ]);

  // The computed feast on that day gives way to the entered one.
  expect(body.holidays.filter((holiday: { date: string }) => holiday.date === '2026-10-14')).toHaveLength(1);

  // Past holidays and ones more than two weeks away are left out; a quiet fortnight shows the next feast.
  expect((await dashboard('2026-10-15')).holidays).toEqual([expect.objectContaining({ title: 'მთავარანგელოზთა კრება', date: '2026-11-21' })]);
  expect((await dashboard('2026-09-29')).holidays).toEqual([expect.objectContaining({ title: 'მცხეთობა - სვეტიცხოვლობა', date: '2026-10-14' })]);
});

it('adds church feasts with the chants matching them', async () => {
  await ctx.db.query(
    `INSERT INTO media."Song" ("Id", "ArtistId", "SongType", "Name", "Path") VALUES
      (gen_random_uuid(), $1, 2, 'ქრისტე აღსდგა', 'x.mp3'),
      (gen_random_uuid(), $1, 1, 'ჭონა ალილო', 'y.mp3'),
      (gen_random_uuid(), $1, 1, 'კახური ალილო', 'z.mp3')`,
    [ids.rustavi],
  );

  // Orthodox Easter 2026 is on 12 April, Palm Sunday a week before.
  const spring = await dashboard('2026-04-05');
  expect(spring.holidays.map((holiday: { title: string; date: string }) => `${holiday.date} ${holiday.title}`)).toEqual([
    '2026-04-05 ბზობა',
    '2026-04-07 ხარება',
    '2026-04-09 დიდი ხუთშაბათი',
    '2026-04-10 დიდი პარასკევი',
    '2026-04-11 დიდი შაბათი',
    '2026-04-12 აღდგომა',
  ]);
  const easter = spring.holidays.find((holiday: { title: string }) => holiday.title === 'აღდგომა');
  expect(easter).toMatchObject({ id: 'easter-2026-04-12', kind: 'feast', imagePath: null });
  expect(easter.songs.map((song: { name: string }) => song.name)).toEqual(['ქრისტე აღსდგა', 'ჭონა ალილო']);

  // Christmas takes ალილო carols, but not the Easter ჭონა ალილო; the window crosses into January.
  const christmas = (await dashboard('2026-12-30')).holidays.find((holiday: { title: string }) => holiday.title === 'ქრისტეშობა');
  expect(christmas.date).toBe('2027-01-07');
  expect(christmas.songs.map((song: { name: string }) => song.name)).toEqual(['კახური ალილო']);
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
