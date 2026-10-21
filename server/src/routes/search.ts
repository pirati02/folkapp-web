import type { FastifyInstance } from 'fastify';
import type { RouteDeps } from '../app.js';
import { ok } from '../http.js';
import { ARTIST_COLUMNS, SONG_COLUMNS, SONGS_WITH_ARTIST, toArtist, toSong, type ArtistRow, type SongRow } from '../media.js';

const MAX_RESULTS = 100;

/** Phone keyboards can type Georgian capitals (Mtavruli, U+1C90–U+1CBF); names are stored in Mkhedruli. */
const toMkhedruli = (text: string) =>
  text.replace(/[Ა-Ჿ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x1c90 + 0x10d0));

export function searchRoutes(app: FastifyInstance, { db, links }: RouteDeps) {
  app.get<{ Params: { term: string } }>('/search/:term', async (request) => {
    const term = toMkhedruli(request.params.term.trim());
    if (!term) {
      return ok({ artists: [], songs: [] });
    }

    // Treat the term literally: escape LIKE wildcards before wrapping it in %...%.
    const pattern = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
    const [artists, songs] = await Promise.all([
      db.query<ArtistRow>(
        `SELECT ${ARTIST_COLUMNS} FROM media."Artist" WHERE "Name" ILIKE $1 ORDER BY "Name" LIMIT ${MAX_RESULTS}`,
        [pattern],
      ),
      db.query<SongRow>(
        `SELECT ${SONG_COLUMNS} FROM ${SONGS_WITH_ARTIST}
         WHERE s."Name" ILIKE $1 ORDER BY s."Name" LIMIT ${MAX_RESULTS}`,
        [pattern],
      ),
    ]);

    const songLinks = links(request);
    return ok({
      artists: artists.rows.map(toArtist),
      songs: songs.rows.map((row) => toSong(row, songLinks)),
    });
  });
}
