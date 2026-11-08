import { useEffect, useState } from 'react';
import { addTransaction, getTransactions } from '../api/bank';
import { useBank } from '../bank/useBank';
import { useCreatures } from '../creatures/useCreatures';
import { MOOD_LABEL, MOOD_TONE, formatField, summaryFor, typeLabel } from '../creatures/viewModel';
import { fmt } from '../utils/finance';

// What "feeding" a creature means per type. Each becomes POST /api/bank/transactions
// { kind, amount, description, category, creatureId, toAccountType? }.
// ASSUMPTION: the backend picks the source account (Checking) when accountType is omitted.
const FEED = {
  income: { kind: 'deposit', label: 'Record a paycheck', description: 'Paycheck', amountKey: 'amount' },
  groceries: { kind: 'purchase', label: 'Log a grocery run', description: 'Grocery run' },
  subscription: { kind: 'bill_payment', label: 'Pay this month', description: 'Subscription payment', amountKey: 'cost' },
  student_loan: { kind: 'bill_payment', label: 'Make a payment', description: 'Student loan payment', amountKey: 'minPayment' },
  credit_card: { kind: 'bill_payment', label: 'Make a payment', description: 'Credit card payment', amountKey: 'minPayment' },
  savings_goal: { kind: 'transfer', label: 'Add to savings', description: 'Savings deposit', toAccountType: 'Savings' },
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
      <strong>{cfg.label}</strong>
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

export default function CreatureCard({ creature, entry, onClose, onEdit }) {
  const { remove } = useCreatures();
  const [recent, setRecent] = useState([]);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState('');

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

  const del = async () => {
    if (!window.confirm(`Remove ${name} from your village?`)) return;
    try {
      await remove(creature._id);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not remove it.');
    }
  };

  return (
    <aside className="creature-card">
      <button type="button" className="close" onClick={onClose} aria-label="Close">
        ×
      </button>

      <div className="cc-head">
        <span className="swatch big" style={{ background: entry?.color ?? '#a3a380' }} />
        <div>
          <strong>{name}</strong>
          <span className="cc-kind">
            {typeLabel(creature.type)}
            {entry?.species ? ` · ${entry.species}` : ''}
          </span>
        </div>
      </div>

      <div className="cc-amount">{summaryFor(creature.type, creature.data)}</div>
      <div className={`badge ${MOOD_TONE[creature.mood] ?? 'ok'}`}>{MOOD_LABEL[creature.mood] ?? 'Steady'}</div>

      <p className="cc-note">{creature.lastAdvice || entry?.greeting}</p>

      {entry && (
        <dl className="cc-fields">
          {entry.fields.map((f) => (
            <div key={f.key}>
              <dt>{f.label}</dt>
              <dd>{formatField(f, creature.data?.[f.key])}</dd>
            </div>
          ))}
        </dl>
      )}

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

      {error && <p className="form-error">{error}</p>}

      <div className="cc-actions">
        <button type="button" className="action" onClick={() => onEdit(creature._id)}>
          Edit
        </button>
        <button type="button" className="action danger" onClick={del}>
          Remove
        </button>
      </div>
    </aside>
  );
}
