export class HttpError extends Error {
  constructor(
    public status: number,
    public url: string,
    public body?: unknown
  ) {
    super(`HTTP ${status} for ${url}`);
  }
}

const toRedirectParam = () =>
  encodeURIComponent(window.location.pathname + window.location.search);

// main fn for fetching json w/ built in error handling, auth redirection and it'll work well w/ react query
export async function fetchJson<T>(
  url: string,
  init: RequestInit & { skipRedirectOn401?: boolean } = {},
  signal?: AbortSignal
): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin', // front/back proxy on same domain and during prod it's same origin too
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    signal, // for cancellation/abort
    ...init,
  });

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  // Auto-redirect on 401
  if (res.status === 401 && !init.skipRedirectOn401) {
    window.location.href = `/login?returnUrl=${toRedirectParam()}`;
    // Halt the current render/update
    return new Promise<T>(() => {});
  }

  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';
  const data =
    contentType.includes('application/json') && text ? JSON.parse(text) : text;

  if (!res.ok) {
    throw new HttpError(res.status, url, data);
  }
  return data as T;
}
