import { randomUUID } from 'node:crypto';
import type { Db } from './db.js';
import { ArtistType, SongType } from './media.js';
import { FOLDER_MIME_TYPE, type DriveApi } from './storage/google-drive.js';

/**
 * Builds the artist/song catalog from the Drive folder layout the app has always used:
 * `<ensembles|oldRecordings>/<artist>/<songs|chants>/<file>.mp3`. Re-running only adds what is new.
 */

const ARTIST_TYPES: Record<string, number> = {
  ensembles: ArtistType.Ensemble,
  oldRecordings: ArtistType.OldRecording,
};
const AUDIO_FILE = /\.(mp3|m4a|aac|ogg|wav)$/i;
// Column sizes in media."Artist" / media."Song".
const MAX_ARTIST_NAME = 70;
const MAX_SONG_NAME = 150;
const MAX_PATH = 150;

export interface CatalogEntry {
  artistType: number;
  artistName: string;
  songType: number;
  songName: string;
  /** Relative path in Drive, stored as the song's `Path` and used to stream it. */
  path: string;
}

export interface Skipped {
  path: string;
  reason: string;
}

/** Lists every file below a folder as path segments, e.g. `['ensembles', 'Basiani', 'songs', 'x.mp3']`. */
export async function listFiles(api: DriveApi, folderId: string, parent: string[] = []): Promise<string[][]> {
  const files: string[][] = [];
  for (const item of await api.listChildren(folderId)) {
    const path = [...parent, item.name];
    if (item.mimeType === FOLDER_MIME_TYPE) {
      files.push(...(await listFiles(api, item.id, path)));
    } else {
      files.push(path);
    }
  }
  return files;
}

export function toCatalogEntries(files: string[][]): { entries: CatalogEntry[]; skipped: Skipped[] } {
  const entries: CatalogEntry[] = [];
  const skipped: Skipped[] = [];

  for (const segments of files) {
    const path = segments.join('/');
    const skip = (reason: string) => skipped.push({ path, reason });
    const [typeFolder, artistFolder] = segments;
    const fileName = segments[segments.length - 1]!;

    if (!AUDIO_FILE.test(fileName)) {
      skip('not an audio file');
      continue;
    }
    const artistType = ARTIST_TYPES[typeFolder!];
    if (segments.length < 3 || artistType === undefined) {
      skip('expected <ensembles|oldRecordings>/<artist>/.../<file>');
      continue;
    }

    const artistName = artistFolder!.trim();
    const songName = fileName.replace(AUDIO_FILE, '').trim();
    if (artistName.length > MAX_ARTIST_NAME) {
      skip(`artist name longer than ${MAX_ARTIST_NAME} characters`);
    } else if (songName.length > MAX_SONG_NAME) {
      skip(`song name longer than ${MAX_SONG_NAME} characters`);
    } else if (path.length > MAX_PATH) {
      skip(`path longer than ${MAX_PATH} characters`);
    } else {
      const inChantsFolder = segments.slice(2, -1).includes('chants');
      entries.push({
        artistType,
        artistName,
        songType: inChantsFolder ? SongType.Chant : SongType.Song,
        songName,
        path,
      });
    }
  }

  return { entries, skipped };
}

/** Adds missing artists and songs (matched by name+type and by path). Nothing is updated or deleted. */
export async function syncCatalog(db: Db, entries: CatalogEntry[]) {
  return db.transaction(async (tx) => {
    let artistsAdded = 0;
    let songsAdded = 0;
    const artistIds = new Map<string, string>();

    for (const entry of entries) {
      const artistKey = `${entry.artistType}/${entry.artistName}`;
      let artistId = artistIds.get(artistKey);
      if (!artistId) {
        const {
          rows: [existing],
        } = await tx.query<{ id: string }>(
          `SELECT "Id" AS id FROM media."Artist" WHERE "Name" = $1 AND "ArtistType" = $2`,
          [entry.artistName, entry.artistType],
        );
        artistId = existing?.id ?? randomUUID();
        if (!existing) {
          await tx.query(`INSERT INTO media."Artist" ("Id", "ArtistType", "Name") VALUES ($1, $2, $3)`, [
            artistId,
            entry.artistType,
            entry.artistName,
          ]);
          artistsAdded++;
        }
        artistIds.set(artistKey, artistId);
      }

      const { rowCount } = await tx.query(
        `INSERT INTO media."Song" ("Id", "ArtistId", "SongType", "Name", "Path")
         SELECT $1::uuid, $2::uuid, $3::integer, $4::varchar, $5::varchar
         WHERE NOT EXISTS (SELECT 1 FROM media."Song" WHERE "Path" = $5::varchar)`,
        [randomUUID(), artistId, entry.songType, entry.songName, entry.path],
      );
      songsAdded += rowCount;
    }

    return { artistsAdded, songsAdded };
  });
}
