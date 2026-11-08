import { useState } from 'react';
import GearButton from './GearButton';
import { user, accounts, decisions, creatures } from '../data/dummyData';
import { fmt } from '../utils/finance';

const longDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function AccountSettings({ onBack, onOpenMenu }) {
  const [filter, setFilter] = useState('All');
  const [prefs, setPrefs] = useState({ reminders: true, weekly: false });

  const types = ['All', ...new Set(decisions.map((d) => d.type))];
  const shown = filter === 'All' ? decisions : decisions.filter((d) => d.type === filter);
  const creatureName = (id) => creatures.find((c) => c.id === id)?.name;

  const togglePref = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <main className="account-page">
      <div className="account-inner">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="back-btn" onClick={onBack}>
              ← Back
            </button>
            <h1>Account settings</h1>
          </div>
          <GearButton onClick={onOpenMenu} />
        </header>

        <div className="settings-panel">
          <section className="settings-section">
            <h2>Profile</h2>
            <dl className="kv">
              <dt>Name</dt>
              <dd>{user.fullName}</dd>
              <dt>Email</dt>
              <dd>{user.email}</dd>
              <dt>Member since</dt>
              <dd>{longDate(user.memberSince)}</dd>
            </dl>
          </section>

          <section className="settings-section">
            <h2>Linked accounts</h2>
            <ul className="acct-list">
              {accounts.map((a) => (
                <li key={a.id}>
                  <div>
                    <strong>{a.name}</strong>
                    <span className="meta">
                      {a.institution} · •••• {a.mask}
                    </span>
                  </div>
                  <span className={`acct-balance ${a.kind === 'debt' ? 'neg' : 'pos'}`}>
                    {fmt(a.kind === 'debt' ? -a.balance : a.balance)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="settings-section">
            <h2>Financial decisions on record</h2>
            <div className="filters" role="group" aria-label="Filter by type">
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip ${filter === t ? 'on' : ''}`}
                  onClick={() => setFilter(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <ul className="decision-list">
              {shown.map((d) => (
                <li key={d.id}>
                  <span className="decision-date">{longDate(d.date)}</span>
                  <div>
                    <span className="decision-title">{d.title}</span>
                    <span className="meta">
                      <span className="tag">{d.type}</span> {creatureName(d.creatureId)}
                    </span>
                  </div>
                  <strong>{fmt(d.amount)}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="settings-section">
            <h2>Preferences</h2>
            <label className="pref">
              <span>
                <strong>Payment reminders</strong>
                <span className="meta">Get nudged before loan and card bills are due.</span>
              </span>
              <input type="checkbox" checked={prefs.reminders} onChange={() => togglePref('reminders')} />
            </label>
            <label className="pref">
              <span>
                <strong>Weekly summary</strong>
                <span className="meta">A short recap of your financial health every Monday.</span>
              </span>
              <input type="checkbox" checked={prefs.weekly} onChange={() => togglePref('weekly')} />
            </label>
          </section>

          <section className="settings-section">
            <button type="button" className="action">
              Sign out
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}