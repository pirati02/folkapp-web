import { describe, expect, it } from 'vitest';
import { listFiles, syncCatalog, toCatalogEntries } from '../src/catalog-sync.js';
import { FOLDER_MIME_TYPE, type DriveApi, type DriveItem } from '../src/storage/google-drive.js';
import { createTestDb } from './helpers.js';

const folder = (id: string, name: string): DriveItem => ({ id, name, mimeType: FOLDER_MIME_TYPE });
const mp3 = (id: string, name: string): DriveItem => ({ id, name, mimeType: 'audio/mpeg' });

const children: Record<string, DriveItem[]> = {
  root: [folder('ens', 'ensembles'), folder('old', 'oldRecordings'), mp3('stray', 'stray.mp3')],
  ens: [folder('rustavi', 'რუსთავი ')],
  rustavi: [folder('rs', 'songs'), folder('rc', 'chants')],
  rs: [mp3('1', 'ჩაკრულო.mp3'), { id: '2', name: 'cover.jpg', mimeType: 'image/jpeg' }],
  rc: [mp3('3', 'შენ ხარ ვენახი.mp3')],
  old: [folder('choir', 'Old Choir')],
  choir: [mp3('4', 'Lazare.mp3')],
};

const api: DriveApi = {
  listChildren: async (id) => children[id] ?? [],
  findChild: async () => null,
  download: async () => new Response(null, { status: 404 }),
  assertReadable: async () => {},
};

describe('catalog sync from Drive', () => {
  it('maps the folder layout to artists and songs, skipping anything else', async () => {
    const { entries, skipped } = toCatalogEntries(await listFiles(api, 'root'));

    expect(entries).toEqual([
      { artistType: 2, artistName: 'რუსთავი', songType: 1, songName: 'ჩაკრულო', path: 'ensembles/რუსთავი /songs/ჩაკრულო.mp3' },
      {
        artistType: 2,
        artistName: 'რუსთავი',
        songType: 2,
        songName: 'შენ ხარ ვენახი',
        path: 'ensembles/რუსთავი /chants/შენ ხარ ვენახი.mp3',
      },
      { artistType: 1, artistName: 'Old Choir', songType: 1, songName: 'Lazare', path: 'oldRecordings/Old Choir/Lazare.mp3' },
    ]);
    expect(skipped.map((item) => item.path)).toEqual(['ensembles/რუსთავი /songs/cover.jpg', 'stray.mp3']);
  });

  it('fills an empty database and only adds new songs on re-runs', async () => {
    const db = await createTestDb({ seed: false });
    const { entries } = toCatalogEntries(await listFiles(api, 'root'));

    expect(await syncCatalog(db, entries)).toEqual({ artistsAdded: 2, songsAdded: 3 });
    expect(await syncCatalog(db, entries)).toEqual({ artistsAdded: 0, songsAdded: 0 });

    children.choir!.push(mp3('5', 'Odoia.mp3'));
    const { entries: updated } = toCatalogEntries(await listFiles(api, 'root'));
    expect(await syncCatalog(db, updated)).toEqual({ artistsAdded: 0, songsAdded: 1 });

    const { rows } = await db.query<{ name: string; artists: number }>(
      `SELECT a."Name" AS name, count(*)::int AS artists
       FROM media."Song" s JOIN media."Artist" a ON a."Id" = s."ArtistId" GROUP BY a."Name" ORDER BY a."Name"`,
    );
    expect(rows).toEqual([
      { name: 'Old Choir', artists: 2 },
      { name: 'რუსთავი', artists: 2 },
    ]);
  });
});
