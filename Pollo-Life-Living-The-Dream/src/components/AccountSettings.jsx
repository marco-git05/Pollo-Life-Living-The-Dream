import { useMemo, useState } from 'react';
import GearButton from './GearButton';
import { decisions, creatures } from '../data/dummyData';
import { snapshotToDashboard } from '../data/bankAdapter';
import { fmt } from '../utils/finance';
import { useAuth } from '../auth/useAuth';
import { useBank } from '../bank/useBank';
import { useCreatures } from '../creatures/useCreatures';

const longDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function AccountSettings({ onBack, onOpenMenu, onSignOut }) {
  const { user } = useAuth();
  const { snapshot } = useBank();
  const { creatures: userCreatures, remove } = useCreatures();
  const accounts = useMemo(() => (snapshot ? snapshotToDashboard(snapshot).accounts : []), [snapshot]);

  const [filter, setFilter] = useState('All');
  const [prefs, setPrefs] = useState({ reminders: true, weekly: false });
  const [resetStatus, setResetStatus] = useState('');
  const [resetting, setResetting] = useState(false);

  // Still dummy: decisions on record (the backend's transactions collection can feed this next).
  const types = ['All', ...new Set(decisions.map((d) => d.type))];
  const shown = filter === 'All' ? decisions : decisions.filter((d) => d.type === filter);
  const creatureName = (id) => creatures.find((c) => c.id === id)?.name;

  const togglePref = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const resetDemoCreature = async () => {
    const resetType = user.username === 'jack' ? 'student_loan' : user.username === 'john' ? 'savings_goal' : null;
    const resetName = user.username === 'jack' ? 'Student loan' : user.username === 'john' ? 'Kids savings' : null;
    if (!resetType || !resetName) return;
    if (!window.confirm(`Reset demo data by deleting ${resetName}? This will let you register it again.`)) return;

    setResetting(true);
    setResetStatus('');
    try {
      const matches = userCreatures.filter(
        (creature) => creature.type === resetType && (user.username !== 'john' || creature.nickname === resetName),
      );
      await Promise.all(matches.map((creature) => remove(creature._id)));
      setResetStatus(matches.length ? `${resetName} was deleted. You can register it again from the village.` : `No ${resetName} registration was found.`);
    } catch (err) {
      setResetStatus(err.message || 'Could not reset the demo creature.');
    } finally {
      setResetting(false);
    }
  };

  const isDemoAccount = user.username === 'jack' || user.username === 'john';
  const resetName = user.username === 'jack' ? 'Student loan' : 'Kids savings';

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
              <dt>Username</dt>
              <dd>{user.username ?? '—'}</dd>
              <dt>Member since</dt>
              <dd>{user.memberSince ? longDate(user.memberSince) : '—'}</dd>
            </dl>
          </section>

          <section className="settings-section">
            <h2>Linked accounts</h2>
            {accounts.length ? (
              <ul className="acct-list">
                {accounts.map((a) => (
                  <li key={a.id}>
                    <div>
                      <strong>{a.name}</strong>
                      <span className="meta">
                        {a.institution} · {a.type}
                      </span>
                    </div>
                    <span className={`acct-balance ${a.kind === 'debt' ? 'neg' : 'pos'}`}>
                      {fmt(a.kind === 'debt' ? -a.balance : a.balance, 2)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="meta">No bank connected yet. Connect one from the dashboard.</p>
            )}
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

          {isDemoAccount && (
            <section className="settings-section">
              <h2>Demo reset</h2>
              <p className="meta">
                Delete the demo {resetName} registration so you can demonstrate adding and activating it again.
                Other creatures and account data are unchanged.
              </p>
              <button type="button" className="action" onClick={resetDemoCreature} disabled={resetting}>
                {resetting ? 'Resetting…' : 'Reset data'}
              </button>
              {resetStatus && <p className="meta" role="status">{resetStatus}</p>}
            </section>
          )}

          <section className="settings-section">
            <button type="button" className="action" onClick={onSignOut}>
              Sign out
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
