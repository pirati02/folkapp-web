import { buildApp } from './app.js';
import { createJwt } from './auth.js';
import { loadConfig } from './config.js';
import { createPgDb } from './db.js';
import { createDriveStorage } from './storage/google-drive.js';
import { createUrlShortener } from './url-shortener.js';

const config = loadConfig();
const db = createPgDb(config.DATABASE_URL);

const app = await buildApp(
  {
    db,
    storage: createDriveStorage({
      audioFolderId: config.GDRIVE_AUDIO_FOLDER_ID,
      imageFolderId: config.GDRIVE_IMAGE_FOLDER_ID,
      serviceAccountKey: config.GOOGLE_SERVICE_ACCOUNT_KEY,
      serviceAccountKeyFile: config.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
    }),
    jwt: createJwt({
      secret: config.JWT_SECRET,
      issuer: config.JWT_ISSUER,
      expiresInSeconds: config.JWT_EXPIRATION_SECONDS,
    }),
    shortenUrl: createUrlShortener(config.TINYURL_TOKEN, (error) => app.log.warn({ err: error }, 'URL shortening failed')),
    corsOrigins: config.CORS_ORIGINS,
    publicBaseUrl: config.PUBLIC_BASE_URL,
  },
  { level: 'info' },
);

app.addHook('onClose', () => db.close());

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.close().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
}

await app.listen({ host: config.HOST, port: config.PORT });
