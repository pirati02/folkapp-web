import { pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { FastifyRequest } from 'fastify';
import { compactVerify, jwtVerify, SignJWT, type JWTPayload } from 'jose';
import { errors, isUuid } from './http.js';

const pbkdf2 = promisify(pbkdf2Callback);

// Parameters of the .NET PasswordGenerator, so existing account hashes keep verifying.
const ITERATIONS = 350_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export async function hashPassword(password: string, salt: Buffer = randomBytes(16)) {
  const hash = await pbkdf2(Buffer.from(password, 'utf8'), salt, ITERATIONS, KEY_LENGTH, DIGEST);
  return { hash: hash.toString('hex').toUpperCase(), salt: salt.toString('hex').toUpperCase() };
}

export async function verifyPassword(password: string, stored: { hash: string; salt: string }): Promise<boolean> {
  const { hash } = await hashPassword(password, Buffer.from(stored.salt, 'hex'));
  const actual = Buffer.from(hash, 'hex');
  const expected = Buffer.from(stored.hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * The .NET API derived the salt from the password length (4 bytes) instead of generating it,
 * so every password of the same length shared a salt. Such hashes are upgraded on login.
 */
export const isLegacySalt = (salt: string) => salt.length === 8;

export interface AccountClaims {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    account: AccountClaims | null;
  }
}

export function currentAccount(request: FastifyRequest): AccountClaims {
  if (!request.account) {
    throw errors.unauthorized();
  }
  return request.account;
}

function toClaims(payload: JWTPayload): AccountClaims | null {
  const { Id, Email, FirstName, LastName } = payload;
  if (!isUuid(Id) || typeof Email !== 'string' || typeof FirstName !== 'string' || typeof LastName !== 'string') {
    return null;
  }
  return { id: Id.toLowerCase(), email: Email, firstName: FirstName, lastName: LastName };
}

export function createJwt(options: { secret: string; issuer: string; expiresInSeconds: number }) {
  const key = new TextEncoder().encode(options.secret);

  return {
    sign(account: AccountClaims): Promise<string> {
      // Claim names match the tokens the .NET API issued, so already signed-in clients keep working.
      return new SignJWT({
        Id: account.id,
        Email: account.email,
        FirstName: account.firstName,
        LastName: account.lastName,
      })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuer(options.issuer)
        .setIssuedAt()
        .setNotBefore('0s')
        .setExpirationTime(`${options.expiresInSeconds}s`)
        .sign(key);
    },

    async verify(token: string): Promise<AccountClaims | null> {
      try {
        const { payload } = await jwtVerify(token, key, { issuer: options.issuer, algorithms: ['HS256'] });
        return toClaims(payload);
      } catch {
        return null;
      }
    },

    /** Checks signature and issuer but not expiry: used to exchange an old token for a fresh one. */
    async verifyIgnoringExpiry(token: string): Promise<AccountClaims | null> {
      try {
        const { payload } = await compactVerify(token, key, { algorithms: ['HS256'] });
        const claims = JSON.parse(new TextDecoder().decode(payload)) as JWTPayload;
        return claims.iss === options.issuer ? toClaims(claims) : null;
      } catch {
        return null;
      }
    },
  };
}

export type Jwt = ReturnType<typeof createJwt>;
