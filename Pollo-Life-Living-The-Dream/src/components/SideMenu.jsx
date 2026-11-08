import { useEffect } from 'react';

// Add more links here later, e.g. { id: 'creatures', label: 'Creatures' }.
// `id` is the view name App.jsx switches to.
const ITEMS = [
  { id: 'account', label: 'Account info' },
  { id: 'nfc', label: 'NFC reader' },
];

export default function SideMenu({ open, view, onClose, onNavigate }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`backdrop ${open ? 'open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidemenu ${open ? 'open' : ''}`} aria-label="Settings menu">
        <header className="sidemenu-head">
          <h2>Menu</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close menu">
            ×
          </button>
        </header>
        <nav>
          <ul className="menu-list">
            {ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="menu-item"
                  aria-current={view === item.id ? 'page' : undefined}
                  onClick={() => onNavigate(item.id)}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    {item.id === 'nfc' ? (
                      <>
                        <path d="M7 3v18M17 3v18M3 7h18M3 17h18" />
                        <circle cx="12" cy="12" r="2" />
                      </>
                    ) : (
                      <>
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                      </>
                    )}
                  </svg>
                  <span>{item.label}</span>
                  <span className="chev" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
