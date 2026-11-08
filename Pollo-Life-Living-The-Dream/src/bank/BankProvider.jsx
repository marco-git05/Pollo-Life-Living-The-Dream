import { useCallback, useEffect, useMemo, useState } from 'react';
import { BankContext } from './context';
import { connectBank, getBank } from '../api/bank';

// Loads the bank snapshot once and shares it with the dashboard, account page, and anything else.
export default function BankProvider({ children }) {
  const [snapshot, setSnapshot] = useState(undefined);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setSyncing(true);
    setError(null);
    try {
      const data = await getBank({ refresh });
      setSnapshot(data ?? null);
    } catch (err) {
      setError(err.message || 'Could not load your bank data.');
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const value = useMemo(() => {
    const status = snapshot === undefined ? (error ? 'error' : 'loading') : 'ready';
    return {
      snapshot,
      status,
      error,
      syncing,
      stale: Boolean(snapshot?.stale),
      refresh: () => load(true),
      connect: async () => {
        await connectBank();
        await load(true);
      },
    };
  }, [snapshot, error, syncing, load]);

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}
