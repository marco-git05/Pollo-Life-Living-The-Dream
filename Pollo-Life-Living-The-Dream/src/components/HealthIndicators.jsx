import { STATUS_LABEL } from '../utils/finance';

function ScoreRing({ score, status }) {
  const R = 26;
  const C = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 64 64" className="ring" role="img" aria-label={`Overall score ${score} out of 100`}>
      <circle cx="32" cy="32" r={R} fill="none" stroke="#e4dfbd" strokeWidth="8" />
      <circle
        cx="32"
        cy="32"
        r={R}
        fill="none"
        className={`ring-fill ${status}`}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * C} ${C}`}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="37" textAnchor="middle" className="ring-text">
        {score}
      </text>
    </svg>
  );
}

export default function HealthIndicators({ health }) {
  return (
    <div className="health">
      <div className="health-top">
        <ScoreRing score={health.overall} status={health.overallStatus} />
        <div>
          <div className="health-title">Financial health</div>
          <div className={`badge ${health.overallStatus}`}>{STATUS_LABEL[health.overallStatus]}</div>
        </div>
      </div>
      <ul className="indicators">
        {health.indicators.map((i) => (
          <li key={i.id} title={i.hint}>
            <div className="ind-row">
              <span>{i.label}</span>
              <strong>{i.display}</strong>
            </div>
            <div className="bar">
              <div className={`bar-fill ${i.status}`} style={{ width: `${Math.max(i.score, 4)}%` }} />
            </div>
            <span className={`ind-status ${i.status}`}>{STATUS_LABEL[i.status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
