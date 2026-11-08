// "2h ago" / "Yesterday" / "Nov 3" from an ISO date. Sample items pass a ready-made `time`.
function timeAgo(iso) {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'Yesterday';
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function NewsCard({ items }) {
  return (
    <ul className="news">
      {items.map((n) => {
        const when = n.time ?? timeAgo(n.publishedAt);
        return (
          <li key={n.id}>
            <span className="tag">{n.tag}</span>
            {n.url ? (
              <a href={n.url} target="_blank" rel="noopener noreferrer">
                {n.headline}
              </a>
            ) : (
              <a href="#" onClick={(e) => e.preventDefault()}>
                {n.headline}
              </a>
            )}
            <span className="meta">
              {n.source}
              {when && ` · ${when}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
