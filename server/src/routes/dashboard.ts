import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { RouteDeps } from '../app.js';
import { HttpError, ok, parse, uuidParam } from '../http.js';
import { SONG_COLUMNS, SONGS_WITH_ARTIST, SongType, toSong, type SongRow } from '../media.js';
import { sendFile } from '../storage/types.js';

/** Accepts `2024-05-10` as well as full ISO timestamps, as ASP.NET's DateTime binding did. */
const dashboardQuery = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Expected a date like 2024-05-10')
    .transform((value) => value.slice(0, 10))
    .optional(),
});

export function dashboardRoutes(app: FastifyInstance, { db, storage, links }: RouteDeps) {
  app.get('/dashboard', async (request) => {
    const day = parse(dashboardQuery, request.query).date ?? new Date().toISOString().slice(0, 10);

    const mostPlayed = (songType: number) =>
      db.query<SongRow>(
        `SELECT ${SONG_COLUMNS} FROM ${SONGS_WITH_ARTIST}
         WHERE s."SongType" = $1 ORDER BY s."PlayCount" DESC LIMIT 1`,
        [songType],
      );

    const [daySong, dayChant, holidays, holidaySongs] = await Promise.all([
      mostPlayed(SongType.Song),
      mostPlayed(SongType.Chant),
      db.query<{ id: string; description: string }>(
        `SELECT "Id" AS id, "Description" AS description FROM holiday."Holiday"
         WHERE ("Date" AT TIME ZONE 'UTC')::date = $1::date`,
        [day],
      ),
      db.query<SongRow & { holidayId: string }>(
        `SELECT hs."HolidayId" AS "holidayId", ${SONG_COLUMNS}
         FROM holiday."HolidaySong" hs
         JOIN holiday."Holiday" h ON h."Id" = hs."HolidayId"
         JOIN media."Song" s ON s."Id" = hs."SongId"
         JOIN media."Artist" a ON a."Id" = s."ArtistId"
         WHERE (h."Date" AT TIME ZONE 'UTC')::date = $1::date`,
        [day],
      ),
    ]);

    const songLinks = links(request);
    const song = (row: SongRow | undefined) => (row ? toSong(row, songLinks) : null);

    return ok({
      daySong: song(daySong.rows[0]),
      dayChant: song(dayChant.rows[0]),
      holidayItems: holidays.rows.map((holiday) => ({
        // The .NET API sent the description as the title; kept so existing clients render the same.
        title: holiday.description,
        imagePath: songLinks.holidayImage(holiday.id),
        holidaySongs: holidaySongs.rows
          .filter((row) => row.holidayId === holiday.id)
          .map(({ holidayId: _, ...row }) => toSong(row, songLinks)),
      })),
    });
  });

  app.get<{ Params: { id: string } }>('/holidays/:id/image', async (request, reply) => {
    const id = uuidParam(request.params.id);
    const {
      rows: [holiday],
    } = await db.query<{ imagePath: string }>(`SELECT "ImagePath" AS "imagePath" FROM holiday."Holiday" WHERE "Id" = $1`, [
      id,
    ]);
    const file = holiday && (await storage.images.open(holiday.imagePath));
    if (!file) {
      throw new HttpError(404, 'Image not found');
    }
    return sendFile(reply, file);
  });
}
