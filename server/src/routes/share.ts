import type { FastifyInstance } from 'fastify';
import type { RouteDeps } from '../app.js';
import { errors, uuidParam } from '../http.js';

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * The link people share. Messengers don't run the web app's JavaScript, so this page carries the
 * link-preview tags itself and then forwards real visitors to the song in the web app.
 */
export function shareRoutes(app: FastifyInstance, { db, links, webBaseUrl }: RouteDeps) {
  app.get<{ Params: { id: string } }>('/share/:id', async (request, reply) => {
    if (!webBaseUrl) {
      throw errors.notFound();
    }
    const web = webBaseUrl.replace(/\/+$/, '');

    // An old or mistyped link still lands somewhere useful.
    let id: string;
    try {
      id = uuidParam(request.params.id);
    } catch {
      return reply.redirect(`${web}/`);
    }
    const {
      rows: [song],
    } = await db.query<{ name: string; artistName: string }>(
      `SELECT s."Name" AS name, a."Name" AS "artistName"
       FROM media."Song" s JOIN media."Artist" a ON a."Id" = s."ArtistId" WHERE s."Id" = $1`,
      [id],
    );
    if (!song) {
      return reply.redirect(`${web}/`);
    }

    const target = `${web}/song/${id}`;
    const title = escapeHtml(song.name);
    const description = escapeHtml(`${song.artistName} · FolkApp`);
    const html = `<!doctype html>
<html lang="ka">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · ${escapeHtml(song.artistName)}</title>
<meta property="og:type" content="music.song">
<meta property="og:site_name" content="FolkApp">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${escapeHtml(links(request).sharePage(id))}">
<meta property="og:image" content="${escapeHtml(`${web}/icons/icon-512.png`)}">
<meta name="twitter:card" content="summary">
<script>location.replace(${JSON.stringify(target).replace(/</g, '\\u003c')});</script>
</head>
<body>
<p><a href="${escapeHtml(target)}">${title} — ${escapeHtml(song.artistName)}</a></p>
</body>
</html>`;
    return reply.type('text/html; charset=utf-8').header('cache-control', 'public, max-age=3600').send(html);
  });
}
