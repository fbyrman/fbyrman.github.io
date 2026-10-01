// Shared pieces for the interactive network figures (Figures 3 and 4): the
// 2-3-2 network with the weights of Figure 1, its drawing, the weight
// matrices as stored, and a forward pass to check the function. Adds XP.play.
(function () {
const { el, mlpWeights } = window.XP;

const SUB = ['₁', '₂', '₃'];

// Same weights as Figures 1 and 2. Edge k runs layer by layer, source-major.
const w = mlpWeights(11);
const W1 = [0, 1, 2].map((h) => [w[0 * 3 + h], w[1 * 3 + h]]); // W1[hidden][input]
const W2 = [0, 1].map((o) => [0, 1, 2].map((h) => w[6 + h * 2 + o])); // W2[output][hidden]

const GEO = {
  XI: 36, XH: 246, XO: 456, R: 9, RH: 15,
  SLOT: [70, 150, 230],
  IN_Y: [110, 190],
  OUT_Y: [110, 190],
};

const fmt = (v) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);

const edgeStyle = (v, hi) =>
  `stroke: var(${v >= 0 ? '--c-meta' : '--warm'}); stroke-width: ${(0.8 + 2.4 * Math.min(Math.abs(v), 2.5)).toFixed(2)}px; stroke-opacity: ${hi ? 1 : 0.85}`;

// Value labels lie along their own edge, on a small backing in the panel color
// that keeps the line from running through the digits. An edge may carry its
// own label, { text, hi } (e.g. "−0.69 q₂"); the backing grows to fit.
//
// Placement: each label is treated as a bar along its edge. It tries positions
// along the edge, clear of the nodes at both ends, and takes the one with the
// widest gap to the bars already placed (ties go to the spot nearest t = 0.35).
function segDist(p1, p2, q1, q2) {
  const d = (p, a, b) => {
    const abx = b[0] - a[0], aby = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / (abx * abx + aby * aby || 1)));
    return Math.hypot(p[0] - a[0] - t * abx, p[1] - a[1] - t * aby);
  };
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const intersect = cross(p1, p2, q1) * cross(p1, p2, q2) < 0 && cross(q1, q2, p1) * cross(q1, q2, p2) < 0;
  return intersect ? 0 : Math.min(d(p1, q1, q2), d(p2, q1, q2), d(q1, p1, p2), d(q2, p1, p2));
}

function placeLabels(g, edges) {
  const placed = []; // bars: [end1, end2]
  // Long labels claim their spots first; the short ones then move out of their way.
  const order = edges.slice().sort((e, f) => (f.label ? 1 : 0) - (e.label ? 1 : 0));
  for (const { a, b, v, label } of order) {
    const s = label ? label.text : fmt(v);
    const half = Math.max(16, s.length * 3.1 + 4);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    let best = null;
    for (let t = 0.12; t <= 0.88; t += 0.02) {
      if (t * len < half + 16 || (1 - t) * len < half + 16) continue; // keep clear of the nodes
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      const bar = [[x - ux * half, y - uy * half], [x + ux * half, y + uy * half]];
      const gap = Math.min(40, ...placed.map(([p, q]) => segDist(bar[0], bar[1], p, q)));
      const score = gap - Math.abs(t - 0.35) * 4;
      if (!best || score > best.score) best = { score, x, y, bar };
    }
    if (!best) {
      const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2;
      best = { x, y, bar: [[x - ux * half, y - uy * half], [x + ux * half, y + uy * half]] };
    }
    const { x, y } = best;
    placed.push(best.bar);
    const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    const lg = el('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})` }, g);
    el('rect', { x: -half, y: -7.5, width: 2 * half, height: 15, rx: 3, style: 'fill: var(--eq-bg)' }, lg);
    const t = el('text', { x: 0, y: 3.8, class: 'fp-weight' + (label && label.hi ? ' is-scaled' : ''), 'text-anchor': 'middle' }, lg);
    t.textContent = s;
  }
}

// The network. opts: { nodeY[id], w1(id, i), w2(o, id), active, badge(id) -> text|null,
// label1(id, i) / label2(o, id) -> optional edge label { text, hi },
// hidden(g, id) -> called for each hidden node group to add attributes and listeners }.
function drawNet(svg, opts) {
  const { XI, XH, XO, R, RH, IN_Y, OUT_Y } = GEO;
  const { nodeY, w1, w2, active } = opts;
  const g = el('g', {}, svg);
  const edges = [];
  for (let id = 0; id < 3; id++) {
    IN_Y.forEach((iy, i) => edges.push({ a: [XI, iy], b: [XH, nodeY[id]], v: w1(id, i), id, label: opts.label1 && opts.label1(id, i) }));
    OUT_Y.forEach((oy, o) => edges.push({ a: [XH, nodeY[id]], b: [XO, oy], v: w2(o, id), id, label: opts.label2 && opts.label2(o, id) }));
  }
  for (const e of edges) {
    el('line', { x1: e.a[0], y1: e.a[1], x2: e.b[0], y2: e.b[1], style: edgeStyle(e.v, e.id === active), 'stroke-linecap': 'round' }, g);
  }
  for (const y of IN_Y) el('circle', { cx: XI, cy: y, r: R, class: 'pm-node' }, g);
  for (const y of OUT_Y) el('circle', { cx: XO, cy: y, r: R, class: 'pm-node' }, g);
  // Edges of the active neuron are placed last, so their labels sit on top.
  placeLabels(g, edges.slice().sort((a, b) => (a.id === active) - (b.id === active)));

  // The active neuron is drawn last, so it passes over the others when dragged.
  for (const id of [0, 1, 2].sort((a, b) => (a === active) - (b === active))) {
    const hg = el('g', { 'data-id': id, class: 'pm-hidden' + (id === active ? ' is-active' : ''), tabindex: 0, role: 'button' }, g);
    el('circle', { cx: XH, cy: nodeY[id], r: RH, class: 'pm-node hid' }, hg);
    const t = el('text', { x: XH, y: nodeY[id] + 5, class: 'pm-name', 'text-anchor': 'middle' }, hg);
    t.textContent = `h${SUB[id]}`;
    const badge = opts.badge && opts.badge(id);
    if (badge) {
      const b = el('text', { x: XH, y: nodeY[id] - RH - 7, class: 'pm-badge', 'text-anchor': 'middle' }, hg);
      b.textContent = badge;
    }
    if (opts.hidden) opts.hidden(hg, id);
  }
}

// The weight matrices as stored. opts: { rows: neuron ids in storage order,
// w1(id, i), w2(o, id), active }.
function drawMatrices(svg, opts) {
  const { rows, w1, w2, active } = opts;
  const g = el('g', {}, svg);
  const CW = 42, CH = 26;
  const cell = (x, y, v, id) => {
    el('rect', {
      x, y, width: CW - 3, height: CH - 3, rx: 3,
      class: 'pm-cell' + (id === active ? ' is-active' : ''),
      style: `fill: var(${v >= 0 ? '--c-meta' : '--warm'}); fill-opacity: ${(0.12 + 0.3 * Math.min(Math.abs(v), 1.5)).toFixed(2)}`,
    }, g);
    const t = el('text', { x: x + (CW - 3) / 2, y: y + 16.5, class: 'fp-weight', 'text-anchor': 'middle' }, g);
    t.textContent = fmt(v);
  };
  const text = (x, y, s, cls, anchor = 'middle') => {
    const t = el('text', { x, y, class: cls, 'text-anchor': anchor }, g);
    t.textContent = s;
  };

  // W1: one row per hidden neuron, one column per input.
  const x1 = 528, y1 = 60;
  text(x1 + CW, y1 - 16, 'W₁', 'pm-mat');
  rows.forEach((id, r) => {
    text(x1 - 8, y1 + r * CH + 17, `h${SUB[id]}`, 'pm-rowlabel' + (id === active ? ' is-active' : ''), 'end');
    [0, 1].forEach((i) => cell(x1 + i * CW, y1 + r * CH, w1(id, i), id));
  });

  // W2: one column per hidden neuron, one row per output.
  const x2 = 626, y2 = 60;
  text(x2 + 1.5 * CW, y2 - 16, 'W₂', 'pm-mat');
  rows.forEach((id, c) => {
    text(x2 + c * CW + (CW - 3) / 2, y2 + 2 * CH + 16, `h${SUB[id]}`, 'pm-rowlabel' + (id === active ? ' is-active' : ''));
    [0, 1].forEach((o) => cell(x2 + c * CW, y2 + o * CH, w2(o, id), id));
  });
}

const ACT = { relu: (z) => Math.max(0, z), tanh: Math.tanh };

// Largest output difference between two networks over a grid in [-2, 2]^2.
// Each network is { w1(id, i), w2(o, id), act }.
function maxDiff(n1, n2) {
  const out = (n, x) => {
    const h = [0, 1, 2].map((id) => ACT[n.act](n.w1(id, 0) * x[0] + n.w1(id, 1) * x[1]));
    return [0, 1].map((o) => h.reduce((s, v, id) => s + n.w2(o, id) * v, 0));
  };
  let worst = 0;
  for (let i = -10; i <= 10; i++) {
    for (let j = -10; j <= 10; j++) {
      const a = out(n1, [i / 5, j / 5]), b = out(n2, [i / 5, j / 5]);
      worst = Math.max(worst, Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
    }
  }
  return worst;
}


window.XP.play = { SUB, W1, W2, GEO, fmt, drawNet, drawMatrices, maxDiff };
})();
