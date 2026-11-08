import { useEffect, useMemo, useState } from 'react';
import { AuthContext } from './context';
import { loadSession, saveSession } from './session';
import * as api from '../api/auth';

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);

  // client.js fires this when the backend answers 401 to a logged-in request (expired token).
  useEffect(() => {
    const onUnauthorized = () => {
      saveSession(null);
      setSession(null);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const value = useMemo(() => {
    const finish = (s) => {
      saveSession(s);
      setSession(s);
      return s;
    };
    return {
      user: session?.user ?? null,
      token: session?.token ?? null,
      login: async (creds) => finish(await api.login(creds)),
      register: async (details) => finish(await api.register(details)),
      loginDemo: async () => finish(await api.loginDemo()),
      loginCaseStudy: async (username, password) => finish(await api.loginCaseStudy(username, password)),
      logout: () => finish(null),
    };
  }, [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
