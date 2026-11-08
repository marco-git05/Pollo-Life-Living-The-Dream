import { useEffect, useMemo, useState } from 'react';
import Dashboard from './Dashboard';
import Village from '../village/Village';
import CreatureCard from './CreatureCard';
import AddCreatureModal from './AddCreatureModal';
import { useCreatures } from '../creatures/useCreatures';
import { toVillageCreature } from '../creatures/viewModel';

// NFC tags open the app at /?scan=creature:credit_card. Read it once, then clean the URL.
function takeScanParam() {
  try {
    const url = new URL(window.location.href);
    const scan = url.searchParams.get('scan');
    if (scan) {
      url.searchParams.delete('scan');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
    return scan;
  } catch {
    return null;
  }
}

export default function Home({ onOpenMenu }) {
  const { creatures, entry, status, error, reload, remove } = useCreatures();
  const [selectedId, setSelectedId] = useState(null);
  const [scanPayload, setScanPayload] = useState(takeScanParam);
  const [adding, setAdding] = useState(Boolean(scanPayload));
  const [registrationNotice, setRegistrationNotice] = useState('');

  const village = useMemo(() => creatures.map((c) => toVillageCreature(c, entry(c.type))), [creatures, entry]);
  const selected = creatures.find((c) => c._id === selectedId) ?? null;

  // A creature removed elsewhere shouldn't leave a dangling selection.
  useEffect(() => {
    if (selectedId && status === 'ready' && !selected) setSelectedId(null);
  }, [selectedId, selected, status]);

  const deleteCreature = async (id) => {
    const c = village.find((v) => v.id === id);
    if (!window.confirm(`Remove ${c?.name ?? 'this creature'} from your village?`)) return;
    try {
      await remove(id);
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      window.alert(err.message || 'Could not remove it.');
    }
  };

  const closeAdd = () => {
    setAdding(false);
    setScanPayload(null);
  };

  return (
    <>
      <Dashboard onSelectCreature={setSelectedId} onOpenMenu={onOpenMenu} />

      {registrationNotice && (
        <div className="notice" role="status">
          {registrationNotice}
        </div>
      )}

      {status === 'error' && (
        <div className="notice warn creature-error" role="alert">
          {error}{' '}
          <button type="button" className="link-btn" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      <Village
        creatures={village}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onDelete={deleteCreature}
        onAdd={() => setAdding(true)}
      />

      {selected && (
        <CreatureCard
          key={selected._id}
          creature={selected}
          entry={entry(selected.type)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {adding && (
        <AddCreatureModal
          initialPayload={scanPayload}
          onClose={closeAdd}
          onOpenExisting={(id) => {
            closeAdd();
            setSelectedId(id);
          }}
          onCreated={(c) => {
            closeAdd();
            if (c.active) setSelectedId(c._id);
            else setRegistrationNotice('Creature registered. Scan its NFC tag to let it move into the village.');
          }}
        />
      )}
    </>
  );
}
