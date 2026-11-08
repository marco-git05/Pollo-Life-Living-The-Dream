// Tiny helpers for the saved login session ({ token, user }) in localStorage.

const KEY = 'finance-village-session';

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the session just won't survive a refresh */
  }
}

export function getToken() {
  return loadSession()?.token ?? null;
}
