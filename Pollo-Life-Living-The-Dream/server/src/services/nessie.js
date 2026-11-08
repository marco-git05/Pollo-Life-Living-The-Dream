/**
 * Capital One Nessie API client (mock bank).
 * Docs/keys: http://api.nessieisreal.com — the key goes in the ?key= query param.
 * Every function returns Nessie's JSON or throws a NessieError.
 */
export class NessieError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'NessieError';
    this.status = status || 502;
  }
}

const base = () => (process.env.NESSIE_BASE_URL || 'http://api.nessieisreal.com').replace(/\/$/, '');
export const nessieConfigured = () => !!process.env.NESSIE_API_KEY;

async function call(path, { method = 'GET', body } = {}) {
  const key = process.env.NESSIE_API_KEY;
  if (!key) throw new NessieError('NESSIE_API_KEY is not set in server/.env', 503);

  const url = `${base()}${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new NessieError(`Could not reach Nessie (${err.name === 'TimeoutError' ? 'timed out' : err.message})`, 504);
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const detail = data?.message || data?.culprit?.join?.(', ') || text.slice(0, 200);
    if (res.status === 401) throw new NessieError('Nessie rejected the API key — check NESSIE_API_KEY', 401);
    throw new NessieError(`Nessie ${method} ${path} failed (${res.status}): ${detail}`, res.status);
  }
  return data;
}

const safeJson = (t) => { try { return JSON.parse(t); } catch { return { raw: t }; } };

/** Nessie create calls return { code, message, objectCreated: {...} } */
const created = (r) => r?.objectCreated ?? r;

export const Nessie = {
  // Customers
  getCustomers: () => call('/customers'),
  getCustomer: (id) => call(`/customers/${id}`),
  createCustomer: async (c) => created(await call('/customers', { method: 'POST', body: c })),

  // Accounts — type: "Checking" | "Savings" | "Credit Card"
  getAccounts: (customerId) => call(`/customers/${customerId}/accounts`),
  getAccount: (accountId) => call(`/accounts/${accountId}`),
  createAccount: async (customerId, a) => created(await call(`/customers/${customerId}/accounts`, { method: 'POST', body: a })),

  // Purchases — medium: "balance" | "rewards"
  getPurchases: (accountId) => call(`/accounts/${accountId}/purchases`),
  createPurchase: async (accountId, p) => created(await call(`/accounts/${accountId}/purchases`, { method: 'POST', body: p })),

  // Deposits / withdrawals
  getDeposits: (accountId) => call(`/accounts/${accountId}/deposits`),
  createDeposit: async (accountId, d) => created(await call(`/accounts/${accountId}/deposits`, { method: 'POST', body: d })),
  getWithdrawals: (accountId) => call(`/accounts/${accountId}/withdrawals`),
  createWithdrawal: async (accountId, w) => created(await call(`/accounts/${accountId}/withdrawals`, { method: 'POST', body: w })),

  // Transfers between two accounts
  createTransfer: async (fromId, t) => created(await call(`/accounts/${fromId}/transfers`, { method: 'POST', body: t })),

  // Bills — status: "pending" | "cancelled" | "completed" | "recurring"
  getBills: (accountId) => call(`/accounts/${accountId}/bills`),
  createBill: async (accountId, b) => created(await call(`/accounts/${accountId}/bills`, { method: 'POST', body: b })),
  updateBill: (billId, b) => call(`/bills/${billId}`, { method: 'PUT', body: b }),
  deleteBill: (billId) => call(`/bills/${billId}`, { method: 'DELETE' }),

  // Loans — Nessie's loan types are home/auto/small business; we track student loans as bills
  getLoans: (accountId) => call(`/accounts/${accountId}/loans`),

  // Merchants
  getMerchants: () => call('/merchants'),
  createMerchant: async (m) => created(await call('/merchants', { method: 'POST', body: m })),
};

export const today = () => new Date().toISOString().slice(0, 10);
