import type { Readable } from 'node:stream';
import type { FastifyReply } from 'fastify';

export interface FileResponse {
  status: number;
  headers: Record<string, string>;
  body: Readable;
}

export interface OpenOptions {
  /** The client's `Range` header, forwarded so seeking in the audio player works. */
  range?: string;
  /** When set, the file is served as a download with this file name. */
  downloadName?: string;
}

export interface FileStore {
  /**
   * Opens a file by its bucket-style key, e.g. `ensembles/<artist>/songs/<file>.mp3`.
   * Resolves to null when the file does not exist.
   */
  open(key: string, options?: OpenOptions): Promise<FileResponse | null>;
}

export interface Storage {
  audio: FileStore;
  images: FileStore;
  /** Throws unless the storage is reachable with the configured credentials. */
  check(): Promise<void>;
}

export function contentDisposition(fileName: string): string {
  const asciiFallback = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export function sendFile(reply: FastifyReply, file: FileResponse) {
  return reply.code(file.status).headers(file.headers).send(file.body);
}
