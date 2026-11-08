import { useContext } from 'react';
import { AuthContext } from './context';

// Returns { user, token, login, register, loginDemo, logout }.
// `user` is null when signed out.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
