import { Router } from 'express';
import mongoose from 'mongoose';
import Creature from '../models/Creature.js';
import User from '../models/User.js';
import { requireAuth, ah } from '../middleware/auth.js';
import { CREATURE_CATALOG, getCatalogEntry, findTypeByNfc } from '../creatures/catalog.js';
import { syncCreatureBill, removeCreatureBill } from '../services/bankSync.js';

const r = Router();

r.get('/catalog', (_req, res) => res.json(CREATURE_CATALOG));

r.use(requireAuth);

const validId = (id) => mongoose.isValidObjectId(id);

function validate(type, data = {}) {
  const entry = getCatalogEntry(type);
  if (!entry) return `Unknown creature type "${type}"`;
  const missing = entry.fields.filter((f) => f.required && (data[f.key] === undefined || data[f.key] === ''));
  if (missing.length) return `Missing: ${missing.map((f) => f.label).join(', ')}`;
  for (const f of entry.fields) {
    const v = data[f.key];
    if (v === undefined || v === '') continue;
    if (['money', 'percent', 'number'].includes(f.type) && (isNaN(v) || Number(v) < 0)) return `${f.label} must be a positive number`;
    if (f.type === 'day' && !(Number(v) >= 1 && Number(v) <= 31)) return `${f.label} must be 1–31`;
    if (f.type === 'select' && !f.options.includes(v)) return `${f.label} must be one of: ${f.options.join(', ')}`;
  }
  return null;
}

r.get('/', ah(async (req, res) => {
  res.json(await Creature.find({ owner: req.userId }).sort('createdAt'));
}));

r.get('/:id', ah(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Bad id' });
  const c = await Creature.findOne({ _id: req.params.id, owner: req.userId });
  c ? res.json(c) : res.status(404).json({ error: 'Not found' });
}));

/** NFC scan → { creature (existing or null), type } */
r.post('/scan', ah(async (req, res) => {
  const { payload, serial } = req.body || {};
  if (serial) {
    const bySerial = await Creature.findOne({ owner: req.userId, nfcTagId: serial });
    if (bySerial) return res.json({ creature: bySerial, type: bySerial.type });
  }
  const type = findTypeByNfc(payload) || (getCatalogEntry(payload) ? payload : null);
  if (!type) return res.status(404).json({ error: 'Unknown card' });
  res.json({ creature: await Creature.findOne({ owner: req.userId, type }), type });
}));

r.post('/', ah(async (req, res) => {
  const { type, data = {}, nickname, nfcTagId } = req.body || {};
  const err = validate(type, data);
  if (err) return res.status(400).json({ error: err });

  const creature = await Creature.create({
    owner: req.userId,
    type,
    data,
    nickname: nickname || getCatalogEntry(type).name,
    nfcTagId,
    position: { x: Math.random() * 0.8 + 0.1 },
  });
  await syncCreatureBill(await User.findById(req.userId), creature);
  res.status(201).json(creature);
}));

r.patch('/:id', ah(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Bad id' });
  const c = await Creature.findOne({ _id: req.params.id, owner: req.userId });
  if (!c) return res.status(404).json({ error: 'Not found' });

  const { data, nickname, nfcTagId, position, mood, lastAdvice } = req.body || {};
  if (data) {
    const merged = { ...c.data, ...data };
    const err = validate(c.type, merged);
    if (err) return res.status(400).json({ error: err });
    c.data = merged;
    c.markModified('data');
  }
  if (nickname !== undefined) c.nickname = nickname;
  if (nfcTagId !== undefined) c.nfcTagId = nfcTagId;
  if (position) c.position = position;
  if (mood) c.mood = mood;
  if (lastAdvice !== undefined) c.lastAdvice = lastAdvice;
  await c.save();

  if (data) await syncCreatureBill(await User.findById(req.userId), c);
  res.json(c);
}));

r.delete('/:id', ah(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Bad id' });
  const c = await Creature.findOneAndDelete({ _id: req.params.id, owner: req.userId });
  if (c) await removeCreatureBill(c);
  res.status(204).end();
}));

export default r;
