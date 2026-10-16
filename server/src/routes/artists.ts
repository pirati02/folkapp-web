import type { FastifyInstance } from 'fastify';
import type { RouteDeps } from '../app.js';
import { errors, ok, uuidParam } from '../http.js';
import { ARTIST_COLUMNS, toArtist, type ArtistRow } from '../media.js';

export function artistRoutes(app: FastifyInstance, { db }: RouteDeps) {
  app.get<{ Params: { type: string } }>('/artists/:type/all', async (request) => {
    const type = Number(request.params.type);
    if (!Number.isInteger(type)) {
      throw errors.notFound();
    }

    const { rows } = await db.query<ArtistRow>(
      `SELECT ${ARTIST_COLUMNS} FROM media."Artist" WHERE "ArtistType" = $1 ORDER BY "Name"`,
      [type],
    );
    return ok(rows.map(toArtist));
  });

  app.get<{ Params: { id: string } }>('/artists/:id', async (request) => {
    const id = uuidParam(request.params.id);
    const {
      rows: [artist],
    } = await db.query<ArtistRow>(`SELECT ${ARTIST_COLUMNS} FROM media."Artist" WHERE "Id" = $1`, [id]);

    if (!artist) {
      throw errors.artistNotFound();
    }
    return ok(toArtist(artist));
  });
}
