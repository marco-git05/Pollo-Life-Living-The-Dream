import { useMemo, useState } from 'react';
import { AuthContext } from './context';
import * as api from '../api/auth';

const KEY = 'finance-village-session';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(session) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
  }
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(load);

  const value = useMemo(() => {
    const finish = (s) => {
      save(s);
      setSession(s);
      return s;
    };
    return {
      user: session?.user ?? null,
      token: session?.token ?? null,
      login: async (creds) => finish(await api.login(creds)),
      register: async (details) => finish(await api.register(details)),
      loginDemo: async () => finish(await api.loginDemo()),
      logout: () => finish(null),
    };
  }, [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
