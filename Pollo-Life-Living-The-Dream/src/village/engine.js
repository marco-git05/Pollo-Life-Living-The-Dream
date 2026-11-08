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

// ───────────── village art ─────────────
// Everything below is measured in background-image pixels (1920×352) and scaled to the canvas.
const BG = { url: '/sprites/village/background.webp', w: 1920, h: 352 };
// One plot per mailbox, left to right, with the matching roof color.
const PLOTS = [
  { x: 165, url: '/sprites/village/house-blue.webp' },
  { x: 464, url: '/sprites/village/house-red.webp' },
  { x: 784, url: '/sprites/village/house-green.webp' },
  { x: 1165, url: '/sprites/village/house-purple.webp' },
  { x: 1427, url: '/sprites/village/house-orange.webp' },
];
const HOUSE = { w: 168, h: 160, scale: 0.8625, top: 36.4, door: 176 }; // sprite size, sprite→bg scale, top y, door y
const PATH_TOP = 266; // creatures' feet stay on/below the dirt path
const PATH_RIGHT = 1470; // the pond starts past here
const GRASS = { x: 0, y: 300, w: 480, h: 52 }; // plain grass strip, tiled below the image on tall canvases

// Preload so the first frame already has the art.
[BG.url, ...PLOTS.map((p) => p.url)].forEach(getSprite);

// ───────────── world ─────────────
export function createWorld() {
  return {
    w: 0,
    h: 0,
    groundTop: 0,
    s: 1, // background scale
    ox: 0,
    oy: 0,
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

  // Fit the background to the width. If the canvas is shorter, trim a little sky first, then grass.
  const sc = w / BG.w;
  world.s = sc;
  world.ox = 0;
  world.oy = h >= BG.h * sc ? 0 : Math.max(h - BG.h * sc, -30 * sc);
  world.groundTop = world.oy + PATH_TOP * sc;
  world.r = clamp(20 * sc, 10, 18);

  const X = (x) => world.ox + x * sc;
  const Y = (y) => world.oy + y * sc;

  // The first five creatures each get a plot; extras just roam.
  world.houses = world.agents.slice(0, PLOTS.length).map((a, i) => {
    const hw = HOUSE.w * HOUSE.scale * sc;
    const hh = HOUSE.h * HOUSE.scale * sc;
    return {
      id: a.id,
      name: a.name,
      url: PLOTS[i].url,
      x: X(PLOTS[i].x),
      top: Y(HOUSE.top),
      w: hw,
      h: hh,
      y: Y(HOUSE.top) + hh, // baseline, used for depth sorting
      doorY: Y(HOUSE.door),
    };
  });

  world.wanderLeft = 20;
  world.wanderRight = Math.max(world.wanderLeft + 10, Math.min(w - 20, X(PATH_RIGHT)));
  world.wanderTop = world.groundTop;
  world.wanderBottom = Math.max(h - world.r * 0.5 - 6, world.wanderTop + 10);

  world.agents.forEach((a, i) => {
    if (!a.placed) {
      const home = world.houses[i];
      a.x = a.spawnX != null ? a.spawnX * w : home ? home.x + rand(-30, 30) : rand(world.wanderLeft, world.wanderRight);
      a.y = rand(world.wanderTop, world.wanderBottom);
      a.placed = true;
    }
    a.x = clamp(a.x, world.wanderLeft, world.wanderRight);
    if (a.state !== 'goHome' && a.state !== 'inside') a.y = clamp(a.y, world.wanderTop, world.wanderBottom);
  });
}

function door(world, id) {
  const hs = world.houses.find((h) => h.id === id);
  return hs ? { x: hs.x, y: hs.doorY } : null;
}

export function updateWorld(world, dt, selectedId) {
  for (const a of world.agents) {
    // The selected creature pauses (and steps out of its house) so you can read its card.
    if (a.id === selectedId) {
      if (a.state === 'inside') {
        const d = door(world, a.id);
        if (d) a.x = d.x;
      }
      a.y = Math.max(a.y, world.wanderTop); // step back onto the path
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
          a.tx = rand(world.wanderLeft, world.wanderRight);
          a.ty = rand(world.wanderTop, world.wanderBottom);
        } else if (roll < 0.9 && door(world, a.id)) {
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
        a.y = world.wanderTop; // walk back down to the path
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
    if (px > h.x - h.w / 2 && px < h.x + h.w / 2 && py > h.top && py < h.y) return h.id;
  }
  return null;
}

// ───────────── drawing ─────────────

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function drawScenery(ctx, world) {
  const { w, h, s: sc, ox, oy } = world;
  const bg = getSprite(BG.url);
  if (!bg) {
    ctx.fillStyle = '#8fcf5a';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const bottom = oy + BG.h * sc;
  // Tall canvas: keep the meadow going below the picture.
  if (bottom < h) {
    const tw = GRASS.w * sc;
    const th = GRASS.h * sc;
    for (let y = Math.floor(bottom) - 1; y < h; y += th - 1) {
      for (let x = 0; x < w; x += tw - 1) {
        ctx.drawImage(bg, GRASS.x, GRASS.y, GRASS.w, GRASS.h, x, y, tw, th);
      }
    }
  }
  ctx.drawImage(bg, ox, oy, BG.w * sc, BG.h * sc);
  ctx.restore();
}

function drawHouse(ctx, house, highlight, t) {
  const img = getSprite(house.url);
  if (!img) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, house.x - house.w / 2, house.top, house.w, house.h);
  ctx.restore();

  if (highlight) {
    // little bouncing marker over the selected creature's roof
    const my = house.top - 4 - Math.abs(Math.sin(t * 3)) * 4;
    ctx.fillStyle = '#ffe066';
    ctx.strokeStyle = UMBER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(house.x - 7, my - 10);
    ctx.lineTo(house.x + 7, my - 10);
    ctx.lineTo(house.x, my);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
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
  drawScenery(ctx, world);

  const items = [
    ...world.houses.map((hs) => ({ y: hs.y, draw: () => drawHouse(ctx, hs, hs.id === selectedId, time) })),
    ...world.agents
      .filter((a) => a.state !== 'inside')
      .map((a) => ({
        y: a.y,
        draw: () => drawAgent(ctx, world, a, { selected: a.id === selectedId, hovered: a.id === hoveredId, t: time }),
      })),
  ].sort((p, q) => p.y - q.y);

  items.forEach((it) => it.draw());
}
