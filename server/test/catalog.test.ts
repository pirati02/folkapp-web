import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, ids } from './helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;
beforeEach(async () => {
  ctx = await createTestApp();
});

describe('artists', () => {
  it('lists artists of a type, sorted, with the { body, error } envelope', async () => {
    // The web app calls `/Artists/...` with a capital A.
    const response = await ctx.app.inject('/Artists/2/all');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      body: [
        { id: ids.basiani, name: 'Basiani', artistType: 'ensembles' },
        { id: ids.rustavi, name: 'რუსთავი', artistType: 'ensembles' },
      ],
      error: null,
    });
  });

  it('returns an artist by id', async () => {
    const response = await ctx.app.inject(`/artists/${ids.oldChoir}`);
    expect(response.json().body).toEqual({ id: ids.oldChoir, name: 'ძველი გუნდი', artistType: 'oldRecordings' });
  });

  it.each([['/artists/00000000-0000-4000-8000-000000000000'], ['/artists/not-a-guid'], ['/artists/abc/all']])(
    '404s for %s',
    async (url) => {
      const response = await ctx.app.inject(url);
      expect(response.statusCode).toBe(404);
      expect(response.json().body).toBeNull();
      expect(response.json().error.message).toBeTruthy();
    },
  );
});

describe('songs', () => {
  it('splits an artist’s songs and chants and links to the stable stream URL', async () => {
    const response = await ctx.app.inject(`/songs/${ids.rustavi}/all`);
    const { songs, chants } = response.json().body;

    expect(songs.map((song: { name: string }) => song.name)).toEqual(['მრავალჟამიერი', 'ჩაკრულო']);
    expect(chants).toEqual([
      {
        id: ids.shenXarVenaxi,
        name: 'შენ ხარ ვენახი',
        songType: 2,
        artistName: 'რუსთავი',
        artistId: ids.rustavi,
        path: `https://api.test/songs/${ids.shenXarVenaxi}/stream`,
      },
    ]);
  });

  it('streams a song from storage by its path', async () => {
    const response = await ctx.app.inject(`/songs/${ids.chakrulo}/stream`);
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('audio/mpeg');
    expect(response.headers['content-disposition']).toBeUndefined();
    expect(response.body).toBe('audio:ensembles/რუსთავი/songs/ჩაკრულო.mp3');
  });

  it('serves the file endpoint as a download', async () => {
    const response = await ctx.app.inject(`/songs/${ids.chakrulo}/file`);
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-disposition']).toContain(`filename*=UTF-8''${encodeURIComponent('ჩაკრულო.mp3')}`);
  });

  it('distinguishes a missing song from a missing file', async () => {
    const unknown = await ctx.app.inject('/songs/00000000-0000-4000-8000-000000000000/stream');
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json().error.message).toBe('Song not found.');

    const noData = await ctx.app.inject(`/songs/${ids.missingDataSong}/stream`);
    expect(noData.statusCode).toBe(404);
    expect(noData.json().error.message).toBe('Song data not found.');
  });

  it('shares the stable song link', async () => {
    const response = await ctx.app.inject(`/songs/${ids.chakrulo}/share`);
    expect(response.json().body).toBe(`https://api.test/songs/${ids.chakrulo}/stream`);
  });

  it('logs plays and downloads', async () => {
    const play = await ctx.app.inject({ method: 'PUT', url: `/songs/${ids.chakrulo}/log`, payload: { logType: 0 } });
    const download = await ctx.app.inject({ method: 'PUT', url: `/songs/${ids.chakrulo}/log`, payload: { logType: 1 } });
    expect([play.statusCode, download.statusCode]).toEqual([200, 200]);

    const { rows } = await ctx.db.query<{ PlayCount: number; DownloadCount: number }>(
      `SELECT "PlayCount", "DownloadCount" FROM media."Song" WHERE "Id" = $1`,
      [ids.chakrulo],
    );
    expect(rows[0]).toEqual({ PlayCount: 11, DownloadCount: 1 });
  });

  it('rejects an invalid log body', async () => {
    const response = await ctx.app.inject({ method: 'PUT', url: `/songs/${ids.chakrulo}/log`, payload: { logType: 7 } });
    expect(response.statusCode).toBe(400);
  });
});

describe('search', () => {
  it('finds artists and songs by partial name', async () => {
    const response = await ctx.app.inject(`/search/${encodeURIComponent('რუსთ')}`);
    const { artists, songs } = response.json().body;
    expect(artists.map((artist: { id: string }) => artist.id)).toEqual([ids.rustavi]);
    expect(songs).toEqual([]);
  });

  it('is case-insensitive and treats LIKE wildcards literally', async () => {
    const percent = await ctx.app.inject(`/search/${encodeURIComponent('0%')}`);
    expect(percent.json().body.songs.map((song: { id: string }) => song.id)).toEqual([ids.percentSong]);

    const underscore = await ctx.app.inject('/search/_');
    expect(underscore.json().body).toEqual({ artists: [], songs: [] });

    const lowercase = await ctx.app.inject('/search/odoia');
    expect(lowercase.json().body.songs).toHaveLength(1);
  });
});

it('reports health of the database and storage without leaking details', async () => {
  expect((await ctx.app.inject('/health')).json()).toEqual({ status: 'ok', database: 'ok', storage: 'ok' });

  ctx.failStorageCheck();
  const unhealthy = await ctx.app.inject('/health');
  expect(unhealthy.statusCode).toBe(503);
  expect(unhealthy.json()).toEqual({ status: 'error', database: 'ok', storage: 'error' });
});

it('answers CORS preflight for the web app', async () => {
  const response = await ctx.app.inject({
    method: 'OPTIONS',
    url: '/artists/2/all',
    headers: { origin: 'http://localhost:4200', 'access-control-request-method': 'GET' },
  });
  expect(response.headers['access-control-allow-origin']).toBe('http://localhost:4200');
});
