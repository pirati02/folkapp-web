import { SignJWT } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/auth.js';
import { bearer, createTestApp, ids, jwtOptions, legacyPassword } from './helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;
beforeEach(async () => {
  ctx = await createTestApp();
});

const device = { deviceId: 'device-1', platformOs: 0 };

async function login(email: string, password: string) {
  return ctx.app.inject({ method: 'POST', url: '/account/login', payload: { email, password, ...device } });
}

async function register(email: string, password = 'hunter22') {
  const response = await ctx.app.inject({
    method: 'POST',
    url: '/account/register',
    payload: { firstName: 'Giorgi', lastName: 'Kapanadze', email, password },
  });
  expect(response.statusCode).toBe(200);
  const token = (await login(email, password)).json().body as string;
  return { id: response.json().body as string, token };
}

describe('passwords', () => {
  it('verifies hashes produced by the .NET PasswordGenerator, including non-ASCII passwords', async () => {
    expect(await verifyPassword(legacyPassword.password, legacyPassword)).toBe(true);
    expect(await verifyPassword('wrong', legacyPassword)).toBe(false);
    expect(
      await verifyPassword('პაროლი-ქართ', {
        hash: 'B2F07EB6F11E8A43061BE432960D69CCFFC1114714CC529536AFB609839062D343CA611C4C52B03DE5B97710193C5066A52B40017D1C97256703F7863DB64BDF',
        salt: '4B000000',
      }),
    ).toBe(true);
  });

  it('uses a random salt for new hashes', async () => {
    const first = await hashPassword('same');
    const second = await hashPassword('same');
    expect(first.salt).not.toBe(second.salt);
    expect(await verifyPassword('same', first)).toBe(true);
  });
});

describe('login', () => {
  it('signs in an existing .NET account and upgrades its legacy salt', async () => {
    const response = await login('legacy@folk.ge', legacyPassword.password);
    expect(response.statusCode).toBe(200);

    const claims = await ctx.jwt.verify(response.json().body);
    expect(claims).toEqual({ id: ids.legacyAccount, email: 'legacy@folk.ge', firstName: 'Nino', lastName: 'Beridze' });

    const { rows } = await ctx.db.query<{ Salt: string }>(`SELECT "Salt" FROM account."Account" WHERE "Id" = $1`, [
      ids.legacyAccount,
    ]);
    expect(rows[0]!.Salt).toHaveLength(32);
    expect((await login('legacy@folk.ge', legacyPassword.password)).statusCode).toBe(200);
  });

  it('records the device the token was issued to', async () => {
    const token = (await login('legacy@folk.ge', legacyPassword.password)).json().body;
    const { rows } = await ctx.db.query(`SELECT "DeviceId", "PlatformOs", "Token" FROM account."AccountDevice"`);
    expect(rows).toEqual([{ DeviceId: 'device-1', PlatformOs: 0, Token: token }]);
  });

  it('keeps the .NET status codes for failures', async () => {
    expect((await login('nobody@folk.ge', 'x')).statusCode).toBe(404);
    const wrong = await login('legacy@folk.ge', 'wrong');
    expect(wrong.statusCode).toBe(409);
    expect(wrong.json().error.message).toBe('Invalid account credentials.');
  });

  it('rejects duplicate registrations', async () => {
    await register('dup@folk.ge');
    const again = await ctx.app.inject({
      method: 'POST',
      url: '/account/register',
      payload: { firstName: 'a', lastName: 'b', email: 'dup@folk.ge', password: 'x' },
    });
    expect(again.statusCode).toBe(409);
  });
});

describe('login by token', () => {
  const exchange = (token: string) =>
    ctx.app.inject({ method: 'POST', url: '/account/login-by-token', payload: { token, ...device } });

  it('exchanges an issued token for a fresh one', async () => {
    const { token } = await register('refresh@folk.ge');
    const response = await exchange(token);
    expect(response.statusCode).toBe(200);
    expect(await ctx.jwt.verify(response.json().body)).toMatchObject({ email: 'refresh@folk.ge' });
  });

  it('accepts an expired token that was issued by the API', async () => {
    const { id } = await register('expired@folk.ge');
    const expired = await new SignJWT({ Id: id, Email: 'expired@folk.ge', FirstName: 'G', LastName: 'K' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(jwtOptions.issuer)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(jwtOptions.secret));
    await ctx.db.query(
      `INSERT INTO account."AccountDevice" ("Id", "AccountId", "DeviceId", "PlatformOs", "LoginTime", "Token")
       VALUES (gen_random_uuid(), $1, 'old', 0, now(), $2)`,
      [id, expired],
    );

    expect((await exchange(expired)).statusCode).toBe(200);
  });

  it('rejects forged tokens (the .NET API accepted unsigned ones)', async () => {
    const claims = { Id: ids.legacyAccount, Email: 'legacy@folk.ge', FirstName: 'Nino', LastName: 'Beridze' };
    await login('legacy@folk.ge', legacyPassword.password); // the account has a device on record

    const unsigned = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(
      JSON.stringify({ ...claims, iss: jwtOptions.issuer }),
    ).toString('base64url')}.`;
    const wrongKey = await new SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(jwtOptions.issuer)
      .sign(new TextEncoder().encode('some-other-secret-that-is-long-enough!'));
    const neverIssued = await ctx.jwt.sign({ id: ids.legacyAccount, email: 'legacy@folk.ge', firstName: 'N', lastName: 'B' });

    for (const token of [unsigned, wrongKey, neverIssued]) {
      const response = await exchange(token);
      expect(response.statusCode).toBe(409);
      expect(response.json().error.message).toBe('Invalid token.');
    }
  });
});

describe('deactivate', () => {
  it('requires a valid token', async () => {
    expect((await ctx.app.inject({ method: 'DELETE', url: '/account/deactivate' })).statusCode).toBe(401);
  });

  it('blocks further sign-ins', async () => {
    const { token } = await register('leaving@folk.ge');
    const response = await ctx.app.inject({ method: 'DELETE', url: '/account/deactivate', headers: bearer(token) });
    expect(response.json()).toEqual({ body: true, error: null });

    const again = await login('leaving@folk.ge', 'hunter22');
    expect(again.statusCode).toBe(409);
    expect(again.json().error.message).toBe('Account is not active.');
  });
});

describe('favourites', () => {
  it('toggles a favourite and reflects it in song lists', async () => {
    const { token } = await register('fav@folk.ge');
    const toggle = () =>
      ctx.app.inject({ method: 'PUT', url: `/songs/${ids.chakrulo}/mark-as-favourite`, headers: bearer(token) });

    expect((await toggle()).json().body).toBe(true);

    const favourites = await ctx.app.inject({ url: '/songs/favourites', headers: bearer(token) });
    expect(favourites.json().body).toMatchObject([{ id: ids.chakrulo, isFav: true }]);

    const list = await ctx.app.inject({ url: `/songs/${ids.rustavi}/all`, headers: bearer(token) });
    const chakrulo = list.json().body.songs.find((song: { id: string }) => song.id === ids.chakrulo);
    expect(chakrulo.isFav).toBe(true);

    expect((await toggle()).json().body).toBe(false);
    expect((await ctx.app.inject({ url: '/songs/favourites', headers: bearer(token) })).json().body).toEqual([]);
  });

  it('requires sign-in', async () => {
    expect((await ctx.app.inject('/songs/favourites')).statusCode).toBe(401);
  });
});
