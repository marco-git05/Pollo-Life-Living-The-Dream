import { api } from './client';

// GET /api/news?limit= -> { items: [{ id, tag, headline, url, source, publishedAt, thumbnail }], fetchedAt, stale }
// The backend calls SerpApi (Google News) and caches for ~1h, so this is cheap to call.
export const getNews = ({ limit = 6 } = {}) => api(`/news?limit=${limit}`);
