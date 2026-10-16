import { z } from 'zod';

const list = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);

const schema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(8080),
  /** Public origin of this API, used to build song/image links. Falls back to the request's origin. */
  PUBLIC_BASE_URL: z.url().optional(),
  CORS_ORIGINS: list.default(['http://localhost:4200']),

  /** e.g. postgres://user:pass@host:5432/FolkAppDatabase?sslmode=no-verify */
  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1),
  JWT_EXPIRATION_SECONDS: z.coerce.number().int().positive().default(36_000),

  /** Google Drive folders holding the songs and the holiday images; shared with the service account. */
  GDRIVE_AUDIO_FOLDER_ID: z.string().min(1),
  GDRIVE_IMAGE_FOLDER_ID: z.string().min(1),
  /** Service-account key as raw JSON (used on Render), or a path to the key file (used locally). */
  GOOGLE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_KEY_FILE: z.string().optional(),

  /** Optional: when set, shared song links are shortened with TinyURL. */
  TINYURL_TOKEN: z.string().optional(),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = schema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
