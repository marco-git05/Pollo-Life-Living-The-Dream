import { useState } from 'react';
import { fmt } from '../utils/finance';

const COLORS = ['#7f8a5a', '#d8a48f', '#bb8588', '#d6ce93', '#4b3a2c', '#a3a380', '#e3c4a0'];

export default function DonutChart({ data }) {
  const [active, setActive] = useState(null);
  const total = data.reduce((s, d) => s + d.amount, 0);
  const R = 50;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" className="donut-svg" role="img" aria-label="Spending by category">
        <g transform="rotate(-90 70 70)">
          {data.map((d, i) => {
            const len = (d.amount / total) * C;
            const el = (
              <circle
                key={d.name}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={active === i ? 26 : 22}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
                style={{ transition: 'stroke-width .15s', cursor: 'pointer' }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                <title>{`${d.name}: ${fmt(d.amount)}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        </g>
        <text x="70" y="67" textAnchor="middle" className="donut-big">
          {fmt(active != null ? data[active].amount : total)}
        </text>
        <text x="70" y="83" textAnchor="middle" className="donut-small">
          {active != null ? data[active].name : 'this month'}
        </text>
      </svg>

      <ul className="legend">
        {data.map((d, i) => (
          <li
            key={d.name}
            className={active === i ? 'on' : ''}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="swatch" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="legend-name">{d.name}</span>
            <span className="legend-amt">{fmt(d.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
