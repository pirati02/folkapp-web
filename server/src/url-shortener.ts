export type UrlShortener = (url: string, description: string) => Promise<string>;

/**
 * Shortens links with TinyURL when a token is configured; otherwise returns the URL unchanged.
 * Results are cached per URL so repeated shares don't create new TinyURL aliases.
 */
export function createUrlShortener(token: string | undefined, log: (error: unknown) => void): UrlShortener {
  const cache = new Map<string, string>();

  return async (url, description) => {
    if (!token) return url;

    const cached = cache.get(url);
    if (cached) return cached;

    try {
      const response = await fetch(`https://api.tinyurl.com/create?api_token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ url, domain: 'tinyurl.com', description }),
      });
      if (!response.ok) {
        throw new Error(`TinyURL responded ${response.status}: ${await response.text()}`);
      }
      const { data } = (await response.json()) as { data: { tiny_url: string } };
      cache.set(url, data.tiny_url);
      return data.tiny_url;
    } catch (error) {
      // The long link works too, so sharing should not fail because the shortener did.
      log(error);
      return url;
    }
  };
}
