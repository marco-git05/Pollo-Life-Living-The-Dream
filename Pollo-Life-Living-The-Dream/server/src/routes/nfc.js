import { Router } from 'express';
import NfcScan from '../models/NfcScan.js';
import { requireAuth, ah } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

r.get('/', ah(async (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  res.json(await NfcScan.find({ owner: req.userId }).sort({ scannedAt: -1 }).limit(limit));
}));

r.post('/', ah(async (req, res) => {
  const { payload, serial, source = 'bridge' } = req.body || {};
  if (typeof payload !== 'string' || payload.trim() === '') {
    return res.status(400).json({ error: 'payload is required' });
  }
  if (!['bridge', 'manual', 'web-nfc'].includes(source)) {
    return res.status(400).json({ error: 'source must be bridge, manual, or web-nfc' });
  }
  const scan = await NfcScan.create({
    owner: req.userId,
    payload: payload.trim(),
    serial: typeof serial === 'string' && serial.trim() ? serial.trim() : undefined,
    source,
  });
  res.status(201).json(scan);
}));

r.delete('/', ah(async (req, res) => {
  await NfcScan.deleteMany({ owner: req.userId });
  res.status(204).end();
}));

export default r;
