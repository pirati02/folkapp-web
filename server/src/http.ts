import type { z } from 'zod';

/** Every response uses the envelope the .NET API returned: `{ body, error }`. */
export const ok = <T>(body: T) => ({ body, error: null });
export const fail = (message: string) => ({ body: null, error: { message } });

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

// Status codes and messages match the .NET API's error records.
export const errors = {
  notFound: () => new HttpError(404, 'Not found'),
  unauthorized: () => new HttpError(401, 'Unauthorized'),
  artistNotFound: () => new HttpError(404, 'Artist not found'),
  songNotFound: () => new HttpError(404, 'Song not found.'),
  songDataNotFound: () => new HttpError(404, 'Song data not found.'),
  accountNotFound: () => new HttpError(404, 'Account not found'),
  accountExists: () => new HttpError(409, 'Account exists.'),
  inactiveAccount: () => new HttpError(409, 'Account is not active.'),
  invalidCredentials: () => new HttpError(409, 'Invalid account credentials.'),
  invalidToken: () => new HttpError(409, 'Invalid token.'),
  activationFailed: () => new HttpError(400, 'Account activation failed.'),
  playListExists: () => new HttpError(409, 'Playlist is already exists'),
  playListNotFound: () => new HttpError(404, 'Playlist not found'),
  songAlreadyInPlayList: () => new HttpError(409, 'Song is already part of playlist'),
  songNotInPlayList: () => new HttpError(404, 'Song not found in playlist'),
};

export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    throw new HttpError(400, message);
  }
  return result.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mirrors ASP.NET's `{id:guid}` route constraint: a malformed id is a 404, not a database error. */
export function uuidParam(value: string | undefined): string {
  if (!value || !UUID.test(value)) {
    throw errors.notFound();
  }
  return value.toLowerCase();
}

export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
