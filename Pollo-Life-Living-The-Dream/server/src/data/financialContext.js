/**
 * HANDOFF FOR THE AI TEAMMATE
 *
 *   import { getFinancialContext } from '../data/financialContext.js';
 *   const ctx = await getFinancialContext(req.userId);
 *   // → pass ctx into the Nemotron prompt
 *
 * One call returns everything the AI needs about a user, already trimmed to a
 * size that fits comfortably in a prompt. Never includes password hashes or
 * full Nessie IDs beyond what's needed to reference creatures.
 */
import User from '../models/User.js';
import Creature from '../models/Creature.js';
import Transaction from '../models/Transaction.js';
import { getBankSnapshot } from '../services/bankSync.js';
import { getCatalogEntry } from '../creatures/catalog.js';

export async function getFinancialContext(userId) {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const [creatures, recentTx, bank] = await Promise.all([
    Creature.find({ owner: userId }).lean(),
    Transaction.find({ owner: userId }).sort('-date').limit(20).lean(),
    getBankSnapshot(user).catch((e) => ({ error: e.message })),
  ]);

  return {
    today: new Date().toISOString().slice(0, 10),
    user: { displayName: user.displayName, ageGroup: user.ageGroup },
    creatures: creatures.map((c) => ({
      creatureId: String(c._id),
      type: c.type,
      category: getCatalogEntry(c.type)?.category,
      nickname: c.nickname,
      ...c.data,
    })),
    bank: bank && {
      totalCash: bank.totalCash,
      creditCardBalance: bank.creditCardBalance,
      last30Days: bank.last30Days,
      upcomingBills: bank.upcomingBills?.map(({ payee, amount, nextDate, status }) => ({ payee, amount, nextDate, status })),
      accounts: bank.accounts?.map((a) => ({ type: a.type, nickname: a.nickname, balance: a.balance, recent: a.recent?.slice(0, 8) })),
      stale: bank.stale || undefined,
      error: bank.error,
    },
    appTransactions: recentTx.map((t) => ({ kind: t.kind, amount: t.amount, description: t.description, category: t.category, date: t.date })),
  };
}

/** Lets the AI pipeline write results back to creatures (mood + speech bubble). */
export async function applyCreatureMoods(userId, moods = []) {
  await Promise.all(
    moods.map((m) =>
      Creature.updateOne({ _id: m.creatureId, owner: userId }, { mood: m.mood, lastAdvice: m.line }).catch(() => {})
    )
  );
}
