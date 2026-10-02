// Figure 2 (interactive): softmax against sigmoid on one small batch. Both panels
// start from the same similarities between three images (rows) and three
// captions (columns). Softmax turns every row into one multiple-choice question,
// so its probabilities in a row sum to 1; sigmoid asks a separate yes-or-no
// question in every cell. The slider changes a single similarity: under softmax
// the whole row responds, under sigmoid only that cell.
(function () {
const { el, photo } = window.XP;

const root = document.getElementById('fig-losses');
if (!root) return;
const svg = root.querySelector('svg');
const q = (role) => root.querySelector(`[data-role="${role}"]`);
const PAIRS = window.XP.PAIRS;

const TAU = 0.1;            // softmax temperature
const T = 10, BIAS = -5;    // sigmoid temperature and bias
const BASE = [[0.8, 0.3, 0.1], [0.35, 0.7, 0.15], [0.1, 0.2, 0.6]];
const EDIT = [0, 1];        // the score the slider controls: the dog photo against "cat"

const CELL = 74;
const PANELS = [
  { x: 70, title: 'Softmax', sub: 'one multiple-choice question per row', kind: 'softmax' },
  { x: 500, title: 'Sigmoid', sub: 'one yes-or-no question per cell', kind: 'sigmoid' },
];
const Y0 = 96;

let s = BASE.map((r) => r.slice());

const softmaxRow = (row) => { const e = row.map((v) => Math.exp(v / TAU)); const z = e.reduce((a, b) => a + b, 0); return e.map((v) => v / z); };
const sigmoid = (v) => 1 / (1 + Math.exp(-(T * v + BIAS)));
const probs = (kind, sim = s) => (kind === 'softmax' ? sim.map(softmaxRow) : sim.map((r) => r.map(sigmoid)));

function draw() {
  svg.replaceChildren();
  const now = { softmax: probs('softmax'), sigmoid: probs('sigmoid') };
  // cells that moved away from their value at the starting scores are outlined
  const base = { softmax: probs('softmax', BASE), sigmoid: probs('sigmoid', BASE) };

  PANELS.forEach(({ x, title, sub, kind }) => {
    el('text', { class: 'ls-title', x, y: 22 }, svg).textContent = title;
    el('text', { class: 'ls-sub', x, y: 42 }, svg).textContent = sub;
    PAIRS.forEach((p, j) => {
      el('text', { class: 'ls-col', x: x + CELL * (j + 0.5), y: Y0 - 12, 'text-anchor': 'middle' }, svg).textContent = `“${p.short}”`;
    });
    const P = now[kind];
    PAIRS.forEach((p, i) => {
      photo(svg, p.img, x - 30, Y0 + CELL * (i + 0.5), 42, 4);
      if (kind === 'softmax') {
        // the row is one question: a frame around it, and its sum
        el('rect', { class: 'ls-row', x: x - 2, y: Y0 + CELL * i + 1, width: CELL * 3 + 4, height: CELL - 2, rx: 6 }, svg);
        el('text', { class: 'ls-sum', x: x + CELL * 3 + 10, y: Y0 + CELL * (i + 0.5) + 4 }, svg).textContent = 'Σ = 1';
      }
      PAIRS.forEach((_, j) => {
        const v = P[i][j];
        const cx = x + CELL * j, cy = Y0 + CELL * i;
        const changed = Math.abs(base[kind][i][j] - v) > 0.005;
        el('rect', { class: 'ls-cell-bg', x: cx + 4, y: cy + 4, width: CELL - 8, height: CELL - 8, rx: 4 }, svg);
        el('rect', { class: 'ls-cell', x: cx + 4, y: cy + 4, width: CELL - 8, height: CELL - 8, rx: 4, 'fill-opacity': 0.08 + 0.85 * v }, svg);
        if (i === j) el('rect', { class: 'ls-target', x: cx + 4, y: cy + 4, width: CELL - 8, height: CELL - 8, rx: 4 }, svg);
        if (changed) el('rect', { class: 'ls-changed', x: cx + 1.5, y: cy + 1.5, width: CELL - 3, height: CELL - 3, rx: 6 }, svg);
        el('text', { class: 'ls-val' + (v > 0.45 ? ' on-dark' : ''), x: cx + CELL / 2, y: cy + CELL / 2 + 5, 'text-anchor': 'middle' }, svg).textContent = v.toFixed(2);
      });
    });
    const legend = kind === 'softmax' ? 'target: the matching caption gets all the probability' : 'target: 1 on the diagonal, 0 everywhere else';
    el('text', { class: 'ls-sub', x, y: Y0 + CELL * 3 + 26 }, svg).textContent = legend;
  });
}

const slider = q('s');
slider.addEventListener('input', () => {
  s = BASE.map((r) => r.slice());
  s[EDIT[0]][EDIT[1]] = Number(slider.value);
  q('s-val').textContent = Number(slider.value).toFixed(2);
  draw();
});
draw();
})();
