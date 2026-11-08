import { useContext } from 'react';
import { CreaturesContext } from './context';

// Returns:
//   catalog     creature types from GET /api/creatures/catalog ([] until loaded)
//   creatures   the user's creatures ([] until loaded)
//   status      'loading' | 'error' | 'ready'
//   error       message of the last failed load (or null)
//   entry(type) catalog entry for a creature type
//   add(body) / update(id, body) / remove(id)   each returns a promise
//   reload()    refetch creatures (e.g. after a transaction changed their data)
export function useCreatures() {
  const ctx = useContext(CreaturesContext);
  if (!ctx) throw new Error('useCreatures must be used inside <CreaturesProvider>');
  return ctx;
}
