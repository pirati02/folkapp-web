import { beforeEach, expect, it } from 'vitest';
import { bearer, createTestApp, ids } from './helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;
let token: string;

async function signUp(email: string) {
  await ctx.app.inject({
    method: 'POST',
    url: '/account/register',
    payload: { firstName: 'A', lastName: 'B', email, password: 'hunter22' },
  });
  const login = await ctx.app.inject({
    method: 'POST',
    url: '/account/login',
    payload: { email, password: 'hunter22', deviceId: 'd', platformOs: 1 },
  });
  return login.json().body as string;
}

async function playLists(as = token) {
  return (await ctx.app.inject({ url: '/PlayList', headers: bearer(as) })).json().body;
}

const update = (id: string, songId: string[], action: number, as = token) =>
  ctx.app.inject({ method: 'PUT', url: `/playlist/${id}`, headers: bearer(as), payload: { songId, action } });

beforeEach(async () => {
  ctx = await createTestApp();
  token = await signUp('owner@folk.ge');
});

it('creates, edits and deletes a playlist', async () => {
  const created = await ctx.app.inject({
    method: 'POST',
    url: '/playlist',
    headers: bearer(token),
    payload: { name: 'Supra', songs: [ids.chakrulo] },
  });
  expect(created.json()).toEqual({ body: true, error: null });

  const [playList] = await playLists();
  expect(playList).toMatchObject({ name: 'Supra', songs: [{ id: ids.chakrulo, path: expect.stringContaining('/stream') }] });

  expect((await update(playList.playListId, [ids.chakrulo], 1)).statusCode).toBe(409);
  expect((await update(playList.playListId, [ids.chakrulo, ids.mravalzhamieri], 1)).statusCode).toBe(200);
  expect((await playLists())[0].songs).toHaveLength(2);

  expect((await update(playList.playListId, [ids.chakrulo], 2)).statusCode).toBe(200);
  expect((await update(playList.playListId, [ids.chakrulo], 2)).statusCode).toBe(404);

  const deleted = await ctx.app.inject({ method: 'DELETE', url: `/playlist/${playList.playListId}`, headers: bearer(token) });
  expect(deleted.statusCode).toBe(200);
  expect(await playLists()).toEqual([]);
});

it('rejects unknown songs and duplicate names', async () => {
  const create = (songs: string[]) =>
    ctx.app.inject({ method: 'POST', url: '/playlist', headers: bearer(token), payload: { name: 'Mine', songs } });

  expect((await create(['00000000-0000-4000-8000-000000000000'])).statusCode).toBe(404);
  expect((await create([])).statusCode).toBe(200);
  expect((await create([])).statusCode).toBe(409);
});

it('keeps playlists private to their owner', async () => {
  await ctx.app.inject({ method: 'POST', url: '/playlist', headers: bearer(token), payload: { name: 'Mine', songs: [] } });
  const [mine] = await playLists();

  const other = await signUp('other@folk.ge');
  expect(await playLists(other)).toEqual([]);
  expect((await update(mine.playListId, [ids.chakrulo], 1, other)).statusCode).toBe(404);
  const deleted = await ctx.app.inject({ method: 'DELETE', url: `/playlist/${mine.playListId}`, headers: bearer(other) });
  expect(deleted.statusCode).toBe(404);

  // Another user may reuse the same name.
  const sameName = await ctx.app.inject({
    method: 'POST',
    url: '/playlist',
    headers: bearer(other),
    payload: { name: 'Mine', songs: [] },
  });
  expect(sameName.statusCode).toBe(200);
});

it('serves the dashboard for a date', async () => {
  const response = await ctx.app.inject({ url: '/dashboard?date=2026-10-14', headers: bearer(token) });
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

  const otherDay = await ctx.app.inject({ url: '/dashboard?date=2026-10-15', headers: bearer(token) });
  expect(otherDay.json().body.holidayItems).toEqual([]);
  expect((await ctx.app.inject('/dashboard')).statusCode).toBe(401);
});
