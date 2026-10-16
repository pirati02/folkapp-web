import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { RouteDeps } from '../app.js';
import { currentAccount, hashPassword, isLegacySalt, verifyPassword } from '../auth.js';
import { errors, ok, parse, uuidParam } from '../http.js';

// PlatformOs in the .NET API: Android = 0, iOS = 1.
const device = {
  deviceId: z.string().trim().min(1),
  platformOs: z.union([z.literal(0), z.literal(1)]),
};

const loginBody = z.object({ email: z.string().min(1), password: z.string().min(1), ...device });
const loginByTokenBody = z.object({ token: z.string().min(1), ...device });
const registerBody = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Invalid email'),
  password: z.string().min(1),
});
const verifyBody = z.object({ code: z.string().min(1) });

interface AccountRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  deactivated: boolean;
  hash: string;
  salt: string;
}

const ACCOUNT_COLUMNS = `
  acc."Id" AS id, acc."Email" AS email, acc."FirstName" AS "firstName", acc."LastName" AS "lastName",
  acc."IsActive" AS "isActive", acc."Deactivated" AS deactivated, acc."Password" AS hash, acc."Salt" AS salt`;

export function accountRoutes(app: FastifyInstance, { db, jwt }: RouteDeps) {
  /** Issues a token and records the device it was issued to, as the .NET API did. */
  async function issueToken(account: AccountRow, deviceId: string, platformOs: number) {
    const token = await jwt.sign(account);
    await db.query(
      `INSERT INTO account."AccountDevice" ("Id", "AccountId", "DeviceId", "PlatformOs", "LoginTime", "Token")
       VALUES ($1, $2, $3, $4, now(), $5)`,
      [randomUUID(), account.id, deviceId, platformOs, token],
    );
    return token;
  }

  function assertActive(account: AccountRow) {
    if (!account.isActive || account.deactivated) {
      throw errors.inactiveAccount();
    }
  }

  app.post('/account/login', async (request) => {
    const body = parse(loginBody, request.body);
    const {
      rows: [account],
    } = await db.query<AccountRow>(`SELECT ${ACCOUNT_COLUMNS} FROM account."Account" acc WHERE acc."Email" = $1`, [
      body.email,
    ]);

    if (!account) {
      throw errors.accountNotFound();
    }
    assertActive(account);
    if (!(await verifyPassword(body.password, account))) {
      throw errors.invalidCredentials();
    }

    if (isLegacySalt(account.salt)) {
      const upgraded = await hashPassword(body.password);
      await db.query(`UPDATE account."Account" SET "Password" = $1, "Salt" = $2 WHERE "Id" = $3`, [
        upgraded.hash,
        upgraded.salt,
        account.id,
      ]);
    }

    return ok(await issueToken(account, body.deviceId, body.platformOs));
  });

  app.post('/account/login-by-token', async (request) => {
    const body = parse(loginByTokenBody, request.body);

    // The .NET API read this token without checking its signature, so anyone could forge one.
    const claims = await jwt.verifyIgnoringExpiry(body.token);
    if (!claims) {
      throw errors.invalidToken();
    }

    const {
      rows: [account],
    } = await db.query<AccountRow>(
      `SELECT ${ACCOUNT_COLUMNS} FROM account."Account" acc
       WHERE acc."Id" = $1
         AND EXISTS (SELECT 1 FROM account."AccountDevice" d WHERE d."AccountId" = acc."Id" AND d."Token" = $2)`,
      [claims.id, body.token],
    );
    if (!account) {
      throw errors.invalidToken();
    }
    assertActive(account);

    return ok(await issueToken(account, body.deviceId, body.platformOs));
  });

  app.post('/account/register', async (request) => {
    const body = parse(registerBody, request.body);
    const { hash, salt } = await hashPassword(body.password);
    const id = randomUUID();

    // Email verification is switched off (as in the .NET API), so accounts start active.
    const { rowCount } = await db.query(
      `INSERT INTO account."Account" ("Id", "Email", "FirstName", "LastName", "Password", "Salt", "IsActive", "Deactivated")
       SELECT $1, $2, $3, $4, $5, $6, true, false
       WHERE NOT EXISTS (SELECT 1 FROM account."Account" WHERE "Email" = $2)`,
      [id, body.email, body.firstName, body.lastName, hash, salt],
    );
    if (!rowCount) {
      throw errors.accountExists();
    }
    return ok(id);
  });

  app.put<{ Params: { id: string } }>('/account/verify/:id', async (request) => {
    const accountId = uuidParam(request.params.id);
    const { code } = parse(verifyBody, request.body);

    return db.transaction(async (tx) => {
      const { rowCount: accountExists } = await tx.query(`SELECT 1 FROM account."Account" WHERE "Id" = $1`, [
        accountId,
      ]);
      if (!accountExists) {
        throw errors.accountNotFound();
      }

      // Codes are valid for five minutes after they are sent.
      const { rowCount: verified } = await tx.query(
        `UPDATE account."AccountVerification" SET "Verified" = true
         WHERE "AccountId" = $1 AND "Code" = $2 AND NOT "Verified" AND NOT "Expired"
           AND "DateVerificationSent" > now() - interval '5 minutes'`,
        [accountId, code],
      );
      if (!verified) {
        throw errors.activationFailed();
      }

      await tx.query(`UPDATE account."Account" SET "IsActive" = true WHERE "Id" = $1`, [accountId]);
      return ok(true);
    });
  });

  app.delete('/account/deactivate', async (request) => {
    const account = currentAccount(request);
    const { rowCount } = await db.query(`UPDATE account."Account" SET "Deactivated" = true WHERE "Id" = $1`, [
      account.id,
    ]);
    if (!rowCount) {
      throw errors.accountNotFound();
    }
    return ok(true);
  });
}
