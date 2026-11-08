/**
 * Capital One Nessie v2 API client (mock bank).
 * Site/docs: https://v2.nessieisreal.com  ·  API: https://v2-prod-api.nessieisreal.com (reference at /docs)
 * Auth: `Authorization: Bearer <key>`.
 *
 * v2 speaks in cents (amount_cents, balance_cents), uses `id`, and wraps lists in { items }.
 * To keep the rest of the server unchanged, every function here takes and returns the
 * old v1-style shapes: dollars, `_id`, `balance`, `amount`. Throws NessieError on failure.
 */
export class NessieError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'NessieError';
    this.status = status || 502;
  }
}

const base = () => (process.env.NESSIE_BASE_URL || 'https://v2-prod-api.nessieisreal.com').replace(/\/$/, '');
export const nessieConfigured = () => !!process.env.NESSIE_API_KEY;

async function call(path, { method = 'GET', body } = {}) {
  const key = process.env.NESSIE_API_KEY?.trim();
  if (!key) throw new NessieError('NESSIE_API_KEY is not set in server/.env', 503);

  let res;
  try {
    res = await fetch(`${base()}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${key}` },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new NessieError(`Could not reach Nessie (${err.name === 'TimeoutError' ? 'timed out' : err.message})`, 504);
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const detail = data?.detail || data?.title || data?.message || text.slice(0, 200);
    if (res.status === 401) throw new NessieError('Nessie rejected the API key — check NESSIE_API_KEY', 401);
    throw new NessieError(`Nessie ${method} ${path} failed (${res.status}): ${detail}`, res.status);
  }
  return data;
}

const safeJson = (t) => { try { return JSON.parse(t); } catch { return { raw: t }; } };

// ---- shape conversion (v2 <-> v1-style) ------------------------------------
const toCents = (dollars) => Math.round(Number(dollars || 0) * 100);
const toDollars = (cents) => (cents == null ? cents : cents / 100);
const items = (r) => (Array.isArray(r) ? r : r?.items ?? []);

/** Fetch every page of a cursor-paginated list. */
async function listAll(path) {
  const out = [];
  let cursor;
  do {
    const sep = path.includes('?') ? '&' : '?';
    const r = await call(`${path}${sep}limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    out.push(...items(r));
    cursor = r?.next_cursor;
  } while (cursor);
  return out;
}

const withId = (o) => (o ? { ...o, _id: o.id } : o);
const account = (a) => a && { ...withId(a), balance: toDollars(a.balance_cents), available: toDollars(a.available_cents) };
const tx = (t) => t && {
  ...withId(t),
  amount: toDollars(t.amount_cents),
  date: (t.created_at || '').slice(0, 10),
  purchase_date: (t.created_at || '').slice(0, 10),
  transaction_date: (t.created_at || '').slice(0, 10),
};

/** v1 money body ({ amount, medium, description, ... }) -> v2 body. Dates are set by Nessie (v2 has no backdating). */
const money = ({ amount, medium, description, merchant_id, payee_id }) => {
  const b = { amount_cents: toCents(amount) };
  if (medium) b.medium = medium;
  if (description) b.description = description;
  if (merchant_id) b.merchant_id = merchant_id;
  if (payee_id) b.payee_id = payee_id;
  return b;
};

const bill = ({ status, payee, nickname, payment_date, recurring_date, payment_amount }) =>
  Object.fromEntries(Object.entries({ status, payee, nickname, payment_date, recurring_date, payment_amount }).filter(([, v]) => v !== undefined));

/**
 * v2 money moves start "pending" and settle later. For a snappy demo we fast-forward them so
 * balances update immediately. Set NESSIE_AUTO_SETTLE=false to keep Nessie's real pending window.
 */
async function settled(made) {
  if (process.env.NESSIE_AUTO_SETTLE === 'false' || made?.status !== 'pending') return made;
  try {
    return (await call(`/transactions/${made.id}/settle`, { method: 'POST' })) || made;
  } catch (e) {
    console.warn('[nessie] could not fast-forward', made.id, e.message);
    return made;
  }
}
const move = async (path, body) => tx(await settled(await call(path, { method: 'POST', body: money(body) })));

const KINDS = { purchase: ['purchase', 'bill_payment', 'fee'], deposit: ['deposit', 'refund', 'interest_credit'], withdrawal: ['withdrawal'] };

export const Nessie = {
  // Customers
  getCustomers: async () => (await listAll('/customers')).map(withId),
  getCustomer: async (id) => withId(await call(`/customers/${id}`)),
  createCustomer: async ({ first_name, last_name, address }) =>
    withId(await call('/customers', { method: 'POST', body: { first_name, last_name, address } })),

  // Accounts — type: "Checking" | "Savings" | "Credit Card"
  getAccounts: async (customerId) => (await listAll(`/customers/${customerId}/accounts`)).map(account),
  getAccount: async (accountId) => account(await call(`/accounts/${accountId}`)),
  createAccount: async (customerId, { type, nickname, rewards = 0, balance = 0, credit_limit }) =>
    account(await call(`/customers/${customerId}/accounts`, {
      method: 'POST',
      body: { type, nickname, rewards, balance_cents: toCents(balance), ...(credit_limit != null && { credit_limit_cents: toCents(credit_limit) }) },
    })),

  /** All money movement on an account (v2 has one feed), newest first, v1-style amounts. */
  getTransactions: async (accountId, limit = 100) => items(await call(`/accounts/${accountId}/transactions?limit=${limit}`)).map(tx),

  // Kept for compatibility: filtered views of the transaction feed
  getPurchases: async (accountId) => (await Nessie.getTransactions(accountId)).filter((t) => KINDS.purchase.includes(t.kind)),
  getDeposits: async (accountId) => (await Nessie.getTransactions(accountId)).filter((t) => KINDS.deposit.includes(t.kind)),
  getWithdrawals: async (accountId) => (await Nessie.getTransactions(accountId)).filter((t) => KINDS.withdrawal.includes(t.kind)),

  // Money movement — medium: "balance" | "rewards"
  createPurchase: (accountId, p) => move(`/accounts/${accountId}/purchases`, p),
  createDeposit: (accountId, d) => move(`/accounts/${accountId}/deposits`, d),
  createWithdrawal: (accountId, w) => move(`/accounts/${accountId}/withdrawals`, w),
  createTransfer: (fromId, t) => move(`/accounts/${fromId}/transfers`, t),

  // Bills — status: "pending" | "cancelled" | "completed" | "recurring" (payment_amount is in dollars in v2 too)
  getBills: async (accountId) => (await listAll(`/accounts/${accountId}/bills`)).map(withId),
  createBill: async (accountId, b) => withId(await call(`/accounts/${accountId}/bills`, { method: 'POST', body: bill(b) })),
  updateBill: async (billId, b) => withId(await call(`/bills/${billId}`, { method: 'PATCH', body: bill(b) })),
  deleteBill: (billId) => call(`/bills/${billId}`, { method: 'DELETE' }),

  // Loans
  getLoans: async (accountId) =>
    (await listAll(`/accounts/${accountId}/loans`)).map((l) => ({ ...withId(l), amount: toDollars(l.amount_cents), monthly_payment: toDollars(l.monthly_payment_cents) })),

  // Merchants
  getMerchants: async () => (await listAll('/merchants')).map(withId),
  createMerchant: async ({ name, category, address, geocode }) =>
    withId(await call('/merchants', { method: 'POST', body: { name, category, address, geocode } })),
};

export const today = () => new Date().toISOString().slice(0, 10);
