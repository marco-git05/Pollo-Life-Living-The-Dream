import { useCallback, useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import CreatureForm from './CreatureForm';
import { scanCard } from '../api/creatures';
import { useCreatures } from '../creatures/useCreatures';

// Flow: pick a card ("scan") -> POST /api/creatures/scan -> existing creature? offer to open it : show the form.
// `initialPayload` is a card payload from an NFC tag URL (?scan=creature:student_loan); it skips the pick step.
export default function AddCreatureModal({ initialPayload, onClose, onOpenExisting, onCreated }) {
  const { catalog, add, status, error: loadError } = useCreatures();
  const [step, setStep] = useState('pick'); // 'pick' | 'exists' | 'form'
  const [entry, setEntry] = useState(null);
  const [existing, setExisting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const started = useRef(false);

  const scan = useCallback(
    async (payload) => {
      setBusy(true);
      setError('');
      try {
        const res = await scanCard(payload);
        setEntry(catalog.find((c) => c.type === res.type) ?? null);
        setExisting(res.creature ?? null);
        setStep(res.creature ? 'exists' : 'form');
      } catch (err) {
        setError(err.message || 'Could not read that card.');
        setStep('pick');
      } finally {
        setBusy(false);
      }
    },
    [catalog],
  );

  useEffect(() => {
    if (initialPayload && catalog.length && !started.current) {
      started.current = true;
      scan(initialPayload);
    }
  }, [initialPayload, catalog, scan]);

  const title = step === 'form' && entry ? `New ${entry.name}` : 'Add a creature';

  return (
    <Modal title={title} onClose={onClose}>
      {step === 'pick' && (
        <>
          <p className="meta modal-intro">
            Tap a card to scan it. (Real NFC cards open the app with the same card code, so this is what a scan does.)
          </p>
          {status === 'loading' && <p className="notice">Loading creature types…</p>}
          {loadError && catalog.length === 0 && <p className="form-error">{loadError}</p>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="card-grid">
            {catalog.map((c) => (
              <button
                key={c.type}
                type="button"
                className="card-option"
                disabled={busy}
                onClick={() => scan(c.nfcTags?.[0] ?? c.type)}
              >
                <span className="swatch big" style={{ background: c.color }} />
                <strong>{c.name}</strong>
                <span className="meta">
                  {c.species} · {c.type.replace(/_/g, ' ')}
                </span>
              </button>
            ))}
          </div>
          {busy && <p className="notice">Reading card…</p>}
        </>
      )}

      {step === 'exists' && existing && (
        <div className="exists">
          <p>
            You already have <strong>{existing.nickname || entry?.name}</strong> in your village.
          </p>
          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={() => setStep('form')}>
              Add another
            </button>
            <button type="button" className="primary-btn" onClick={() => onOpenExisting(existing._id)}>
              Open it
            </button>
          </div>
        </div>
      )}

      {step === 'form' && entry && (
        <>
          <p className="meta modal-intro">{entry.greeting}</p>
          <CreatureForm
            entry={entry}
            submitLabel="Move in"
            onCancel={() => setStep('pick')}
            onSubmit={async ({ data, nickname }) => {
              const created = await add({ type: entry.type, data, nickname });
              onCreated(created);
            }}
          />
        </>
      )}
    </Modal>
  );
}
