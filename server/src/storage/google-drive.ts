import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import { GoogleAuth } from 'google-auth-library';
import { HttpError } from '../http.js';
import { contentDisposition, type FileResponse, type FileStore, type OpenOptions, type Storage } from './types.js';

const FILES_API = 'https://www.googleapis.com/drive/v3/files';
const PASSTHROUGH_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];

/**
 * Largest chunk served per Range request. Players ask for `bytes=0-` and fetch the rest as they go, so
 * a skipped song doesn't pull the whole file from Drive.
 */
export const MAX_RANGE_BYTES = 8 * 1024 * 1024;

/** Caps an open-ended or oversized single range. Suffix (`bytes=-500`) and multi-part ranges pass through. */
export function capRange(range: string | undefined): string | undefined {
  const match = range?.match(/^bytes=(\d+)-(\d*)$/);
  if (!match) return range;
  const start = Number(match[1]);
  const end = Math.min(match[2] ? Number(match[2]) : Infinity, start + MAX_RANGE_BYTES - 1);
  return `bytes=${start}-${end}`;
}

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
}

export const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

export interface DriveApi {
  findChild(parentId: string, name: string): Promise<string | null>;
  listChildren(folderId: string): Promise<DriveItem[]>;
  download(fileId: string, range?: string): Promise<Response>;
  /** Throws unless the file or folder is readable with the API's credentials. */
  assertReadable(fileId: string): Promise<void>;
}

/** Escapes a value for a single-quoted string in a Drive search query. */
const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export function createDriveApi(auth: Pick<GoogleAuth, 'getAccessToken'>, fetchImpl: typeof fetch = fetch): DriveApi {
  const authorization = async () => ({ authorization: `Bearer ${await auth.getAccessToken()}` });

  return {
    async findChild(parentId, name) {
      const query = new URLSearchParams({
        q: `${quote(parentId)} in parents and name = ${quote(name)} and trashed = false`,
        fields: 'files(id)',
        pageSize: '1',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      });
      const response = await fetchImpl(`${FILES_API}?${query}`, { headers: await authorization() });
      if (!response.ok) {
        throw new Error(`Google Drive lookup failed (${response.status}): ${await response.text()}`);
      }
      const { files } = (await response.json()) as { files: { id: string }[] };
      return files[0]?.id ?? null;
    },

    async listChildren(folderId) {
      const items: DriveItem[] = [];
      let pageToken: string | undefined;
      do {
        const query = new URLSearchParams({
          q: `${quote(folderId)} in parents and trashed = false`,
          fields: 'nextPageToken, files(id, name, mimeType)',
          pageSize: '1000',
          supportsAllDrives: 'true',
          includeItemsFromAllDrives: 'true',
          ...(pageToken ? { pageToken } : {}),
        });
        const response = await fetchImpl(`${FILES_API}?${query}`, { headers: await authorization() });
        if (!response.ok) {
          throw new Error(`Google Drive listing failed (${response.status}): ${await response.text()}`);
        }
        const page = (await response.json()) as { files: DriveItem[]; nextPageToken?: string };
        items.push(...page.files);
        pageToken = page.nextPageToken;
      } while (pageToken);
      return items;
    },

    async download(fileId, range) {
      return fetchImpl(`${FILES_API}/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, {
        headers: {
          ...(await authorization()),
          // Undici would otherwise transparently decompress and break Content-Length/Range.
          'accept-encoding': 'identity',
          ...(range ? { range } : {}),
        },
      });
    },

    async assertReadable(fileId) {
      const response = await fetchImpl(`${FILES_API}/${encodeURIComponent(fileId)}?fields=id&supportsAllDrives=true`, {
        headers: await authorization(),
      });
      if (!response.ok) {
        throw new Error(`Google Drive item ${fileId} is not readable (${response.status}): ${await response.text()}`);
      }
    },
  };
}

/**
 * Serves files from a Drive folder tree laid out like the old S3 buckets, so the existing
 * `Path` values in the database (e.g. `ensembles/<artist>/songs/<file>.mp3`) keep working.
 * Drive has no signed URLs, so bytes are proxied through the API with Range support.
 */
export class DriveFileStore implements FileStore {
  private readonly ids = new Map<string, Promise<string | null>>();

  constructor(
    private readonly rootFolderId: string,
    private readonly api: DriveApi,
  ) {}

  async open(key: string, { range, downloadName }: OpenOptions = {}): Promise<FileResponse | null> {
    const fileId = await this.resolve(key);
    if (!fileId) {
      return null;
    }

    const response = await this.api.download(fileId, capRange(range));
    if (response.status === 404) {
      this.ids.delete(normalize(key));
      return null;
    }
    if (!response.ok && response.status !== 416) {
      const detail = await response.text();
      if (response.status === 429 || (response.status === 403 && /rateLimitExceeded|downloadQuotaExceeded/.test(detail))) {
        // Drive throttles heavily downloaded files; this is temporary, so let clients retry.
        throw new HttpError(503, 'Song is temporarily unavailable, please try again later.');
      }
      throw new Error(`Google Drive download failed (${response.status}): ${detail}`);
    }
    if (!response.body) {
      throw new Error('Google Drive returned an empty response');
    }

    const headers: Record<string, string> = { 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=86400' };
    for (const name of PASSTHROUGH_HEADERS) {
      const value = response.headers.get(name);
      if (value) headers[name] = value;
    }
    if (downloadName) {
      headers['content-disposition'] = contentDisposition(downloadName);
    }

    return {
      status: response.status,
      headers,
      body: Readable.fromWeb(response.body as ReadableStream<Uint8Array>),
    };
  }

  /** Resolves a key to a Drive file id, one path segment at a time. */
  resolve(key: string): Promise<string | null> {
    return this.resolveSegments(normalize(key).split('/').filter(Boolean));
  }

  private resolveSegments(segments: string[]): Promise<string | null> {
    if (segments.length === 0) {
      return Promise.resolve(this.rootFolderId);
    }

    const path = segments.join('/');
    let id = this.ids.get(path);
    if (!id) {
      const name = segments[segments.length - 1]!;
      id = this.resolveSegments(segments.slice(0, -1)).then((parentId) =>
        parentId ? this.api.findChild(parentId, name) : null,
      );
      this.ids.set(path, id);
      // Only hits are cached, so files added to Drive later are found without a restart.
      id.then(
        (resolved) => resolved ?? this.ids.delete(path),
        () => this.ids.delete(path),
      );
    }
    return id;
  }
}

const normalize = (key: string) => key.split('/').filter(Boolean).join('/');

export interface DriveStorageOptions {
  audioFolderId: string;
  imageFolderId: string;
  serviceAccountKey?: string;
  serviceAccountKeyFile?: string;
}

/** Uses the given service-account key, or else Application Default Credentials (e.g. a `gcloud` login). */
export function createDriveApiFromCredentials(options: Pick<DriveStorageOptions, 'serviceAccountKey' | 'serviceAccountKeyFile'>) {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    ...(options.serviceAccountKey
      ? { credentials: JSON.parse(options.serviceAccountKey) }
      : options.serviceAccountKeyFile
        ? { keyFile: options.serviceAccountKeyFile }
        : {}),
  });
  return createDriveApi(auth);
}

export function createDriveStorage(options: DriveStorageOptions): Storage & { audio: DriveFileStore; images: DriveFileStore } {
  const api = createDriveApiFromCredentials(options);

  return {
    audio: new DriveFileStore(options.audioFolderId, api),
    images: new DriveFileStore(options.imageFolderId, api),
    async check() {
      await Promise.all([api.assertReadable(options.audioFolderId), api.assertReadable(options.imageFolderId)]);
    },
  };
}
