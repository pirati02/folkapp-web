import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { RouteDeps } from '../app.js';
import { HttpError, ok, parse, uuidParam } from '../http.js';
import { SONG_COLUMNS, SONGS_WITH_ARTIST, SongType, toSong, type SongRow } from '../media.js';
import { sendFile } from '../storage/types.js';

/** Accepts `2024-05-10` as well as full ISO timestamps. */
const dashboardQuery = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Expected a date like 2024-05-10')
    .transform((value) => value.slice(0, 10))
    .optional(),
});

/** The song and chant of the day are picked from this many of the most played. */
const DAILY_PICK_POOL = 50;
/** How far ahead the home page lists holidays. */
const HOLIDAY_DAYS_AHEAD = 14;

export function dashboardRoutes(app: FastifyInstance, { db, storage, links }: RouteDeps) {
  app.get('/dashboard', async (request) => {
    // The web app sends its own date: the server's UTC "today" is a day behind in Georgia before 4am.
    const day = parse(dashboardQuery, request.query).date ?? new Date().toISOString().slice(0, 10);

    // Ordering by a hash of id + date picks one song per day: stable all day, different the next.
    const popularPick = (songType: number) =>
      db.query<SongRow>(
        `SELECT ${SONG_COLUMNS}
         FROM (SELECT * FROM media."Song" WHERE "SongType" = $1 ORDER BY "PlayCount" DESC, "Id" LIMIT ${DAILY_PICK_POOL}) s
         JOIN media."Artist" a ON a."Id" = s."ArtistId"
         ORDER BY md5(s."Id"::text || $2) LIMIT 1`,
        [songType, day],
      );

    const [daySong, dayChant, discoverSong, holidays, holidaySongs] = await Promise.all([
      popularPick(SongType.Song),
      popularPick(SongType.Chant),
      db.query<SongRow>(
        `SELECT ${SONG_COLUMNS} FROM ${SONGS_WITH_ARTIST} ORDER BY md5(s."Id"::text || 'discover' || $1) LIMIT 1`,
        [day],
      ),
      db.query<{ id: string; title: string; date: string }>(
        `SELECT "Id" AS id, "Description" AS title, to_char(("Date" AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS date
         FROM holiday."Holiday"
         WHERE ("Date" AT TIME ZONE 'UTC')::date BETWEEN $1::date AND $1::date + ${HOLIDAY_DAYS_AHEAD}
         ORDER BY "Date"`,
        [day],
      ),
      db.query<SongRow & { holidayId: string }>(
        `SELECT hs."HolidayId" AS "holidayId", ${SONG_COLUMNS}
         FROM holiday."HolidaySong" hs
         JOIN holiday."Holiday" h ON h."Id" = hs."HolidayId"
         JOIN media."Song" s ON s."Id" = hs."SongId"
         JOIN media."Artist" a ON a."Id" = s."ArtistId"
         WHERE (h."Date" AT TIME ZONE 'UTC')::date BETWEEN $1::date AND $1::date + ${HOLIDAY_DAYS_AHEAD}
         ORDER BY s."Name"`,
        [day],
      ),
    ]);

    const songLinks = links(request);
    const song = (row: SongRow | undefined) => (row ? toSong(row, songLinks) : null);

    return ok({
      date: day,
      daySong: song(daySong.rows[0]),
      dayChant: song(dayChant.rows[0]),
      discoverSong: song(discoverSong.rows[0]),
      holidays: holidays.rows.map((holiday) => ({
        ...holiday,
        imagePath: songLinks.holidayImage(holiday.id),
        songs: holidaySongs.rows
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
    // Images rarely change and come from Drive, which is slow; let browsers keep them a day.
    reply.header('cache-control', 'public, max-age=86400');
    return sendFile(reply, file);
  });
}
