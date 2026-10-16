# folkapp-server

Node.js replacement for the .NET `FolkApp.API`, with **no AWS dependencies**: songs and holiday images
are streamed from **Google Drive**, and the database is any PostgreSQL with the existing FolkApp schema.

It keeps the .NET API's routes, JSON shapes (`{ body, error }`), status codes, and JWT claims, so the web
app switches by changing only its API URL.

Stack: Node 22, TypeScript, Fastify 5, `pg`, `jose`, `zod`, `google-auth-library`.

## Run

```bash
cp .env.example .env     # fill in DATABASE_URL, JWT_*, GDRIVE_* and the service-account key
npm install
npm run dev              # http://localhost:8080
npm test                 # runs against an in-memory Postgres (PGlite); no Docker needed
npm run build && npm start
npm run drive:sync       # adds artists/songs found in Drive to the database
npm run drive:verify     # checks every song/image in the database exists in Drive
```

`db/schema.sql` mirrors the EF Core schema, for a fresh database. Deploy with the `Dockerfile`.

### Local development with the web app

1. `docker compose up -d` starts Postgres on `localhost:5433` (user/password/db: `folk`/`folk`/`folkapp`).
2. Google access for the API, via the [Cloud Console](https://console.cloud.google.com) in project
   `folk-app-fb823` (no billing needed):
   - APIs & Services → Library → enable **Google Drive API**;
   - IAM & Admin → Service Accounts → create one with the id `folkapp-api` (no roles needed);
   - in that account: Keys → Add key → JSON, saved as `server/service-account.json` (gitignored);
   - in Google Drive, share the songs and holiday-image folders with
     `folkapp-api@folk-app-fb823.iam.gserviceaccount.com` as **Viewer**.
3. In `.env`: `DATABASE_URL=postgres://folk:folk@localhost:5433/folkapp`, the two `GDRIVE_*` folder ids,
   and `GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./service-account.json`.
4. `npm run drive:sync` fills the database from Drive, then `npm run dev` starts the API on port 8080.
   `/health` should report `database` and `storage` as `ok`.
5. In the repository root, `npm start` serves the web app on http://localhost:4200, already pointed at
   `http://localhost:8080` (`src/environments/environment.development.ts`).

## How songs are served from Google Drive

Every song's `path` is a link to this API: `/songs/:id/stream`. The API looks up the song's `Path`
(for example `ensembles/<artist>/songs/<file>.mp3`), finds that file in a Drive folder tree with the same
layout as the old S3 bucket, and streams it through the Drive API as a service account. It forwards the
browser's `Range` header, so seeking works. **No database changes are needed.** Folder lookups are cached
in memory, so after warm-up each request costs one Drive call.

Why the API proxies the bytes: Drive has no signed URLs, and its public "anyone with the link" download
URLs aren't usable for a player. They are rate-limited per file, show a virus-scan page for large files,
and don't reliably support seeking.

What that means in practice:

- **All audio passes through the server**, so pick a host whose bandwidth is cheap (see below).
- Drive throttles files that are downloaded very heavily. The API then answers `503` ("temporarily
  unavailable"), and the next play works again once the quota resets.
- Links never expire, so cached and shared songs keep working.

## Going live

The songs are in Google Drive and AWS is gone. The old RDS database went with it, so the catalog is
rebuilt from the Drive folders, the same way it was originally seeded from S3. What can't be rebuilt
from Drive (user accounts, playlists, favourites, play counts, holidays) starts empty; the web app
doesn't use any of it.

### 1. Drive layout

The songs folder (`GDRIVE_AUDIO_FOLDER_ID`) must directly contain the type folders:

```
<songs folder>/
  ensembles/<artist>/songs/<song>.mp3
  ensembles/<artist>/chants/<chant>.mp3
  oldRecordings/<artist>/.../<song>.mp3
```

`ensembles` → ensemble, `oldRecordings` → old recording; a file under a `chants` folder is a chant,
anything else a song. The file name without `.mp3` is the song's title. Holiday images go in their own
folder (`GDRIVE_IMAGE_FOLDER_ID`). A folder's id is the last part of its URL.

### 2. Database

Create an empty Postgres. Neon's free tier is enough (it runs on AWS infrastructure but needs no AWS
account); Google Cloud SQL (about $10 a month) keeps everything in Google Cloud, and then also needs
`--add-cloudsql-instances` in the deploy workflow and a `?host=/cloudsql/<connection-name>` `DATABASE_URL`.

### 3. Fill the catalog from Drive

In `server/.env` set `DATABASE_URL` and `GDRIVE_AUDIO_FOLDER_ID`, and give the script Google access in
one of two ways:

- your own login: `gcloud auth application-default login --scopes=https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/cloud-platform`
  (if Google blocks Drive access for gcloud's login, use the other option); or
- a key for the `folkapp-api` service account (created in step 4) in `GOOGLE_SERVICE_ACCOUNT_KEY_FILE`.
  Delete the key afterwards.

```bash
npm run drive:sync -- --dry-run   # shows what it found and which files it skipped, and why
npm run drive:sync                # creates the tables and adds the artists and songs
```

Re-run `npm run drive:sync` whenever you upload new songs: it only adds what's new and never deletes.

### 4. Deploy to Google Cloud Run

The API runs on Cloud Run in the Firebase project (`folk-app-fb823`, region `europe-west1`), deployed
by `.github/workflows/server-deploy.yml` on every push to `master` that touches `server/`. GitHub signs
in to Google Cloud through Workload Identity Federation, so no keys are stored in GitHub. On Cloud Run
the API reads Drive as its own service account, so no key file is needed there either.

1. Cloud Run needs billing: switch the Firebase project to the **Blaze** plan (pay as you go; the free
   tiers still apply) and set a budget alert in Google Cloud Billing.
2. Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install), run `gcloud auth login`, then
   `bash server/deploy/setup-gcp.sh`. It enables the APIs and creates the image repository, the two
   service accounts, the secrets (it asks for `DATABASE_URL` and generates `JWT_SECRET`), and the GitHub
   sign-in. At the end it prints what's left:
   - share the Drive folder(s) with `folkapp-api@folk-app-fb823.iam.gserviceaccount.com` as Viewer;
   - add four repository **variables** in GitHub (provider, deployer account, two folder ids).
3. Run the **Deploy API to Cloud Run** workflow from the Actions tab. It tests, builds, deploys, and
   finally calls `/health`, which fails unless both the database and the Drive folders are reachable.

Cost to keep in mind: audio streams through the API, so Cloud Run's outbound traffic is the main cost
once past its free allowance. Roughly, 1,000 plays a day of ~5 MB songs is about 150 GB a month.
`--max-instances=3` caps runaway scaling. Each response is at most 8 MB (players fetch songs in ranged
chunks), and whole-file downloads are streamed, so long recordings stay within Cloud Run's limits.

### 5. Point the web app at it

Put the Cloud Run URL in `src/environments/environment.ts` (`apiUrl`) and push; Firebase Hosting
deploys it. (`ng serve` uses `environment.development.ts`, i.e. a local API on port 8080.)

## Endpoints

Routes are case-insensitive, as in ASP.NET. 🔒 = needs `Authorization: Bearer <token>`.

| Method | Path | Notes |
|---|---|---|
| GET | `/artists/:type/all` | `type`: 1 old recordings, 2 ensembles |
| GET | `/artists/:id` | |
| GET | `/songs/:artistId/all` | `{ songs, chants }`; `isFav` is filled in when signed in |
| GET | `/songs/:id/stream` | **New.** The audio URL used as every song's `path`. Supports `Range` |
| GET | `/songs/:id/file` | Same audio, as a download |
| GET | `/songs/:id/share` | Shareable link (TinyURL-shortened if `TINYURL_TOKEN` is set) |
| PUT | `/songs/:id/log` | `{ logType: 0 }` played, `1` downloaded |
| PUT | `/songs/:id/mark-as-favourite` 🔒 | Toggles; `true` = now a favourite |
| GET | `/songs/favourites` 🔒 | |
| GET | `/search/:term` | Case-insensitive substring search, up to 100 of each |
| POST | `/account/register` · `/account/login` · `/account/login-by-token` | |
| PUT | `/account/verify/:id` | |
| DELETE | `/account/deactivate` 🔒 | |
| GET/POST | `/playlist` 🔒 | |
| PUT/DELETE | `/playlist/:id` 🔒 | |
| GET | `/dashboard?date=YYYY-MM-DD` 🔒 | |
| GET | `/holidays/:id/image` | **New.** Holiday image, used as `imagePath` |
| GET | `/health` | Checks the database connection |

## Differences from the .NET API

Deliberate fixes. Everything else matches.

- **Song `path` is a stable API link** (`/songs/:id/stream`) instead of a 7-day presigned S3 URL, so cached
  songs in the web app and shared links no longer die after a week.
- **`login-by-token` verifies the token.** .NET read it without checking the signature, so anyone could
  forge a token for any account and get a valid one back. Now the signature and issuer must be valid,
  and the token must be one the API issued (it is in `AccountDevice`). Expired tokens are still accepted
  here, since refreshing them is the point.
- **`DELETE /account/deactivate` requires a valid token** (it had no `[Authorize]` and trusted unsigned
  tokens). Deactivated accounts can no longer sign in.
- **Playlists are scoped to their owner.** Any signed-in user could edit or delete anyone's playlist,
  and playlist names had to be unique across all users.
- **Passwords:** .NET derived the PBKDF2 salt from the password length, so it was effectively unsalted.
  Existing hashes still verify and are re-hashed with a random salt on the next login. New accounts get
  random salts. Once a user has signed in through this server, the .NET API can't verify their password,
  so don't run both against the same database long-term.
- `artistType` is reported correctly (.NET serialized `1` as `"ensembles"` and `2` as `"oldRecordings"`).
- Play/download counters are incremented atomically. Song lists are sorted by name.

The holiday `title` still carries the holiday's *description*, as .NET sent it, so existing clients
render the same. Email verification stays disabled, as it was.

## Adding new songs

Upload the file into the matching Drive folder (e.g. `ensembles/<artist>/songs/`) and run
`npm run drive:sync`. It adds the new song (and artist, if new) to the database.
