import type { FastifyInstance } from 'fastify';
import type { RouteDeps } from '../app.js';
import { ok } from '../http.js';
import { SONG_COLUMNS, SONGS_WITH_ARTIST, SongType, toSong, type SongRow } from '../media.js';

const TOP_SONGS = 20;
const TOP_ARTISTS = 20;

/** Catalogue size and what people play and download (the counts the apps log). */
export function statsRoutes(app: FastifyInstance, { db, links }: RouteDeps) {
  app.get('/stats', async (request) => {
    type Counted = SongRow & { plays: number; downloads: number };
    const [totals, artistCount, topPlayed, topDownloaded, artists] = await Promise.all([
      db.query<{ songs: number; chants: number; plays: number; downloads: number }>(
        `SELECT count(*) FILTER (WHERE "SongType" = ${SongType.Song})::int AS songs,
                count(*) FILTER (WHERE "SongType" = ${SongType.Chant})::int AS chants,
                coalesce(sum("PlayCount"), 0)::int AS plays,
                coalesce(sum("DownloadCount"), 0)::int AS downloads
         FROM media."Song"`,
      ),
      db.query<{ artists: number }>(`SELECT count(*)::int AS artists FROM media."Artist"`),
      db.query<Counted>(
        `SELECT ${SONG_COLUMNS}, s."PlayCount" AS plays, s."DownloadCount" AS downloads FROM ${SONGS_WITH_ARTIST}
         WHERE s."PlayCount" > 0 ORDER BY s."PlayCount" DESC, s."Name" LIMIT ${TOP_SONGS}`,
      ),
      db.query<Counted>(
        `SELECT ${SONG_COLUMNS}, s."PlayCount" AS plays, s."DownloadCount" AS downloads FROM ${SONGS_WITH_ARTIST}
         WHERE s."DownloadCount" > 0 ORDER BY s."DownloadCount" DESC, s."Name" LIMIT ${TOP_SONGS}`,
      ),
      db.query<{ id: string; name: string; plays: number; downloads: number; songs: number }>(
        `SELECT a."Id" AS id, a."Name" AS name, sum(s."PlayCount")::int AS plays,
                sum(s."DownloadCount")::int AS downloads, count(s."Id")::int AS songs
         FROM media."Artist" a JOIN media."Song" s ON s."ArtistId" = a."Id"
         GROUP BY a."Id", a."Name" HAVING sum(s."PlayCount") > 0
         ORDER BY plays DESC, a."Name" LIMIT ${TOP_ARTISTS}`,
      ),
    ]);

    const songLinks = links(request);
    const withCounts = ({ plays, downloads, ...row }: Counted) => ({ ...toSong(row, songLinks), plays, downloads });
    return ok({
      totals: { ...totals.rows[0], artists: artistCount.rows[0]?.artists ?? 0 },
      topPlayed: topPlayed.rows.map(withCounts),
      topDownloaded: topDownloaded.rows.map(withCounts),
      artists: artists.rows,
    });
  });
}
