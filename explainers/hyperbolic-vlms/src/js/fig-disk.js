// Figure 4 (interactive): a tree in the Poincaré disk. Every edge has the same
// hyperbolic length, and every node has the same number of neighbours, spaced
// evenly around it (as in Sarkar's construction). Click a node to move it to the
// centre with a Möbius transformation, an isometry of the hyperbolic plane: the
// tree looks the same from every node, and there is always room for more.
(function () {
const { el, svgPoint } = window.XP;

const root = document.getElementById('fig-disk');
if (!root) return;
const svg = root.querySelector('svg');
const q = (role) => root.querySelector(`[data-role="${role}"]`);

const EDGE = 1;                    // hyperbolic length of every edge
const CX = 430, CY = 225, RPX = 205;

// ---- complex numbers as [re, im] ----------------------------------------------
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const conj = (a) => [a[0], -a[1]];
const abs = (a) => Math.hypot(a[0], a[1]);
const polar = (r, t) => [r * Math.cos(t), r * Math.sin(t)];

// Möbius maps of the disk: to(a) sends a to 0, from(a) sends 0 back to a.
const to = (a) => (z) => div(sub(z, a), sub([1, 0], mul(conj(a), z)));
const from = (a) => (z) => div(add(z, a), add([1, 0], mul(conj(a), z)));

// ---- the tree -----------------------------------------------------------------
// Every node has degree b + 1: the root has b + 1 neighbours, every other node b
// children and its parent.
function build(b, depth) {
  const r = Math.tanh(EDGE / 2);   // Poincaré radius of a point at distance EDGE from 0
  const nodes = [{ z: [0, 0], d: 0, parent: -1 }];
  for (let k = 0; k <= b; k++) nodes.push({ z: polar(r, (2 * Math.PI * k) / (b + 1) + Math.PI / 2), d: 1, parent: 0 });
  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.d >= depth) continue;
    // in the frame where n sits at 0, its parent lies in direction phi; the
    // children take the other b of b + 1 evenly spaced directions
    const back = to(n.z)(nodes[n.parent].z);
    const phi = Math.atan2(back[1], back[0]);
    for (let k = 1; k <= b; k++) {
      nodes.push({ z: from(n.z)(polar(r, phi + (2 * Math.PI * k) / (b + 1))), d: n.d + 1, parent: i });
    }
  }
  return nodes;
}

// ---- Poincaré geodesics -------------------------------------------------------
function geodesic(p, q, n = 20) {
  const cross = p[0] * q[1] - p[1] * q[0];
  const pp = p[0] * p[0] + p[1] * p[1], qq = q[0] * q[0] + q[1] * q[1];
  if (Math.abs(cross) < 1e-12 * Math.max(1, pp, qq)) return [p, q];
  if (pp < 1e-12 || qq < 1e-12) return [p, q];
  const inv = [p[0] / pp, p[1] / pp];
  const [ax, ay] = p, [bx, by] = q, [cx, cy] = inv;
  const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D;
  const rr = Math.hypot(ax - ux, ay - uy);
  if (!isFinite(rr) || rr > 1e4) return [p, q];
  const a1 = Math.atan2(ay - uy, ax - ux);
  let a2 = Math.atan2(by - uy, bx - ux);
  if (a2 - a1 > Math.PI) a2 -= 2 * Math.PI;
  if (a1 - a2 > Math.PI) a2 += 2 * Math.PI;
  return Array.from({ length: n + 1 }, (_, k) => polar(rr, a1 + ((a2 - a1) * k) / n).map((v, i) => v + (i ? uy : ux)));
}

// ---- state and drawing --------------------------------------------------------
const state = { b: 2, depth: 6, centre: [0, 0], focus: 0, anim: null };
let nodes = build(state.b, state.depth);
let screen = [];

const P = (z) => [CX + z[0] * RPX, CY - z[1] * RPX];

function draw() {
  svg.replaceChildren();
  el('circle', { class: 'pd-bg', cx: CX, cy: CY, r: RPX }, svg);

  const T = to(state.centre);
  const zs = nodes.map((n) => T(n.z));

  let d = '';
  nodes.forEach((n, i) => {
    if (n.parent < 0) return;
    const a = zs[n.parent], c = zs[i];
    if (1 - abs(a) < 2e-4 && 1 - abs(c) < 2e-4) return;   // too small to see
    d += geodesic(a, c).map((p, k) => (k ? 'L' : 'M') + P(p).map((v) => v.toFixed(1)).join(' ')).join('');
  });
  el('path', { class: 'pd-edge', d }, svg);

  // each node is drawn as a disc of fixed hyperbolic size, so it shrinks
  // towards the rim exactly as the edges do
  screen = [];
  nodes.forEach((n, i) => {
    const z = zs[i];
    const r = 7 * (1 - z[0] * z[0] - z[1] * z[1]);
    if (r < 0.35) return;
    const [x, y] = P(z);
    el('circle', { class: 'pd-node' + (i === state.focus ? ' is-focus' : ''), cx: x, cy: y, r }, svg);
    screen.push({ i, x, y, r });
  });

  el('circle', { class: 'pd-rim', cx: CX, cy: CY, r: RPX }, svg);
}

// Glide the view to a new centre along the geodesic, over ~0.6 s.
function moveTo(i) {
  const start = state.centre, target = nodes[i].z;
  // the new centre, expressed in the current view
  const w = to(start)(target);
  const dist = 2 * Math.atanh(Math.min(abs(w), 1 - 1e-12));
  const dir = abs(w) > 1e-12 ? [w[0] / abs(w), w[1] / abs(w)] : [1, 0];
  state.focus = i;
  const t0 = performance.now();
  cancelAnimationFrame(state.anim);
  const tick = (now) => {
    const t = Math.min(1, (now - t0) / 600);
    const e = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
    const step = polar(Math.tanh((e * dist) / 2), Math.atan2(dir[1], dir[0]));
    state.centre = from(start)(step);
    draw();
    if (t < 1) state.anim = requestAnimationFrame(tick);
  };
  state.anim = requestAnimationFrame(tick);
}

svg.addEventListener('click', (ev) => {
  const p = svgPoint(svg, ev);
  let best = null, bestD = Infinity;
  screen.forEach((s) => { const dd = Math.hypot(p.x - s.x, p.y - s.y); if (dd < Math.max(s.r + 6, 10) && dd < bestD) { bestD = dd; best = s.i; } });
  if (best != null) moveTo(best);
});
svg.addEventListener('pointermove', (ev) => {
  const p = svgPoint(svg, ev);
  svg.style.cursor = screen.some((s) => Math.hypot(p.x - s.x, p.y - s.y) < Math.max(s.r + 6, 10)) ? 'pointer' : 'default';
});

function rebuild() {
  nodes = build(state.b, state.depth);
  state.focus = 0;
  state.centre = [0, 0];
  draw();
}
const slider = q('depth');
slider.addEventListener('input', () => {
  state.depth = Number(slider.value);
  q('depth-val').textContent = slider.value;
  rebuild();
});

draw();
})();
