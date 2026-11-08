import { user as demoUser } from '../data/dummyData';

// ─────────────────────────────────────────────────────────────
// STUB AUTH. Replace each function body with a fetch() to the backend:
//   POST /api/auth/login     { email, password }        -> { token, user }
//   POST /api/auth/register  { name, email, password }  -> { token, user }
// `user` shape: { name, fullName, email, memberSince }
// Throw an Error with a readable message on failure; the login form shows it.
// ─────────────────────────────────────────────────────────────

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const EMAIL = /^\S+@\S+\.\S+$/;
const today = () => new Date().toISOString().slice(0, 10);
const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function nameFromEmail(email) {
  return titleCase(email.split('@')[0].split(/[._-]/)[0]);
}

export async function login({ email, password }) {
  await delay(400);
  const e = email.trim();
  if (!EMAIL.test(e)) throw new Error('Enter a valid email address.');
  if (!password) throw new Error('Enter your password.');
  // Dummy rule: any valid email + any password works.
  const name = nameFromEmail(e);
  return { token: 'dummy-token', user: { name, fullName: name, email: e, memberSince: today() } };
}

export async function register({ name, email, password }) {
  await delay(500);
  const e = email.trim();
  if (!name.trim()) throw new Error('Enter your name.');
  if (!EMAIL.test(e)) throw new Error('Enter a valid email address.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  const full = name.trim();
  return {
    token: 'dummy-token',
    user: { name: full.split(/\s+/)[0], fullName: full, email: e, memberSince: today() },
  };
}

export async function loginDemo() {
  await delay(250);
  return { token: 'dummy-token', user: demoUser };
}
