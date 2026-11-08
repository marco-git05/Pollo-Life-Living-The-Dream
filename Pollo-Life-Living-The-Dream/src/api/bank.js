import { api } from './client';

// GET /api/bank                -> snapshot, or null if the user has no mock bank yet.
//                                 Cached ~2 min by the backend; ?refresh=1 forces a fresh pull.
// POST /api/bank/connect       -> creates the mock bank if missing ("Connect account" button)
// POST /api/bank/seed          -> adds demo history to an existing bank
// GET /api/bank/transactions   -> ?creatureId=&limit=
// POST /api/bank/transactions  -> { kind, amount, description, accountType?, creatureId?, category?, toAccountType? }
//                                 kind: purchase | deposit | withdrawal | bill_payment | transfer

export async function getBank({ refresh = false } = {}) {
  const data = await api(`/bank${refresh ? '?refresh=1' : ''}`);
  // Accept either the snapshot itself or { snapshot }.
  return data && data.snapshot !== undefined ? data.snapshot : data;
}

export const connectBank = () => api('/bank/connect', { method: 'POST' });

export const seedBank = () => api('/bank/seed', { method: 'POST' });

export function getTransactions({ creatureId, limit } = {}) {
  const qs = new URLSearchParams();
  if (creatureId) qs.set('creatureId', creatureId);
  if (limit) qs.set('limit', String(limit));
  const q = qs.toString();
  return api(`/bank/transactions${q ? `?${q}` : ''}`);
}

export const addTransaction = (tx) => api('/bank/transactions', { method: 'POST', body: tx });
