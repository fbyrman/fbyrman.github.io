// Figure 4 (interactive): scaling symmetry. Pick a hidden neuron and a factor q:
// its incoming weights are multiplied by q and, if compensation is on, its
// outgoing weights divided by q. Under ReLU any q > 0 keeps the function;
// under tanh only q = ±1 does.
(function () {
const { svgPoint } = window.XP;
const { SUB, W1, W2, GEO, fmt, drawNet, drawMatrices, maxDiff } = window.XP.play;

const root = document.getElementById('fig-scale');
if (!root) return;
const svg = root.querySelector('svg');
const q = (role) => root.querySelector(`[data-role="${role}"]`);
const { XH, RH, SLOT } = GEO;

const state = { act: 'relu', compensate: true, scale: [1, 1, 1], selected: 0 };

const w1 = (id, i) => state.scale[id] * W1[id][i];
const w2 = (o, id) => (state.compensate ? W2[o][id] / state.scale[id] : W2[o][id]);
const flat = (f1, f2) => [...[0, 1, 2].flatMap((id) => [f1(id, 0), f1(id, 1)]), ...[0, 1].flatMap((o) => [0, 1, 2].map((id) => f2(o, id)))];

const fmtQ = (v) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
const scaled = (id) => Math.abs(state.scale[id] - 1) > 1e-9;

function redraw() {
  svg.replaceChildren();
  drawNet(svg, {
    nodeY: SLOT, w1, w2, active: state.selected,
    // Every neuron shows its factor, and its edges show how their weights are made,
    // also at q = 1. Scaled ones are highlighted.
    badge: (id) => `q${SUB[id]} = ${fmtQ(state.scale[id])}`,
    label1: (id, i) => ({ text: `${fmt(W1[id][i])} q${SUB[id]}`, hi: scaled(id) }),
    label2: (o, id) => (state.compensate ? { text: `${fmt(W2[o][id])}/q${SUB[id]}`, hi: scaled(id) } : null),
    hidden(hg, id) {
      hg.setAttribute('aria-label', `hidden neuron ${id + 1}, scaled by ${fmtQ(state.scale[id])}; press Enter to select`);
      hg.setAttribute('aria-pressed', String(id === state.selected));
      hg.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          select(id);
          svg.querySelector(`.pm-hidden[data-id="${id}"]`).focus();
        }
      });
    },
  });
  drawMatrices(svg, { rows: [0, 1, 2], w1, w2, active: state.selected });

  const base = flat((id, i) => W1[id][i], (o, id) => W2[o][id]);
  const cur = flat(w1, w2);
  q('dtheta').textContent = Math.hypot(...cur.map((v, i) => v - base[i])).toFixed(2);
  const d = maxDiff({ w1: (id, i) => W1[id][i], w2: (o, id) => W2[o][id], act: state.act }, { w1, w2, act: state.act });
  const same = d < 1e-9;
  const status = q('status');
  status.textContent = same ? '✓ same function' : '✕ different function';
  status.className = 'status ' + (same ? 'ok' : 'bad');
}

// ---- controls ----
const slider = q('q');
function select(id) {
  state.selected = id;
  q('sel').textContent = `h${SUB[id]}`;
  q('q-name').textContent = `q${SUB[id]}`;
  slider.value = String(state.scale[id]);
  q('q-val').textContent = fmtQ(state.scale[id]);
  redraw();
}

slider.addEventListener('input', () => {
  let v = Number(slider.value);
  if (Math.abs(Math.abs(v) - 1) < 0.05) v = Math.sign(v); // snap to q = ±1
  if (Math.abs(v) < 0.1) v = 0.1 * (Math.sign(v) || 1); // q = 0 cannot be undone
  state.scale[state.selected] = v;
  q('q-val').textContent = fmtQ(v);
  redraw();
});

q('compensate').addEventListener('change', (ev) => {
  state.compensate = ev.target.checked;
  redraw();
});

root.querySelectorAll('[data-act]').forEach((b) =>
  b.addEventListener('click', () => {
    state.act = b.dataset.act;
    root.querySelectorAll('[data-act]').forEach((o) => o.setAttribute('aria-checked', String(o === b)));
    redraw();
  }),
);

q('reset').addEventListener('click', () => {
  state.scale = [1, 1, 1];
  state.compensate = true;
  q('compensate').checked = true;
  select(state.selected);
});

// Clicking near a hidden neuron selects it (the nodes are redrawn often).
svg.addEventListener('pointerdown', (ev) => {
  const p = svgPoint(svg, ev);
  const hit = [0, 1, 2].find((id) => Math.hypot(p.x - XH, p.y - SLOT[id]) <= RH + 4);
  if (hit !== undefined && hit !== state.selected) select(hit);
});

select(0);
})();
