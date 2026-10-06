// Figures 3 and 6 (interactive): naming a neuron in a two-dimensional sketch of
// CLIP space. Four word embeddings are fixed; the two neurons' dictionary vectors
// can be dragged. Each neuron is named after the word at the smallest angle, and
// its cosine score is the cosine of that angle. Where the figure has a
// "fine-tune" button (Figure 6), it rotates both vectors most of the way to their
// names, as our fine-tuning does.
(function () {
const { el, svgPoint } = window.XP;

const CX = 212, CY = 176, R = 118;
const WORDS = [
  { name: 'street', deg: 112 },
  { name: 'intersection', deg: 62 },
  { name: 'sunlight', deg: 196 },
  { name: 'pink', deg: 318 },
];
const START = [12, 262];
const rad = (d) => (d * Math.PI) / 180;
const pt = (deg, r) => [CX + r * Math.cos(rad(deg)), CY - r * Math.sin(rad(deg))];
const diff = (a, b) => ((((a - b) % 360) + 540) % 360) - 180;

function nameOf(deg) {
  let best = null;
  for (const w of WORDS) {
    const c = Math.cos(rad(diff(deg, w.deg)));
    if (!best || c > best.cos) best = { word: w, cos: c };
  }
  return best;
}

function setup(root) {
  const svg = root.querySelector('svg');
  const q = (role) => root.querySelector(`[data-role="${role}"]`);
  const state = { deg: START.slice() };

  let dragging = -1;

  function draw() {
    svg.replaceChildren();
    el('rect', { class: 'plane', x: 12, y: 8, width: 400, height: 344, rx: 3 }, svg);
    el('circle', { class: 'unit', cx: CX, cy: CY, r: R }, svg);
    el('text', { class: 'lbl', x: 24, y: 340 }, svg).textContent = 'CLIP space (sketch)';

    const named = state.deg.map(nameOf);

    // word embeddings
    WORDS.forEach((w) => {
      const [x, y] = pt(w.deg, R);
      el('line', { class: 'txt-vec', x1: CX, y1: CY, x2: x, y2: y }, svg);
      el('circle', { class: 'txt-dot', cx: x, cy: y, r: 3.5 }, svg);
      const [lx, ly] = pt(w.deg, R + 20);
      const anchor = Math.cos(rad(w.deg)) > 0.3 ? 'start' : Math.cos(rad(w.deg)) < -0.3 ? 'end' : 'middle';
      const isNamed = named.some((n) => n.word === w);
      el('text', { class: isNamed ? 'word is-named' : 'word', x: lx, y: ly + 5, 'text-anchor': anchor }, svg).textContent = w.name;
    });

    // dictionary vectors, the angle to their name, and their handles
    state.deg.forEach((deg, i) => {
      const cls = `p${i + 1}`;
      const n = named[i];
      const a0 = deg, a1 = n.word.deg, d = diff(a1, a0);
      const r = 34 + 12 * i;
      const [sx, sy] = pt(a0, r);
      const [ex, ey] = pt(a1, r);
      el('path', { class: `angle ${cls}`, d: `M${sx},${sy} A${r},${r} 0 0 ${d > 0 ? 0 : 1} ${ex},${ey}` }, svg);
      const [x, y] = pt(deg, R * 0.82);
      el('line', { class: `dict ${cls}`, x1: CX, y1: CY, x2: x, y2: y }, svg);
      const h = el('circle', { class: `handle ${cls}`, cx: x, cy: y, r: 9 }, svg);
      h.addEventListener('pointerdown', (ev) => {
        dragging = i;
        svg.setPointerCapture(ev.pointerId);
        ev.preventDefault();
      });
    });
    el('circle', { cx: CX, cy: CY, r: 3, fill: 'var(--ink-soft)' }, svg);

    // readout: name and cosine score per neuron
    const RX = 430, BW = 300;
    el('text', { class: 'lbl', x: RX, y: 48 }, svg).textContent = 'name and cosine score';
    named.forEach((n, i) => {
      const y0 = 100 + i * 120;
      const cls = `p${i + 1}`;
      el('text', { class: 'lbl-strong', x: RX, y: y0 }, svg).textContent = `neuron ${i + 1}`;
      el('text', { class: `pname ${cls}`, x: RX + 80, y: y0 }, svg).textContent = `“${n.word.name}”`;
      el('rect', { class: 'bar-bg', x: RX, y: y0 + 16, width: BW, height: 14, rx: 2 }, svg);
      el('rect', { class: `score-bar ${cls}`, x: RX, y: y0 + 16, width: Math.max(0, n.cos) * BW, height: 14, rx: 2 }, svg);
      el('text', { class: 'val', x: RX + BW + 10, y: y0 + 28 }, svg).textContent = n.cos.toFixed(2);
      el('text', { class: 'lbl', x: RX, y: y0 + 52 }, svg).textContent =
        n.cos > 0.95 ? 'the name fits' : n.cos > 0.8 ? 'a reasonable fit' : 'named anyway: no word is close';
    });
  }

  svg.addEventListener('pointermove', (ev) => {
    if (dragging < 0) return;
    const p = svgPoint(svg, ev);
    state.deg[dragging] = (Math.atan2(CY - p.y, p.x - CX) * 180) / Math.PI;
    draw();
  });
  const stop = () => { dragging = -1; };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);

  // rotate each vector from where it is to `target(i)` over a short animation
  function animate(target, ms) {
    const from = state.deg.slice();
    const to = from.map((d, i) => d + diff(target(i), d));
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      state.deg = from.map((d, i) => d + (to[i] - d) * e);
      draw();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  q('reset').addEventListener('click', () => animate((i) => START[i], 650));
  const tune = q('tune');
  if (tune) {
    tune.addEventListener('click', () => {
      const names = state.deg.map((d) => nameOf(d).word.deg);
      animate((i) => state.deg[i] + diff(names[i], state.deg[i]) * 0.92, 1400);
    });
  }

  draw();
}

document.querySelectorAll('.naming-fig').forEach(setup);
})();
