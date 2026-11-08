/**
 * Finance headlines from SerpApi's Google News engine.
 * Docs: https://serpapi.com/google-news-api  ·  Auth: `api_key` query param (server-side only!).
 *
 * Every search costs quota, so results are cached in memory (NEWS_CACHE_SECONDS, default 1h)
 * and shared by all users. If SerpApi fails we keep serving the last good copy.
 */
export class NewsError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'NewsError';
    this.status = status || 502;
  }
}

export const newsConfigured = () => !!process.env.SERPAPI_API_KEY?.trim();

const DEFAULT_QUERY = 'personal finance OR student loans OR credit cards OR savings rates OR interest rates';
const cacheMs = () => (Number(process.env.NEWS_CACHE_SECONDS) || 3600) * 1000;
const cache = new Map(); // query -> { at, items }

// Tag each headline by keyword so we only need one search instead of one per topic.
const TAGS = [
  ['Loans', /student loan|loan|mortgage|borrow|refinanc/i],
  ['Credit', /credit card|credit score|\bapr\b|debt|fico/i],
  ['Savings', /saving|high-yield|\bcd\b|emergency fund|retire|401\(k\)|\bira\b/i],
  ['Markets', /stock|market|fed\b|federal reserve|rate|inflation|dow|s&p|nasdaq/i],
];
const tagFor = (title) => TAGS.find(([, re]) => re.test(title))?.[0] || 'Money';

// SerpApi gives `iso_date`, or `date` like "11/07/2026, 08:00 AM, +0000 UTC".
function parseDate(r) {
  if (r.iso_date) return new Date(r.iso_date);
  const m = r.date?.match(/^(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2}) (AM|PM)/);
  if (!m) return null;
  const [, mo, d, y, h, min, ap] = m;
  const hour = (Number(h) % 12) + (ap === 'PM' ? 12 : 0);
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), hour, Number(min)));
}

function normalize(results, limit) {
  const out = [];
  for (const r of results) {
    // Some results are clusters ("stories"); take the top story from those.
    const item = r.title && r.link ? r : r.highlight || r.stories?.[0];
    if (!item?.title || !item?.link) continue;
    const date = parseDate(item);
    out.push({
      id: item.link,
      tag: tagFor(item.title),
      headline: item.title,
      url: item.link,
      source: item.source?.name || 'Google News',
      publishedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
      thumbnail: item.thumbnail || null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

async function search(query) {
  const params = new URLSearchParams({
    engine: 'google_news',
    q: query,
    gl: 'us',
    hl: 'en',
    api_key: process.env.SERPAPI_API_KEY.trim(),
  });

  let res;
  try {
    res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(15_000) });
  } catch (err) {
    throw new NewsError(`Could not reach SerpApi (${err.name === 'TimeoutError' ? 'timed out' : err.message})`, 504);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) throw new NewsError(`SerpApi: ${data?.error || `HTTP ${res.status}`}`, res.status === 401 ? 503 : 502);
  return data?.news_results || [];
}

/** Returns { items, fetchedAt, stale }. */
export async function getFinanceNews({ query = DEFAULT_QUERY, limit = 6 } = {}) {
  if (!newsConfigured()) throw new NewsError('SERPAPI_API_KEY is not set in server/.env', 503);

  const hit = cache.get(query);
  if (hit && Date.now() - hit.at < cacheMs()) {
    return { items: hit.items.slice(0, limit), fetchedAt: new Date(hit.at).toISOString(), stale: false };
  }

  try {
    const items = normalize(await search(query), 20);
    cache.set(query, { at: Date.now(), items });
    return { items: items.slice(0, limit), fetchedAt: new Date().toISOString(), stale: false };
  } catch (err) {
    if (hit) return { items: hit.items.slice(0, limit), fetchedAt: new Date(hit.at).toISOString(), stale: true };
    throw err;
  }
}
