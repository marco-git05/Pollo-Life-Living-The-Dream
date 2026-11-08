// Turns the backend's bank snapshot (GET /api/bank) into the shapes the dashboard components expect.
// This is the one place that knows how Nessie data maps to the UI. Tweak the assumptions here.
//
// Snapshot: { syncedAt, totalCash, creditCardBalance, last30Days: { moneyIn, moneyOut },
//             upcomingBills: [{ payee, amount, nextDate, status }],
//             accounts: [{ id, type, nickname, balance, recent, bills }], stale? }

// ASSUMPTION: the snapshot has no credit limit. Replace with the real limit (e.g. from the
// credit card creature's data) when it is available.
export const DEFAULT_CREDIT_LIMIT = 3000;

// Cushion the forecast chart warns about.
const SAFETY_BUFFER = 500;

const sumBy = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);

function daysUntil(iso) {
  if (!iso) return null;
  const due = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}

function urgencyFor(days) {
  if (days == null) return 'low';
  if (days <= 3) return 'high';
  if (days <= 10) return 'med';
  return 'low';
}

// Best-effort match of a Nessie bill payee ("Student Loan", "Netflix") to one of the user's creatures.
function creatureForBill(payee = '', creatures) {
  const p = String(payee).toLowerCase();
  if (!p) return null;
  return (
    creatures.find((c) => c.nickname && p.includes(c.nickname.toLowerCase())) ??
    creatures.find((c) => p.includes(c.type.replace(/_/g, ' '))) ??
    creatures.find((c) => c.type === 'credit_card' && (p.includes('credit') || p.includes('card'))) ??
    creatures.find((c) => c.type === 'subscription' && String(c.data?.name ?? '').toLowerCase() === p) ??
    null
  );
}

// creatures (optional): the user's creatures, used to link bills to creatures and to read the credit limit.
export function snapshotToDashboard(snap, creatures = []) {
  const card = creatures.find((c) => c.type === 'credit_card');
  const creditLimit = Number(card?.data?.limit ?? card?.data?.creditLimit) || DEFAULT_CREDIT_LIMIT;
  const accounts = (snap.accounts ?? []).map((a) => {
    const isCard = a.type === 'Credit Card';
    return {
      id: a.id,
      name: a.nickname || a.type,
      type: a.type,
      kind: isCard ? 'debt' : 'asset',
      // Nessie reports a credit card balance as the amount owed.
      balance: isCard ? Math.abs(a.balance ?? 0) : (a.balance ?? 0),
      institution: 'Capital One',
    };
  });

  const checking = sumBy(accounts.filter((a) => a.type === 'Checking'), (a) => a.balance);
  const savings = sumBy(accounts.filter((a) => a.type === 'Savings'), (a) => a.balance);
  const creditBalance = snap.creditCardBalance ?? sumBy(accounts.filter((a) => a.kind === 'debt'), (a) => a.balance);

  const moneyIn = snap.last30Days?.moneyIn ?? 0;
  const moneyOut = snap.last30Days?.moneyOut ?? 0;
  const bills = snap.upcomingBills ?? [];

  // APPROXIMATIONS: income = money in over 30 days; debt payments = the recurring bills listed;
  // living expenses = money out minus those bills (never below zero).
  const monthlyDebtPayments = sumBy(bills, (b) => b.amount ?? 0);
  const monthlyExpenses = Math.max(moneyOut - monthlyDebtPayments, 0);

  const profile = {
    monthlyIncome: moneyIn,
    monthlyExpenses,
    monthlyDebtPayments,
    savingsBalance: savings,
    creditBalance,
    creditLimit,
  };

  const priorities = bills
    .map((b, i) => {
      const days = daysUntil(b.nextDate);
      return {
        id: `bill-${i}`,
        title: `${b.payee} payment`,
        amount: b.amount ?? 0,
        dueInDays: days,
        urgency: urgencyFor(days),
        creatureId: creatureForBill(b.payee, creatures)?._id ?? null,
      };
    })
    .sort((a, b) => (a.dueInDays ?? 999) - (b.dueInDays ?? 999));

  return {
    accounts,
    profile,
    priorities,
    monthlyNet: moneyIn - moneyOut,
    forecastSetup: { startBalance: checking, safetyBuffer: SAFETY_BUFFER, events: [] },
  };
}
