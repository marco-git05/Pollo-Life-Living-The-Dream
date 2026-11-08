import { useMemo, useState } from 'react';
import Card from './Card';
import SummaryStrip from './SummaryStrip';
import DonutChart from './DonutChart';
import HealthIndicators from './HealthIndicators';
import ForecastChart from './ForecastChart';
import WhatIf from './WhatIf';
import NewsCard from './NewsCard';
import PriorityList from './PriorityList';
import TipsCard from './TipsCard';
import {
  user,
  accounts,
  spending,
  profile,
  forecastSetup,
  studentLoan,
  news,
  priorities,
  tips,
  creatures,
} from '../data/dummyData';
import { buildForecast, computeHealth } from '../utils/finance';

export default function Dashboard({ onSelectCreature }){
    const [extra, setExtra] = useState(0);

  const monthlyNet = profile.monthlyIncome - profile.monthlyExpenses - profile.monthlyDebtPayments;
  const health = useMemo(() => computeHealth(profile), []);
  const forecast = useMemo(
    () => buildForecast({ startBalance: forecastSetup.startBalance, monthlyNet, events: forecastSetup.events }),
    [monthlyNet],
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
    [extra, monthlyNet],
  );
  const loanCreature = creatures.find((c) => c.id === 'student-loan');

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <h1>Welcome, {user.name}</h1>
          <p className="sub">Your whole financial picture in one place. Demo data.</p>
        </div>
        <button type="button" className="icon-btn" aria-label="Settings">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
          </svg>
        </button>
      </header>

      <SummaryStrip accounts={accounts} monthlyNet={monthlyNet} />

      <div className="grid">
        <Card title="Spend analyzer" area="spend">
          <DonutChart data={spending} />
        </Card>

        <Card title="Health check" area="health">
          <HealthIndicators health={health} />
        </Card>

        <Card title="News recently" area="news">
          <NewsCard items={news} />
        </Card>

        <Card title="Priority list" area="priority">
          <PriorityList items={priorities} onSelectCreature={onSelectCreature} />
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
          <WhatIf
            loan={studentLoan}
            extra={extra}
            setExtra={setExtra}
            monthlyNet={monthlyNet}
            creatureName={loanCreature?.name ?? 'Your loan'}
          />
        </Card>

        <Card title="Finance tips" area="tips">
          <TipsCard tips={tips} />
        </Card>
      </div>
    </main>
  );
}