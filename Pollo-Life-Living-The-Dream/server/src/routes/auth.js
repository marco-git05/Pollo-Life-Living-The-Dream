import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken, requireAuth, ah } from '../middleware/auth.js';
import { provisionBank } from '../services/bankSync.js';
import { nessieConfigured } from '../services/nessie.js';

const r = Router();

r.post('/register', ah(async (req, res) => {
  const { username, password, displayName, ageGroup, createBank = true } = req.body || {};
  if (!username || !password || password.length < 6)
    return res.status(400).json({ error: 'Username and a password of at least 6 characters are required' });
  if (await User.exists({ username: username.toLowerCase().trim() }))
    return res.status(409).json({ error: 'That username is taken' });

  const user = await User.create({
    username,
    displayName: displayName || username,
    ageGroup,
    passwordHash: await bcrypt.hash(password, 10),
  });

  let bankWarning;
  if (createBank && nessieConfigured()) {
    try {
      await provisionBank(user);
    } catch (e) {
      bankWarning = `Account created, but the mock bank wasn't: ${e.message}`;
    }
  }
  res.status(201).json({ token: signToken(user), user: user.toPublic(), bankWarning });
}));

r.post('/login', ah(async (req, res) => {
  const { username, password } = req.body || {};
  const user = await User.findOne({ username: (username || '').toLowerCase().trim() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash)))
    return res.status(401).json({ error: 'Wrong username or password' });
  res.json({ token: signToken(user), user: user.toPublic() });
}));

r.get('/me', requireAuth, ah(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: user.toPublic() });
}));

r.patch('/me', requireAuth, ah(async (req, res) => {
  const allowed = ['displayName', 'ageGroup', 'aiPrefs', 'village'];
  const update = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
  const user = await User.findByIdAndUpdate(req.userId, update, { new: true, runValidators: true });
  res.json({ user: user.toPublic() });
}));

export default r;
