import cors from '@fastify/cors';
import Fastify, { type FastifyError, type FastifyRequest, type FastifyServerOptions } from 'fastify';
import type { Jwt } from './auth.js';
import type { Db } from './db.js';
import { fail, HttpError } from './http.js';
import { linksFor, type Links } from './media.js';
import { accountRoutes } from './routes/account.js';
import { artistRoutes } from './routes/artists.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { playListRoutes } from './routes/playlists.js';
import { searchRoutes } from './routes/search.js';
import { songRoutes } from './routes/songs.js';
import type { Storage } from './storage/types.js';
import type { UrlShortener } from './url-shortener.js';

export interface AppDeps {
  db: Db;
  storage: Storage;
  jwt: Jwt;
  shortenUrl: UrlShortener;
  corsOrigins: string[];
  publicBaseUrl?: string;
}

export interface RouteDeps extends AppDeps {
  links(request: FastifyRequest): Links;
}

export async function buildApp(deps: AppDeps, logger: FastifyServerOptions['logger'] = false) {
  const app = Fastify({
    logger,
    trustProxy: true,
    // ASP.NET routing was case-insensitive, and the web app calls e.g. `/Artists/...` and `/songs/...`.
    routerOptions: { caseSensitive: false, ignoreTrailingSlash: true },
  });

  await app.register(cors, { origin: deps.corsOrigins.includes('*') ? true : deps.corsOrigins });

  app.decorateRequest('account', null);
  app.addHook('onRequest', async (request) => {
    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      request.account = await deps.jwt.verify(header.slice('Bearer '.length).trim());
    }
  });

  app.setErrorHandler<FastifyError | HttpError>((error, request, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send(fail(error.message));
    }
    // Fastify's own client errors, e.g. malformed JSON bodies.
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send(fail(error.message));
    }
    request.log.error(error);
    return reply.code(500).send(fail('An unexpected error occurred'));
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send(fail('Not found')));

  app.get('/health', async (request, reply) => {
    const [database, storage] = await Promise.allSettled([deps.db.query('SELECT 1'), deps.storage.check()]);
    const report = (name: string, result: PromiseSettledResult<unknown>) => {
      if (result.status === 'fulfilled') return 'ok';
      // Details stay in the logs; they can include connection info.
      request.log.error({ err: result.reason }, `${name} health check failed`);
      return 'error';
    };
    const body = { database: report('database', database), storage: report('storage', storage) };
    const healthy = body.database === 'ok' && body.storage === 'ok';
    return reply.code(healthy ? 200 : 503).send({ status: healthy ? 'ok' : 'error', ...body });
  });

  const routeDeps: RouteDeps = { ...deps, links: (request) => linksFor(request, deps.publicBaseUrl) };
  artistRoutes(app, routeDeps);
  songRoutes(app, routeDeps);
  searchRoutes(app, routeDeps);
  accountRoutes(app, routeDeps);
  playListRoutes(app, routeDeps);
  dashboardRoutes(app, routeDeps);

  return app;
}
