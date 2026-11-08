export default function Card({ title, area, right, children }) {
  return (
    <section className="card" style={{ gridArea: area }}>
      <header className="card-head">
        <h2>{title}</h2>
        {right}
      </header>
      <div className="card-body">{children}</div>
    </section>
  );
}
