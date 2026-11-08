import { Router } from 'express';
import { requireAuth, ah } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

r.post('/', ah(async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  if (!messages.length || messages.some((message) => !message?.role || typeof message.content !== 'string')) {
    return res.status(400).json({ error: 'Messages must be a non-empty array with role and content.' });
  }
  const apiKey = process.env.NVIDIA_API_KEY?.trim();
  if (!apiKey) return res.status(503).json({ error: 'The finance companion is not configured.' });

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3.5-bolt-e4b',
      messages,
      temperature: 0.6,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = result?.detail || result?.message || 'The finance companion could not answer.';
    return res.status(502).json({ error: detail });
  }
  res.json({ reply: result?.choices?.[0]?.message?.content || 'The finance companion returned no answer.' });
}));

export default r;
