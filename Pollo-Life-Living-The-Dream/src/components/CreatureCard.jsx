import { useEffect, useState } from 'react';
import Modal from './Modal';
import { IdField, Mrz, Portrait } from './creatureFields';
import { collectData, initValues, splitGoal, useFieldValues } from '../creatures/fields';
import { addTransaction, getTransactions } from '../api/bank';
import { useBank } from '../bank/useBank';
import { useCreatures } from '../creatures/useCreatures';
import { MOOD_LABEL, MOOD_TONE, summaryFor, typeLabel } from '../creatures/viewModel';
import { fmt } from '../utils/finance';

// What "feeding" a creature means per type. Each becomes POST /api/bank/transactions
// { kind, amount, description, category, creatureId, toAccountType? }.
// ASSUMPTION: the backend picks the source account (Checking) when accountType is omitted.
const FEED = {
  income: { kind: 'deposit', label: 'Record a paycheck', description: 'Paycheck', amountKey: 'amount' },
  subscription: { kind: 'bill_payment', label: 'Pay this month', description: 'Subscription payment', amountKey: 'cost' },
  credit_card: { kind: 'bill_payment', label: 'Make a payment', description: 'Credit card payment', amountKey: 'minPayment' },
};

function FeedForm({ creature, onDone }) {
  const cfg = FEED[creature.type];
  const [amount, setAmount] = useState(cfg?.amountKey && creature.data?.[cfg.amountKey] ? String(creature.data[cfg.amountKey]) : '');
  const [description, setDescription] = useState(cfg?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const { refresh } = useBank();
  const { reload } = useCreatures();

  if (!cfg) return null;

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!(value > 0)) {
      setMsg({ ok: false, text: 'Enter an amount greater than 0.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const body = {
        kind: cfg.kind,
        amount: value,
        description: description.trim() || cfg.description,
        category: creature.type,
        creatureId: creature._id,
      };
      if (cfg.toAccountType) body.toAccountType = cfg.toAccountType;
      await addTransaction(body);
      await Promise.all([refresh(), reload()]); // new balances + any creature data the backend updated
      setMsg({ ok: true, text: `Done: ${fmt(value, 2)} recorded.` });
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not record that.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="feed" onSubmit={submit} noValidate>
      <strong className="id-label">{cfg.label}</strong>
      <div className="feed-row">
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="$ amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Amount"
        />
        <button type="submit" className="action" disabled={busy}>
          {busy ? '…' : 'Record'}
        </button>
      </div>
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label="Description"
        placeholder="Description"
      />
      {msg && <span className={msg.ok ? 'feed-ok' : 'warn-text'}>{msg.text}</span>}
    </form>
  );
}

const shortDate = (d) => {
  const t = d ? new Date(d) : null;
  return t && !Number.isNaN(t.getTime()) ? t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
};

// The creature's ID card: portrait on the left, editable details on the right, "Save changes" up top.
export default function CreatureCard({ creature, entry, onClose }) {
  const { remove, update } = useCreatures();
  const [recent, setRecent] = useState([]);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nickname, setNickname] = useState(creature.nickname ?? '');
  const [values, setValue, setValues] = useFieldValues(entry, creature.data);

  useEffect(() => {
    let cancelled = false;
    getTransactions({ creatureId: creature._id, limit: 3 })
      .then((list) => !cancelled && setRecent(Array.isArray(list) ? list : []))
      .catch(() => !cancelled && setRecent([]));
    return () => {
      cancelled = true;
    };
  }, [creature._id, tick]);

  const name = creature.nickname || entry?.name || typeLabel(creature.type);
  const idNo = String(creature._id).slice(-6).toUpperCase();
  const { main, goal } = splitGoal(entry?.fields);

  // Compare parsed values so "640" vs "640.00" doesn't count as a change.
  const dirty =
    Boolean(entry) &&
    (nickname !== (creature.nickname ?? '') ||
      JSON.stringify(collectData(entry, values)) !== JSON.stringify(collectData(entry, initValues(entry, creature.data))));

  const edit = (setter) => (v) => {
    setSaved(false);
    setter(v);
  };

  const save = async () => {
    if (!entry || busy) return;
    setBusy(true);
    setError('');
    try {
      const data = collectData(entry, values);
      // Fields that were cleared are sent as '' so the backend's merge actually clears them.
      for (const f of entry.fields) if (!(f.key in data) && creature.data?.[f.key] != null) data[f.key] = '';
      await update(creature._id, { data, nickname: nickname.trim() });
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save changes.');
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!window.confirm(`Remove ${name} from your village?`)) return;
    try {
      await remove(creature._id);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not remove it.');
    }
  };

  const reset = () => {
    setNickname(creature.nickname ?? '');
    setValues(initValues(entry, creature.data));
    setError('');
  };

  return (
    <Modal title={`${name} — creature ID`} onClose={onClose} className="id-modal" bare>
      <article className="id-card" style={{ '--accent': entry?.color ?? '#a3a380' }}>
        <header className="id-band">
          <div>
            <span className="id-kicker">Village of Pollo · Creature ID</span>
            <span className="id-no">No. {idNo}</span>
          </div>
          <div className="id-band-actions">
            <button type="button" className="id-save" onClick={save} disabled={!dirty || busy}>
              {busy ? 'Saving…' : saved && !dirty ? 'Saved ✓' : 'Save changes'}
            </button>
            <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </header>

        <div className="id-body">
          <div className="id-left">
            <Portrait entry={entry}>
              <span className={`id-stamp ${MOOD_TONE[creature.mood] ?? 'ok'}`}>{MOOD_LABEL[creature.mood] ?? 'Steady'}</span>
            </Portrait>
            <div className="id-summary">{summaryFor(creature.type, creature.data)}</div>
            <dl className="id-meta">
              <div>
                <dt>Species</dt>
                <dd>{entry?.species ?? '—'}</dd>
              </div>
              <div>
                <dt>Moved in</dt>
                <dd>{shortDate(creature.createdAt)}</dd>
              </div>
            </dl>
          </div>

          <form
            className="id-right"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            noValidate
          >
            <label className="id-field id-name" htmlFor="id-nickname">
              <span className="id-label">Name</span>
              <input
                id="id-nickname"
                type="text"
                maxLength={40}
                value={nickname}
                placeholder={entry?.name}
                onChange={(e) => edit(setNickname)(e.target.value)}
              />
            </label>

            <div className="id-field id-static">
              <span className="id-label">Type</span>
              <span>{typeLabel(creature.type)}</span>
            </div>

            {entry ? (
              <div className="id-grid">
                {main.map((f) => (
                  <IdField key={f.key} f={f} value={values[f.key]} onChange={edit(setValue(f.key))} />
                ))}
              </div>
            ) : (
              <p className="form-error">Unknown creature type.</p>
            )}

            {goal && <IdField f={goal} value={values[goal.key]} onChange={edit(setValue(goal.key))} hint="(optional)" />}

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div className="id-row-actions">
              {dirty && (
                <button type="button" className="id-link" onClick={reset}>
                  Undo changes
                </button>
              )}
              <button type="button" className="id-delete" onClick={del}>
                Delete
              </button>
            </div>
            {/* lets Enter in any field save */}
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          </form>
        </div>

        <section className="id-back">
          <p className="id-note">
            <span className="id-label">{name} says</span>
            {creature.lastAdvice || entry?.greeting}
          </p>
          <div>
            <FeedForm key={creature._id} creature={creature} onDone={() => setTick((t) => t + 1)} />
            {recent.length > 0 && (
              <ul className="cc-recent">
                {recent.map((t) => (
                  <li key={t._id}>
                    <span>{t.description || t.kind}</span>
                    <strong>{fmt(t.amount, 2)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <Mrz name={name} type={creature.type} id={idNo} />
      </article>
    </Modal>
  );
}
