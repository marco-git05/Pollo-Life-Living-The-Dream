import { Router } from 'express';
import { requireAuth, ah } from '../middleware/auth.js';
import { getFinanceNews } from '../services/news.js';

const r = Router();
r.use(requireAuth); // keeps randoms from burning our SerpApi quota

/** GET /api/news?limit= → { items: [{ id, tag, headline, url, source, publishedAt, thumbnail }], fetchedAt, stale } */
r.get('/', ah(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 20);
  res.json(await getFinanceNews({ limit }));
}));

export default r;
