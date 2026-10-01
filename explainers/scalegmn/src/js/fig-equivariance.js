// Figure 6 (interactive): equivariance as a commuting square. Top left the
// network, top right the metanetwork's output; bottom left the network after a
// symmetry, bottom right the metanetwork applied to that. An equivariant
// metanetwork gives the same network along both routes; an ordinary one does not.
// Both metanetworks here are small stand-in maps, not trained models.
(function () {
const { el, rng } = window.XP;
const { SUB, W1, W2 } = window.XP.play;

const root = document.getElementById('fig-equivariance');
if (!root) return;
const svg = root.querySelector('svg');
const q = (role) => root.querySelector(`[data-role="${role}"]`);
const state = { sym: 'permute', meta: 'equivariant' };

// A network as stored: ids[slot] = neuron id, a[slot][input], b[output][slot].
const original = () => ({ ids: [0, 1, 2], a: W1.map((r) => r.slice()), b: W2.map((r) => r.slice()) });
const copy = (n) => ({ ids: n.ids.slice(), a: n.a.map((r) => r.slice()), b: n.b.map((r) => r.slice()) });

// The symmetry: swap the first two hidden slots, or scale neuron h₂ by 2.
function symmetry(n) {
  const m = copy(n);
  if (state.sym === 'permute') {
    [m.ids[0], m.ids[1]] = [m.ids[1], m.ids[0]];
    [m.a[0], m.a[1]] = [m.a[1], m.a[0]];
    m.b.forEach((row) => ([row[0], row[1]] = [row[1], row[0]]));
  } else {
    const s = m.ids.indexOf(1);
    m.a[s] = m.a[s].map((v) => 2 * v);
    m.b.forEach((row) => (row[s] /= 2));
  }
  return m;
}

// Equivariant stand-in: each neuron's incoming and outgoing weights are updated
// from that neuron's own weights only, linearly, so the update follows the
// neuron when it moves and scales with it when it is scaled.
function metaEquivariant(n) {
  const m = copy(n);
  m.a = n.a.map((row) => {
    const mean = (row[0] + row[1]) / 2;
    return row.map((v) => v - 0.9 * mean);
  });
  for (let s = 0; s < 3; s++) {
    const mean = (n.b[0][s] + n.b[1][s]) / 2;
    m.b[0][s] = n.b[0][s] + 0.8 * mean;
    m.b[1][s] = n.b[1][s] + 0.8 * mean;
  }
  return m;
}

// Ordinary stand-in: adds a fixed correction to every storage position. It is
// tied to slots, not neurons, and it does not scale, so it breaks both symmetries.
const r = rng(31);
const DA = [0, 1, 2].map(() => [r() - 0.5, r() - 0.5].map((v) => 0.8 * v));
const DB = [0, 1].map(() => [0, 1, 2].map(() => 0.8 * (r() - 0.5)));
function metaOrdinary(n) {
  const m = copy(n);
  m.a = n.a.map((row, s) => row.map((v, i) => v + DA[s][i]));
  m.b = n.b.map((row, o) => row.map((v, s) => v + DB[o][s]));
  return m;
}

const meta = (n) => (state.meta === 'equivariant' ? metaEquivariant(n) : metaOrdinary(n));

// ---- drawing ----
const W = 200, H = 120;
function drawMini(x0, y0, n, label, diff) {
  const g = el('g', { transform: `translate(${x0} ${y0})` }, svg);
  const IN = [[0, 32], [0, 88]], OUT = [[W, 32], [W, 88]];
  const HID = [0, 1, 2].map((s) => [W / 2, 4 + s * 56]);
  const edge = (p, q2, v, bad) => {
    el('line', {
      x1: p[0], y1: p[1], x2: q2[0], y2: q2[1], 'stroke-linecap': 'round',
      style: `stroke: var(${v >= 0 ? '--c-meta' : '--warm'}); stroke-width: ${(0.8 + 2.2 * Math.min(Math.abs(v), 1.6)).toFixed(2)}px; stroke-opacity: 0.85`,
    }, g);
    if (bad) {
      el('line', { x1: p[0], y1: p[1], x2: q2[0], y2: q2[1], class: 'eq-diff' }, g);
    }
  };
  for (let s = 0; s < 3; s++) {
    IN.forEach((p, i) => edge(p, HID[s], n.a[s][i], diff && diff.a[s][i]));
    OUT.forEach((p, o) => edge(HID[s], p, n.b[o][s], diff && diff.b[o][s]));
  }
  for (const p of [...IN, ...OUT]) el('circle', { cx: p[0], cy: p[1], r: 6, class: 'pm-node' }, g);
  HID.forEach((p, s) => {
    el('circle', { cx: p[0], cy: p[1], r: 11, class: 'pm-node' }, g);
    const t = el('text', { x: p[0], y: p[1] + 4, class: 'eq-name', 'text-anchor': 'middle' }, g);
    t.textContent = `h${SUB[n.ids[s]]}`;
  });
  const t = el('text', { x: W / 2, y: H + 26, class: 'fp-label', 'text-anchor': 'middle' }, g);
  for (const [text, cls] of label) {
    const sp = el('tspan', cls ? { class: cls } : {}, t);
    sp.textContent = text;
  }
}

function arrow(x1, y1, x2, y2, text, tx, ty, anchor = 'middle') {
  const a = Math.atan2(y2 - y1, x2 - x1);
  el('line', { x1, y1, x2: x2 - 9 * Math.cos(a), y2: y2 - 9 * Math.sin(a), class: 'eq-arrow' }, svg);
  el('path', {
    d: `M ${x2} ${y2} L ${x2 - 10 * Math.cos(a - 0.45)} ${y2 - 10 * Math.sin(a - 0.45)} L ${x2 - 10 * Math.cos(a + 0.45)} ${y2 - 10 * Math.sin(a + 0.45)} Z`,
    class: 'eq-head',
  }, svg);
  const t = el('text', { x: tx, y: ty, class: 'eq-arrow-label', 'text-anchor': anchor }, svg);
  t.textContent = text;
}

function redraw() {
  svg.replaceChildren();
  const theta = original();
  const top = meta(theta); // top right
  const left = symmetry(theta); // bottom left
  const viaTop = symmetry(top); // right, then down
  const viaLeft = meta(left); // down, then right

  // Where do the two routes disagree?
  const diff = {
    a: viaLeft.a.map((row, s) => row.map((v, i) => Math.abs(v - viaTop.a[s][i]) > 1e-9)),
    b: viaLeft.b.map((row, o) => row.map((v, s) => Math.abs(v - viaTop.b[o][s]) > 1e-9)),
  };
  const same = diff.a.every((r2) => r2.every((d) => !d)) && diff.b.every((r2) => r2.every((d) => !d));

  const symText = state.sym === 'permute' ? 'swap h₁ and h₂' : 'scale h₂ by 2';
  const L = 70, R = 490, T = 20, B = 230;
  drawMini(L, T, theta, [['network '], ['θ', 'sym-bold']]);
  drawMini(R, T, top, [['metanetwork output']]);
  drawMini(L, B, left, [['after the symmetry']]);
  drawMini(R, B, viaLeft, [['metanetwork output']], diff);

  arrow(L + W + 30, T + 60, R - 30, T + 60, 'metanetwork', (L + W + R) / 2, T + 50);
  arrow(L + W + 30, B + 60, R - 30, B + 60, 'metanetwork', (L + W + R) / 2, B + 50);
  arrow(L + W / 2 - 60, T + H + 36, L + W / 2 - 60, B - 6, symText, L + W / 2 - 70, (T + H + B) / 2 + 22, 'end');
  arrow(R + W / 2 + 60, T + H + 36, R + W / 2 + 60, B - 6, symText, R + W / 2 + 70, (T + H + B) / 2 + 22, 'start');

  const st = q('status');
  st.textContent = same ? '✓ both routes give the same network' : '✕ the two routes disagree';
  st.className = 'status ' + (same ? 'ok' : 'bad');
}

function bindSeg(attr, key) {
  root.querySelectorAll(`[data-${attr}]`).forEach((b) =>
    b.addEventListener('click', () => {
      state[key] = b.dataset[attr];
      root.querySelectorAll(`[data-${attr}]`).forEach((o) => o.setAttribute('aria-checked', String(o === b)));
      redraw();
    }),
  );
}
bindSeg('sym', 'sym');
bindSeg('meta', 'meta');

redraw();
})();
