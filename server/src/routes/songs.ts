import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { RouteDeps } from '../app.js';
import { errors, ok, parse, uuidParam } from '../http.js';
import { SONG_COLUMNS, SONGS_WITH_ARTIST, SongType, toSong, type SongRow } from '../media.js';
import { sendFile } from '../storage/types.js';

type SongRequest = FastifyRequest<{ Params: { id: string } }>;

// SongLogType in the .NET API: Played = 0, Downloaded = 1.
const logBody = z.object({ logType: z.union([z.literal(0), z.literal(1)]) });

/** One device can't sensibly play a song more often than this between two batches. */
const MAX_COUNT_PER_BATCH = 100;
const MAX_SONGS_PER_BATCH = 500;
const counts = z
  .record(z.guid(), z.number().int().min(1).transform((count) => Math.min(count, MAX_COUNT_PER_BATCH)))
  .refine((record) => Object.keys(record).length <= MAX_SONGS_PER_BATCH, `At most ${MAX_SONGS_PER_BATCH} songs`)
  .default({});
const metricsBody = z.object({ plays: counts, downloads: counts });

const popularQuery = z.object({
  type: z.coerce.number().pipe(z.union([z.literal(SongType.Song), z.literal(SongType.Chant)])).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const listQuery = z.object({ sort: z.enum(['name', 'popular']).default('name') });

export function songRoutes(app: FastifyInstance, { db, storage, links, shortenUrl, webBaseUrl }: RouteDeps) {
  async function findSong(id: string) {
    const {
      rows: [song],
    } = await db.query<{ name: string; path: string }>(
      `SELECT "Name" AS name, "Path" AS path FROM media."Song" WHERE "Id" = $1`,
      [id],
    );
    if (!song) {
      throw errors.songNotFound();
    }
    return song;
  }

  async function sendSongFile(request: SongRequest, reply: FastifyReply, download: boolean) {
    const song = await findSong(uuidParam(request.params.id));
    const file = await storage.audio.open(song.path, {
      range: request.headers.range,
      downloadName: download ? `${song.name}.mp3` : undefined,
    });
    if (!file) {
      throw errors.songDataNotFound();
    }
    return sendFile(reply, file);
  }

  /** Most played first; `type` limits it to songs (1) or chants (2). */
  app.get('/songs/popular', async (request) => {
    const { type, limit } = parse(popularQuery, request.query);
    const { rows } = await db.query<SongRow>(
      `SELECT ${SONG_COLUMNS} FROM ${SONGS_WITH_ARTIST}
       WHERE s."PlayCount" > 0 AND ($1::int IS NULL OR s."SongType" = $1)
       ORDER BY s."PlayCount" DESC, s."Name" LIMIT ${limit}`,
      [type ?? null],
    );
    return ok(rows.map((row) => toSong(row, links(request))));
  });

  app.get<{ Params: { id: string } }>('/songs/:id', async (request) => {
    const id = uuidParam(request.params.id);
    const {
      rows: [song],
    } = await db.query<SongRow>(`SELECT ${SONG_COLUMNS} FROM ${SONGS_WITH_ARTIST} WHERE s."Id" = $1`, [id]);
    if (!song) {
      throw errors.songNotFound();
    }
    return ok(toSong(song, links(request)));
  });

  app.get<{ Params: { id: string } }>('/songs/:id/all', async (request) => {
    const artistId = uuidParam(request.params.id);
    const { sort } = parse(listQuery, request.query);
    const order = sort === 'popular' ? 's."PlayCount" DESC, s."Name"' : 's."Name"';
    const { rows } = await db.query<SongRow>(
      `SELECT ${SONG_COLUMNS} FROM ${SONGS_WITH_ARTIST} WHERE s."ArtistId" = $1 ORDER BY ${order}`,
      [artistId],
    );

    const songs = rows.map((row) => toSong(row, links(request)));
    return ok({
      songs: songs.filter((song) => song.songType === SongType.Song),
      chants: songs.filter((song) => song.songType === SongType.Chant),
    });
  });

  /** Stable audio URL used as each song's `path`; supports Range requests for seeking. */
  app.get('/songs/:id/stream', (request: SongRequest, reply) => sendSongFile(request, reply, false));

  app.get('/songs/:id/file', (request: SongRequest, reply) => sendSongFile(request, reply, true));

  app.get<{ Params: { id: string } }>('/songs/:id/share', async (request) => {
    const id = uuidParam(request.params.id);
    const song = await findSong(id);
    // Without the web app's address there is nothing to forward to, so share the audio itself.
    const url = webBaseUrl ? links(request).sharePage(id) : links(request).song(id);
    return ok(await shortenUrl(url, song.name));
  });

  app.put<{ Params: { id: string } }>('/songs/:id/log', async (request) => {
    const id = uuidParam(request.params.id);
    const { logType } = parse(logBody, request.body);
    const column = logType === 0 ? '"PlayCount"' : '"DownloadCount"';

    const { rowCount } = await db.query(`UPDATE media."Song" SET ${column} = ${column} + 1 WHERE "Id" = $1`, [id]);
    if (!rowCount) {
      throw errors.songNotFound();
    }
    return ok(true);
  });

  /** Plays and downloads the web app counted since its last batch, as `{ plays: { [songId]: n }, downloads }`. */
  app.post('/songs/metrics', async (request) => {
    const { plays, downloads } = parse(metricsBody, request.body);
    const songIds = [...new Set([...Object.keys(plays), ...Object.keys(downloads)])];
    if (!songIds.length) {
      return ok({ counted: 0 });
    }

    // Songs removed from the catalogue since are skipped, so the app doesn't keep resending them.
    const { rowCount } = await db.query(
      `UPDATE media."Song" s
       SET "PlayCount" = s."PlayCount" + c.plays, "DownloadCount" = s."DownloadCount" + c.downloads
       FROM unnest($1::uuid[], $2::int[], $3::int[]) AS c(id, plays, downloads)
       WHERE s."Id" = c.id`,
      [songIds, songIds.map((id) => plays[id] ?? 0), songIds.map((id) => downloads[id] ?? 0)],
    );
    return ok({ counted: rowCount });
  });
}
