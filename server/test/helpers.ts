import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { buildApp } from '../src/app.js';
import type { Db } from '../src/db.js';
import { contentDisposition, type FileStore } from '../src/storage/types.js';

export const ids = {
  rustavi: '11111111-1111-4111-8111-111111111111',
  basiani: '22222222-2222-4222-8222-222222222222',
  oldChoir: '33333333-3333-4333-8333-333333333333',
  chakrulo: 'aaaaaaaa-0000-4000-8000-000000000001',
  mravalzhamieri: 'aaaaaaaa-0000-4000-8000-000000000002',
  shenXarVenaxi: 'aaaaaaaa-0000-4000-8000-000000000003',
  percentSong: 'aaaaaaaa-0000-4000-8000-000000000004',
  missingDataSong: 'aaaaaaaa-0000-4000-8000-000000000005',
  holiday: 'bbbbbbbb-0000-4000-8000-000000000001',
};

function adapt(client: PGlite | Transaction): Db['query'] {
  return async <R>(text: string, params?: unknown[]) => {
    const result = await client.query<R>(text, params);
    // node-postgres reports the row count for SELECTs too; PGlite only for writes.
    return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
  };
}

export async function createTestDb({ seed = true } = {}): Promise<Db> {
  const pg = new PGlite();
  await pg.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  if (seed) await pg.exec(`
    INSERT INTO media."Artist" ("Id", "ArtistType", "Name") VALUES
      ('${ids.rustavi}', 2, 'რუსთავი'),
      ('${ids.basiani}', 2, 'Basiani'),
      ('${ids.oldChoir}', 1, 'ძველი გუნდი');

    INSERT INTO media."Song" ("Id", "ArtistId", "SongType", "Name", "Path", "PlayCount") VALUES
      ('${ids.chakrulo}', '${ids.rustavi}', 1, 'ჩაკრულო', 'ensembles/რუსთავი/songs/ჩაკრულო.mp3', 10),
      ('${ids.mravalzhamieri}', '${ids.rustavi}', 1, 'მრავალჟამიერი', 'ensembles/რუსთავი/songs/მრავალჟამიერი.mp3', 3),
      ('${ids.shenXarVenaxi}', '${ids.rustavi}', 2, 'შენ ხარ ვენახი', 'ensembles/რუსთავი/chants/შენ ხარ ვენახი.mp3', 7),
      ('${ids.percentSong}', '${ids.basiani}', 1, 'Odoia 100%', 'ensembles/Basiani/songs/Odoia.mp3', 0),
      ('${ids.missingDataSong}', '${ids.basiani}', 1, 'Lost Tape', 'ensembles/Basiani/songs/missing.mp3', 0);

    INSERT INTO holiday."Holiday" ("Id", "Date", "Description", "ImagePath", "Title") VALUES
      ('${ids.holiday}', '2026-10-14T00:00:00Z', 'სვეტიცხოვლობა', 'holidays/svetitskhovloba.png', 'Svetitskhovloba');
    INSERT INTO holiday."HolidaySong" ("Id", "HolidayId", "SongId") VALUES
      (gen_random_uuid(), '${ids.holiday}', '${ids.shenXarVenaxi}');
  `);

  return {
    query: adapt(pg),
    transaction: (fn) =>
      pg.transaction((tx) => {
        const txDb: Db = { query: adapt(tx), transaction: (inner) => inner(txDb) };
        return fn(txDb);
      }),
  };
}

/** Serves "<folder>:<key>" as the file content; keys containing "missing" don't exist. */
const fakeStore = (folder: string): FileStore => ({
  async open(key, options) {
    if (key.includes('missing')) return null;
    const headers: Record<string, string> = { 'content-type': 'audio/mpeg' };
    if (options?.downloadName) headers['content-disposition'] = contentDisposition(options.downloadName);
    return { status: 200, headers, body: Readable.from([`${folder}:${key}`]) };
  },
});

export async function createTestApp() {
  const db = await createTestDb();
  let storageCheck = async () => {};
  const app = await buildApp({
    db,
    storage: { audio: fakeStore('audio'), images: fakeStore('images'), check: async () => storageCheck() },
    shortenUrl: async (url) => url,
    corsOrigins: ['http://localhost:4200'],
    publicBaseUrl: 'https://api.test',
  });
  return {
    app,
    db,
    failStorageCheck: () => {
      storageCheck = async () => {
        throw new Error('folder not shared');
      };
    },
  };
}
