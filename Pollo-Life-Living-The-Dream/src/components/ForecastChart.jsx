import { fmt } from '../utils/finance';

const W = 420;
const H = 190;
const PAD = { l: 50, r: 14, t: 14, b: 26 };

function pickStep(span) {
  return [100, 250, 500, 1000, 2000, 5000].find((s) => span / s <= 4) || 5000;
}

export default function ForecastChart({ data, scenario, buffer, events }) {
  const series = scenario || data;
  const values = [...data, ...(scenario || [])].map((d) => d.balance).concat(buffer);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const step = pickStep(rawMax - rawMin || 1000);
  const yMin = Math.floor(rawMin / step) * step;
  const yMax = Math.ceil(rawMax / step) * step;
  const ticks = [];
  for (let t = yMin; t <= yMax; t += step) ticks.push(t);

  const n = data.length;
  const x = (i) => PAD.l + (i * (W - PAD.l - PAD.r)) / (n - 1);
  const y = (v) => PAD.t + ((yMax - v) / (yMax - yMin)) * (H - PAD.t - PAD.b);
  const path = (arr) => arr.map((d, i) => `${i ? 'L' : 'M'}${x(i)} ${y(d.balance)}`).join(' ');
  const area = `${path(data)} L${x(n - 1)} ${y(yMin)} L${x(0)} ${y(yMin)} Z`;

  const lowIdx = series.reduce((m, d, i, a) => (d.balance < a[m].balance ? i : m), 0);
  const low = series[lowIdx];
  const dips = low.balance < buffer;

  return (
    <div className="forecast">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Projected checking balance">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={PAD.l - 6} y={y(t) + 3} textAnchor="end" className="axis">
              {fmt(t)}
            </text>
          </g>
        ))}

        <line x1={PAD.l} x2={W - PAD.r} y1={y(buffer)} y2={y(buffer)} className="buffer-line" />
        <text x={W - PAD.r} y={y(buffer) - 4} textAnchor="end" className="axis buffer-text">
          safety buffer
        </text>

        <path d={area} className="area" />
        <path d={path(data)} className="line" />
        {scenario && <path d={path(scenario)} className="line scenario" />}

        {data.map((d, i) => (
          <g key={d.label + i}>
            <circle cx={x(i)} cy={y(d.balance)} r="3.5" className="dot">
              <title>{`${d.label}: ${fmt(d.balance)}`}</title>
            </circle>
            <text x={x(i)} y={H - 8} textAnchor="middle" className="axis">
              {d.label}
            </text>
          </g>
        ))}

        {events.map((e) => (
          <circle key={e.label} cx={x(e.monthOffset)} cy={y(data[e.monthOffset].balance)} r="7" className="event-ring">
            <title>{`${e.label}: ${fmt(e.amount)}`}</title>
          </circle>
        ))}

        {scenario && (
          <circle cx={x(lowIdx)} cy={y(low.balance)} r="5" className={`low-dot ${dips ? 'warn' : ''}`} />
        )}
      </svg>

      <p className="forecast-note">
        {events.map((e) => (
          <span key={e.label} className="note-chip">
            {e.label} {fmt(e.amount)}
          </span>
        ))}
        <span className={dips ? 'warn-text' : ''}>
          {dips
            ? `Heads up: checking drops to ${fmt(low.balance)} in ${low.label}, below your buffer.`
            : `Lowest projected balance: ${fmt(low.balance)} in ${low.label}.`}
        </span>
      </p>
    </div>
  );
}
