import { useState } from 'react';

// Form helpers for catalog fields (types: money | percent | number | day | text | select | date).

const NUMERIC = ['money', 'percent', 'number', 'day'];

export function initValues(entry, data) {
  const v = {};
  for (const f of entry?.fields ?? []) {
    const raw = data?.[f.key];
    v[f.key] = raw === undefined || raw === null ? '' : f.type === 'date' ? String(raw).slice(0, 10) : String(raw);
  }
  return v;
}

// Form strings -> the `data` object the API expects. Blank fields are left out.
export function collectData(entry, values) {
  const data = {};
  for (const f of entry.fields) {
    const raw = values[f.key];
    if (raw === '' || raw === undefined) continue;
    data[f.key] = NUMERIC.includes(f.type) ? Number(raw) : raw;
  }
  return data;
}

// The ID card shows the goal date on its own line, so it is pulled out of the regular field list.
export const splitGoal = (fields = []) => ({
  main: fields.filter((f) => f.key !== 'goalDate'),
  goal: fields.find((f) => f.key === 'goalDate') ?? null,
});

export function useFieldValues(entry, data) {
  const [values, setValues] = useState(() => initValues(entry, data));
  const set = (key) => (v) => setValues((vals) => ({ ...vals, [key]: v }));
  return [values, set, setValues];
}
