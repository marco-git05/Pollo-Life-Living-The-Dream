export default function NewsCard({ items }) {
  return (
    <ul className="news">
      {items.map((n) => (
        <li key={n.id}>
          <span className="tag">{n.tag}</span>
          <a href="#" onClick={(e) => e.preventDefault()}>
            {n.headline}
          </a>
          <span className="meta">
            {n.source} · {n.time}
          </span>
        </li>
      ))}
    </ul>
  );
}
