const UMBER = '#4b3a2c';
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ───────────── sprites ─────────────
const sprites = new Map();

function getSprite(url) {
  if (!url) return null;
  let s = sprites.get(url);
  if (!s) {
    const img = new Image();
    s = { img, ok: false };
    img.onload = () => {
      s.ok = true;
    };
    img.onerror = () => {
      s.ok = false; // missing file: keep drawing the shape
    };
    img.src = url;
    sprites.set(url, s);
  }
  return s.ok ? s.img : null;
}

// ───────────── world ─────────────
export function createWorld() {
  return {
    w: 0,
    h: 0,
    groundTop: 0,
    size: 44,
    r: 12,
    wanderTop: 0,
    wanderBottom: 0,
    houses: [],
    agents: [],
  };
}

// Add / remove / update agents to match the creature list WITHOUT resetting the ones that already exist.
export function syncWorld(world, creatures) {
  const prev = new Map(world.agents.map((a) => [a.id, a]));
  world.agents = creatures.map((c) => {
    const a =
      prev.get(c.id) ?? {
        id: c.id,
        x: 0,
        y: 0,
        tx: 0,
        ty: 0,
        dir: 1,
        state: 'idle', // idle | walk | goHome | inside
        timer: rand(0.2, 2),
        speed: rand(24, 38),
        phase: rand(0, 6.28),
        placed: false,
        spawnX: c.positionX,
      };
    a.name = c.name;
    a.shape = c.shape;
    a.color = c.color;
    a.sprite = c.sprite;
    a.mood = c.mood;
    return a;
  });
  if (world.w) layoutWorld(world, world.w, world.h);
}

export function layoutWorld(world, w, h) {
  world.w = w;
  world.h = h;
  world.groundTop = h * 0.4;
  world.r = clamp(h * 0.06, 11, 16);

  const n = world.agents.length;
  const margin = Math.min(70, w * 0.07);
  const right = w - margin - Math.min(110, w * 0.12); // leave room for the pond
  const span = n ? (right - margin) / n : 0;

  world.size = clamp(h * 0.17, 38, 58); // house width
  if (n) world.size = Math.min(world.size, Math.max(30, span * 0.9));

  world.houses = world.agents.map((a, i) => ({
    id: a.id,
    color: a.color,
    name: a.name,
    x: margin + span * (i + 0.5),
    y: world.groundTop + world.size * 0.85 + (i % 2) * 10, // baseline
  }));

  const lowestHouse = n ? Math.max(...world.houses.map((hs) => hs.y)) : world.groundTop + world.size;
  world.wanderTop = lowestHouse + world.r * 2 + 6;
  world.wanderBottom = Math.max(h - world.r - 8, world.wanderTop + 10);

  world.agents.forEach((a, i) => {
    if (!a.placed) {
      a.x = a.spawnX != null ? clamp(a.spawnX * w, 20, w - 20) : world.houses[i].x + rand(-30, 30);
      a.y = rand(world.wanderTop, world.wanderBottom);
      a.placed = true;
    } else {
      a.x = clamp(a.x, 16, w - 16);
      a.y = clamp(a.y, world.wanderTop, world.wanderBottom);
    }
  });
}

function door(world, id) {
  const hs = world.houses.find((h) => h.id === id);
  return hs ? { x: hs.x, y: hs.y + 4 } : { x: world.w / 2, y: world.wanderTop };
}

export function updateWorld(world, dt, selectedId) {
  for (const a of world.agents) {
    // The selected creature pauses (and steps out of its house) so you can read its card.
    if (a.id === selectedId) {
      if (a.state === 'inside') {
        const d = door(world, a.id);
        a.x = d.x;
        a.y = d.y + world.r;
      }
      a.state = 'idle';
      a.timer = 0.6;
      continue;
    }

    if (a.state === 'idle') {
      a.timer -= dt;
      if (a.timer <= 0) {
        const roll = Math.random();
        if (roll < 0.7) {
          a.state = 'walk';
          a.tx = rand(20, world.w - 20);
          a.ty = rand(world.wanderTop, world.wanderBottom);
        } else if (roll < 0.9) {
          a.state = 'goHome';
          const d = door(world, a.id);
          a.tx = d.x;
          a.ty = d.y;
        } else {
          a.timer = rand(0.8, 2.5);
        }
      }
    } else if (a.state === 'walk' || a.state === 'goHome') {
      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const dist = Math.hypot(dx, dy);
      const step = a.speed * dt;
      a.phase += dt * 9;
      if (Math.abs(dx) > 1) a.dir = dx > 0 ? 1 : -1;
      if (dist <= step) {
        a.x = a.tx;
        a.y = a.ty;
        if (a.state === 'goHome') {
          a.state = 'inside';
          a.timer = rand(2, 5);
        } else {
          a.state = 'idle';
          a.timer = rand(0.6, 3);
        }
      } else {
        a.x += (dx / dist) * step;
        a.y += (dy / dist) * step;
      }
    } else if (a.state === 'inside') {
      a.timer -= dt;
      if (a.timer <= 0) {
        a.y += world.r + 2; // step out in front of the door
        a.state = 'idle';
        a.timer = rand(0.4, 1.5);
      }
    }
  }
}

export function hitTest(world, px, py) {
  let best = null;
  let bestD = Infinity;
  for (const a of world.agents) {
    if (a.state === 'inside') continue;
    const d = Math.hypot(px - a.x, py - (a.y - world.r * 1.2));
    if (d < world.r * 1.4 + 6 && d < bestD) {
      best = a.id;
      bestD = d;
    }
  }
  if (best) return best;
  for (const h of world.houses) {
    const s = world.size;
    if (px > h.x - s / 2 && px < h.x + s / 2 && py > h.y - s * 1.0 && py < h.y) return h.id;
  }
  return null;
}

// ───────────── drawing ─────────────

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function drawScenery(ctx, world, t) {
  const { w, h, groundTop } = world;

  const sky = ctx.createLinearGradient(0, 0, 0, groundTop);
  sky.addColorStop(0, '#efebce');
  sky.addColorStop(1, '#e6dfae');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, groundTop + 2);

  // sun
  ctx.fillStyle = '#e9c9a0';
  ctx.beginPath();
  ctx.arc(w * 0.88, groundTop * 0.42, Math.min(26, groundTop * 0.28), 0, Math.PI * 2);
  ctx.fill();

  // clouds drifting
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 3; i++) {
    const cx = ((t * (6 + i * 3) + i * w * 0.38) % (w + 120)) - 60;
    const cy = groundTop * (0.25 + i * 0.2);
    ctx.beginPath();
    ctx.ellipse(cx, cy, 34, 11, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 18, cy - 7, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ground
  ctx.fillStyle = '#a3a380';
  ctx.fillRect(0, groundTop, w, h - groundTop);
  ctx.fillStyle = '#b1b18d';
  for (let i = 0; i < 14; i++) {
    const gx = (i * 97.3) % w;
    const gy = groundTop + 20 + ((i * 53.7) % Math.max(10, h - groundTop - 30));
    ctx.fillRect(gx, gy, 18, 3);
  }
  ctx.fillStyle = UMBER;
  ctx.fillRect(0, groundTop, w, 3);

  // pond (bottom right, like the sketch)
  const px = w - Math.min(70, w * 0.09);
  const py = h * 0.78;
  ctx.fillStyle = '#9db5a5';
  ctx.strokeStyle = UMBER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(px, py, 48, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(px - 8 + Math.sin(t) * 3, py, 6, 0.2, 2.6);
  ctx.stroke();
}

function drawTree(ctx, x, baseY, s) {
  ctx.fillStyle = UMBER;
  ctx.fillRect(x - 3, baseY - s * 0.5, 6, s * 0.5);
  ctx.fillStyle = '#7f8a5a';
  ctx.strokeStyle = UMBER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, baseY - s * 0.7, s * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawHouse(ctx, world, house, highlight) {
  const s = world.size;
  const { x, y } = house;
  const bodyH = s * 0.62;

  ctx.strokeStyle = UMBER;
  ctx.lineWidth = 2;

  ctx.fillStyle = '#f6f2da';
  ctx.fillRect(x - s / 2, y - bodyH, s, bodyH);
  ctx.strokeRect(x - s / 2, y - bodyH, s, bodyH);

  // roof in the creature's color
  ctx.fillStyle = house.color;
  ctx.beginPath();
  ctx.moveTo(x - s / 2 - 5, y - bodyH);
  ctx.lineTo(x, y - bodyH - s * 0.4);
  ctx.lineTo(x + s / 2 + 5, y - bodyH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // door
  ctx.fillStyle = UMBER;
  ctx.fillRect(x - s * 0.1, y - bodyH * 0.55, s * 0.2, bodyH * 0.55);
  // window
  ctx.fillStyle = '#e9c9a0';
  ctx.fillRect(x + s * 0.22, y - bodyH * 0.8, s * 0.16, s * 0.16);
  ctx.strokeRect(x + s * 0.22, y - bodyH * 0.8, s * 0.16, s * 0.16);

  if (highlight) {
    ctx.strokeStyle = '#d8a48f';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - s / 2 - 4, y - bodyH - s * 0.4, s + 8, bodyH + s * 0.4 + 3);
  }
}

function drawBody(ctx, shape, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = UMBER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  switch (shape) {
    case 'square':
      rr(ctx, cx - r, cy - r, r * 2, r * 2, 4);
      break;
    case 'triangle':
      ctx.moveTo(cx, cy - r * 1.15);
      ctx.lineTo(cx + r * 1.1, cy + r * 0.85);
      ctx.lineTo(cx - r * 1.1, cy + r * 0.85);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(cx, cy - r * 1.2);
      ctx.lineTo(cx + r * 1.05, cy);
      ctx.lineTo(cx, cy + r * 1.1);
      ctx.lineTo(cx - r * 1.05, cy);
      ctx.closePath();
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i;
        const px = cx + Math.cos(ang) * r * 1.1;
        const py = cy + Math.sin(ang) * r * 1.1;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'pill':
      rr(ctx, cx - r * 0.85, cy - r * 1.15, r * 1.7, r * 2.3, r * 0.85);
      break;
    default:
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
}

function drawFace(ctx, a, cx, cy, r, look) {
  ctx.fillStyle = UMBER;
  ctx.beginPath();
  ctx.arc(cx - r * 0.36 + look, cy - r * 0.12, 1.8, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.36 + look, cy - r * 0.12, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = UMBER;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (a.mood === 'happy') {
    ctx.arc(cx + look, cy + r * 0.1, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
  } else if (a.mood === 'worried' || a.mood === 'sad') {
    ctx.arc(cx + look, cy + r * 0.5, r * 0.28, 1.15 * Math.PI, 1.85 * Math.PI);
  } else {
    ctx.moveTo(cx - r * 0.25 + look, cy + r * 0.3);
    ctx.lineTo(cx + r * 0.25 + look, cy + r * 0.3);
  }
  ctx.stroke();

  if (a.mood === 'sad') {
    ctx.fillStyle = '#9db5a5';
    ctx.beginPath();
    ctx.arc(cx + r * 0.5 + look, cy + r * 0.15, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAgent(ctx, world, a, { selected, hovered, t }) {
  const r = world.r;
  const walking = a.state === 'walk' || a.state === 'goHome';
  const bob = walking ? Math.abs(Math.sin(a.phase)) * 3 : Math.sin(t * 2 + a.phase) * 0.8;
  const cx = a.x;
  const sprite = getSprite(a.sprite);

  // shadow
  ctx.fillStyle = 'rgba(75,58,44,0.25)';
  ctx.beginPath();
  ctx.ellipse(a.x, a.y, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (selected) {
    ctx.strokeStyle = '#efebce';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(a.x, a.y, r * 1.5 + Math.sin(t * 4) * 1.5, r * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  let headY;
  if (sprite) {
    const hh = r * 3.2;
    const ww = hh * (sprite.naturalWidth / sprite.naturalHeight);
    ctx.save();
    ctx.imageSmoothingEnabled = false; // keep pixel art crisp
    if (a.dir < 0) {
      ctx.translate(cx, 0);
      ctx.scale(-1, 1);
      ctx.translate(-cx, 0);
    }
    ctx.drawImage(sprite, cx - ww / 2, a.y - hh - bob, ww, hh);
    ctx.restore();
    headY = a.y - hh - bob;
  } else {
    const cy = a.y - r - bob;
    drawBody(ctx, a.shape, cx, cy, r, a.color);
    drawFace(ctx, a, cx, cy, r, selected ? 0 : a.dir * 1.5);
    headY = cy - r * 1.3;
  }

  const worried = a.mood === 'worried' || a.mood === 'sad';
  if (worried) {
    ctx.fillStyle = '#bb8588';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', cx, headY - 2 - Math.abs(Math.sin(t * 3 + a.phase)) * 3);
  }

  if (selected || hovered) {
    ctx.font = '600 11px system-ui, sans-serif';
    const tw = ctx.measureText(a.name).width + 12;
    const ty = headY - 22 - (worried ? 8 : 0);
    ctx.fillStyle = '#f8f5e1';
    ctx.strokeStyle = UMBER;
    ctx.lineWidth = 1.5;
    rr(ctx, cx - tw / 2, ty, tw, 17, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = UMBER;
    ctx.textAlign = 'center';
    ctx.fillText(a.name, cx, ty + 12);
  }
}

export function drawWorld(ctx, world, { selectedId, hoveredId, time }) {
  const { w, h } = world;
  ctx.clearRect(0, 0, w, h);
  drawScenery(ctx, world, time);

  // trees between houses
  for (let i = 0; i < world.houses.length - 1; i += 2) {
    const a = world.houses[i];
    const b = world.houses[i + 1];
    drawTree(ctx, (a.x + b.x) / 2, Math.min(a.y, b.y) + 2, world.size * 0.95);
  }

  const items = [
    ...world.houses.map((hs) => ({ y: hs.y, draw: () => drawHouse(ctx, world, hs, hs.id === selectedId) })),
    ...world.agents
      .filter((a) => a.state !== 'inside')
      .map((a) => ({
        y: a.y,
        draw: () => drawAgent(ctx, world, a, { selected: a.id === selectedId, hovered: a.id === hoveredId, t: time }),
      })),
  ].sort((p, q) => p.y - q.y);

  items.forEach((it) => it.draw());
}
