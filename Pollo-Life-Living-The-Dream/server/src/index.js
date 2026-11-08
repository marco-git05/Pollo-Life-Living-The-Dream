import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { nessieConfigured } from './services/nessie.js';
import authRoutes from './routes/auth.js';
import creatureRoutes from './routes/creatures.js';
import bankRoutes from './routes/bank.js';
import newsRoutes from './routes/news.js';
import { newsConfigured } from './services/news.js';
// AI teammate: add `import aiRoutes from './routes/ai.js';` and mount it below

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));

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
// app.use('/api/ai', aiRoutes);

app.use((req, res) => res.status(404).json({ error: `No route ${req.method} ${req.path}` }));

app.use((err, _req, res, _next) => {
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Bad id' });
  if (err.code === 11000) return res.status(409).json({ error: 'That already exists' });
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const port = process.env.PORT || 4000;
try {
  await connectDB();
  app.listen(port, () => console.log(`API on http://localhost:${port}  (Nessie: ${nessieConfigured() ? 'on' : 'no key'})`));
} catch (err) {
  console.error(`\n✖ ${err.message}\n`);
  process.exit(1);
}

export default app;
