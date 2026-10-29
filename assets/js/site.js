// Shared motion for every page: arrival cascade, header progress, CRT wordmarks,
// pixel canvases (transit network, LED sign, packing, descent) and page widgets.

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const css = getComputedStyle(root);
const color = (name) => css.getPropertyValue(name).trim();

const palette = {
  paper: color('--paper'),
  paper2: color('--paper-2'),
  ink: color('--ink'),
  muted: color('--muted'),
  rule: color('--rule'),
  ruleStrong: color('--rule-strong'),
  blue: color('--blue'),
  blueInk: color('--blue-ink'),
  blueSoft: color('--blue-soft'),
  blueWash: color('--blue-wash'),
};

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// Run `frame(t, dt)` only while `el` is on screen and the tab is visible.
function visibleLoop(el, frame) {
  let raf = 0;
  let running = false;
  let onScreen = false;
  let last = 0;
  let t = 0;
  const tick = (now) => {
    const dt = Math.min(250, now - last);
    last = now;
    t += dt;
    frame(t, dt);
    raf = requestAnimationFrame(tick);
  };
  const sync = () => {
    const want = onScreen && !document.hidden;
    if (want && !running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    } else if (!want && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  };
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  }).observe(el);
  document.addEventListener('visibilitychange', sync);
}

// Size a canvas to its CSS box at device pixel ratio; returns the 2D context.
function fitCanvas(canvas, width, height) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/* ---------- Header scroll progress ----------------------------------- */

function initProgress() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    header.style.setProperty('--progress', max > 0 ? (scrollY / max).toFixed(4) : 0);
  };
  addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

/* ---------- Arrival: blur-fade-up in a cascade ------------------------ */

function initArrival() {
  const items = document.querySelectorAll('[data-arrive]');
  if (reduced) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    const entering = entries.filter((e) => e.isIntersecting).map((e) => e.target);
    entering
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
      .forEach((el, i) => {
        el.style.setProperty('--arrive-delay', `${Math.min(i, 6) * 90}ms`);
        el.classList.add('is-in');
        io.unobserve(el);
      });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  items.forEach((el) => io.observe(el));
}

/* ---------- Wordmarks: CRT power-on and tear glitch ------------------- */

const BEAM = [
  { opacity: 0, transform: 'scaleX(0.03)' },
  { opacity: 1, transform: 'scaleX(0.03)', offset: 0.04, easing: 'cubic-bezier(.45,0,.2,1)' },
  { opacity: 1, transform: 'scaleX(1)', offset: 0.14, easing: 'steps(1, end)' },
  { opacity: 0.5, transform: 'scaleX(1)', offset: 0.16, easing: 'steps(1, end)' },
  { opacity: 1, transform: 'scaleX(1)', offset: 0.2, easing: 'ease-in' },
  { opacity: 0, transform: 'scaleX(1) scaleY(3)', offset: 0.3 },
  { opacity: 0, transform: 'scaleX(1) scaleY(3)' },
];

const FACE = [
  [0, 'scaleY(0.02)', 1.5, 0],
  [0, 'scaleY(0.02)', 1.5, 0.2],
  [1, 'scaleY(0.02)', 1.5, 0.21, 'cubic-bezier(.2,.9,.3,1)'],
  [1, 'scaleY(1.12)', 0.8, 0.32, 'ease-in-out'],
  [1, 'scaleY(0.96)', 0.6, 0.38, 'ease-out'],
  [1, 'none', 0.5, 0.46],
  [1, 'none', 0.2, 0.6, 'steps(1, end)'],
  [1, 'translateX(1px)', 0, 0.62, 'steps(1, end)'],
  [1, 'none', 0, 0.66],
  [0.6, 'none', 0, 0.8, 'steps(1, end)'],
  [1, 'none', 0, 1],
].map(([opacity, transform, blur, offset, easing]) => ({
  opacity, transform, filter: `blur(${blur}px)`, offset, ...(easing ? { easing } : {}),
}));

const ECHO = [
  { opacity: 0 },
  { opacity: 0, offset: 0.28 },
  { opacity: 0.4, offset: 0.34 },
  { opacity: 0.14, offset: 0.7 },
  { opacity: 0.14 },
];

function initWordmark(mark) {
  const glyphs = mark.querySelector('.wm-glyphs');
  const face = glyphs?.querySelector('.wm-face');
  const echo = glyphs?.querySelector('.wm-echo');
  if (!face || !echo) return;

  const bands = [0, 1].map(() => {
    const band = document.createElement('span');
    band.className = 'wm-band';
    band.setAttribute('aria-hidden', 'true');
    band.textContent = face.textContent;
    glyphs.append(band);
    return band;
  });
  const beam = document.createElement('span');
  beam.className = 'wm-beam';
  beam.setAttribute('aria-hidden', 'true');
  glyphs.append(beam);

  const pct = (v) => `${(v * 100).toFixed(1)}%`;

  const tearFrame = (strength) => {
    const cuts = [];
    const count = Math.random() < 0.2 ? 1 : Math.round(rand(1, 2.4));
    for (let tries = 0; cuts.length < count && tries < 12; tries++) {
      const h = rand(0.05, 0.13) * 0.55;
      const top = 0.24 + Math.random() * (0.55 - h);
      if (!cuts.some(([a, b]) => top < b + 0.02 && top + h > a - 0.02)) cuts.push([top, top + h]);
    }
    cuts.sort((a, b) => a[0] - b[0]);
    const stops = cuts.flatMap(([a, b]) => [`#000 ${pct(a)}`, `transparent ${pct(a)}`, `transparent ${pct(b)}`, `#000 ${pct(b)}`]);
    const mask = stops.length ? `linear-gradient(to bottom, ${stops.join(', ')})` : '';
    face.style.maskImage = mask;
    face.style.webkitMaskImage = mask;
    bands.forEach((band, i) => {
      const cut = cuts[i];
      band.toggleAttribute('data-torn', !!cut);
      if (!cut) return;
      const shift = rand(2, 6) * strength * (Math.random() < 0.5 ? -1 : 1);
      band.style.clipPath = `inset(${pct(cut[0])} -40px ${pct(1 - cut[1])} -40px)`;
      band.style.transform = `translateX(${shift.toFixed(1)}px)`;
    });
    echo.style.transform = `translateX(${(rand(1, 3) * strength).toFixed(1)}px)`;
  };

  const clearTear = () => {
    face.style.maskImage = '';
    face.style.webkitMaskImage = '';
    bands.forEach((band) => band.removeAttribute('data-torn'));
    echo.style.transform = '';
  };

  let bursting = false;
  const burst = (strength = 1) => {
    if (reduced || bursting || !mark.classList.contains('is-on')) return;
    bursting = true;
    const frames = [0, 55, 110, 190];
    frames.forEach((at) => setTimeout(() => tearFrame(strength), at));
    setTimeout(() => {
      clearTear();
      bursting = false;
    }, 260);
  };

  const powerOn = () => {
    mark.classList.add('is-on');
    if (reduced || !face.animate) return;
    const timing = { duration: 1500, fill: 'both' };
    beam.animate(BEAM, timing);
    face.animate(FACE, timing);
    echo.animate(ECHO, timing);
  };

  // Power on the first time the mark scrolls into view.
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    setTimeout(powerOn, 120);
  }, { threshold: 0.5 });
  io.observe(mark);

  // Tear while the surrounding project is hovered, plus a rare idle flicker.
  const host = mark.closest('[data-project]') ?? mark;
  let hoverTimer = 0;
  const hoverLoop = () => {
    burst(1);
    hoverTimer = setTimeout(hoverLoop, rand(1200, 2200));
  };
  host.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    clearTimeout(hoverTimer);
    hoverLoop();
  });
  host.addEventListener('pointerleave', () => clearTimeout(hoverTimer));

  const idle = () => {
    setTimeout(() => {
      const box = mark.getBoundingClientRect();
      if (box.bottom > 0 && box.top < innerHeight && !document.hidden) burst(0.6);
      idle();
    }, rand(6000, 14000));
  };
  idle();
}

/* ---------- Pixel transit network ------------------------------------- */

const ROUTES = [
  [[0.04, 0.18], [0.34, 0.18], [0.52, 0.38], [0.96, 0.38]],
  [[0.2, 0.03], [0.2, 0.56], [0.44, 0.8], [0.92, 0.8]],
  [[0.03, 0.66], [0.3, 0.66], [0.5, 0.46], [0.72, 0.46], [0.72, 0.97]],
  [[0.62, 0.04], [0.62, 0.28], [0.86, 0.52], [0.86, 0.95]],
  [[0.1, 0.93], [0.36, 0.93], [0.36, 0.3], [0.5, 0.12], [0.9, 0.12]],
];

function rasterLine(x0, y0, x1, y1) {
  const cells = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    cells.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return cells;
}

function initTransit(canvas) {
  const pitch = Number(canvas.dataset.pitch) || 6;
  const routeTones = [palette.blueSoft, '#b9c4d4', '#a7b8d2', '#c3cbd6', '#98abc9'];
  let w = 0, h = 0, cols = 0, rows = 0, ctx;
  let base = [];
  let routes = [];
  let buses = [];
  let pulses = [];
  let revealAt = [];
  let cache;
  let probe = null;
  const revealing = canvas.hasAttribute('data-reveal') && root.classList.contains('opening') && !reduced;
  let revealStart = performance.now();

  const build = () => {
    const box = canvas.getBoundingClientRect();
    w = box.width;
    h = box.height;
    if (!w || !h) return;
    ctx = fitCanvas(canvas, w, h);
    cols = Math.floor(w / pitch);
    rows = Math.floor(h / pitch);
    base = new Array(cols * rows).fill(null);

    // City blocks: soft rectangles of slightly darker cells.
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let b = 0; b < Math.round(cols * rows / 140); b++) {
      const bw = 2 + Math.floor(rnd() * 6);
      const bh = 2 + Math.floor(rnd() * 5);
      const bx = Math.floor(rnd() * (cols - bw));
      const by = Math.floor(rnd() * (rows - bh));
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) base[y * cols + x] = '#e3e1da';
    }

    routes = ROUTES.map((points, r) => {
      const pts = points.map(([px, py]) => [Math.round(px * (cols - 1)), Math.round(py * (rows - 1))]);
      const path = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const seg = rasterLine(...pts[i], ...pts[i + 1]);
        path.push(...(i ? seg.slice(1) : seg));
      }
      path.forEach(([x, y]) => (base[y * cols + x] = routeTones[r]));
      const stops = new Set([0, path.length - 1]);
      for (let i = 9; i < path.length - 4; i += 11 + (r % 3) * 2) stops.add(i);
      stops.forEach((i) => {
        const [x, y] = path[i];
        base[y * cols + x] = palette.ink;
      });
      return { path, stops };
    });

    buses = routes.flatMap((route, r) =>
      [0, 1].map((k) => ({
        route: r,
        s: ((k + 0.5) / 2) * route.path.length + rand(-3, 3),
        dir: k ? -1 : 1,
        speed: rand(7, 11),
        dwell: 0,
        lastStop: -1,
      })),
    );

    revealAt = base.map((_, i) => {
      const x = i % cols;
      const y = Math.floor(i / cols);
      return ((x + (rows - y)) / (cols + rows)) * 700 + Math.random() * 380;
    });

    cache = document.createElement('canvas');
    cache.width = canvas.width;
    cache.height = canvas.height;
    const c = cache.getContext('2d');
    c.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
    drawCells(c, () => 1);
  };

  const cellSize = pitch - 2;
  const ox = () => (w - cols * pitch) / 2 + 1;
  const oy = () => (h - rows * pitch) / 2 + 1;

  function drawCells(c, alphaFor) {
    c.fillStyle = palette.paper2;
    c.fillRect(0, 0, w, h);
    const x0 = ox(), y0 = oy();
    for (let i = 0; i < base.length; i++) {
      const a = alphaFor(i);
      if (a <= 0) continue;
      const x = i % cols;
      const y = (i - x) / cols;
      c.globalAlpha = a;
      c.fillStyle = base[i] ?? '#e9e7e1';
      c.fillRect(x0 + x * pitch, y0 + y * pitch, cellSize, cellSize);
    }
    c.globalAlpha = 1;
  }

  const cell = (x, y, fill, alpha = 1) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.fillRect(ox() + x * pitch, oy() + y * pitch, cellSize, cellSize);
    ctx.globalAlpha = 1;
  };

  let nextPulse = 1800;

  const frame = (t, dt) => {
    if (!ctx) return;
    const sinceReveal = performance.now() - revealStart;
    if (revealing && sinceReveal < 1200) {
      drawCells(ctx, (i) => clamp((sinceReveal - revealAt[i]) / 120, 0, 1));
      for (let i = 0; i < base.length; i++) {
        const age = sinceReveal - revealAt[i];
        if (age > 0 && age < 140) cell(i % cols, Math.floor(i / cols), palette.blue, 1 - age / 140);
      }
      return;
    }
    ctx.drawImage(cache, 0, 0, w, h);

    // Pulses: a wave of light travelling along one route ("re-optimizing").
    if (t > nextPulse && !reduced) {
      pulses.push({ route: Math.floor(Math.random() * routes.length), at: 0 });
      nextPulse = t + rand(2600, 4200);
    }
    pulses = pulses.filter((p) => {
      p.at += dt * 0.07;
      const path = routes[p.route].path;
      for (let k = 0; k < 14; k++) {
        const i = Math.floor(p.at) - k;
        if (i < 0 || i >= path.length) continue;
        cell(path[i][0], path[i][1], palette.blue, (1 - k / 14) * 0.85);
      }
      return p.at - 14 < path.length;
    });

    // Buses with short trails; they dwell briefly at each stop.
    buses.forEach((bus) => {
      const route = routes[bus.route];
      const n = route.path.length;
      if (bus.dwell > 0) bus.dwell -= dt;
      else if (!reduced) bus.s += (bus.dir * bus.speed * dt) / 1000;
      if (bus.s >= n - 1) { bus.s = n - 1; bus.dir = -1; }
      if (bus.s <= 0) { bus.s = 0; bus.dir = 1; }
      const i = Math.round(bus.s);
      if (route.stops.has(i) && bus.lastStop !== i) {
        bus.lastStop = i;
        bus.dwell = 380;
      }
      for (let k = 4; k >= 1; k--) {
        const j = i - bus.dir * k;
        if (j >= 0 && j < n) cell(route.path[j][0], route.path[j][1], palette.blue, 0.5 - k * 0.1);
      }
      const [x, y] = route.path[i];
      cell(x, y, palette.blueInk);
    });

    // Pointer probe: light up nearby cells.
    if (probe) {
      const px = Math.floor((probe.x - ox()) / pitch);
      const py = Math.floor((probe.y - oy()) / pitch);
      for (let y = py - 4; y <= py + 4; y++) {
        for (let x = px - 4; x <= px + 4; x++) {
          const d = Math.hypot(x - px, y - py);
          if (d > 4.2) continue;
          const filled = base[y * cols + x];
          cell(x, y, filled && filled !== '#e3e1da' ? palette.blue : palette.blueSoft, (1 - d / 4.6) * 0.55);
        }
      }
    }
  };

  build();
  revealStart = performance.now();
  new ResizeObserver(() => {
    const box = canvas.getBoundingClientRect();
    if (Math.abs(box.width - w) > 1 || Math.abs(box.height - h) > 1) build();
  }).observe(canvas);

  canvas.addEventListener('pointermove', (e) => {
    const box = canvas.getBoundingClientRect();
    probe = { x: e.clientX - box.left, y: e.clientY - box.top };
  });
  canvas.addEventListener('pointerleave', () => (probe = null));

  if (reduced) {
    frame(0, 0);
    return;
  }
  visibleLoop(canvas, frame);
}

/* ---------- LED dot-matrix sign --------------------------------------- */

const FONT = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '111 010 010 010 010 010 111',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 10001 11001 10101 10011 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110',
  1: '010 110 010 010 010 010 111',
  2: '01110 10001 00001 00010 00100 01000 11111',
  3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010',
  5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110',
  7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110',
  9: '01110 10001 10001 01111 00001 00010 01100',
  ' ': '000 000 000 000 000 000 000',
  '·': '000 000 000 010 000 000 000',
  '+': '00000 00100 00100 11111 00100 00100 00000',
  '&': '01100 10010 10100 01000 10101 10010 01101',
};

function textColumns(text) {
  const columns = [];
  for (const ch of text.toUpperCase()) {
    const rowsOf = (FONT[ch] ?? FONT[' ']).split(' ');
    for (let x = 0; x < rowsOf[0].length; x++) columns.push(rowsOf.map((r) => r[x] === '1'));
    columns.push(new Array(7).fill(false));
  }
  return columns;
}

function initSign(canvas) {
  const message = textColumns(canvas.dataset.sign || 'HELLO · ');
  const cols = Number(canvas.dataset.cols) || 64;
  const rows = 11;
  let w = 0, h = 0, ctx, pitch = 0;

  // Spiral order: the board "writes itself on" from the outside in.
  const order = new Array(cols * rows);
  {
    let k = 0, left = 0, right = cols - 1, top = 0, bottom = rows - 1;
    const mark = (x, y) => (order[y * cols + x] = k++);
    while (left <= right && top <= bottom) {
      for (let x = left; x <= right; x++) mark(x, top);
      top++;
      for (let y = top; y <= bottom; y++) mark(right, y);
      right--;
      if (top <= bottom) { for (let x = right; x >= left; x--) mark(x, bottom); bottom--; }
      if (left <= right) { for (let y = bottom; y >= top; y--) mark(left, y); left++; }
    }
  }

  const build = () => {
    const box = canvas.getBoundingClientRect();
    w = box.width;
    pitch = w / cols;
    h = pitch * rows;
    canvas.style.height = `${h}px`;
    ctx = fitCanvas(canvas, w, h);
  };

  let started = -1;
  const frame = (t) => {
    if (!ctx) return;
    if (started < 0) started = t;
    const life = t - started;
    const written = reduced ? 1 : clamp(life / 1300, 0, 1);
    const scroll = reduced ? 0 : Math.max(0, Math.floor((life - 1500) / 75));
    const sweep = ((life / 2600) % 1.6) - 0.3;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#efeee9';
    ctx.beginPath();
    ctx.roundRect?.(0.5, 0.5, w - 1, h - 1, 4);
    ctx.fill();
    ctx.strokeStyle = palette.rule;
    ctx.stroke();

    const r = pitch * 0.34;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (order[y * cols + x] > written * order.length) continue;
        const gy = y - 2;
        const column = message[(x + scroll) % message.length];
        const lit = gy >= 0 && gy < 7 && column[gy];
        const cx = (x + 0.5) * pitch;
        const cy = (y + 0.5) * pitch;
        const glint = Math.abs(x / cols - sweep - (y / rows) * 0.18) < 0.05;
        if (lit) {
          ctx.fillStyle = palette.blueSoft;
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = glint ? palette.blueInk : palette.blue;
        } else {
          ctx.fillStyle = glint ? '#d3d8e0' : '#dfddd6';
        }
        ctx.beginPath();
        ctx.arc(cx, cy, lit && glint ? r * 1.12 : r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  build();
  new ResizeObserver(() => {
    if (Math.abs(canvas.getBoundingClientRect().width - w) > 1) build();
  }).observe(canvas);
  if (reduced) frame(0);
  else visibleLoop(canvas, frame);
}

/* ---------- Packing figure (isometric truck loading) ------------------ */

function initPacking(canvas) {
  const L = 10, W = 4, H = 4;
  const sizes = [[2, 2, 2], [2, 1, 1], [1, 1, 1], [3, 2, 1], [2, 2, 1], [1, 2, 2], [4, 2, 2], [2, 1, 2]];
  const tones = [
    ['#dde5f1', '#b9c8de', '#9fb3d1'],
    ['#ece7dc', '#d8d0bf', '#c6bca8'],
    ['#e4eaf3', '#a9bbd6', '#7f98bf'],
    ['#f1efe9', '#dcd8cf', '#c9c4b8'],
  ];
  const readout = canvas.closest('figure')?.querySelector('[data-readout]');
  let w = 0, h = 0, ctx, unit = 0, origin = [0, 0];
  let grid, boxes, falling, idleUntil, attempts;

  const reset = () => {
    grid = new Uint8Array(L * W * H);
    boxes = [];
    falling = null;
    attempts = 0;
    idleUntil = 0;
  };

  const occupied = (x, y, z) => grid[(z * W + y) * L + x];
  const fits = (x, y, z, [dx, dy, dz]) => {
    if (x + dx > L || y + dy > W || z + dz > H) return false;
    for (let k = z; k < z + dz; k++)
      for (let j = y; j < y + dy; j++)
        for (let i = x; i < x + dx; i++) if (occupied(i, j, k)) return false;
    if (z === 0) return true;
    let support = 0;
    for (let j = y; j < y + dy; j++) for (let i = x; i < x + dx; i++) support += occupied(i, j, z - 1);
    return support >= dx * dy * 0.75;
  };

  // Greedy "deepest-bottom-left" placement on a voxel grid — honest, always valid.
  const place = () => {
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    for (let z = 0; z < H; z++)
      for (let x = 0; x < L; x++)
        for (let y = 0; y < W; y++)
          if (fits(x, y, z, size)) {
            const [dx, dy, dz] = size;
            for (let k = z; k < z + dz; k++)
              for (let j = y; j < y + dy; j++)
                for (let i = x; i < x + dx; i++) grid[(k * W + j) * L + i] = 1;
            return { x, y, z, dx, dy, dz, tone: tones[Math.floor(Math.random() * tones.length)] };
          }
    return null;
  };

  const used = () => boxes.reduce((s, b) => s + b.dx * b.dy * b.dz, 0) / (L * W * H);

  const build = () => {
    const box = canvas.getBoundingClientRect();
    w = box.width;
    h = w * 0.56;
    canvas.style.height = `${h}px`;
    ctx = fitCanvas(canvas, w, h);
    const span = H + (L + W) / 2;
    unit = Math.min(w / ((L + W) * Math.cos(Math.PI / 6) + 2.4), h / (span + 1.6));
    origin = [w / 2 - ((L - W) / 2) * Math.cos(Math.PI / 6) * unit, (h - span * unit) / 2 + H * unit];
  };

  const iso = (x, y, z) => [
    origin[0] + (x - y) * Math.cos(Math.PI / 6) * unit,
    origin[1] + (x + y) * Math.sin(Math.PI / 6) * unit - z * unit,
  ];

  const poly = (pts, fill, stroke) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  };

  const drawBox = ({ x, y, z, dx, dy, dz, tone }, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1;
    const edge = 'rgba(21,23,26,.28)';
    poly([iso(x, y, z + dz), iso(x + dx, y, z + dz), iso(x + dx, y + dy, z + dz), iso(x, y + dy, z + dz)], tone[0], edge);
    poly([iso(x, y + dy, z), iso(x + dx, y + dy, z), iso(x + dx, y + dy, z + dz), iso(x, y + dy, z + dz)], tone[1], edge);
    poly([iso(x + dx, y, z), iso(x + dx, y + dy, z), iso(x + dx, y + dy, z + dz), iso(x + dx, y, z + dz)], tone[2], edge);
    ctx.globalAlpha = 1;
  };

  const frame = (t) => {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    // Container: floor grid + back walls.
    ctx.lineWidth = 1;
    poly([iso(0, 0, 0), iso(L, 0, 0), iso(L, W, 0), iso(0, W, 0)], '#e9e7e0', palette.ruleStrong);
    ctx.strokeStyle = 'rgba(21,23,26,.07)';
    for (let i = 1; i < L; i++) { const a = iso(i, 0, 0), b = iso(i, W, 0); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
    for (let j = 1; j < W; j++) { const a = iso(0, j, 0), b = iso(L, j, 0); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
    poly([iso(0, 0, 0), iso(L, 0, 0), iso(L, 0, H), iso(0, 0, H)], 'rgba(255,255,255,.35)', palette.ruleStrong);
    poly([iso(0, 0, 0), iso(0, W, 0), iso(0, W, H), iso(0, 0, H)], 'rgba(255,255,255,.2)', palette.ruleStrong);

    const fade = idleUntil && t > idleUntil - 700 ? clamp((idleUntil - t) / 700, 0, 1) : 1;
    const all = falling ? [...boxes, falling] : boxes;
    [...all]
      .sort((a, b) => a.x + a.y + a.z - (b.x + b.y + b.z) || a.z - b.z)
      .forEach((b) => {
        if (b === falling) {
          const p = easeOut(clamp((t - b.start) / 520, 0, 1));
          drawBox({ ...b, z: b.z + (1 - p) * (H + 2 - b.z) }, p * fade);
        } else drawBox(b, fade);
      });

    // Front frame edges, drawn last so the truck reads as a volume.
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = palette.ruleStrong;
    [[iso(L, W, 0), iso(L, W, H)], [iso(0, W, H), iso(L, W, H)], [iso(L, 0, H), iso(L, W, H)]].forEach(([a, b]) => {
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
    });
    ctx.setLineDash([]);

    if (idleUntil) {
      if (t > idleUntil) reset();
      return;
    }
    if (falling && t - falling.start >= 520) {
      boxes.push(falling);
      falling = null;
    }
    if (!falling) {
      const next = place();
      if (next) {
        falling = { ...next, start: t + 140 };
        attempts = 0;
      } else if (++attempts > 6) {
        idleUntil = t + 2600;
      }
    }
    if (readout) readout.textContent = `${boxes.length} boxes · ${(used() * 100).toFixed(0)}% utilized`;
  };

  reset();
  build();
  new ResizeObserver(() => {
    if (Math.abs(canvas.getBoundingClientRect().width - w) > 1) build();
  }).observe(canvas);
  if (reduced) {
    for (let i = 0; i < 40; i++) { const b = place(); if (b) boxes.push(b); }
    frame(0);
    return;
  }
  visibleLoop(canvas, frame);
}

/* ---------- Descent figure (GD vs Adam on an ill-conditioned bowl) ---- */

function initDescent(canvas) {
  const a = 1, b = 14, theta = Math.PI / 7;
  const cos = Math.cos(theta), sin = Math.sin(theta);
  const toUV = (x, y) => [x * cos + y * sin, -x * sin + y * cos];
  const f = (x, y) => { const [u, v] = toUV(x, y); return 0.5 * (a * u * u + b * v * v); };
  const grad = (x, y) => {
    const [u, v] = toUV(x, y);
    const gu = a * u, gv = b * v;
    return [gu * cos - gv * sin, gu * sin + gv * cos];
  };
  const start = [-2.6, -0.5];

  const simulate = (step, n) => {
    const path = [start];
    let p = start;
    const state = {};
    for (let i = 0; i < n; i++) path.push((p = step(p, state, i + 1)));
    return path;
  };
  const gd = simulate(([x, y]) => { const [gx, gy] = grad(x, y); const lr = 0.125; return [x - lr * gx, y - lr * gy]; }, 60);
  const adam = simulate(([x, y], s, t) => {
    const g = grad(x, y);
    s.m ??= [0, 0]; s.v ??= [0, 0];
    const lr = 0.14, b1 = 0.9, b2 = 0.999;
    const out = [x, y];
    for (let k = 0; k < 2; k++) {
      s.m[k] = b1 * s.m[k] + (1 - b1) * g[k];
      s.v[k] = b2 * s.v[k] + (1 - b2) * g[k] * g[k];
      const mh = s.m[k] / (1 - b1 ** t), vh = s.v[k] / (1 - b2 ** t);
      out[k] -= (lr * mh) / (Math.sqrt(vh) + 1e-8);
    }
    return out;
  }, 60);

  const readout = canvas.closest('figure')?.querySelector('[data-readout]');
  let w = 0, h = 0, ctx, scale = 1;
  const build = () => {
    w = canvas.getBoundingClientRect().width;
    h = w * 0.5;
    canvas.style.height = `${h}px`;
    ctx = fitCanvas(canvas, w, h);
    scale = Math.min(w / 6.6, h / 3.4);
  };
  const px = ([x, y]) => [w / 2 + x * scale, h / 2 - y * scale];

  const drawPath = (path, upto, stroke, dot) => {
    const n = Math.floor(upto);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= n && i < path.length; i++) {
      const [x, y] = px(path[i]);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = dot;
    for (let i = 0; i <= n && i < path.length; i++) {
      const [x, y] = px(path[i]);
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
    const [hx, hy] = px(path[Math.min(n, path.length - 1)]);
    ctx.fillStyle = dot;
    ctx.fillRect(hx - 3.5, hy - 3.5, 7, 7);
  };

  const frame = (t) => {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-theta);
    for (let c = 1; c <= 13; c++) {
      const level = 0.04 * c * c;
      ctx.strokeStyle = c % 4 === 0 ? 'rgba(58,95,148,.32)' : 'rgba(58,95,148,.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.sqrt((2 * level) / a) * scale, Math.sqrt((2 * level) / b) * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    const cycle = reduced ? 1e9 : t % 9000;
    const steps = clamp((cycle - 400) / 110, 0, 60);
    drawPath(gd, steps, 'rgba(128,133,141,.65)', palette.muted);
    drawPath(adam, steps, palette.blue, palette.blueInk);

    const n = Math.floor(steps);
    if (readout) readout.textContent = `iter ${String(n).padStart(2, '0')} · GD ${f(...gd[n]).toFixed(3)} · Adam ${f(...adam[n]).toFixed(3)}`;
  };

  build();
  new ResizeObserver(() => {
    if (Math.abs(canvas.getBoundingClientRect().width - w) > 1) build();
  }).observe(canvas);
  if (reduced) frame(0);
  else visibleLoop(canvas, frame);
}

/* ---------- Publication thumbnails: one pixel motif per paper --------- */

// Each motif draws onto a cell grid: `cell(x, y, color, alpha)`, t in ms.
const THUMBS = {
  // Randomized Hadamard rotation: Sylvester sign pattern, random column sign
  // flips, and a sweeping row being "applied".
  hadamard({ cols, rows, cell, t, state }) {
    const n = 16;
    const z = Math.max(1, Math.floor(Math.min(cols, rows) / n));
    const ox = Math.floor((cols - n * z) / 2), oy = Math.floor((rows - n * z) / 2);
    const block = (x, y, fill) => {
      for (let j = 0; j < z; j++) for (let i = 0; i < z; i++) cell(ox + x * z + i, oy + y * z + j, fill);
    };
    const cycle = Math.floor(t / 4800);
    if (state.cycle !== cycle) {
      state.cycle = cycle;
      state.signs = Array.from({ length: n }, () => 1);
      state.flips = Array.from({ length: 5 }, (_, k) => ({ x: Math.floor(Math.random() * n), at: 600 + k * 650 }));
    }
    const local = t % 4800;
    state.flips.forEach((f) => {
      if (!f.done && local > f.at) { state.signs[f.x] *= -1; f.done = true; }
    });
    const sweep = Math.floor((local / 150) % (n + 6)) - 3;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let bits = x & y, parity = 0;
        while (bits) { parity ^= bits & 1; bits >>= 1; }
        const plus = (parity ? -1 : 1) * state.signs[x] > 0;
        const lit = y === sweep;
        const flash = state.flips.some((f) => f.x === x && local > f.at && local - f.at < 350);
        if (plus) block(x, y, lit || flash ? palette.blueInk : palette.blueSoft);
        else block(x, y, lit || flash ? palette.blueWash : '#e3e1da');
      }
    }
  },

  // A monotone score map slides the operating point along a fixed ROC curve;
  // only a feature map lifts the curve itself.
  roc({ cols, rows, cell, t }) {
    const x0 = 2, y0 = rows - 3, w = cols - 4, h = rows - 5;
    for (let x = 0; x <= w; x++) cell(x0 + x, y0 + 1, palette.ruleStrong);
    for (let y = 0; y <= h; y++) cell(x0 - 1, y0 - y, palette.ruleStrong);
    for (let i = 0; i <= w; i += 2) cell(x0 + i, Math.round(y0 - (i / w) * h), palette.rule);
    const lift = (Math.sin(t / 1400) + 1) / 2;
    const curve = (u, k) => 1 - Math.pow(1 - u, k);
    for (let x = 0; x <= w; x++) {
      const u = x / w;
      cell(x0 + x, Math.round(y0 - curve(u, 2.2) * h), palette.blue);
      cell(x0 + x, Math.round(y0 - curve(u, 2.2 + 2.6 * lift) * h), palette.blueSoft, 0.4 + 0.6 * lift);
    }
    const u = 0.15 + 0.6 * ((Math.sin(t / 900) + 1) / 2);
    const px = x0 + Math.round(u * w), py = Math.round(y0 - curve(u, 2.2) * h);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) cell(px + dx, py + dy, palette.ink);
  },

  // First-moment erasure: two domains' means are pulled together, but the
  // clouds keep their different shapes.
  erasure({ cols, rows, cell, t, state }) {
    state.a ??= Array.from({ length: 70 }, () => [rand(-1, 1) * 0.7, rand(-1, 1) * 2.2]);
    state.b ??= Array.from({ length: 70 }, () => [rand(-1, 1) * 2.4, rand(-1, 1) * 0.6]);
    const p = easeOut(clamp(((t % 6000) - 600) / 2600, 0, 1));
    const gap = (1 - p) * cols * 0.26;
    const cx = cols / 2, cy = rows / 2;
    const k = rows / 7;
    const draw = (pts, ox, color) => pts.forEach(([x, y]) => cell(Math.round(cx + ox + x * k), Math.round(cy + y * k), color, 0.85));
    draw(state.a, -gap, palette.ink);
    draw(state.b, gap, palette.blue);
    [[-gap, palette.ink], [gap, palette.blueInk]].forEach(([ox, color]) => {
      for (let k = -2; k <= 2; k++) {
        cell(Math.round(cx + ox + k), Math.round(cy), color);
        cell(Math.round(cx + ox), Math.round(cy + k), color);
      }
    });
  },

  // Agent traces with injected (blue) and natural (ink) failures; a monitor
  // scans across the steps.
  traces({ cols, rows, cell, t, state }) {
    state.rows ??= Array.from({ length: Math.floor(rows / 2) }, () => {
      const len = Math.floor(rand(cols * 0.45, cols - 2));
      return { len, fail: Math.floor(rand(3, len - 1)), injected: Math.random() < 0.55 };
    });
    const scan = Math.floor((t / 70) % (cols + 10));
    state.rows.forEach((trace, r) => {
      const y = r * 2 + 1;
      for (let x = 1; x < trace.len; x++) {
        const isFail = x === trace.fail;
        const seen = scan >= x;
        if (isFail && seen) {
          cell(x, y, trace.injected ? palette.blue : palette.ink);
          cell(x + 1, y, trace.injected ? palette.blue : palette.ink);
        } else if (x !== trace.fail + 1 || !seen) cell(x, y, x === scan ? palette.blueSoft : palette.rule);
      }
    });
    for (let y = 0; y < rows; y++) cell(scan, y, palette.blueSoft, 0.35);
  },

  // The same answer twice: once in full (formal blocks in blue), once after an
  // identity marker lights, where the formal blocks quietly drop out.
  identity({ cols, rows, cell, t, state }) {
    const half = Math.floor(cols / 2);
    state.lines ??= Array.from({ length: Math.floor((rows - 4) / 2) }, () =>
      Array.from({ length: half - 3 }, () => (Math.random() < 0.22 ? 'f' : Math.random() < 0.82 ? 'w' : ' ')),
    );
    const cycle = t % 7000;
    const loss = clamp((cycle - 1200) / 3600, 0, 1);
    const marker = cycle > 600 && cycle < 6400;
    state.lines.forEach((line, i) => {
      const y = 3 + i * 2;
      line.forEach((kind, x) => {
        if (kind === ' ') return;
        cell(1 + x, y, kind === 'f' ? palette.blue : palette.ruleStrong);
        const gone = kind === 'f' && i / state.lines.length < loss * 1.1;
        cell(half + 1 + x, y, kind === 'f' ? (gone ? palette.ruleStrong : palette.blue) : palette.ruleStrong, gone ? 0.45 : 1);
      });
    });
    cell(1, 1, palette.muted);
    for (let k = 0; k < 3; k++) cell(half + 1 + k, 1, marker ? palette.blueInk : palette.rule);
  },

  // A leaderboard under increasing shift severity: two near-tied models swap.
  rank({ cols, rows, cell, t, state }) {
    const scores = [[0.92, 0.88], [0.85, 0.6], [0.83, 0.74], [0.6, 0.42]];
    const sev = (Math.sin(t / 1500 - Math.PI / 2) + 1) / 2;
    const now = scores.map(([a, b], i) => ({ i, v: a + (b - a) * sev }));
    const order = [...now].sort((p, q) => q.v - p.v);
    state.pos ??= now.map((_, i) => i);
    order.forEach((bar, rank) => (state.pos[bar.i] += (rank - state.pos[bar.i]) * 0.12));
    const band = Math.floor((rows - 4) / 4);
    now.forEach(({ i, v }) => {
      const y = 1 + Math.round(state.pos[i] * band);
      const len = Math.round(v * (cols - 4));
      const tone = i === 1 || i === 2 ? palette.blue : palette.blueSoft;
      for (let x = 0; x < len; x++) for (let k = 0; k < band - 1; k++) cell(2 + x, y + k, tone, i === 1 || i === 2 ? 1 : 0.8);
    });
    const levels = 5;
    for (let s = 0; s < levels; s++) cell(2 + s * 2, rows - 2, s / (levels - 1) <= sev + 0.01 ? palette.ink : palette.rule);
  },

  // Rotary position encoding as a field of dials turning at different
  // frequencies; the first-order "jet" adds a small wobble.
  rope({ cols, rows, cell, t }) {
    const nx = 4, ny = 3;
    const r = Math.min(cols / nx, rows / ny) / 2 - 1.2;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const cx = (i + 0.5) * (cols / nx), cy = (j + 0.5) * (rows / ny);
        for (let a = 0; a < 40; a++) {
          const th = (a / 40) * Math.PI * 2;
          cell(Math.round(cx + Math.cos(th) * r), Math.round(cy + Math.sin(th) * r), palette.ruleStrong);
        }
        const k = j * nx + i;
        const freq = Math.pow(0.62, k) * 0.004;
        const angle = t * freq + k + 0.25 * Math.sin(t / 700 + k) * (j === ny - 1 ? 1 : 0);
        for (let s = 0; s <= r; s += 0.5) {
          cell(Math.round(cx + Math.cos(angle) * s), Math.round(cy + Math.sin(angle) * s), j === ny - 1 ? palette.blueInk : palette.blue);
        }
      }
    }
  },
};

function initThumb(canvas) {
  const draw = THUMBS[canvas.dataset.thumb];
  if (!draw) return;
  const pitch = 5;
  const state = {};
  let w = 0, h = 0, cols = 0, rows = 0, ctx;
  const build = () => {
    const box = canvas.getBoundingClientRect();
    w = box.width;
    h = box.height;
    if (!w || !h) return;
    ctx = fitCanvas(canvas, w, h);
    cols = Math.floor(w / pitch);
    rows = Math.floor(h / pitch);
  };
  const cell = (x, y, fill, alpha = 1) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.fillRect((w - cols * pitch) / 2 + x * pitch + 0.5, (h - rows * pitch) / 2 + y * pitch + 0.5, pitch - 1.5, pitch - 1.5);
    ctx.globalAlpha = 1;
  };
  const frame = (t) => {
    if (!ctx) return;
    ctx.fillStyle = palette.paper2;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cell(x, y, '#e8e6e0');
    draw({ cols, rows, cell, t, state });
  };
  build();
  new ResizeObserver(() => {
    const box = canvas.getBoundingClientRect();
    if (Math.abs(box.width - w) > 1 || Math.abs(box.height - h) > 1) build();
  }).observe(canvas);
  if (reduced) frame(2400);
  else visibleLoop(canvas, frame);
}

/* ---------- Research index: scrollspy with a sliding chip ------------- */

function initIndexNav(nav) {
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const chip = nav.querySelector('.index-chip');
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const activate = (id) => {
    links.forEach((a) => {
      const on = a.getAttribute('href') === `#${id}`;
      a.classList.toggle('is-active', on);
      if (on && chip) {
        chip.style.opacity = 1;
        chip.style.width = `${a.offsetWidth}px`;
        chip.style.height = `${a.offsetHeight}px`;
        chip.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
      }
    });
  };
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e) => activate(e.target.id));
  }, { rootMargin: '-35% 0px -60% 0px' });
  sections.forEach((s) => io.observe(s));
  if (sections[0]) activate(sections[0].id);
}

/* ---------- Project filters (with view transitions) ------------------- */

function initFilters(bar) {
  const rows = [...document.querySelectorAll('[data-tags]')];
  rows.forEach((row, i) => (row.style.viewTransitionName = `project-${i}`));
  bar.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-filter]');
    if (!button) return;
    const filter = button.dataset.filter;
    const apply = () => {
      bar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      rows.forEach((row) => {
        row.hidden = filter !== 'all' && !row.dataset.tags.split(' ').includes(filter);
        if (!row.hidden) row.querySelector('[data-arrive]')?.classList.add('is-in');
      });
    };
    if (document.startViewTransition && !reduced) document.startViewTransition(apply);
    else apply();
  });
}

/* ---------- Boot -------------------------------------------------------- */

initProgress();
initArrival();
document.querySelectorAll('[data-wordmark]').forEach(initWordmark);
document.querySelectorAll('canvas[data-transit]').forEach(initTransit);
document.querySelectorAll('canvas[data-sign]').forEach(initSign);
document.querySelectorAll('canvas[data-packing]').forEach(initPacking);
document.querySelectorAll('canvas[data-descent]').forEach(initDescent);
document.querySelectorAll('canvas[data-thumb]').forEach(initThumb);
document.querySelectorAll('[data-index-nav]').forEach(initIndexNav);
document.querySelectorAll('[data-filters]').forEach(initFilters);
