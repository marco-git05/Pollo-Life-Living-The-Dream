import { useEffect, useRef } from 'react';
import { createWorld, layoutWorld, updateWorld, drawWorld, hitTest } from './engine';

const MOOD_LABEL = { happy: 'Thriving', neutral: 'Steady', worried: 'Needs attention' };

export default function Village({ creatures, selectedId, onSelect }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  const selectedRef = useRef(selectedId);
  const hoverRef = useRef(null);

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const world = createWorld(creatures);
    worldRef.current = world;

    const resize = () => {
      const { width, height } = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layoutWorld(world, width, height);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    let raf;
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      updateWorld(world, dt, selectedRef.current);
      drawWorld(ctx, world, {
        selectedId: selectedRef.current,
        hoveredId: hoverRef.current,
        time: now / 1000,
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [creatures]);

  const pointer = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return hitTest(worldRef.current, e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMove = (e) => {
    const id = pointer(e);
    hoverRef.current = id;
    canvasRef.current.style.cursor = id ? 'pointer' : 'default';
  };

  const handleClick = (e) => {
    const id = pointer(e);
    onSelect(id && id !== selectedId ? id : null);
  };

  const selected = creatures.find((c) => c.id === selectedId);

  return (
    <section className="village" ref={wrapRef} aria-label="Village">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMove}
        onMouseLeave={() => {
          hoverRef.current = null;
        }}
        onClick={handleClick}
      />

      <nav className="village-menu" aria-label="Creatures">
        {creatures.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip ${c.id === selectedId ? 'on' : ''}`}
            onClick={() => onSelect(c.id === selectedId ? null : c.id)}
          >
            <span className={`chip-shape ${c.shape}`} style={{ background: c.color }} />
            {c.name}
          </button>
        ))}
      </nav>

      {selected && (
        <aside className="creature-card">
          <button type="button" className="close" onClick={() => onSelect(null)} aria-label="Close">
            ×
          </button>
          <div className="cc-head">
            <span className={`chip-shape big ${selected.shape}`} style={{ background: selected.color }} />
            <div>
              <strong>{selected.name}</strong>
              <span className="cc-kind">{selected.kind}</span>
            </div>
          </div>
          <div className="cc-amount">{selected.amount}</div>
          <div className={`badge ${selected.mood === 'happy' ? 'good' : selected.mood === 'worried' ? 'warn' : 'ok'}`}>
            {MOOD_LABEL[selected.mood]}
          </div>
          <p>{selected.note}</p>
        </aside>
      )}
    </section>
  );
}
