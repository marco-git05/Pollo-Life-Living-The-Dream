import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { nessieConfigured } from './services/nessie.js';
import authRoutes from './routes/auth.js';
import creatureRoutes from './routes/creatures.js';
import bankRoutes from './routes/bank.js';
import newsRoutes from './routes/news.js';
import nfcRoutes from './routes/nfc.js';
import { newsConfigured } from './services/news.js';

const app = express();
const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', (_req, res) =>
  res.json({
    ok: true,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    nessie: nessieConfigured() ? 'configured' : 'missing key',
    news: newsConfigured() ? 'configured' : 'missing key',
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/creatures', creatureRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/nfc', nfcRoutes);

app.use((req, res) => res.status(404).json({ error: `No route ${req.method} ${req.path}` }));

app.use((err, _req, res, _next) => {
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Bad id' });
  if (err.code === 11000) return res.status(409).json({ error: 'That already exists' });
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

export default app;
