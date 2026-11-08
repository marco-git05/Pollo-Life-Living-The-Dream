import { useState } from 'react';
import { useAuth } from '../auth/useAuth';

export default function Login() {
  const { login, register, loginDemo } = useAuth();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const run = async (action) => {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    run(() => (isRegister ? register(form) : login(form)));
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

  return (
    <main className="login-page">
      <div className="login-card">

        <h1>Poyo Life: Living the Dream</h1>
        <p className="login-sub">See your whole financial picture and your next move.</p>

        <div className="auth-tabs" role="group" aria-label="Sign in or create account">
          <button type="button" aria-pressed={!isRegister} onClick={() => switchMode('signin')}>
            Sign in
          </button>
          <button type="button" aria-pressed={isRegister} onClick={() => switchMode('register')}>
            Create account
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          {isRegister && (
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={setField('name')}
                placeholder="Sam Rivera"
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={setField('email')}
              placeholder="you@example.com"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={form.password}
              onChange={setField('password')}
              placeholder={isRegister ? 'At least 6 characters' : 'Your password'}
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="primary-btn" disabled={busy}>
            {busy ? 'One moment…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button type="button" className="secondary-btn" disabled={busy} onClick={() => run(loginDemo)}>
          Try the demo
        </button>
      </div>
    </main>
  );
}
