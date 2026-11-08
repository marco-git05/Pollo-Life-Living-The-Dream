import { api } from './client';

// Talks to the real backend:
//   POST /api/auth/register  { username, password, displayName?, ageGroup? } -> { token, user, bankWarning? }
//   POST /api/auth/login     { username, password }                          -> { token, user }
// Backend errors come back as { error } and are thrown as readable Error messages.

// Adds the fields the UI reads (name for the greeting, fullName/memberSince for Account settings).
function normalizeUser(u = {}) {
  const full = u.displayName || u.username || 'there';
  return {
    ...u,
    name: full.split(/\s+/)[0],
    fullName: full,
    memberSince: u.createdAt ? String(u.createdAt).slice(0, 10) : null,
  };
}

export async function login({ username, password }) {
  if (!username.trim()) throw new Error('Enter your username.');
  if (!password) throw new Error('Enter your password.');
  const data = await api('/auth/login', {
    method: 'POST',
    body: { username: username.trim(), password },
  });
  return { token: data.token, user: normalizeUser(data.user) };
}

export async function register({ username, password, displayName, ageGroup }) {
  if (!username.trim()) throw new Error('Choose a username.');
  if (!password) throw new Error('Choose a password.');
  const body = { username: username.trim(), password };
  if (displayName?.trim()) body.displayName = displayName.trim();
  if (ageGroup) body.ageGroup = ageGroup; // kid | teen | young_adult | adult
  const data = await api('/auth/register', { method: 'POST', body });
  // data.bankWarning is set if the mock bank couldn't be created; the dashboard offers "Connect account".
  return { token: data.token, user: normalizeUser(data.user), bankWarning: data.bankWarning };
}

// Demo account created by the backend's `npm run seed`.
export function loginDemo() {
  return login({ username: 'demo', password: 'demo1234' });
}
