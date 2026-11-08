import { getToken } from '../auth/session';

// In dev, Vite proxies /api to the backend (see vite.config.js).
// For a deployed build, set VITE_API_URL (e.g. https://my-api.example.com).
const PRODUCTION_API = 'https://pollo-life-api.vercel.app';
const BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : PRODUCTION_API);

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// api('/bank'), api('/auth/login', { method: 'POST', body: {...} })
// Sends the Bearer token automatically. Backend errors look like { error: "message" }.
export async function api(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new ApiError("Can't reach the server. Is the backend running?", 0);
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    // An expired or invalid token: tell AuthProvider to sign the user out.
    if (res.status === 401 && token) window.dispatchEvent(new Event('auth:unauthorized'));
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data;
}
