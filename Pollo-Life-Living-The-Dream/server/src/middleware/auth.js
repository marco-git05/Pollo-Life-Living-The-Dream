import jwt from 'jsonwebtoken';

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

/** Protects a route; sets req.userId. Send header: Authorization: Bearer <token> */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).sub;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

/** Wrap async handlers so thrown errors reach the error middleware. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
