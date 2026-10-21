// The app's service worker: Angular's (ngsw-worker.js, imported below) plus playback of songs saved
// for offline listening. The player asks for a downloaded song as `<stream url>?offline=1`
// (OfflineService.playbackUrl); only those requests are answered here, from the audio cache,
// so ordinary streaming never goes through this code.

const AUDIO_CACHE = 'folkapp-audio-v1';

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.searchParams.get('offline') !== '1') {
    return;
  }
  url.searchParams.delete('offline');
  event.respondWith(fromCache(url.href, event.request));
  // Angular's worker listens to the same event; it must not answer it as well.
  event.stopImmediatePropagation();
});

async function fromCache(key, request) {
  const cached = await caches.open(AUDIO_CACHE).then(cache => cache.match(key));
  if (!cached) {
    return fetch(request); // removed meanwhile: stream it (the API ignores `offline`)
  }
  const range = request.headers.get('range');
  if (!range) {
    return cached;
  }

  // Audio elements ask for byte ranges to start and to seek; answer with that slice.
  const blob = await cached.blob();
  const size = blob.size;
  const [, from, to] = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = from ? Number(from) : 0;
  let end = to ? Math.min(Number(to), size - 1) : size - 1;
  if (!from && to) {
    start = Math.max(size - Number(to), 0); // "bytes=-500": the last 500 bytes
    end = size - 1;
  }
  if (start >= size || start > end) {
    return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${size}`}});
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}

importScripts('ngsw-worker.js');
