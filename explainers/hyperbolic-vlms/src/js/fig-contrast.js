// Figure 2 (interactive): contrastive learning on a sphere. Each embedding is a
// unit vector in R^3. Train runs Riemannian gradient descent on the symmetric
// contrastive loss: matching pairs align and the pairs spread apart. Drag a
// point to move it over the sphere, or drag the sphere to rotate the view.
(function () {
const { el, svgPoint, photo } = window.XP;

const root = document.getElementById('fig-contrast');
if (!root) return;
const svg = root.querySelector('svg');
const q = (role) => root.querySelector(`[data-role="${role}"]`);

const PAIRS = window.XP.PAIRS;
const N = PAIRS.length;
const TAU = 0.3, LR = 0.12;
const CX = 215, CY = 198, R = 128;            // the sphere on screen
const MX = 560, MY = 92, CELL = 82;           // the similarity matrix

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
const sph = (lon, lat) => {
  const a = (lon * Math.PI) / 180, b = (lat * Math.PI) / 180;
  return [Math.cos(b) * Math.cos(a), Math.sin(b), Math.cos(b) * Math.sin(a)];
};
const START = {
  img: [sph(10, 35), sph(150, -20), sph(260, 50)],
  txt: [sph(200, 10), sph(310, -45), sph(80, -10)],
};

const state = {
  img: START.img.map((v) => v.slice()), txt: START.txt.map((v) => v.slice()),
  steps: 0, running: false, drag: null, yaw: 0.5, pitch: 0.35,
};

// ---- the loss and its gradient ---------------------------------------------
function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

function lossAndGrad() {
  const S = state.img.map((u) => state.txt.map((w) => dot(u, w) / TAU));
  const P = S.map(softmax);                                                     // image -> captions
  const Qc = [...Array(N).keys()].map((j) => softmax(S.map((row) => row[j])));  // caption -> images
  let loss = 0;
  for (let i = 0; i < N; i++) loss -= Math.log(P[i][i]) + Math.log(Qc[i][i]);
  loss /= 2 * N;
  const gImg = state.img.map(() => [0, 0, 0]), gTxt = state.txt.map(() => [0, 0, 0]);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const d = i === j ? 1 : 0;
      const G = (P[i][j] - d + Qc[j][i] - d) / (2 * N) / TAU;  // dL / d(u_i . w_j)
      for (let k = 0; k < 3; k++) {
        gImg[i][k] += G * state.txt[j][k];
        gTxt[j][k] += G * state.img[i][k];
      }
    }
  }
  // keep only the part of each gradient that moves along the sphere
  const tangent = (g, u) => { const s = dot(g, u); return g.map((x, k) => x - s * u[k]); };
  return { loss, gImg: gImg.map((g, i) => tangent(g, state.img[i])), gTxt: gTxt.map((g, j) => tangent(g, state.txt[j])) };
}

function step() {
  const { gImg, gTxt } = lossAndGrad();
  state.img = state.img.map((u, i) => unit(u.map((x, k) => x - LR * gImg[i][k])));
  state.txt = state.txt.map((w, j) => unit(w.map((x, k) => x - LR * gTxt[j][k])));
  state.steps++;
}

// ---- view -------------------------------------------------------------------
// World -> view: rotate by yaw about the vertical axis, then tilt by pitch.
function toView(v) {
  const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
  const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
  const x = cy * v[0] - sy * v[2];
  const z1 = sy * v[0] + cy * v[2];
  return [x, cp * v[1] - sp * z1, sp * v[1] + cp * z1];   // [right, up, towards the viewer]
}
function fromView(v) {
  const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
  const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
  const y = cp * v[1] + sp * v[2];
  const z1 = -sp * v[1] + cp * v[2];
  return [cy * v[0] + sy * z1, y, -sy * v[0] + cy * z1];
}
const screen = (v, r = R) => { const p = toView(v); return [CX + r * p[0], CY - r * p[1], p[2]]; };

// Great and small circles of the wireframe, split into front and back parts.
function wire(pts) {
  let front = '', back = '', prev = null;
  pts.forEach((v) => {
    const [x, y, z] = screen(v);
    const side = z >= 0 ? 'f' : 'b';
    const seg = `${x.toFixed(1)} ${y.toFixed(1)}`;
    if (side === 'f') front += (prev === 'f' ? 'L' : 'M') + seg;
    else back += (prev === 'b' ? 'L' : 'M') + seg;
    prev = side;
  });
  return { front, back };
}

// ---- drawing ----------------------------------------------------------------
function draw() {
  svg.replaceChildren();
  el('text', { class: 'ct-title', x: CX, y: 14, 'text-anchor': 'middle' }, svg).textContent = 'latent space (unit sphere)';

  // sphere body and wireframe
  // light shading, lit from the upper left, so the disc reads as a ball
  const grad = el('radialGradient', { id: 'ct-shade', cx: '0.36', cy: '0.32', r: '0.75' }, el('defs', {}, svg));
  el('stop', { offset: '0', style: 'stop-color: var(--eq-bg)' }, grad);
  el('stop', { offset: '1', style: 'stop-color: var(--paper-raise)' }, grad);
  el('circle', { class: 'ct-sphere', cx: CX, cy: CY, r: R, fill: 'url(#ct-shade)' }, svg);
  let front = '', back = '';
  for (let lat = -60; lat <= 60; lat += 30) {
    const w = wire(Array.from({ length: 73 }, (_, i) => sph(i * 5, lat)));
    front += w.front; back += w.back;
  }
  for (let lon = 0; lon < 180; lon += 30) {
    const w = wire(Array.from({ length: 73 }, (_, i) => {
      const t = (i * 5 * Math.PI) / 180;
      const a = (lon * Math.PI) / 180;
      return [Math.cos(t) * Math.cos(a), Math.sin(t), Math.cos(t) * Math.sin(a)];
    }));
    front += w.front; back += w.back;
  }
  el('path', { class: 'ct-wire is-back', d: back }, svg);
  el('path', { class: 'ct-wire', d: front }, svg);
  el('circle', { class: 'ct-rim', cx: CX, cy: CY, r: R }, svg);
  el('circle', { class: 'ct-origin', cx: CX, cy: CY, r: 3 }, svg);

  // points, drawn back to front; points behind the sphere are faded
  const items = [];
  PAIRS.forEach((p, k) => {
    items.push({ kind: 'txt', k, v: state.txt[k] });
    items.push({ kind: 'img', k, v: state.img[k] });
  });
  items.forEach((it) => { it.s = screen(it.v); });
  items.sort((a, b) => a.s[2] - b.s[2]);
  items.forEach(({ kind, k, s: [x, y, z] }) => {
    const g = el('g', { class: 'ct-point' + (z < 0 ? ' is-back' : '') }, svg);
    el('line', { class: 'ct-vec', x1: CX, y1: CY, x2: x, y2: y, style: `stroke: var(--pair-${k + 1})` }, g);
    // labels sit on the side facing away from the centre of the disc
    let dx = x - CX, dy = y - CY;
    const n = Math.hypot(dx, dy);
    if (n < 1e-6) { dx = 0; dy = -1; } else { dx /= n; dy /= n; }
    if (kind === 'txt') {
      el('circle', { class: 'ct-ring', cx: x, cy: y, r: 13, style: `stroke: var(--pair-${k + 1})` }, g);
      el('text', { class: 'ct-word', x: x - 34 * dx, y: y - 34 * dy + 4, 'text-anchor': 'middle' }, g).textContent = `“${PAIRS[k].short}”`;
    } else {
      el('rect', { class: 'ct-square', x: x - 7, y: y - 7, width: 14, height: 14, rx: 2, style: `fill: var(--pair-${k + 1})` }, g);
      photo(g, PAIRS[k].img, x + 32 * dx, y + 32 * dy, 34, 4);
    }
  });

  // similarity matrix
  el('text', { class: 'ct-title', x: MX + (CELL * N) / 2, y: 24, 'text-anchor': 'middle' }, svg).textContent = 'cosine similarity';
  PAIRS.forEach((p, j) => {
    el('text', { class: 'ct-word', x: MX + CELL * (j + 0.5), y: MY - 14, 'text-anchor': 'middle' }, svg).textContent = `“${p.short}”`;
  });
  PAIRS.forEach((p, i) => {
    photo(svg, p.img, MX - 30, MY + CELL * (i + 0.5), 44, 4);
    PAIRS.forEach((_, j) => {
      const c = dot(state.img[i], state.txt[j]);
      const x = MX + CELL * j, y = MY + CELL * i;
      el('rect', { class: 'ct-cell-bg', x: x + 2, y: y + 2, width: CELL - 4, height: CELL - 4, rx: 3 }, svg);
      el('rect', { class: 'ct-cell', x: x + 2, y: y + 2, width: CELL - 4, height: CELL - 4, rx: 3, 'fill-opacity': ((c + 1) / 2) * 0.85 }, svg);
      if (i === j) el('rect', { class: 'ct-diag', x: x + 2, y: y + 2, width: CELL - 4, height: CELL - 4, rx: 3 }, svg);
      el('text', { class: 'ct-val' + (c > 0.35 ? ' on-dark' : ''), x: x + CELL / 2, y: y + CELL / 2 + 5, 'text-anchor': 'middle' }, svg)
        .textContent = (c < 0 ? '−' : '') + Math.abs(c).toFixed(2);
    });
  });

  // readout
  const { loss } = lossAndGrad();
  let acc = 0;
  for (let i = 0; i < N; i++) {
    const row = state.txt.map((w) => dot(state.img[i], w));
    if (row.indexOf(Math.max(...row)) === i) acc++;
  }
  q('steps').textContent = String(state.steps);
  q('loss').textContent = loss.toFixed(3);
  q('acc').textContent = `${acc} / ${N}`;
}

// ---- controls ---------------------------------------------------------------
const trainBtn = q('train');
function loop() {
  if (!state.running) return;
  step();
  draw();
  const { gImg, gTxt } = lossAndGrad();
  if ([...gImg, ...gTxt].every((g) => Math.hypot(...g) < 5e-3)) setRunning(false);
  else requestAnimationFrame(loop);
}
function setRunning(on) {
  state.running = on;
  trainBtn.textContent = on ? 'Pause' : 'Train';
  if (on) requestAnimationFrame(loop);
}
trainBtn.addEventListener('click', () => setRunning(!state.running));

q('shuffle').addEventListener('click', () => {
  const g = () => { const u = Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u || 1e-9)) * Math.cos(2 * Math.PI * v); };
  const rand = () => unit([g(), g(), g()]);
  state.img = state.img.map(rand);
  state.txt = state.txt.map(rand);
  state.steps = 0;
  draw();
});

// Drag a visible point over the sphere, or drag anywhere else to rotate.
function pick(p) {
  let best = null, bestD = 20;
  ['img', 'txt'].forEach((kind) => state[kind].forEach((v, k) => {
    const [x, y, z] = screen(v);
    const d = Math.hypot(p.x - x, p.y - y);
    if (z >= -0.05 && d < bestD) { bestD = d; best = { kind, k }; }
  }));
  return best;
}
svg.addEventListener('pointerdown', (ev) => {
  const p = svgPoint(svg, ev);
  const hit = pick(p);
  if (hit) state.drag = hit;
  else if (Math.hypot(p.x - CX, p.y - CY) <= R + 40) state.drag = { rotate: true, x: p.x, y: p.y, yaw: state.yaw, pitch: state.pitch };
  else return;
  svg.setPointerCapture(ev.pointerId);
  svg.classList.add('is-dragging');
});
svg.addEventListener('pointermove', (ev) => {
  const p = svgPoint(svg, ev);
  const d = state.drag;
  if (!d) {
    svg.style.cursor = pick(p) ? 'grab' : Math.hypot(p.x - CX, p.y - CY) <= R + 40 ? 'move' : 'default';
    return;
  }
  if (d.rotate) {
    state.yaw = d.yaw + (p.x - d.x) * 0.012;
    state.pitch = Math.max(-1.4, Math.min(1.4, d.pitch + (p.y - d.y) * 0.012));
  } else {
    // the point under the cursor on the front of the sphere (or on its rim)
    let x = (p.x - CX) / R, y = (CY - p.y) / R;
    const r = Math.hypot(x, y);
    if (r > 1) { x /= r; y /= r; }
    state[d.kind][d.k] = unit(fromView([x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))]));
  }
  draw();
});
const end = () => { state.drag = null; svg.classList.remove('is-dragging'); };
svg.addEventListener('pointerup', end);
svg.addEventListener('pointercancel', end);

draw();
})();
