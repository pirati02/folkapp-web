import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { RouteDeps } from '../app.js';
import { errors, ok, parse, uuidParam } from '../http.js';
import { SONG_COLUMNS, SONGS_WITH_ARTIST, SongType, toSong, type SongRow } from '../media.js';
import { sendFile } from '../storage/types.js';

type SongRequest = FastifyRequest<{ Params: { id: string } }>;

// SongLogType in the .NET API: Played = 0, Downloaded = 1.
const logBody = z.object({ logType: z.union([z.literal(0), z.literal(1)]) });

export function songRoutes(app: FastifyInstance, { db, storage, links, shortenUrl }: RouteDeps) {
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

  app.get<{ Params: { id: string } }>('/songs/:id/all', async (request) => {
    const artistId = uuidParam(request.params.id);
    const { rows } = await db.query<SongRow>(
      `SELECT ${SONG_COLUMNS} FROM ${SONGS_WITH_ARTIST} WHERE s."ArtistId" = $1 ORDER BY s."Name"`,
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
    return ok(await shortenUrl(links(request).song(id), song.name));
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

}
