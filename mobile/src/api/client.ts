import { getItem, setItem, deleteItem } from './storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

if (!process.env.EXPO_PUBLIC_API_URL) {
  // localhost points at the device itself on real hardware.
  console.warn('[api] EXPO_PUBLIC_API_URL is not set — falling back to http://localhost:3000');
}

// Notifies the app (AuthContext) when the session can no longer be refreshed.
let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(cb: (() => void) | null): void {
  onSessionExpired = cb;
}

// Single in-flight refresh: concurrent 401s must not race each other,
// because the server rotates the refresh token on every use.
let refreshPromise: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = await getItem('refreshToken');
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    await setItem('accessToken', data.accessToken);
    // The server rotates the refresh token; keeping the old one would
    // log the user out on the next refresh.
    if (data.refreshToken) await setItem('refreshToken', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // A 401 from /auth/* is a credentials problem (wrong password, bad
  // refresh token), not an expired session — surface the server's message.
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = await getItem('accessToken');
      res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    } else {
      await deleteItem('accessToken');
      await deleteItem('refreshToken');
      onSessionExpired?.();
      const err = Object.assign(new Error('Session expired'), { status: 401 });
      throw err;
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
