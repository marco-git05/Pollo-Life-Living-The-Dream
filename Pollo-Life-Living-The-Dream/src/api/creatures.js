import { api } from './client';

// GET    /api/creatures/catalog   public: creature types, fields, colors, sprites, NFC payloads
// GET    /api/creatures           the user's creatures (Mongo docs: _id, type, nickname, data, mood, lastAdvice, ...)
// POST   /api/creatures           { type, data, nickname?, nfcTagId? }   validated against the catalog
// PATCH  /api/creatures/:id       { data?, nickname?, position?, ... }   data is merged
// DELETE /api/creatures/:id       also removes its Nessie bill
// POST   /api/creatures/scan      { payload, serial? } -> { creature | null, type }

export const getCatalog = () => api('/creatures/catalog');
export const getCreatures = () => api('/creatures');
export const createCreature = (body) => api('/creatures', { method: 'POST', body });
export const updateCreature = (id, body) => api(`/creatures/${id}`, { method: 'PATCH', body });
export const deleteCreature = (id) => api(`/creatures/${id}`, { method: 'DELETE' });
export const scanCard = (payload, serial) => api('/creatures/scan', { method: 'POST', body: { payload, serial } });
