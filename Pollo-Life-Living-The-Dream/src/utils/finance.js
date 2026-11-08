// Pure finance math. Keep all numbers computed here (not by the LLM),
// then hand the results to Nemotron to explain.

export const fmt = (n, digits = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);

export const STATUS_LABEL = { good: 'On track', ok: 'Keep an eye', warn: 'Needs work' };

const clamp = (v, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

function rate(value, good, ok, lowerIsBetter) {
  if (lowerIsBetter) return value <= good ? 'good' : value <= ok ? 'ok' : 'warn';
  return value >= good ? 'good' : value >= ok ? 'ok' : 'warn';
}

export function computeHealth(p) {
  const dti = (p.monthlyDebtPayments / p.monthlyIncome) * 100;
  const runway = p.savingsBalance / p.monthlyExpenses;
  const utilization = (p.creditBalance / p.creditLimit) * 100;
  const savingsRate =
    ((p.monthlyIncome - p.monthlyExpenses - p.monthlyDebtPayments) / p.monthlyIncome) * 100;

  const indicators = [
    {
      id: 'dti',
      label: 'Debt-to-income',
      display: `${dti.toFixed(0)}%`,
      status: rate(dti, 20, 36, true),
      score: clamp(100 - (dti / 50) * 100),
      hint: 'Monthly debt payments divided by income. Under 20% is healthy.',
    },
    {
      id: 'runway',
      label: 'Savings runway',
      display: `${runway.toFixed(1)} mo`,
      status: rate(runway, 6, 3, false),
      score: clamp((runway / 6) * 100),
      hint: 'How many months of expenses your savings cover. Aim for 3 to 6.',
    },
    {
      id: 'utilization',
      label: 'Credit utilization',
      display: `${utilization.toFixed(0)}%`,
      status: rate(utilization, 30, 50, true),
      score: clamp(100 - utilization),
      hint: 'Card balance divided by credit limit. Under 30% helps your credit score.',
    },
    {
      id: 'savingsRate',
      label: 'Savings rate',
      display: `${savingsRate.toFixed(0)}%`,
      status: rate(savingsRate, 20, 10, false),
      score: clamp((savingsRate / 20) * 100),
      hint: 'Share of income left after expenses and debt payments. Aim for 20%.',
    },
  ];

  const overall = Math.round(indicators.reduce((s, i) => s + i.score, 0) / indicators.length);
  const overallStatus = overall >= 75 ? 'good' : overall >= 50 ? 'ok' : 'warn';
  return { indicators, overall, overallStatus };
}

export function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

export function monthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Months until a loan is paid off and total interest paid at a fixed payment
export function simulatePayoff({ balance, apr, payment }) {
  const r = apr / 100 / 12;
  if (payment <= balance * r) return { months: Infinity, interest: Infinity };
  let bal = balance;
  let months = 0;
  let interest = 0;
  while (bal > 0.005 && months < 1200) {
    const i = bal * r;
    interest += i;
    bal = bal + i - payment;
    months += 1;
  }
  return { months, interest };
}

// Projected checking balance. `extra` is an additional monthly payment (what-if).
export function buildForecast({
  startBalance,
  monthlyNet,
  events = [],
  extra = 0,
  months = 6,
  from = new Date(),
}) {
  const out = [];
  for (let i = 0; i <= months; i += 1) {
    const eventSum = events
      .filter((e) => e.monthOffset <= i)
      .reduce((s, e) => s + e.amount, 0);
    out.push({
      label: i === 0 ? 'Now' : addMonths(from, i).toLocaleDateString('en-US', { month: 'short' }),
      balance: Math.round(startBalance + (monthlyNet - extra) * i + eventSum),
    });
  }
  return out;
}