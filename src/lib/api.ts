/**
 * Minimal client for the lyric-chord backend. Cloud features are disabled when
 * `VITE_API_URL` is not set at build time.
 */

export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
export const cloudEnabled = API_URL !== '';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let currentToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};

/** Wires the auth store in without a circular import. */
export function configureApiAuth(getToken: () => string | null, unauthorized: () => void): void {
  currentToken = getToken;
  onUnauthorized = unauthorized;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = currentToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && typeof init.body === 'string') headers.set('Content-Type', 'application/json');

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Can’t reach the server. Check your connection.');
  }
  if (res.ok) return res;

  if (res.status === 401 && token) onUnauthorized();
  let message = `Request failed (${res.status}).`;
  try {
    const body = await res.json();
    if (typeof body?.error === 'string') message = body.error;
  } catch {}
  throw new ApiError(res.status, message);
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Filename from a `Content-Disposition: attachment; filename="…"` header. */
export function dispositionFilename(res: Response, fallback: string): string {
  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '');
  return match?.[1] ?? fallback;
}
