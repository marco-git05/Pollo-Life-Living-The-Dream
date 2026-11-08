export default function GearButton({ onClick }) {
  return (
    <button type="button" className="icon-btn" aria-label="Open settings menu" aria-haspopup="true" onClick={onClick}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
      </svg>
    </button>
  );
}
