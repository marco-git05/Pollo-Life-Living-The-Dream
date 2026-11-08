// Shared components for the creature ID card and the "new character" card (helpers live in creatures/fields.js).

function fieldLabel(f) {
  return `${f.label}${f.type === 'percent' ? ' (%)' : ''}${f.type === 'money' ? ' ($)' : ''}`;
}

function FieldInput({ f, id, value, onChange }) {
  const common = { id, value, onChange: (e) => onChange(e.target.value) };
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
}

// One labelled ID line: small caps label above an underlined input.
export function IdField({ f, value, onChange, prefix = 'id', hint }) {
  const id = `${prefix}-${f.key}`;
  return (
    <label className="id-field" htmlFor={id}>
      <span className="id-label">
        {fieldLabel(f)}
        {f.required ? <b aria-hidden="true"> *</b> : hint ? <i> {hint}</i> : null}
      </span>
      <FieldInput f={f} id={id} value={value} onChange={onChange} />
    </label>
  );
}

// Big pixel-art portrait in an ID-photo frame. `hidden` shows it as a black silhouette ("new character").
export function Portrait({ entry, hidden = false, children }) {
  const src = entry?.portrait || entry?.sprite;
  return (
    <div className="id-photo" style={{ '--accent': entry?.color ?? '#a3a380' }}>
      {src ? (
        <img key={src} className={hidden ? 'silhouette' : 'reveal'} src={src} alt={hidden ? '' : `${entry.species ?? 'Creature'} portrait`} />
      ) : (
        <span className="id-unknown" aria-hidden="true">
          ?
        </span>
      )}
      {children}
    </div>
  );
}

// Passport-style machine-readable line at the bottom of the card, purely decorative.
export function Mrz({ name, type, id }) {
  const clean = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '<');
  const line = `ID<${clean(type)}<<${clean(name)}<<${clean(id)}`.padEnd(44, '<').slice(0, 44);
  return (
    <div className="id-mrz" aria-hidden="true">
      {line}
    </div>
  );
}
