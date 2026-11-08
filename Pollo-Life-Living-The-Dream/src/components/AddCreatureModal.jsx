import { useCallback, useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { IdField, Mrz, Portrait } from './creatureFields';
import { collectData, initValues, splitGoal } from '../creatures/fields';
import { scanCard } from '../api/creatures';
import { useCreatures } from '../creatures/useCreatures';
import { typeLabel } from '../creatures/viewModel';

// "New character detected": an empty ID card. The portrait is a silhouette until a type is chosen.
// `initialPayload` is a card payload from an NFC tag URL (?scan=creature:credit_card). It is checked with
// POST /api/creatures/scan first: if that creature already lives in the village we offer to open it instead.
export default function AddCreatureModal({ initialPayload, onClose, onOpenExisting, onCreated }) {
  const { catalog, add, update, status, error: loadError } = useCreatures();
  const [type, setType] = useState('');
  const [nickname, setNickname] = useState('');
  const [nfcTagId, setNfcTagId] = useState('');
  const [values, setValues] = useState({});
  const [existing, setExisting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [readingNfc, setReadingNfc] = useState(false);
  const [error, setError] = useState('');
  const started = useRef(false);

  const entry = catalog.find((c) => c.type === type) ?? null;
  const { main, goal } = splitGoal(entry?.fields);

  const chooseType = useCallback(
    (t, initialData = {}) => {
      setType(t);
      setValues(initValues(catalog.find((c) => c.type === t), initialData));
      setError('');
    },
    [catalog],
  );

  useEffect(() => {
    if (!initialPayload || !catalog.length || started.current) return;
    started.current = true;
    setBusy(true);
    scanCard(initialPayload)
      .then((res) => {
        chooseType(res.type, res.creature?.data);
        setExisting(res.creature ?? null);
        setNickname(res.creature?.nickname ?? '');
        setNfcTagId(res.creature?.nfcTagId ?? '');
      })
      .catch((err) => setError(err.message || 'Could not read that card.'))
      .finally(() => setBusy(false));
  }, [initialPayload, catalog, chooseType]);

  const setValue = (key) => (v) => setValues((vals) => ({ ...vals, [key]: v }));

  const readNfcSerial = async () => {
    if (!('NDEFReader' in window)) {
      setError('Web NFC is not available in this browser. Use Android Chrome or enter the serial manually.');
      return;
    }
    try {
      setError('');
      setReadingNfc(true);
      const reader = new window.NDEFReader();
      reader.onreading = ({ serialNumber }) => {
        if (!serialNumber) {
          setError('The tag was detected, but this browser did not provide its serial number.');
        } else {
          setNfcTagId(serialNumber);
          setError('');
        }
        setReadingNfc(false);
      };
      reader.onreadingerror = () => {
        setError('The tag was detected, but its serial number could not be read. Try holding it against the phone again.');
        setReadingNfc(false);
      };
      await reader.scan();
    } catch (err) {
      setError(err.message || 'Could not start NFC scanning.');
      setReadingNfc(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!entry) {
      setError('Pick what kind of financial decision this creature is.');
      return;
    }
    const missing = entry.fields.filter((f) => f.required && !String(values[f.key] ?? '').trim());
    if (missing.length) {
      setError(`Missing: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const body = {
        type: entry.type,
        data: collectData(entry, values),
        nickname: nickname.trim() || undefined,
        nfcTagId: nfcTagId.trim() || undefined,
      };
      const saved = existing && !existing.active
        ? await update(existing._id, body)
        : await add(body);
      onCreated(saved);
    } catch (err) {
      setError(err.message || 'Could not save this creature.');
      setBusy(false);
    }
  };

  if (existing?.active) {
    return (
      <Modal title="Creature already here" onClose={onClose}>
        <div className="exists">
          <p>
            You already have <strong>{existing.nickname || entry?.name}</strong> in your village.
          </p>
          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={() => setExisting(null)}>
              Add another
            </button>
            <button type="button" className="primary-btn" onClick={() => onOpenExisting(existing._id)}>
              Open it
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="New character detected" onClose={onClose} className="id-modal" bare>
      <form className="id-card new" style={{ '--accent': entry?.color ?? '#a3a380' }} onSubmit={save} noValidate>
        <header className="id-band">
          <div>
            <span className="id-kicker">Village of Pollo · Creature ID</span>
            <span className="id-no">New character detected</span>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="id-body">
          <div className="id-left">
            <Portrait entry={entry} hidden={!entry} />
            <p className="id-greeting">{entry ? entry.greeting : 'Who could it be? Choose a type to find out.'}</p>
          </div>

          <div className="id-right">
            <label className="id-field id-name" htmlFor="new-nickname">
              <span className="id-label">Name</span>
              <input
                id="new-nickname"
                type="text"
                maxLength={40}
                value={nickname}
                placeholder={entry?.name ?? 'Give it a name'}
                onChange={(e) => setNickname(e.target.value)}
              />
            </label>

            <label className="id-field" htmlFor="new-type">
              <span className="id-label">
                Type <i>(financial decision)</i>
              </span>
              <select id="new-type" value={type} onChange={(e) => chooseType(e.target.value)} disabled={busy && !entry}>
                <option value="">Choose…</option>
                {catalog.map((c) => (
                  <option key={c.type} value={c.type}>
                    {typeLabel(c.type)} · {c.name} the {c.species}
                  </option>
                ))}
              </select>
            </label>

            {status === 'loading' && <p className="notice">Loading creature types…</p>}
            {loadError && catalog.length === 0 && <p className="form-error">{loadError}</p>}

            {entry && main.length > 0 && (
              <div className="id-grid">
                {main.map((f) => (
                  <IdField key={f.key} f={f} prefix="new" value={values[f.key] ?? ''} onChange={setValue(f.key)} />
                ))}
              </div>
            )}

            {goal && <IdField f={goal} prefix="new" value={values[goal.key] ?? ''} onChange={setValue(goal.key)} hint="(optional)" />}

            <div className="id-field">
              <span className="id-label">NFC serial <i>(optional)</i></span>
              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={readNfcSerial} disabled={readingNfc || busy}>
                  {readingNfc ? 'Ready for a tag…' : 'Scan NFC tag'}
                </button>
              </div>
              {readingNfc && <span className="meta" role="status">Web app is listening. Hold the NFC tag to the back of the phone.</span>}
              <input
                id="new-nfc-tag-id"
                type="text"
                value={nfcTagId}
                onChange={(e) => setNfcTagId(e.target.value)}
                placeholder="04:C4:72:E2:7B:1D:90"
              />
              <span className="meta">Scan the tag to fill this automatically, or enter its serial manually.</span>
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div className="id-row-actions">
              <button type="button" className="id-link" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="id-save" disabled={busy || !entry}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        <Mrz name={nickname || entry?.name || 'UNKNOWN'} type={type || 'unregistered'} id="NEW" />
      </form>
    </Modal>
  );
}
