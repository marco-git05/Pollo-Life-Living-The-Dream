export default function TipsCard({ tips }) {
  return (
    <ul className="tips">
      {tips.map((t) => (
        <li key={t.id}>
          <strong>{t.title}</strong>
          <p>{t.body}</p>
          <div className="actions">
            {t.actions.map((a) => (
              <button key={a} type="button" className="action">
                {a}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
