/**
 * Checks that every song and holiday image in the database resolves to a file in Google Drive.
 * Run after copying the S3 buckets to Drive, before shutting S3 down.
 */
import { loadConfig } from '../src/config.js';
import { createPgDb } from '../src/db.js';
import { createDriveStorage } from '../src/storage/google-drive.js';

const config = loadConfig();
const db = createPgDb(config.DATABASE_URL);
const drive = createDriveStorage({
  audioFolderId: config.GDRIVE_AUDIO_FOLDER_ID,
  imageFolderId: config.GDRIVE_IMAGE_FOLDER_ID,
  serviceAccountKey: config.GOOGLE_SERVICE_ACCOUNT_KEY,
  serviceAccountKeyFile: config.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
});

const { rows: songs } = await db.query<{ id: string; path: string }>(`SELECT "Id" AS id, "Path" AS path FROM media."Song"`);
const { rows: images } = await db.query<{ id: string; path: string }>(
  `SELECT "Id" AS id, "ImagePath" AS path FROM holiday."Holiday"`,
);

const missing: string[] = [];
// Sequential on purpose: folder lookups are cached, and it stays well inside Drive API rate limits.
for (const song of songs) {
  if (!(await drive.audio.resolve(song.path))) missing.push(`song ${song.id}: ${song.path}`);
}
for (const image of images) {
  if (!(await drive.images.resolve(image.path))) missing.push(`holiday ${image.id}: ${image.path}`);
}

console.log(`Checked ${songs.length} songs and ${images.length} holiday images: ${missing.length} missing.`);
for (const line of missing) console.log(`  ${line}`);
if (songs.length > 0 && missing.length >= songs.length) {
  console.log(
    '\nNothing resolved: GDRIVE_AUDIO_FOLDER_ID should be the folder that directly contains ' +
      `"${songs[0]!.path.split('/')[0]}/", and it must be shared with the account the script runs as.`,
  );
}

await db.close();
process.exitCode = missing.length ? 1 : 0;
