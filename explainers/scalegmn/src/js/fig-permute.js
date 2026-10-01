// Figure 3 (interactive): permutation symmetry. Drag the hidden neurons of the
// 2-3-2 ReLU network into a new order; their weights travel with them. The
// weight matrices the metanetwork would read change, the function does not.
(function () {
const { svgPoint } = window.XP;
const { SUB, W1, W2, GEO, drawNet, drawMatrices, maxDiff } = window.XP.play;

const root = document.getElementById('fig-permute');
if (!root) return;
const svg = root.querySelector('svg');
const q = (role) => root.querySelector(`[data-role="${role}"]`);
const { XH, RH, SLOT } = GEO;

let order = [0, 1, 2]; // order[slot] = neuron id
const nodeY = [0, 1, 2].map((id) => SLOT[order.indexOf(id)]);
let active = -1; // neuron being dragged or hovered
let drag = null;

const w1 = (id, i) => W1[id][i];
const w2 = (o, id) => W2[o][id];
// The weights as stored, slot by slot: this is what changes under a permutation.
const flat = (ord) => [...ord.flatMap((id) => W1[id]), ...[0, 1].flatMap((o) => ord.map((id) => W2[o][id]))];

function redraw() {
  svg.replaceChildren();
  drawNet(svg, {
    nodeY, w1, w2, active,
    hidden(hg, id) {
      hg.setAttribute('aria-label', `hidden neuron ${id + 1}, slot ${order.indexOf(id) + 1}; drag or use the arrow keys to move it`);
      hg.addEventListener('pointerdown', (ev) => startDrag(ev, id));
      hg.addEventListener('keydown', (ev) => keyMove(ev, id));
    },
  });
  // Rows follow the live node positions, so the matrices reorder while dragging.
  drawMatrices(svg, { rows: [0, 1, 2].sort((a, b) => nodeY[a] - nodeY[b]), w1, w2, active });

  const base = flat([0, 1, 2]), cur = flat(order);
  q('dtheta').textContent = Math.hypot(...cur.map((v, i) => v - base[i])).toFixed(2);
  // Summing over hidden neurons does not depend on their order, so this holds by construction.
  const same = maxDiff({ w1, w2, act: 'relu' }, { w1, w2, act: 'relu' }) < 1e-9;
  const status = q('status');
  status.textContent = same ? '✓ same function' : '✕ different function';
  status.className = 'status ' + (same ? 'ok' : 'bad');
  q('order').textContent = order.map((id) => `h${SUB[id]}`).join(', ');
}

// ---- interaction ----
function startDrag(ev, id) {
  ev.preventDefault();
  drag = { id, dy: svgPoint(svg, ev).y - nodeY[id] };
  active = id;
  svg.setPointerCapture(ev.pointerId);
  redraw();
}
// Hover is hit-tested on coordinates: the nodes are redrawn on every change,
// so enter/leave events on them would not be reliable.
function setActive(id) {
  if (id === active) return;
  active = id;
  redraw();
}
svg.addEventListener('pointerleave', () => { if (!drag) setActive(-1); });
svg.addEventListener('pointermove', (ev) => {
  const p = svgPoint(svg, ev);
  if (!drag) {
    const hit = [0, 1, 2].find((id) => Math.hypot(p.x - XH, p.y - nodeY[id]) <= RH + 3);
    setActive(hit === undefined ? -1 : hit);
    return;
  }
  nodeY[drag.id] = Math.max(SLOT[0] - 20, Math.min(SLOT[2] + 20, p.y - drag.dy));
  redraw();
});
const endDrag = () => {
  if (!drag) return;
  drag = null;
  order = [0, 1, 2].sort((a, b) => nodeY[a] - nodeY[b]);
  settle();
};
svg.addEventListener('pointerup', endDrag);
svg.addEventListener('pointercancel', endDrag);

function keyMove(ev, id) {
  if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
  ev.preventDefault();
  const s = order.indexOf(id), t = s + (ev.key === 'ArrowUp' ? -1 : 1);
  if (t < 0 || t > 2) return;
  [order[s], order[t]] = [order[t], order[s]];
  active = id;
  settle(() => svg.querySelector(`.pm-hidden[data-id="${id}"]`).focus());
}

// Ease every hidden neuron into its slot.
function settle(done) {
  const from = nodeY.slice();
  const to = [0, 1, 2].map((id) => SLOT[order.indexOf(id)]);
  const dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280;
  const t0 = performance.now();
  const step = (now) => {
    const t = dur ? Math.min((now - t0) / dur, 1) : 1;
    const e = 1 - Math.pow(1 - t, 3);
    for (let id = 0; id < 3; id++) nodeY[id] = from[id] + (to[id] - from[id]) * e;
    redraw();
    if (t < 1) requestAnimationFrame(step);
    else if (done) done();
  };
  requestAnimationFrame(step);
}

q('shuffle').addEventListener('click', () => {
  const o = order.slice();
  do {
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
  } while (o.every((v, i) => v === order[i]));
  order = o;
  active = -1;
  settle();
});
q('reset').addEventListener('click', () => {
  order = [0, 1, 2];
  active = -1;
  settle();
});

redraw();
})();
