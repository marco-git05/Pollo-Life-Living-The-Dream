import { Router } from 'express';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { requireAuth, ah } from '../middleware/auth.js';
import { provisionBank, getBankSnapshot, recordTransaction, seedDemoActivity } from '../services/bankSync.js';

const r = Router();
r.use(requireAuth);

const loadUser = async (req) => {
  const user = await User.findById(req.userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  return user;
};

/** GET /api/bank → cached snapshot (null if no bank yet). ?refresh=1 forces a Nessie call. */
r.get('/', ah(async (req, res) => {
  const user = await loadUser(req);
  res.json(await getBankSnapshot(user, { force: req.query.refresh === '1' }));
}));

/** POST /api/bank/connect → "Connect account" button. Creates the mock bank if missing. */
r.post('/connect', ah(async (req, res) => {
  const user = await provisionBank(await loadUser(req));
  res.json(await getBankSnapshot(user, { force: true }));
}));

/** POST /api/bank/seed → add demo history to an existing bank (handy before a demo). */
r.post('/seed', ah(async (req, res) => {
  const user = await loadUser(req);
  if (!user.nessie?.customerId) return res.status(400).json({ error: 'Connect a bank first' });
  await seedDemoActivity(user);
  res.json(await getBankSnapshot(user, { force: true }));
}));

/**
 * POST /api/bank/transactions
 * body: { kind, amount, description, accountType?, creatureId?, category?, toAccountType? }
 * e.g. feeding the groceries creature: { kind:"purchase", amount:42, description:"Grocery run", category:"groceries", creatureId }
 */
r.post('/transactions', ah(async (req, res) => {
  const user = await loadUser(req);
  if (!user.nessie?.customerId) return res.status(400).json({ error: 'Connect a bank first' });
  const tx = await recordTransaction(user, req.body || {});
  res.status(201).json(tx);
}));

/** GET /api/bank/transactions?creatureId=&limit= → our own log (works even if Nessie is down) */
r.get('/transactions', ah(async (req, res) => {
  const filter = { owner: req.userId };
  if (req.query.creatureId) filter.creature = req.query.creatureId;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json(await Transaction.find(filter).sort('-date').limit(limit));
}));

export default r;
