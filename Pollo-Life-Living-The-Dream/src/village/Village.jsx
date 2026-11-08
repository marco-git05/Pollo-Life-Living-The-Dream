import { useEffect, useRef, useState } from 'react';
import { createWorld, layoutWorld, updateWorld, drawWorld, hitTest, syncWorld } from './engine';

// Pixel-art sprite when the file exists, otherwise the placeholder shape.
function ChipIcon({ creature }) {
  const [failed, setFailed] = useState(false);
  if (creature.sprite && !failed) {
    return <img className="chip-sprite" src={creature.sprite} alt="" onError={() => setFailed(true)} />;
  }
  return <span className={`chip-shape ${creature.shape}`} style={{ background: creature.color }} />;
}

// `creatures` are village view models (see creatures/viewModel.js): { id, name, shape, color, sprite, mood }.
// Pressing a chip opens a small Edit / Delete menu; clicking a creature in the scene opens its ID card directly.
// `children` is rendered on top of the village.
export default function Village({ creatures, selectedId, onSelect, onDelete, onAdd, children }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  const selectedRef = useRef(selectedId);
  const hoverRef = useRef(null);
  const [menuId, setMenuId] = useState(null);

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  // One world for the lifetime of the component.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const world = createWorld();
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
  }, []);

  // Creatures added / removed / changed: update the world without resetting everyone's position.
  useEffect(() => {
    if (worldRef.current) syncWorld(worldRef.current, creatures);
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
    setMenuId(null);
    onSelect(id && id !== selectedId ? id : null);
  };

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
          <div key={c.id} className="chip-wrap">
            <button
              type="button"
              className={`chip ${c.id === selectedId || c.id === menuId ? 'on' : ''}`}
              aria-expanded={c.id === menuId}
              onClick={() => setMenuId(c.id === menuId ? null : c.id)}
            >
              <ChipIcon creature={c} />
              {c.name}
            </button>
            {c.id === menuId && (
              <div className="chip-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuId(null);
                    onSelect(c.id);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="danger"
                  onClick={() => {
                    setMenuId(null);
                    onDelete?.(c.id);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
        <button type="button" className="chip add" onClick={onAdd}>
          + Add creature
        </button>
      </nav>

      {creatures.length === 0 && (
        <p className="village-empty">Your village is empty. Add a creature or scan a card to move one in.</p>
      )}

      {children}
    </section>
  );
}
