import { useEffect } from 'react';

// `bare` drops the default title bar so the content can draw its own (the creature ID cards do).
export default function Modal({ title, onClose, children, className = '', bare = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        {!bare && (
          <header className="modal-head">
            <h2>{title}</h2>
            <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
              ×
            </button>
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
