import { useState } from 'react';

// Builds a form from a catalog entry's `fields` (types: money | percent | number | day | text | select | date).
// onSubmit receives { data, nickname }; throw an Error from it to show a message under the form.
export default function CreatureForm({ entry, initial, submitLabel, onSubmit, onCancel }) {
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [values, setValues] = useState(() => {
    const v = {};
    for (const f of entry.fields) {
      const raw = initial?.data?.[f.key];
      v[f.key] = raw === undefined || raw === null ? '' : f.type === 'date' ? String(raw).slice(0, 10) : String(raw);
    }
    return v;
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setValue = (key) => (e) => setValues((vals) => ({ ...vals, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const data = {};
    for (const f of entry.fields) {
      const raw = values[f.key];
      if (raw === '' || raw === undefined) continue;
      data[f.key] = ['money', 'percent', 'number', 'day'].includes(f.type) ? Number(raw) : raw;
    }
    setBusy(true);
    try {
      await onSubmit({ data, nickname: nickname.trim() || undefined });
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setBusy(false);
    }
  };

  const input = (f) => {
    const common = { id: `f-${f.key}`, value: values[f.key], onChange: setValue(f.key) };
    switch (f.type) {
      case 'money':
      case 'percent':
        return <input {...common} type="number" min="0" step="0.01" inputMode="decimal" />;
      case 'number':
        return <input {...common} type="number" min="0" step="any" inputMode="decimal" />;
      case 'day':
        return <input {...common} type="number" min="1" max="31" step="1" inputMode="numeric" />;
      case 'date':
        return <input {...common} type="date" />;
      case 'select':
        return (
          <select {...common}>
            <option value="">Choose…</option>
            {f.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      default:
        return <input {...common} type="text" />;
    }
  };

  return (
    <form className="creature-form" onSubmit={submit} noValidate>
      <label className="field" htmlFor="f-nickname">
        <span>Nickname (optional)</span>
        <input
          id="f-nickname"
          type="text"
          maxLength={40}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={entry.name}
        />
      </label>

      {entry.fields.map((f) => (
        <label key={f.key} className="field" htmlFor={`f-${f.key}`}>
          <span>
            {f.label}
            {f.required ? ' *' : ''}
            {f.type === 'percent' ? ' (%)' : ''}
            {f.type === 'money' ? ' ($)' : ''}
          </span>
          {input(f)}
        </label>
      ))}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="secondary-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
        <button type="submit" className="primary-btn" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
