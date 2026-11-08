import { useState } from 'react';
import { fmt } from '../utils/finance';

const ORDER = { high: 0, med: 1, low: 2 };

function dueLabel(days) {
  if (days == null) return 'Anytime';
  if (days === 0) return 'Due today';
  return `Due in ${days} day${days === 1 ? '' : 's'}`;
}

export default function PriorityList({ items, onSelectCreature }) {
  const [done, setDone] = useState({});
  const sorted = [...items].sort(
    (a, b) => ORDER[a.urgency] - ORDER[b.urgency] || (a.dueInDays ?? 999) - (b.dueInDays ?? 999),
  );

  return (
    <ul className="priority">
      {sorted.map((p) => (
        <li key={p.id} className={done[p.id] ? 'done' : ''}>
          <input
            type="checkbox"
            checked={!!done[p.id]}
            onChange={() => setDone((d) => ({ ...d, [p.id]: !d[p.id] }))}
            aria-label={`Mark ${p.title} done`}
          />
          <button type="button" className="priority-main" onClick={() => onSelectCreature?.(p.creatureId)}>
            <span className="priority-title">{p.title}</span>
            <span className="priority-meta">
              <span className={`dot ${p.urgency}`} />
              {dueLabel(p.dueInDays)} · {fmt(p.amount)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
