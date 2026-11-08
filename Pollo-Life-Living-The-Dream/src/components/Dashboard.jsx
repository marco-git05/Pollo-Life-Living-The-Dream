import { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import SummaryStrip from './SummaryStrip';
import DonutChart from './DonutChart';
import HealthIndicators from './HealthIndicators';
import ForecastChart from './ForecastChart';
import WhatIf from './WhatIf';
import NewsCard from './NewsCard';
import PriorityList from './PriorityList';
import TipsCard from './TipsCard';
import ChatbotCard from './ChatbotCard';
import GearButton from './GearButton';
import ConnectBank from './ConnectBank';
// Still sample data: tips (Nemotron). News falls back to samples if SerpApi is unavailable.
import { news as sampleNews } from '../data/dummyData';
import { getTransactions } from '../api/bank';
import { getNews } from '../api/news';
import { useCreatures } from '../creatures/useCreatures';
import { typeLabel } from '../creatures/viewModel';
import { snapshotToDashboard } from '../data/bankAdapter';
import { buildForecast, computeHealth } from '../utils/finance';
import { useAuth } from '../auth/useAuth';
import { useBank } from '../bank/useBank';

const Sample = () => <span className="badge ok">Sample</span>;

// Live headlines from /api/news (SerpApi). Falls back to the sample list on any error.
function useNews() {
  const [news, setNews] = useState({ items: sampleNews, live: false });
  useEffect(() => {
    let cancelled = false;
    getNews({ limit: 5 })
      .then((d) => !cancelled && d?.items?.length && setNews({ items: d.items, live: true }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return news;
}

// Spending this month by category, from the user's recorded transactions (purchases and bill payments).
function useSpending(syncedAt) {
  const [spending, setSpending] = useState([]);
  useEffect(() => {
    let cancelled = false;
    getTransactions({ limit: 200 })
      .then((list) => {
        if (cancelled) return;
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const totals = {};
        for (const t of Array.isArray(list) ? list : []) {
          if (!['purchase', 'bill_payment'].includes(t.kind)) continue;
          if (new Date(t.date) < start) continue;
          const name = typeLabel(t.category || 'other');
          totals[name] = (totals[name] ?? 0) + (Number(t.amount) || 0);
        }
        setSpending(
          Object.entries(totals)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount),
        );
      })
      .catch(() => !cancelled && setSpending([]));
    return () => {
      cancelled = true;
    };
  }, [syncedAt]);
  return spending;
}

// Loan terms for the what-if simulator come from the student loan creature.
function loanFrom(creature) {
  const d = creature?.data;
  if (!d) return null;
  const balance = Number(d.balance);
  const apr = Number(d.apr ?? d.interestRate ?? d.rate);
  const payment = Number(d.minPayment ?? d.payment);
  if (!(balance > 0) || !(payment > 0) || !Number.isFinite(apr)) return null;
  return { balance, apr, payment };
}

function DashboardBody({ data, spending, loanCreature, onSelectCreature }) {
  const [extra, setExtra] = useState(0);
  const { accounts, profile, priorities, forecastSetup, monthlyNet } = data;

  const health = useMemo(() => computeHealth(profile), [profile]);
  const forecast = useMemo(
    () => buildForecast({ startBalance: forecastSetup.startBalance, monthlyNet, events: forecastSetup.events }),
    [forecastSetup, monthlyNet],
  );
  const scenario = useMemo(
    () =>
      extra > 0
        ? buildForecast({
            startBalance: forecastSetup.startBalance,
            monthlyNet,
            events: forecastSetup.events,
            extra,
          })
        : null,
    [extra, forecastSetup, monthlyNet],
  );
  const loan = loanFrom(loanCreature);
  const news = useNews();

  return (
    <>
      <SummaryStrip accounts={accounts} monthlyNet={monthlyNet} />

      <div className="grid">
        <Card title="Spend analyzer" area="spend">
          {spending.length ? (
            <DonutChart data={spending} />
          ) : (
            <p className="meta">No spending recorded this month yet. Feed a creature to log some.</p>
          )}
        </Card>

        <Card title="Health check" area="health">
          <HealthIndicators health={health} />
        </Card>

        <Card title="News recently" area="news" right={news.live ? null : <Sample />}>
          <NewsCard items={news.items} />
        </Card>

        <Card title="Priority list" area="priority">
          {priorities.length ? (
            <PriorityList items={priorities} onSelectCreature={onSelectCreature} />
          ) : (
            <p className="meta">No upcoming bills. Nice.</p>
          )}
        </Card>

        <Card title="Balance forecast (6 months)" area="forecast">
          <ForecastChart
            data={forecast}
            scenario={scenario}
            buffer={forecastSetup.safetyBuffer}
            events={forecastSetup.events}
          />
        </Card>

        <Card title="What-if simulator" area="whatif">
          {loan ? (
            <WhatIf
              loan={loan}
              extra={extra}
              setExtra={setExtra}
              monthlyNet={monthlyNet}
              creatureName={loanCreature.nickname || 'Your card'}
            />
          ) : (
            <p className="meta">
              Add a credit card or student loan creature (with balance, interest rate and minimum payment) to try extra payments.
            </p>
          )}
        </Card>

        <Card title="Finance tips" area="tips">
          <TipsCard data={data} spending={spending} priorities={priorities} />
        </Card>

        <ChatbotCard data={data} />
      </div>
    </>
  );
}

export default function Dashboard({ onSelectCreature, onOpenMenu }) {
  const { user } = useAuth();
  const { snapshot, status, error, stale, syncing, refresh, connect } = useBank();
  const { creatures } = useCreatures();
  const data = useMemo(() => (snapshot ? snapshotToDashboard(snapshot, creatures) : null), [snapshot, creatures]);
  const spending = useSpending(snapshot?.syncedAt);
  const loanCreature = creatures.find((c) => c.type === 'student_loan') ?? creatures.find((c) => c.type === 'credit_card');

  let body;
  if (status === 'loading') {
    body = <p className="notice">Loading your bank data…</p>;
  } else if (status === 'error') {
    body = (
      <div className="notice warn" role="alert">
        {error}{' '}
        <button type="button" className="link-btn" onClick={refresh}>
          Try again
        </button>
      </div>
    );
  } else if (!snapshot) {
    body = <ConnectBank onConnect={connect} />;
  } else {
    body = <DashboardBody data={data} spending={spending} loanCreature={loanCreature} onSelectCreature={onSelectCreature} />;
  }

  const syncedAt = snapshot?.syncedAt
    ? new Date(snapshot.syncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Welcome, {user.name}</h1>
          <p className="sub sync-row">
            {syncedAt ? (
              <>
                Bank synced at {syncedAt}
                {stale && ' (offline copy, Nessie unreachable)'}
                <button type="button" className="link-btn" onClick={refresh} disabled={syncing}>
                  {syncing ? 'Refreshing…' : 'Refresh'}
                </button>
              </>
            ) : (
              'Your whole financial picture in one place.'
            )}
          </p>
          {snapshot && error && <p className="sub warn-text">Could not refresh: {error}</p>}
        </div>
        <GearButton onClick={onOpenMenu} />
      </header>

      {body}
    </main>
  );
}
