import type { FastifyRequest } from 'fastify';

export const ArtistType = { OldRecording: 1, Ensemble: 2 } as const;
export const SongType = { Song: 1, Chant: 2 } as const;

export interface ArtistRow {
  id: string;
  name: string;
  artistType: number;
}

export const ARTIST_COLUMNS = `"Id" AS id, "Name" AS name, "ArtistType" AS "artistType"`;

export function toArtist(row: ArtistRow) {
  // The .NET API had these names swapped (1 was serialized as "ensembles").
  const artistType = row.artistType === ArtistType.Ensemble ? 'ensembles' : 'oldRecordings';
  return { name: row.name, artistType, id: row.id };
}

export interface SongRow {
  id: string;
  name: string;
  songType: number;
  artistName: string;
  artistId: string;
  isFav: boolean;
}

/**
 * Columns of a song response, for queries over `media."Song" s` joined with `media."Artist" a`.
 * `$1` must be the signed-in account's id (or null), which drives `isFav`.
 */
export const SONG_COLUMNS = `
  s."Id" AS id,
  s."Name" AS name,
  s."SongType" AS "songType",
  a."Name" AS "artistName",
  a."Id" AS "artistId",
  EXISTS (
    SELECT 1 FROM favourite."AccountFavouriteSong" f
    WHERE f."SongId" = s."Id" AND f."AccountId" = $1::uuid
  ) AS "isFav"`;

export const SONGS_WITH_ARTIST = `media."Song" s JOIN media."Artist" a ON a."Id" = s."ArtistId"`;

export interface Links {
  song(id: string): string;
  holidayImage(id: string): string;
}

/**
 * Songs link to this API, which streams them from Google Drive. The links never expire (the .NET
 * API handed out 7-day presigned S3 URLs that broke cached and shared songs).
 */
export function linksFor(request: FastifyRequest, publicBaseUrl: string | undefined): Links {
  const base = (publicBaseUrl ?? `${request.protocol}://${request.host}`).replace(/\/+$/, '');
  return {
    song: (id) => `${base}/songs/${id}/stream`,
    holidayImage: (id) => `${base}/holidays/${id}/image`,
  };
}

export const toSong = (row: SongRow, links: Links) => ({ ...row, path: links.song(row.id) });
