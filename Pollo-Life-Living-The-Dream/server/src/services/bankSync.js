/**
 * App-level banking logic on top of the raw Nessie client:
 *  - provisionBank: give a new user a mock customer + 3 accounts
 *  - seedDemoActivity: fill those accounts with realistic history
 *  - getBankSnapshot: compact, cached summary (stored in MongoDB)
 *  - recordTransaction: create in Nessie AND log in our Transaction collection
 *  - syncCreatureBill: keep a recurring Nessie bill in step with a creature
 */
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { Nessie, NessieError, nessieConfigured, today } from './nessie.js';

const CACHE_MS = () => (Number(process.env.NESSIE_CACHE_SECONDS) || 120) * 1000;
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Merchants: Nessie purchases require a merchant_id, so we create our own once
// ---------------------------------------------------------------------------
const MERCHANTS = {
  groceries: { name: 'Village Grocer', category: 'Groceries' },
  food: { name: 'Acorn Cafe', category: 'Food' },
  shopping: { name: 'Pixel Mart', category: 'Shopping' },
  subscription: { name: 'StreamBox', category: 'Entertainment' },
};
const merchantCache = new Map();

export async function getMerchantId(kind = 'shopping') {
  if (merchantCache.has(kind)) return merchantCache.get(kind);
  const spec = MERCHANTS[kind] || MERCHANTS.shopping;
  const all = await Nessie.getMerchants();
  let m = Array.isArray(all) ? all.find((x) => x.name === spec.name) : null;
  if (!m) {
    m = await Nessie.createMerchant({
      name: spec.name,
      category: spec.category,
      address: { street_number: '1', street_name: 'Acorn Lane', city: 'Fort Worth', state: 'TX', zip: '76102' },
      geocode: { lat: 32.7555, lng: -97.3308 },
    });
  }
  merchantCache.set(kind, m._id);
  return m._id;
}

// ---------------------------------------------------------------------------
// Provisioning
// ---------------------------------------------------------------------------
const STARTER_ACCOUNTS = [
  { type: 'Checking', nickname: 'Everyday', rewards: 0, balance: 850 },
  { type: 'Savings', nickname: 'Rainy day', rewards: 0, balance: 300 },
  { type: 'Credit Card', nickname: 'Starter card', rewards: 0, balance: 0 },
];

/** Create a Nessie customer + accounts for a user (no-op if they already have one). */
export async function provisionBank(user, { seed = true } = {}) {
  if (user.nessie?.customerId) return user;
  if (!nessieConfigured()) throw new NessieError('NESSIE_API_KEY is not set', 503);

  const [first, ...rest] = (user.displayName || user.username || 'Village Kid').split(' ');
  const customer = await Nessie.createCustomer({
    first_name: first,
    last_name: rest.join(' ') || 'Villager',
    address: { street_number: '1', street_name: 'Acorn Lane', city: 'Fort Worth', state: 'TX', zip: '76102' },
  });

  const accounts = [];
  for (const a of STARTER_ACCOUNTS) {
    const acc = await Nessie.createAccount(customer._id, a);
    accounts.push({ id: acc._id, type: a.type, nickname: a.nickname });
  }

  user.nessie = { customerId: customer._id, accounts };
  await user.save();
  if (seed) await seedDemoActivity(user).catch((e) => console.warn('[nessie] seeding skipped:', e.message));
  return user;
}

/** Give a fresh account a few weeks of believable history so the dashboard isn't empty. */
export async function seedDemoActivity(user) {
  const checking = user.accountId('Checking');
  const card = user.accountId('Credit Card');
  if (!checking) return;

  const grocer = await getMerchantId('groceries');
  const cafe = await getMerchantId('food');
  const shop = await getMerchantId('shopping');

  const deposits = [
    { medium: 'balance', transaction_date: daysAgo(14), amount: 320, description: 'Paycheck' },
    { medium: 'balance', transaction_date: daysAgo(0), amount: 320, description: 'Paycheck' },
  ];
  const purchases = [
    { acct: checking, merchant_id: grocer, amount: 46.2, days: 12, description: 'Grocery run' },
    { acct: checking, merchant_id: cafe, amount: 8.75, days: 9, description: 'Lunch' },
    { acct: card || checking, merchant_id: shop, amount: 59.99, days: 6, description: 'Sneakers' },
    { acct: checking, merchant_id: grocer, amount: 38.4, days: 3, description: 'Grocery run' },
  ];

  for (const d of deposits) await Nessie.createDeposit(checking, d);
  for (const p of purchases) {
    await Nessie.createPurchase(p.acct, {
      merchant_id: p.merchant_id,
      medium: 'balance',
      purchase_date: daysAgo(p.days),
      amount: p.amount,
      description: p.description,
    });
  }
  await invalidateSnapshot(user);
}

// ---------------------------------------------------------------------------
// Snapshot (what the dashboard + AI read)
// ---------------------------------------------------------------------------
export async function invalidateSnapshot(user) {
  await User.updateOne({ _id: user._id }, { $unset: { 'nessie.lastSnapshot': 1, 'nessie.syncedAt': 1 } });
}

/**
 * Small JSON summary of the user's bank. Cached in MongoDB for NESSIE_CACHE_SECONDS.
 * If Nessie is down, returns the last cached copy with `stale: true`.
 */
export async function getBankSnapshot(userOrId, { force = false } = {}) {
  const user = userOrId?._id ? userOrId : await User.findById(userOrId);
  if (!user?.nessie?.customerId) return null;

  const fresh = user.nessie.syncedAt && Date.now() - user.nessie.syncedAt.getTime() < CACHE_MS();
  if (!force && fresh && user.nessie.lastSnapshot) return user.nessie.lastSnapshot;

  try {
    const snapshot = await buildSnapshot(user.nessie.customerId);
    await User.updateOne({ _id: user._id }, { 'nessie.lastSnapshot': snapshot, 'nessie.syncedAt': new Date() });
    return snapshot;
  } catch (err) {
    if (user.nessie.lastSnapshot) return { ...user.nessie.lastSnapshot, stale: true, error: err.message };
    throw err;
  }
}

async function buildSnapshot(customerId) {
  const accounts = await Nessie.getAccounts(customerId);
  const detailed = await Promise.all(
    accounts.map(async (a) => {
      const [feed, bills] = await Promise.all([
        Nessie.getTransactions(a._id).catch(() => []),
        Nessie.getBills(a._id).catch(() => []),
      ]);
      // v2 returns one feed; money coming in counts as "deposit" for the dashboard math below.
      // A transfer is incoming when this account is the payee.
      const incoming = (t) => ['deposit', 'refund', 'interest_credit'].includes(t.kind) || (t.kind === 'transfer' && t.payee_id === a._id);
      const tx = feed
        .filter((t) => !['declined', 'cancelled'].includes(t.status))
        .map((t) => ({ kind: incoming(t) ? 'deposit' : t.kind, amount: t.amount, date: t.date, description: t.description }))
        .sort((x, y) => String(y.date).localeCompare(String(x.date)));

      // Nessie v2 only moves `balance` once a transaction settles. Fold pending ones in so the
      // dashboard reacts right away (for a card, spending raises the balance owed).
      const pending = feed.filter((t) => t.status === 'pending');
      const pendingIn = pending.filter(incoming).reduce((s, t) => s + t.amount, 0);
      const pendingOut = pending.filter((t) => !incoming(t)).reduce((s, t) => s + t.amount, 0);
      const balance = round((a.balance || 0) + (a.type === 'Credit Card' ? pendingOut - pendingIn : pendingIn - pendingOut));

      return {
        id: a._id,
        type: a.type,
        nickname: a.nickname,
        balance,
        pendingCount: pending.length,
        recent: tx.slice(0, 15),
        bills: bills.map((b) => ({
          id: b._id,
          payee: b.payee,
          nickname: b.nickname,
          amount: b.payment_amount,
          status: b.status,
          nextDate: b.upcoming_payment_date || b.payment_date,
          recurringDay: b.recurring_date,
        })),
      };
    })
  );

  const cash = detailed.filter((a) => a.type !== 'Credit Card');
  const cards = detailed.filter((a) => a.type === 'Credit Card');
  const monthAgo = daysAgo(30);
  const all = detailed.flatMap((a) => a.recent);

  return {
    syncedAt: new Date().toISOString(),
    totalCash: round(cash.reduce((s, a) => s + (a.balance || 0), 0)),
    creditCardBalance: round(cards.reduce((s, a) => s + (a.balance || 0), 0)),
    last30Days: {
      moneyIn: round(all.filter((t) => t.kind === 'deposit' && t.date >= monthAgo).reduce((s, t) => s + t.amount, 0)),
      moneyOut: round(all.filter((t) => t.kind !== 'deposit' && t.date >= monthAgo).reduce((s, t) => s + t.amount, 0)),
    },
    upcomingBills: detailed
      .flatMap((a) => a.bills)
      .filter((b) => ['pending', 'recurring'].includes(b.status))
      .sort((x, y) => String(x.nextDate).localeCompare(String(y.nextDate))),
    accounts: detailed,
  };
}

const round = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Writing transactions
// ---------------------------------------------------------------------------
/**
 * Create a money event in Nessie and log it in MongoDB.
 * kind: purchase | deposit | withdrawal | bill_payment | transfer
 */
export async function recordTransaction(user, { kind, amount, description, accountType = 'Checking', accountId, creatureId, category, merchant, toAccountType }) {
  amount = Number(amount);
  if (!(amount > 0)) throw Object.assign(new Error('Amount must be greater than 0'), { status: 400 });

  const acct = accountId || user.accountId(accountType);
  if (!acct || !user.nessie.accounts.some((a) => a.id === acct))
    throw Object.assign(new Error('Account not found for this user'), { status: 403 });

  let made;
  const date = today();
  switch (kind) {
    case 'deposit':
      made = await Nessie.createDeposit(acct, { medium: 'balance', transaction_date: date, amount, description });
      break;
    case 'withdrawal':
      made = await Nessie.createWithdrawal(acct, { medium: 'balance', transaction_date: date, amount, description });
      break;
    case 'transfer': {
      const to = user.accountId(toAccountType || 'Savings');
      if (!to) throw Object.assign(new Error('Destination account not found'), { status: 400 });
      made = await Nessie.createTransfer(acct, { medium: 'balance', payee_id: to, transaction_date: date, amount, description });
      break;
    }
    case 'bill_payment':
      // Nessie bills are scheduled payments; a one-off payment is modelled as a completed bill
      made = await Nessie.createBill(acct, { status: 'completed', payee: description || 'Payment', nickname: description, payment_date: date, payment_amount: amount });
      break;
    case 'purchase':
    default:
      made = await Nessie.createPurchase(acct, {
        merchant_id: await getMerchantId(merchant || category || 'shopping'),
        medium: 'balance',
        purchase_date: date,
        amount,
        description,
      });
  }

  const tx = await Transaction.create({
    owner: user._id,
    creature: creatureId,
    kind: kind || 'purchase',
    amount,
    description,
    category,
    nessieAccountId: acct,
    nessieId: made?._id,
  });
  await invalidateSnapshot(user);
  return tx;
}

// ---------------------------------------------------------------------------
// Creatures ↔ Nessie bills
// ---------------------------------------------------------------------------
const BILL_TYPES = { student_loan: 'Checking', credit_card: 'Checking', subscription: 'Credit Card' };

/**
 * For recurring-payment creatures (loan, card, subscription), keep a matching
 * recurring bill in Nessie so it shows up in "upcomingBills".
 * Call after creating/updating a creature. Safe to call when Nessie isn't set up.
 */
export async function syncCreatureBill(user, creature) {
  const accountType = BILL_TYPES[creature.type];
  if (!accountType || !nessieConfigured() || !user.nessie?.customerId) return creature;

  const amount = Number(creature.data?.minPayment ?? creature.data?.cost);
  const day = Number(creature.data?.dueDay);
  if (!(amount > 0) || !(day >= 1 && day <= 31)) return creature;

  const bill = {
    status: 'recurring',
    payee: creature.data?.service || creature.nickname || creature.type,
    nickname: `${creature.nickname || creature.type} (creature)`,
    payment_date: nextDateForDay(day),
    recurring_date: Math.min(day, 28), // Nessie only accepts 1–28
    payment_amount: amount,
  };

  try {
    if (creature.nessieBillId) {
      await Nessie.updateBill(creature.nessieBillId, bill);
    } else {
      const acct = user.accountId(accountType);
      const made = await Nessie.createBill(acct, bill);
      creature.nessieBillId = made._id;
      creature.nessieAccountId = acct;
      await creature.save();
    }
    await invalidateSnapshot(user);
  } catch (e) {
    console.warn('[nessie] bill sync failed:', e.message);
  }
  return creature;
}

export async function removeCreatureBill(creature) {
  if (creature.nessieBillId && nessieConfigured()) await Nessie.deleteBill(creature.nessieBillId).catch(() => {});
}

function nextDateForDay(day) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), Math.min(day, 28));
  if (d < new Date(now.toDateString())) d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}
