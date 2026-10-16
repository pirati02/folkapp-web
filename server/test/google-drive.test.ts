import { text } from 'node:stream/consumers';
import { describe, expect, it } from 'vitest';
import { DriveFileStore, MAX_RANGE_BYTES, type DriveApi } from '../src/storage/google-drive.js';

/** An in-memory Drive: folder id -> children by name. */
function fakeDrive(tree: Record<string, Record<string, string>>, files: Record<string, string>) {
  const calls = { findChild: 0, ranges: [] as (string | undefined)[] };
  const api: DriveApi = {
    async findChild(parentId, name) {
      calls.findChild++;
      return tree[parentId]?.[name] ?? null;
    },
    async download(fileId, range) {
      calls.ranges.push(range);
      const content = files[fileId];
      if (content === undefined) return new Response('not found', { status: 404 });
      return range
        ? new Response(content.slice(0, 2), {
            status: 206,
            headers: { 'content-type': 'audio/mpeg', 'content-range': `bytes 0-1/${content.length}` },
          })
        : new Response(content, {
            status: 200,
            headers: { 'content-type': 'audio/mpeg', 'content-length': String(content.length) },
          });
    },
    listChildren: async () => [],
    assertReadable: async () => {},
  };
  return { api, calls };
}

const tree = {
  root: { ensembles: 'f-ensembles' },
  'f-ensembles': { "Rustavi's": 'f-rustavi' },
  'f-rustavi': { songs: 'f-songs' },
  'f-songs': { 'chakrulo.mp3': 'file-1', 'odoia.mp3': 'file-2' },
};

describe('DriveFileStore', () => {
  it('resolves bucket-style keys through the mirrored folder tree and caches folders', async () => {
    const { api, calls } = fakeDrive(tree, { 'file-1': 'MP3DATA', 'file-2': 'OTHER' });
    const store = new DriveFileStore('root', api);

    expect(await store.resolve("ensembles/Rustavi's/songs/chakrulo.mp3")).toBe('file-1');
    expect(calls.findChild).toBe(4);

    expect(await store.resolve("ensembles/Rustavi's/songs/odoia.mp3")).toBe('file-2');
    expect(calls.findChild).toBe(5);
  });

  it('proxies bytes and forwards Range requests for seeking', async () => {
    const { api, calls } = fakeDrive(tree, { 'file-1': 'MP3DATA' });
    const store = new DriveFileStore('root', api);

    const partial = await store.open("ensembles/Rustavi's/songs/chakrulo.mp3", { range: 'bytes=0-1' });
    expect(partial).toMatchObject({
      status: 206,
      headers: { 'content-type': 'audio/mpeg', 'content-range': 'bytes 0-1/7', 'accept-ranges': 'bytes' },
    });
    expect(calls.ranges).toEqual(['bytes=0-1']);
    expect(await text(partial!.body)).toBe('MP');
  });

  it('caps open-ended and oversized ranges, and passes whole files through with their length', async () => {
    const { api, calls } = fakeDrive(tree, { 'file-1': 'MP3DATA' });
    const store = new DriveFileStore('root', api);
    const key = "ensembles/Rustavi's/songs/chakrulo.mp3";

    await store.open(key, { range: 'bytes=0-' });
    await store.open(key, { range: `bytes=100-${100 + MAX_RANGE_BYTES * 2}` });
    await store.open(key, { range: 'bytes=5-10' });
    await store.open(key, { range: 'bytes=-500' });
    expect(calls.ranges).toEqual([
      `bytes=0-${MAX_RANGE_BYTES - 1}`,
      `bytes=100-${100 + MAX_RANGE_BYTES - 1}`,
      'bytes=5-10',
      'bytes=-500',
    ]);

    const whole = await store.open(key);
    expect(whole?.status).toBe(200);
    expect(whole?.headers['content-length']).toBe('7');
  });

  it('reports Drive throttling as a retryable 503, and other failures as errors', async () => {
    const respondWith = (response: Response): DriveApi => ({
      findChild: async () => 'file-1',
      download: async () => response,
      listChildren: async () => [],
      assertReadable: async () => {},
    });
    const quota = JSON.stringify({ error: { errors: [{ reason: 'downloadQuotaExceeded' }] } });

    await expect(new DriveFileStore('root', respondWith(new Response(quota, { status: 403 }))).open('a.mp3')).rejects.toMatchObject({
      statusCode: 503,
    });
    await expect(new DriveFileStore('root', respondWith(new Response('', { status: 429 }))).open('a.mp3')).rejects.toMatchObject({
      statusCode: 503,
    });

    const forbidden = new DriveFileStore('root', respondWith(new Response('insufficientFilePermissions', { status: 403 })));
    await expect(forbidden.open('a.mp3')).rejects.toThrow(/403.*insufficientFilePermissions/);
  });

  it('returns null for missing files and retries misses later', async () => {
    const files: Record<string, string> = {};
    const songs: Record<string, string> = {};
    const { api } = fakeDrive({ ...tree, 'f-songs': songs }, files);
    const store = new DriveFileStore('root', api);

    expect(await store.open("ensembles/Rustavi's/songs/new.mp3")).toBeNull();

    songs['new.mp3'] = 'file-3';
    files['file-3'] = 'NEW';
    expect(await store.open("ensembles/Rustavi's/songs/new.mp3")).toMatchObject({ status: 200 });
  });
});
