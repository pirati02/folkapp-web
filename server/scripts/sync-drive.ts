/**
 * Creates the database schema if needed and adds every artist and song found in the Drive songs folder.
 * Safe to re-run: use it after uploading new songs to Drive.
 *
 *   npm run drive:sync              # needs DATABASE_URL, GDRIVE_AUDIO_FOLDER_ID and Google credentials
 *   npm run drive:sync -- --dry-run # only reports what would be added
 */
import { readFileSync } from 'node:fs';
import { listFiles, syncCatalog, toCatalogEntries } from '../src/catalog-sync.js';
import { createPgDb } from '../src/db.js';
import { createDriveApiFromCredentials } from '../src/storage/google-drive.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see .env.example)`);
  return value;
}

const dryRun = process.argv.includes('--dry-run');
const api = createDriveApiFromCredentials({
  serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  serviceAccountKeyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
});

console.log('Listing the Drive songs folder...');
const files = await listFiles(api, requireEnv('GDRIVE_AUDIO_FOLDER_ID'));
const { entries, skipped } = toCatalogEntries(files);

const artists = new Set(entries.map((entry) => `${entry.artistType}/${entry.artistName}`));
console.log(`Found ${entries.length} songs by ${artists.size} artists; skipped ${skipped.length} files.`);
for (const { path, reason } of skipped) console.log(`  skipped ${path}: ${reason}`);

if (dryRun) {
  console.log('Dry run: the database was not touched.');
} else {
  const db = createPgDb(requireEnv('DATABASE_URL'));
  try {
    await db.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
    const { artistsAdded, songsAdded } = await syncCatalog(db, entries);
    console.log(`Added ${artistsAdded} artists and ${songsAdded} songs.`);
  } finally {
    await db.close();
  }
}
