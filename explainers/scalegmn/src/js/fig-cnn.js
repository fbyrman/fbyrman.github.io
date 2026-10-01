// Figure 5 (interactive): symmetries of a tiny CNN. A 3x3 input, a first layer
// of 3 channels with 2x2 kernels (ReLU, 2x2 feature maps), and a second layer
// whose 2x2-per-channel kernel gives one output. Channels play the role of
// neurons: they can be reordered, and each can be scaled as a whole.
(function () {
const { el, rng, svgPoint } = window.XP;

const root = document.getElementById('fig-cnn');
if (!root) return;
const svg = root.querySelector('svg');
const q = (role) => root.querySelector(`[data-role="${role}"]`);
const SUB = ['₁', '₂', '₃'];

// ---- weights: K1[c] is channel c's 2x2 kernel, K2[c] its slice of the next kernel ----
const r = rng(23);
const draw = () => Math.round((r() * 2 - 1) * 100) / 100;
const K1 = [0, 1, 2].map(() => [draw(), draw(), draw(), draw()]);
const K2 = [0, 1, 2].map(() => [draw(), draw(), draw(), draw()]);

// scale[c]: factor on channel c. Its kernel is multiplied by it, its slice of
// the next kernel divided by it.
const state = { order: [0, 1, 2], scale: [1, 1, 1], selected: 0 };

// ---- forward pass ----
// Position p = (i, j) of the 2x2 feature map sees the input patch starting at (i, j).
const patch = (x, p) => {
  const i = p >> 1, j = p & 1;
  return [x[i * 3 + j], x[i * 3 + j + 1], x[(i + 1) * 3 + j], x[(i + 1) * 3 + j + 1]];
};
function forward(x, scale) {
  let out = 0;
  for (let c = 0; c < 3; c++) {
    for (let p = 0; p < 4; p++) {
      const z = patch(x, p).reduce((acc, v, k) => acc + scale[c] * K1[c][k] * v, 0);
      out += (K2[c][p] / scale[c]) * Math.max(0, z);
    }
  }
  return out;
}
const rx = rng(7);
const INPUTS = Array.from({ length: 200 }, () => Array.from({ length: 9 }, () => rx() * 2 - 1));
const sameFunction = () => INPUTS.every((x) => Math.abs(forward(x, [1, 1, 1]) - forward(x, state.scale)) < 1e-9);

// ---- geometry ----
const SLOT = [72, 186, 300];
const cardY = [0, 1, 2].map((c) => SLOT[state.order.indexOf(c)]);
const IMG = { x: 26, cell: 22 }, CARD = { x: 160, w: 300, h: 104 }, K2X = 530, K2C = 37, OUT = [712, 186];

const fmt = (v) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
const fill = (v) => `fill: var(${v >= 0 ? '--c-meta' : '--warm'}); fill-opacity: ${(0.12 + 0.3 * Math.min(Math.abs(v), 1.5)).toFixed(2)}`;
const text = (g, x, y, s, cls, anchor = 'middle') => {
  const t = el('text', { x, y, class: cls, 'text-anchor': anchor }, g);
  t.textContent = s;
  return t;
};

// A 2x2 grid of values.
function grid(g, x, y, cell, values) {
  values.forEach((v, k) => {
    const cx = x + (k & 1) * cell, cy = y + (k >> 1) * cell;
    el('rect', { x: cx, y: cy, width: cell - 3, height: cell - 3, rx: 3, style: fill(v), class: 'pm-cell' }, g);
    text(g, cx + (cell - 3) / 2, cy + (cell - 3) / 2 + 4, fmt(v), 'fp-weight');
  });
}

function redraw() {
  svg.replaceChildren();
  const g = el('g', {}, svg);
  const active = state.selected;

  // Input image.
  const iy = SLOT[1] - 1.5 * IMG.cell;
  for (let k = 0; k < 9; k++) {
    el('rect', { x: IMG.x + (k % 3) * IMG.cell, y: iy + Math.floor(k / 3) * IMG.cell, width: IMG.cell - 3, height: IMG.cell - 3, rx: 2, class: 'cn-input' }, g);
  }
  text(g, IMG.x + 1.5 * IMG.cell, iy + 3 * IMG.cell + 18, 'input', 'cn-label');
  text(g, CARD.x + CARD.w / 2, 11, 'layer 1: one 2 × 2 kernel per channel', 'cn-label');
  text(g, K2X + K2C, 11, 'layer 2 kernel', 'cn-label');

  // Connections; the active channel is drawn last.
  const ids = [0, 1, 2].sort((a, b) => (a === active) - (b === active));
  for (const c of ids) {
    const y = cardY[c];
    const hi = c === active ? ' is-active' : '';
    el('line', { x1: IMG.x + 3 * IMG.cell, y1: SLOT[1], x2: CARD.x, y2: y, class: 'cn-wire' + hi }, g);
    el('line', { x1: CARD.x + CARD.w, y1: y, x2: K2X - 8, y2: y, class: 'cn-wire' + hi }, g);
    el('line', { x1: K2X + 2 * K2C - 3, y1: y, x2: OUT[0] - 10, y2: OUT[1], class: 'cn-wire' + hi }, g);
  }
  el('circle', { cx: OUT[0], cy: OUT[1], r: 10, class: 'pm-node' }, g);
  text(g, OUT[0], OUT[1] + 30, 'output', 'cn-label');

  for (const c of ids) drawChannel(g, c);

  q('order').textContent = state.order.map((c) => `c${SUB[c]}`).join(', ');
  const same = sameFunction();
  const st = q('status');
  st.textContent = same ? '✓ same function' : '✕ different function';
  st.className = 'status ' + (same ? 'ok' : 'bad');
}

function drawChannel(g, c) {
  const y = cardY[c], top = y - CARD.h / 2;
  const s = state.scale[c];
  const cg = el('g', { class: 'cn-card' + (c === state.selected ? ' is-active' : ''), 'data-id': c, tabindex: 0, role: 'button' }, g);
  cg.setAttribute('aria-label', `channel ${c + 1}, scaled by ${s.toFixed(2)}; drag or use the arrow keys to move it`);
  el('rect', { x: CARD.x, y: top, width: CARD.w, height: CARD.h, rx: 8, class: 'cn-card-bg' }, cg);
  text(cg, CARD.x + 16, y + 5, `c${SUB[c]}`, 'pm-name');

  // The kernel keeps its original values; its label carries the factor, also at
  // q = 1. A scaled channel is highlighted.
  const scaled = Math.abs(s - 1) > 1e-9;
  const cls = scaled ? 'cn-sub is-scaled' : 'cn-sub';
  grid(cg, CARD.x + 42, y - 40, 37, K1[c]);
  text(cg, CARD.x + 78, top + CARD.h - 8, `kernel q${SUB[c]}`, cls);

  text(cg, CARD.x + 152, y + 4, 'ReLU →', 'cn-sub');
  const fx = CARD.x + 196, fy = y - 31, fc = 30;
  for (let k = 0; k < 4; k++) {
    el('rect', { x: fx + (k & 1) * fc, y: fy + (k >> 1) * fc, width: fc - 3, height: fc - 3, rx: 3, class: 'cn-fmap' }, cg);
  }
  text(cg, fx + fc, top + CARD.h - 8, 'feature map', 'cn-sub');

  text(cg, CARD.x + CARD.w - 12, top + 16, `q${SUB[c]} = ${s.toFixed(2)}`, scaled ? 'pm-badge' : 'pm-badge is-idle', 'end');

  // This channel's slice of the layer-2 kernel, divided by the same factor.
  grid(g, K2X, y - K2C, K2C, K2[c]);
  text(g, K2X + K2C, y + K2C + 14, `slice/q${SUB[c]}`, cls);
}

// ---- interaction ----
const slider = q('q');
function select(c) {
  state.selected = c;
  slider.value = String(state.scale[c]);
  q('q-val').textContent = state.scale[c].toFixed(2);
  q('sel').textContent = `c${SUB[c]}`;
  q('q-name').textContent = `q${SUB[c]}`;
  redraw();
}

slider.addEventListener('input', () => {
  let v = Number(slider.value);
  if (Math.abs(v - 1) < 0.05) v = 1;
  state.scale[state.selected] = v;
  q('q-val').textContent = v.toFixed(2);
  redraw();
});

// Pointer: a press on a card selects it; moving while pressed drags it.
let drag = null;
svg.addEventListener('pointerdown', (ev) => {
  const p = svgPoint(svg, ev);
  const c = [0, 1, 2].find((id) => p.x >= CARD.x && p.x <= CARD.x + CARD.w && Math.abs(p.y - cardY[id]) <= CARD.h / 2);
  if (c === undefined) return;
  ev.preventDefault();
  drag = { c, dy: p.y - cardY[c], y0: p.y, moved: false };
  svg.setPointerCapture(ev.pointerId);
  select(c);
});
svg.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const y = svgPoint(svg, ev).y;
  if (Math.abs(y - drag.y0) > 4) drag.moved = true;
  if (!drag.moved) return;
  cardY[drag.c] = Math.max(SLOT[0] - 24, Math.min(SLOT[2] + 24, y - drag.dy));
  redraw();
});
const endDrag = () => {
  if (!drag) return;
  const moved = drag.moved;
  drag = null;
  if (moved) {
    state.order = [0, 1, 2].sort((a, b) => cardY[a] - cardY[b]);
    settle();
  }
};
svg.addEventListener('pointerup', endDrag);
svg.addEventListener('pointercancel', endDrag);

svg.addEventListener('keydown', (ev) => {
  const c = Number(ev.target.getAttribute && ev.target.getAttribute('data-id'));
  if (Number.isNaN(c) || (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown')) return;
  ev.preventDefault();
  const s = state.order.indexOf(c), t = s + (ev.key === 'ArrowUp' ? -1 : 1);
  if (t < 0 || t > 2) return;
  [state.order[s], state.order[t]] = [state.order[t], state.order[s]];
  state.selected = c;
  settle(() => svg.querySelector(`.cn-card[data-id="${c}"]`).focus());
});

// Ease every card into its slot.
function settle(done) {
  const from = cardY.slice();
  const to = [0, 1, 2].map((c) => SLOT[state.order.indexOf(c)]);
  const dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280;
  const t0 = performance.now();
  const step = (now) => {
    const t = dur ? Math.min((now - t0) / dur, 1) : 1;
    const e = 1 - Math.pow(1 - t, 3);
    for (let c = 0; c < 3; c++) cardY[c] = from[c] + (to[c] - from[c]) * e;
    redraw();
    if (t < 1) requestAnimationFrame(step);
    else if (done) done();
  };
  requestAnimationFrame(step);
}

q('shuffle').addEventListener('click', () => {
  const o = state.order.slice();
  do {
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
  } while (o.every((v, i) => v === state.order[i]));
  state.order = o;
  settle();
});
q('reset').addEventListener('click', () => {
  state.order = [0, 1, 2];
  state.scale = [1, 1, 1];
  select(state.selected);
  settle();
});

select(0);
})();
