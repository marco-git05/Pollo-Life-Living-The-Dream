import { useState } from 'react';

// Shown when the user has no mock bank yet (GET /api/bank returned null).
export default function ConnectBank({ onConnect }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const connect = async () => {
    setBusy(true);
    setError('');
    try {
      await onConnect();
    } catch (err) {
      setError(err.message || 'Could not connect your account.');
      setBusy(false);
    }
  };

  return (
    <section className="empty-state">
      <h2>Connect your bank</h2>
      <p>
        Link a mock Capital One account to fill your dashboard with balances, bills, and spending. It takes a few
        seconds.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="primary-btn" onClick={connect} disabled={busy}>
        {busy ? 'Connecting…' : 'Connect account'}
      </button>
    </section>
  );
}
