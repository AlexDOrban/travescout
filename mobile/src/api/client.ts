import { getItem, setItem, deleteItem } from './storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 15000);

if (!process.env.EXPO_PUBLIC_API_URL) {
  // localhost points at the device itself on real hardware.
  console.warn('[api] EXPO_PUBLIC_API_URL is not set — falling back to http://localhost:3000');
}

// Notifies the app (AuthContext) when the session can no longer be refreshed.
let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(cb: (() => void) | null): void {
  onSessionExpired = cb;
}

// fetch with a hard timeout so a stalled connection can't spin forever.
async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw Object.assign(new Error('The request timed out. Please try again.'), { status: 0, transient: true });
    }
    throw Object.assign(new Error('Network error. Check your connection and try again.'), { status: 0, transient: true });
  } finally {
    clearTimeout(timer);
  }
}

// 'ok'        — access token refreshed
// 'expired'   — refresh definitively rejected (401 / no token); session is over
// 'transient' — couldn't reach the server (network / 5xx / 429); DON'T log out
type RefreshOutcome = 'ok' | 'expired' | 'transient';

// Single in-flight refresh: concurrent 401s must not race, because the server
// rotates the refresh token on every use.
let refreshPromise: Promise<RefreshOutcome> | null = null;

function tryRefresh(): Promise<RefreshOutcome> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(): Promise<RefreshOutcome> {
  const refreshToken = await getItem('refreshToken');
  if (!refreshToken) return 'expired';
  let res: Response;
  try {
    res = await fetchWithTimeout(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Network/timeout — keep the (still valid) tokens; user can retry.
    return 'transient';
  }
  if (res.ok) {
    const data = await res.json();
    await setItem('accessToken', data.accessToken);
    // The server rotates the refresh token; keeping the old one would log the
    // user out on the next refresh.
    if (data.refreshToken) await setItem('refreshToken', data.refreshToken);
    return 'ok';
  }
  // Only a definitive 401 means the session is truly gone. A 429 (rate limit)
  // or 5xx (deploy/restart) is transient and must not destroy the session.
  return res.status === 401 ? 'expired' : 'transient';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res = await fetchWithTimeout(`${BASE_URL}${path}`, { ...options, headers });

  // A 401 from /auth/* is a credentials problem, not an expired session.
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const outcome = await tryRefresh();
    if (outcome === 'ok') {
      const newToken = await getItem('accessToken');
      res = await fetchWithTimeout(`${BASE_URL}${path}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    } else if (outcome === 'expired') {
      await deleteItem('accessToken');
      await deleteItem('refreshToken');
      onSessionExpired?.();
      throw Object.assign(new Error('Session expired'), { status: 401 });
    } else {
      // Transient — leave tokens intact so the user can retry when back online.
      throw Object.assign(
        new Error('Can’t reach the server right now. Please try again.'),
        { status: 0, transient: true }
      );
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw Object.assign(new Error(body.error ?? `HTTP ${res.status}`), { status: res.status });
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
};
