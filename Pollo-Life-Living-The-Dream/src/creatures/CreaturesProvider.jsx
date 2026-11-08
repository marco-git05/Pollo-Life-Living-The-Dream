import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreaturesContext } from './context';
import {
  createCreature,
  deleteCreature,
  getCatalog,
  getCreatures,
  updateCreature,
} from '../api/creatures';

// Loads the catalog + the user's creatures once and shares them with the village, dashboard and forms.
export default function CreaturesProvider({ children }) {
  const [catalog, setCatalog] = useState([]);
  const [creatures, setCreatures] = useState(undefined); // undefined = not loaded yet
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [cat, list] = await Promise.all([getCatalog(), getCreatures()]);
      setCatalog(cat);
      setCreatures(list);
      setError(null);
    } catch (err) {
      setError(err.message || 'Could not load your creatures.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reload = useCallback(async () => {
    try {
      setCreatures(await getCreatures());
    } catch (err) {
      setError(err.message || 'Could not refresh your creatures.');
    }
  }, []);

  const value = useMemo(() => {
    const status = creatures === undefined ? (error ? 'error' : 'loading') : 'ready';
    return {
      catalog,
      creatures: creatures ?? [],
      status,
      error,
      entry: (type) => catalog.find((c) => c.type === type),
      reload,
      add: async (body) => {
        try {
          const created = await createCreature(body);
          setCreatures((list) => [...(list ?? []), created]);
          return created;
        } catch (err) {
          await reload(); // the creature may have been saved even if a follow-up Nessie call failed
          throw err;
        }
      },
      update: async (id, body) => {
        try {
          const updated = await updateCreature(id, body);
          setCreatures((list) => (list ?? []).map((c) => (c._id === id ? updated : c)));
          return updated;
        } catch (err) {
          await reload();
          throw err;
        }
      },
      remove: async (id) => {
        await deleteCreature(id);
        setCreatures((list) => (list ?? []).filter((c) => c._id !== id));
      },
    };
  }, [catalog, creatures, error, reload]);

  return <CreaturesContext.Provider value={value}>{children}</CreaturesContext.Provider>;
}
