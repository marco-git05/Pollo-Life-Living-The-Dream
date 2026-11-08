import { useContext } from 'react';
import { BankContext } from './context';

// Returns:
//   snapshot   undefined = not loaded yet, null = user has no bank, object = the bank snapshot
//   status     'loading' | 'error' | 'ready'
//   error      message of the last failed request (or null)
//   stale      true when the backend returned its cached copy because Nessie was unreachable
//   syncing    true while a request is in flight
//   refresh()  force a fresh pull from Nessie
//   connect()  create the mock bank, then reload
export function useBank() {
  const ctx = useContext(BankContext);
  if (!ctx) throw new Error('useBank must be used inside <BankProvider>');
  return ctx;
}
