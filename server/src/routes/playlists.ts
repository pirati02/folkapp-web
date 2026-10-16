import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { RouteDeps } from '../app.js';
import { currentAccount } from '../auth.js';
import type { Db } from '../db.js';
import { errors, ok, parse, uuidParam } from '../http.js';
import { SONG_COLUMNS, toSong, type SongRow } from '../media.js';

// PlayListAction in the .NET API: Add = 1, Remove = 2.
const Action = { Add: 1, Remove: 2 } as const;

const createBody = z.object({
  name: z.string().trim().min(1).max(100),
  songs: z.array(z.guid()).default([]),
});
const updateBody = z.object({
  songId: z.array(z.guid()).min(1),
  action: z.union([z.literal(Action.Add), z.literal(Action.Remove)]),
});

const uniqueIds = (ids: string[]) => [...new Set(ids.map((id) => id.toLowerCase()))];

async function assertSongsExist(db: Db, songIds: string[]) {
  if (songIds.length === 0) return;
  const { rows } = await db.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM media."Song" WHERE "Id" = ANY($1::uuid[])`,
    [songIds],
  );
  if (rows[0]?.count !== songIds.length) {
    throw errors.songNotFound();
  }
}

/** The .NET API let any signed-in user change or delete anyone's playlist; ownership is enforced here. */
async function assertOwnPlayList(db: Db, playListId: string, accountId: string) {
  const { rowCount } = await db.query(`SELECT 1 FROM media."PlayList" WHERE "Id" = $1 AND "AccountId" = $2`, [
    playListId,
    accountId,
  ]);
  if (!rowCount) {
    throw errors.playListNotFound();
  }
}

export function playListRoutes(app: FastifyInstance, { db, links }: RouteDeps) {
  app.get('/playlist', async (request) => {
    const account = currentAccount(request);
    const [playLists, songs] = await Promise.all([
      db.query<{ id: string; name: string }>(
        `SELECT "Id" AS id, "Name" AS name FROM media."PlayList" WHERE "AccountId" = $1 ORDER BY "Name"`,
        [account.id],
      ),
      db.query<SongRow & { playListId: string }>(
        `SELECT pls."PlayListId" AS "playListId", ${SONG_COLUMNS}
         FROM media."PlayListSong" pls
         JOIN media."PlayList" pl ON pl."Id" = pls."PlayListId"
         JOIN media."Song" s ON s."Id" = pls."SongId"
         JOIN media."Artist" a ON a."Id" = s."ArtistId"
         WHERE pl."AccountId" = $1
         ORDER BY s."Name"`,
        [account.id],
      ),
    ]);

    const songLinks = links(request);
    return ok(
      playLists.rows.map((playList) => ({
        playListId: playList.id,
        name: playList.name,
        songs: songs.rows
          .filter((song) => song.playListId === playList.id)
          .map(({ playListId: _, ...song }) => toSong(song, songLinks)),
      })),
    );
  });

  app.post('/playlist', async (request) => {
    const account = currentAccount(request);
    const body = parse(createBody, request.body);
    const songIds = uniqueIds(body.songs);

    return db.transaction(async (tx) => {
      // Names are unique per account (the .NET API checked them across all users).
      const { rowCount: exists } = await tx.query(
        `SELECT 1 FROM media."PlayList" WHERE "AccountId" = $1 AND "Name" = $2`,
        [account.id, body.name],
      );
      if (exists) {
        throw errors.playListExists();
      }
      await assertSongsExist(tx, songIds);

      const playListId = randomUUID();
      await tx.query(`INSERT INTO media."PlayList" ("Id", "AccountId", "Name") VALUES ($1, $2, $3)`, [
        playListId,
        account.id,
        body.name,
      ]);
      await tx.query(
        `INSERT INTO media."PlayListSong" ("Id", "PlayListId", "SongId")
         SELECT gen_random_uuid(), $1, song_id FROM unnest($2::uuid[]) AS song_id`,
        [playListId, songIds],
      );
      return ok(true);
    });
  });

  app.put<{ Params: { id: string } }>('/playlist/:id', async (request) => {
    const account = currentAccount(request);
    const playListId = uuidParam(request.params.id);
    const body = parse(updateBody, request.body);
    const songIds = uniqueIds(body.songId);

    return db.transaction(async (tx) => {
      await assertSongsExist(tx, songIds);
      await assertOwnPlayList(tx, playListId, account.id);

      if (body.action === Action.Add) {
        const { rowCount: added } = await tx.query(
          `INSERT INTO media."PlayListSong" ("Id", "PlayListId", "SongId")
           SELECT gen_random_uuid(), $1, song_id FROM unnest($2::uuid[]) AS song_id
           WHERE NOT EXISTS (
             SELECT 1 FROM media."PlayListSong" WHERE "PlayListId" = $1 AND "SongId" = song_id
           )`,
          [playListId, songIds],
        );
        if (!added) {
          throw errors.songAlreadyInPlayList();
        }
      } else {
        const { rowCount: removed } = await tx.query(
          `DELETE FROM media."PlayListSong" WHERE "PlayListId" = $1 AND "SongId" = ANY($2::uuid[])`,
          [playListId, songIds],
        );
        if (!removed) {
          throw errors.songNotInPlayList();
        }
      }
      return ok(true);
    });
  });

  app.delete<{ Params: { id: string } }>('/playlist/:id', async (request) => {
    const account = currentAccount(request);
    const playListId = uuidParam(request.params.id);

    return db.transaction(async (tx) => {
      await assertOwnPlayList(tx, playListId, account.id);
      await tx.query(`DELETE FROM media."PlayListSong" WHERE "PlayListId" = $1`, [playListId]);
      await tx.query(`DELETE FROM media."PlayList" WHERE "Id" = $1`, [playListId]);
      return ok(true);
    });
  });
}
