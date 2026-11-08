import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function TipsCard({ data, spending, priorities }) {
  const [tip, setTip] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    api('/chat', {
      method: 'POST',
      body: {
        messages: [
          {
            role: 'system',
            content: 'You are a supportive personal-finance coach. Give one practical, specific tip based only on the supplied dashboard data. Return exactly three lines: a short title, a one-sentence explanation, and a semicolon-separated action list. Do not use markdown or make up facts.',
          },
          {
            role: 'user',
            content: JSON.stringify({ profile: data?.profile, spending, priorities }),
          },
        ],
      },
    })
      .then((result) => {
        if (cancelled) return;
        const [title, body, actions] = String(result.reply || '').split('\n').map((line) => line.trim()).filter(Boolean);
        if (!title || !body) throw new Error('The finance companion returned an incomplete tip.');
        setTip({ title, body, actions: (actions || 'Review your dashboard').split(';').map((action) => action.trim()).filter(Boolean) });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [data, priorities, spending]);

  if (status === 'loading') return <p className="meta">Your finance companion is preparing a tip…</p>;
  if (status === 'error') return <p className="meta">Finance tips are unavailable right now. Try refreshing the dashboard.</p>;

  return (
    <ul className="tips">
      <li>
          <strong>{tip.title}</strong>
          <p>{tip.body}</p>
          <div className="actions">
            {tip.actions.map((a) => (
              <button key={a} type="button" className="action">
                {a}
              </button>
            ))}
          </div>
      </li>
    </ul>
  );
}
