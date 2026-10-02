// Figure 4 (interactive): where training starts. At initialization most pairs sit
// near the mean similarity mu, so the model starts out predicting
// sigma(t * mu + b) for every pair. One log-scale axis shows that start for no
// bias, for SigLIP's b = -10, and for prior matching, b* = -ln(|B| - 1) - t * mu,
// against the batch prior 1/|B| where it should be.
(function () {
const { el } = window.XP;

const root = document.getElementById('fig-bias');
if (!root) return;
const svg = root.querySelector('svg');
const q = (role) => root.querySelector(`[data-role="${role}"]`);

const W = 860, H = 180, AX = { l: 60, r: 40, y: 118 };
const LOG_MIN = -12;
const state = { logB: 9, mu: 0, t: 10 };

const sup = (n) => String(n).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
// log10 of sigmoid(z), accurate far into the tail
const log10Sigmoid = (z) => (z >= 0 ? -Math.log1p(Math.exp(-z)) : z - Math.log1p(Math.exp(z))) / Math.LN10;
const X = (lp) => AX.l + ((Math.max(LOG_MIN, Math.min(0, lp)) - LOG_MIN) / -LOG_MIN) * (W - AX.l - AX.r);

function times(lp, prior) {
  const f = 10 ** Math.abs(lp - prior);
  if (f < 1.05) return 'on the prior';
  const n = f < 100 ? f.toFixed(1) : f < 1e5 ? Math.round(f).toLocaleString('en-US') : `${(f / 10 ** Math.floor(Math.log10(f))).toFixed(1)}·10${sup(Math.floor(Math.log10(f)))}`;
  return `${n}× too ${lp > prior ? 'high' : 'low'}`;
}

function draw() {
  svg.replaceChildren();
  const B = 2 ** state.logB;
  const prior = -Math.log10(B);
  const bStar = -Math.log(B - 1) - state.t * state.mu;

  // the axis, one tick per two decades
  el('line', { class: 'axis', x1: AX.l, x2: W - AX.r, y1: AX.y, y2: AX.y }, svg);
  for (let k = LOG_MIN; k <= 0; k += 2) {
    el('line', { class: 'axis', x1: X(k), x2: X(k), y1: AX.y, y2: AX.y + 6 }, svg);
    el('text', { class: 'tick-label', x: X(k), y: AX.y + 22, 'text-anchor': 'middle' }, svg).textContent = k === 0 ? '1' : `10${sup(k)}`;
  }
  el('text', { class: 'axis-label', x: (AX.l + W - AX.r) / 2, y: H - 8, 'text-anchor': 'middle' }, svg).textContent = 'predicted chance of a match at the start of training';

  // where training should start
  el('line', { class: 'prior', x1: X(prior), x2: X(prior), y1: 28, y2: AX.y }, svg);
  el('text', { class: 'prior-label', x: X(prior), y: 20, 'text-anchor': 'middle' }, svg).textContent = `batch prior 1/${B.toLocaleString('en-US')}, where b* starts`;

  // where it does start, for each choice of bias
  const starts = [
    { cls: 'dot-none', label: 'no bias', lp: log10Sigmoid(state.t * state.mu), y: 52 },
    { cls: 'dot-siglip', label: 'b = −10', lp: log10Sigmoid(state.t * state.mu - 10), y: 80 },
  ];
  starts.forEach(({ cls, label, lp, y }) => {
    const x = X(lp);
    el('line', { class: 'stem', x1: x, x2: x, y1: y + 6, y2: AX.y }, svg);
    el('circle', { class: cls, cx: x, cy: AX.y, r: 7 }, svg);
    const t = el('text', { class: 'dot-label', x, y, 'text-anchor': x > W - 150 ? 'end' : x < AX.l + 90 ? 'start' : 'middle' }, svg);
    t.textContent = `${label}: ${times(lp, prior)}`;
  });
  // prior matching always lands on the prior
  el('circle', { class: 'dot-star', cx: X(log10Sigmoid(state.t * state.mu + bStar)), cy: AX.y, r: 7 }, svg);
}

function sync() {
  q('n-val').textContent = (2 ** state.logB).toLocaleString('en-US');
  q('mu-val').textContent = state.mu.toFixed(2).replace('-', '−');
  q('t-val').textContent = String(state.t);
  draw();
}
q('n').addEventListener('input', (ev) => { state.logB = Number(ev.target.value); sync(); });
q('mu').addEventListener('input', (ev) => { state.mu = Number(ev.target.value); sync(); });
q('t').addEventListener('input', (ev) => { state.t = Number(ev.target.value); sync(); });
sync();
})();
