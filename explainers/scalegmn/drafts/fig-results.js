// Figure 4: Table 1 of the paper as result against wall-clock time.
import { css, onTheme, el } from './common.js';

const root = document.getElementById('fig-results');
if (root) init(root);

// Table 1 (tanh networks, greyscale CIFAR-10). Times in seconds per network.
const DATA = {
  cnn: {
    init: { acc: 37.9, loss: 3.233, sparsity: 0 },
    meta: { acc: [50.3, 0.055], loss: [1.901, 0.055], sparsity: [87.6, 0.055] },
    broken: { acc: [51.5, 0.054], loss: [1.982, 0.054], sparsity: [85.3, 0.054] },
    sgd: {
      epochs: [25, 50, 100, 150],
      acc: [[41.0, 59.5], [41.6, 119], [43.5, 238], [44.5, 357]],
      loss: [[2.651, 82.5], [2.474, 165], [2.189, 330], [2.07, 495]],
      sparsity: [[35.9, 82.5], [50.7, 165], [64.4, 330], [70.9, 495]],
    },
  },
  mlp: {
    init: { acc: 34.5, loss: 3.258, sparsity: 0 },
    meta: { acc: [35.4, 0.056], loss: [1.964, 0.07], sparsity: [85.2, 0.07] },
    broken: { acc: [35.0, 0.054], loss: [2.074, 0.068], sparsity: [77.4, 0.068] },
    sgd: {
      epochs: [25, 50, 100, 150],
      acc: [[35.5, 80], [35.8, 160], [36.3, 320], [36.7, 480]],
      loss: [[2.18, 101], [2.095, 201], [2.016, 402], [1.963, 603]],
      sparsity: [[26.2, 101], [38.8, 201], [50.1, 402], [55.2, 603]],
    },
  },
};

const METRIC = {
  acc: { label: 'average test accuracy (%)', fmt: (v) => `${v.toFixed(1)}%`, better: 'higher' },
  loss: { label: 'test loss, CE + L1 (lower is better)', fmt: (v) => v.toFixed(3), better: 'lower' },
  sparsity: { label: 'reduction in L1 norm (%)', fmt: (v) => `${v.toFixed(1)}%`, better: 'higher' },
};

function fmtTime(t) {
  if (t < 1) return `${t.toFixed(3)} s`;
  if (t < 120) return `${t.toFixed(0)} s`;
  return `${(t / 60).toFixed(1)} min`;
}

function init(root) {
  const svg = root.querySelector('[data-role="chart"]');
  const tip = root.querySelector('[data-role="tip"]');
  const state = { metric: 'acc', arch: 'cnn' };

  const VW = 760, VH = 360;
  const m = { l: 60, r: 28, t: 18, b: 50 };
  const pw = VW - m.l - m.r, ph = VH - m.t - m.b;
  const TMIN = 0.025, TMAX = 1200;
  const X = (t) => m.l + ((Math.log10(t) - Math.log10(TMIN)) / (Math.log10(TMAX) - Math.log10(TMIN))) * pw;

  function draw() {
    const d = DATA[state.arch];
    const key = state.metric;
    const meta = METRIC[key];
    const c = { meta: css('--c-meta'), sgd: css('--c-sgd'), broken: css('--c-broken'), panel: css('--eq-bg') };

    const ys = [d.init[key], d.meta[key][0], d.broken[key][0], ...d.sgd[key].map((p) => p[0])];
    let lo = Math.min(...ys), hi = Math.max(...ys);
    const pad = (hi - lo) * 0.12;
    lo -= pad;
    hi += pad;
    const Y = (v) => m.t + ((hi - v) / (hi - lo)) * ph;

    svg.replaceChildren();
    // Grid and y ticks.
    const span = hi - lo;
    const step = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 25].find((s) => span / s <= 6) || 50;
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
      el('line', { x1: m.l, x2: m.l + pw, y1: Y(v), y2: Y(v), class: 'grid' }, svg);
      const t = el('text', { x: m.l - 8, y: Y(v) + 4, class: 'tick', 'text-anchor': 'end' }, svg);
      t.textContent = String(+v.toFixed(2));
    }
    // X ticks.
    for (const [t, label] of [[0.1, '0.1 s'], [1, '1 s'], [10, '10 s'], [60, '1 min'], [600, '10 min']]) {
      el('line', { x1: X(t), x2: X(t), y1: m.t + ph, y2: m.t + ph + 5, class: 'axis' }, svg);
      const tx = el('text', { x: X(t), y: m.t + ph + 20, class: 'tick', 'text-anchor': 'middle' }, svg);
      tx.textContent = label;
    }
    el('line', { x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph, class: 'axis' }, svg);
    const xl = el('text', { x: m.l + pw / 2, y: VH - 6, class: 'axis-label', 'text-anchor': 'middle' }, svg);
    xl.textContent = 'time per network (log scale)';
    const yl = el('text', { x: 14, y: m.t + ph / 2, class: 'axis-label', 'text-anchor': 'middle', transform: `rotate(-90 14 ${m.t + ph / 2})` }, svg);
    yl.textContent = meta.label;

    // Before fine-tuning.
    el('line', { x1: m.l, x2: m.l + pw, y1: Y(d.init[key]), y2: Y(d.init[key]), class: 'init-line' }, svg);

    const marks = [];
    // SGD: connected points, direct labels with the epoch count.
    const sgdPts = d.sgd[key].map(([v, t]) => [X(t), Y(v)]);
    el('polyline', { points: sgdPts.map((p) => p.join(',')).join(' '), fill: 'none', stroke: c.sgd, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
    d.sgd[key].forEach(([v, t], i) => {
      const [x, y] = sgdPts[i];
      el('circle', { cx: x, cy: y, r: 4.5, fill: c.sgd, class: 'ringed' }, svg);
      const lab = el('text', { x, y: y - 11, class: 'point-label', 'text-anchor': 'middle' }, svg);
      lab.textContent = `${d.sgd.epochs[i]} ep`;
      marks.push({ x, y, title: `SGD, ${d.sgd.epochs[i]} epochs`, v, t });
    });

    // Metanetworks: nudge labels apart when the two points nearly coincide.
    const pm = [X(d.meta[key][1]), Y(d.meta[key][0])];
    const pb = [X(d.broken[key][1]), Y(d.broken[key][0])];
    let lm = pm[1] + 4, lb = pb[1] + 4;
    if (Math.abs(lm - lb) < 16) {
      const mid = (lm + lb) / 2;
      const up = pm[1] <= pb[1];
      lm = mid + (up ? -8 : 8);
      lb = mid + (up ? 8 : -8);
    }
    el('circle', { cx: pb[0], cy: pb[1], r: 5, fill: c.panel, stroke: c.broken, 'stroke-width': 2.2 }, svg);
    el('circle', { cx: pm[0], cy: pm[1], r: 5.5, fill: c.meta, class: 'ringed' }, svg);
    const tm = el('text', { x: pm[0] + 12, y: lm, class: 'point-label strong' }, svg);
    tm.textContent = 'ScaleGMN-B';
    const tb = el('text', { x: pb[0] + 12, y: lb, class: 'point-label' }, svg);
    tb.textContent = 'symmetry broken';
    marks.push({ x: pm[0], y: pm[1], title: 'ScaleGMN-B, one forward pass', v: d.meta[key][0], t: d.meta[key][1] });
    marks.push({ x: pb[0], y: pb[1], title: 'GMN-B, symmetry broken', v: d.broken[key][0], t: d.broken[key][1] });

    const il = el('text', { x: m.l + pw - 4, y: Y(d.init[key]) + (Y(d.init[key]) > m.t + ph - 20 ? -6 : 14), class: 'point-label', 'text-anchor': 'end' }, svg);
    il.textContent = `before fine-tuning: ${meta.fmt(d.init[key])}`;

    // Hover targets, larger than the marks.
    for (const mk of marks) {
      const hit = el('circle', { cx: mk.x, cy: mk.y, r: 14, class: 'hit', tabindex: 0 }, svg);
      const show = () => {
        tip.hidden = false;
        tip.innerHTML = `<strong>${mk.title}</strong><br>${meta.fmt(mk.v)} · ${fmtTime(mk.t)}`;
        const box = svg.getBoundingClientRect();
        const left = (mk.x / VW) * box.width;
        const top = (mk.y / VH) * box.height;
        tip.style.left = `${Math.min(Math.max(left, 80), box.width - 80)}px`;
        tip.style.top = `${top}px`;
      };
      hit.addEventListener('pointerenter', show);
      hit.addEventListener('focus', show);
      hit.addEventListener('pointerleave', () => (tip.hidden = true));
      hit.addEventListener('blur', () => (tip.hidden = true));
    }
  }

  const bind = (attr, field) =>
    root.querySelectorAll(`[data-${attr}]`).forEach((b) =>
      b.addEventListener('click', () => {
        state[field] = b.dataset[attr];
        root.querySelectorAll(`[data-${attr}]`).forEach((o) => o.setAttribute('aria-checked', String(o === b)));
        tip.hidden = true;
        draw();
      }),
    );
  bind('metric', 'metric');
  bind('arch', 'arch');

  onTheme(draw);
  draw();
}
