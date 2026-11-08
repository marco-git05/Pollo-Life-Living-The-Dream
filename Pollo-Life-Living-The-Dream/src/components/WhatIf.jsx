import { useEffect, useState } from 'react';
import { addMonths, fmt, monthYear, simulatePayoff } from '../utils/finance';
import { api } from '../api/client';

function Face({ mood }) {
  const mouth =
    mood === 'happy' ? 'M20 40 Q32 52 44 40' : mood === 'worried' ? 'M21 46 Q32 36 43 46' : 'M22 43 L42 43';
  return (
    <svg viewBox="0 0 64 64" className={`face ${mood}`} aria-hidden="true">
      <rect x="8" y="8" width="48" height="48" rx="8" className="face-body" />
      <circle cx="24" cy="28" r="3.5" fill="#4b3a2c" />
      <circle cx="40" cy="28" r="3.5" fill="#4b3a2c" />
      <path d={mouth} fill="none" stroke="#4b3a2c" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function WhatIf({ loan, extra, setExtra, monthlyNet, creatureName }) {
  const base = simulatePayoff({ ...loan });
  const next = simulatePayoff({ ...loan, payment: loan.payment + extra });
  const monthsSooner = base.months - next.months;
  const interestSaved = base.interest - next.interest;
  const cashLeft = monthlyNet - extra;
  const payoffDate = monthYear(addMonths(new Date(), next.months));
  const [message, setMessage] = useState('Your finance companion is calculating a personalized explanation…');

  const mood = cashLeft < 0 ? 'worried' : monthsSooner >= 12 ? 'happy' : 'neutral';

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      api('/chat', {
        method: 'POST',
        body: {
          messages: [
            {
              role: 'system',
              content: 'You explain debt payoff scenarios in one warm, concise sentence. Use only the supplied numbers. Do not give legal, tax, or investment advice.',
            },
            {
              role: 'user',
              content: JSON.stringify({ creatureName, extra, monthlyNet, monthsSooner, interestSaved, cashLeft, payoffDate }),
            },
          ],
        },
      })
        .then((result) => {
          if (!cancelled) setMessage(result.reply);
        })
        .catch(() => {
          if (!cancelled) setMessage('The finance companion could not explain this scenario right now.');
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cashLeft, creatureName, extra, interestSaved, monthlyNet, monthsSooner, payoffDate]);

  return (
    <div className="whatif">
      <div className="whatif-top">
        <Face mood={mood} />
        <p className="whatif-msg">{message}</p>
      </div>

      <label className="slider">
        <span>
          Extra card payment: <strong>{fmt(extra)}/mo</strong>
        </span>
        <input
          type="range"
          min="0"
          max="500"
          step="25"
          value={extra}
          onChange={(e) => setExtra(Number(e.target.value))}
        />
      </label>

      <dl className="stats">
        <div>
          <dt>Payoff date</dt>
          <dd>{payoffDate}</dd>
        </div>
        <div>
          <dt>Time saved</dt>
          <dd>{monthsSooner} mo</dd>
        </div>
        <div>
          <dt>Interest saved</dt>
          <dd>{fmt(interestSaved)}</dd>
        </div>
        <div>
          <dt>Cash left / mo</dt>
          <dd className={cashLeft < 0 ? 'warn-text' : ''}>{fmt(cashLeft)}</dd>
        </div>
      </dl>
    </div>
  );
}
