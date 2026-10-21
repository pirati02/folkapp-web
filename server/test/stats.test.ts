import { beforeEach, expect, it } from 'vitest';
import { createTestApp, ids } from './helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;
beforeEach(async () => {
  ctx = await createTestApp();
});

it('reports catalogue totals and the most played and downloaded', async () => {
  await ctx.db.query(`UPDATE media."Song" SET "DownloadCount" = 4 WHERE "Id" = $1`, [ids.mravalzhamieri]);
  const body = (await ctx.app.inject('/stats')).json().body;

  expect(body.totals).toEqual({ songs: 4, chants: 1, plays: 20, downloads: 4, artists: 3 });
  expect(body.topPlayed.map((song: { id: string; plays: number }) => [song.id, song.plays])).toEqual([
    [ids.chakrulo, 10],
    [ids.shenXarVenaxi, 7],
    [ids.mravalzhamieri, 3],
  ]);
  expect(body.topPlayed[0]).toMatchObject({ name: 'ჩაკრულო', artistName: 'რუსთავი', downloads: 0 });
  expect(body.topDownloaded).toEqual([expect.objectContaining({ id: ids.mravalzhamieri, downloads: 4 })]);
  expect(body.artists).toEqual([{ id: ids.rustavi, name: 'რუსთავი', plays: 20, downloads: 4, songs: 3 }]);
});
