// Shared drawing for the "network -> metanetwork -> network" diagrams
// (Figures 1 and 2). Adds XP.mlpWeights and XP.mlpFigure.
(function () {
const { el, rng } = window.XP;

const LAYERS = [2, 3, 2];
const H = 250;
const TOP = 40, BOTTOM = 190;
const MID = (TOP + BOTTOM) / 2;
const R = 9;

// Node positions of the MLP with its layers spread over [x0, x1].
function layout(x0, x1) {
  const gap = (BOTTOM - TOP) / 2;
  return LAYERS.map((n, l) => {
    const x = x0 + ((x1 - x0) * l) / (LAYERS.length - 1);
    const y0 = MID - ((n - 1) * gap) / 2;
    return Array.from({ length: n }, (_, i) => [x, y0 + i * gap]);
  });
}

function edgesOf(nodes) {
  const out = [];
  for (let l = 0; l + 1 < nodes.length; l++)
    for (const a of nodes[l]) for (const b of nodes[l + 1]) out.push([a, b]);
  return out;
}

const N_EDGES = LAYERS.slice(1).reduce((s, n, l) => s + n * LAYERS[l], 0);

// One weight per edge, rounded to two decimals, from a fixed seed.
function mlpWeights(seed) {
  const r = rng(seed);
  return Array.from({ length: N_EDGES }, () => {
    const u = 1 - r(), v = r();
    const w = 0.6 * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return Math.round(Math.max(-1.2, Math.min(1.2, w)) * 100) / 100;
  });
}

// A text label built from [text, className] runs, so symbols can be styled.
function label(svg, x, y, runs, cls) {
  const t = el('text', { x, y, class: cls, 'text-anchor': 'middle' }, svg);
  for (const [text, runCls] of runs) {
    const s = el('tspan', runCls ? { class: runCls } : {}, t);
    s.textContent = text;
  }
}

function arrow(svg, x0, x1, y) {
  el('line', { x1: x0, y1: y, x2: x1 - 8, y2: y, style: 'stroke: var(--ink-soft); stroke-width: 1.8px' }, svg);
  el('path', { d: `M ${x1} ${y} L ${x1 - 10} ${y - 5.5} L ${x1 - 10} ${y + 5.5} Z`, style: 'fill: var(--ink-soft)' }, svg);
}

// Draw one network. Without weights the edges are dashed placeholders; with
// weights they are colored by sign, sized by magnitude and labeled.
function drawNet(svg, x0, x1, weights) {
  const nodes = layout(x0, x1);
  const edges = edgesOf(nodes);
  const g = el('g', {}, svg);
  edges.forEach(([a, b], k) => {
    const w = weights ? weights[k] : null;
    const style = w === null
      ? 'stroke: var(--ink-soft); stroke-width: 1px; stroke-dasharray: 3 4; stroke-opacity: 0.7'
      : `stroke: var(${w >= 0 ? '--c-meta' : '--warm'}); stroke-width: ${(0.8 + 2.4 * Math.abs(w)).toFixed(2)}px; stroke-opacity: 0.85`;
    el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], style, 'stroke-linecap': 'round' }, g);
  });
  for (const layer of nodes)
    for (const [x, y] of layer)
      el('circle', { cx: x, cy: y, r: R, style: 'fill: var(--eq-bg); stroke: var(--ink); stroke-width: 1.5px' }, g);
  if (!weights) return;

  // Value labels lie along their own edge. Each slides along its edge to the
  // first spot that clears the labels already placed; a small backing in the
  // panel color keeps the line from running through the digits.
  const placed = [];
  edges.forEach(([a, b], k) => {
    let x, y;
    for (const t of [0.34, 0.46, 0.24, 0.58, 0.7]) {
      x = a[0] + (b[0] - a[0]) * t;
      y = a[1] + (b[1] - a[1]) * t;
      if (placed.every(([px, py]) => Math.hypot(px - x, py - y) > 30)) break;
    }
    placed.push([x, y]);
    const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    const lg = el('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})` }, g);
    el('rect', { x: -15, y: -7.5, width: 30, height: 15, rx: 3, style: 'fill: var(--eq-bg)' }, lg);
    const t = el('text', { x: 0, y: 3.8, class: 'fp-weight', 'text-anchor': 'middle' }, lg);
    const w = weights[k];
    t.textContent = (w < 0 ? '−' : '') + Math.abs(w).toFixed(2);
  });
}

// The full diagram: input network, metanetwork box, output network.
// opts: { inWeights (array or null), outWeights, inLabel, outLabel, boxMath }
function mlpFigure(svg, opts) {
  // Both networks get the same width, so they read as the same architecture.
  drawNet(svg, 20, 248, opts.inWeights);
  label(svg, 134, H - 14, opts.inLabel, 'fp-label');

  arrow(svg, 262, 304, MID);
  el('rect', { x: 310, y: MID - 44, width: 136, height: 88, rx: 10, style: 'fill: var(--paper-raise); stroke: var(--ink); stroke-width: 1.5px' }, svg);
  label(svg, 378, MID - 6, [['metanetwork']], 'fp-box');
  label(svg, 378, MID + 22, opts.boxMath, 'fp-math');
  arrow(svg, 452, 494, MID);

  drawNet(svg, 512, 740, opts.outWeights);
  label(svg, 626, H - 14, opts.outLabel, 'fp-label');
}

Object.assign(window.XP, { mlpWeights, mlpFigure });
})();
