// Figure 2: reorder and rescale the hidden neurons of a small network and see
// that the function it computes does not change (unless the move is not a symmetry).
import { css, onTheme, setupCanvas, ramp, paintField, contour, svgPoint, el } from './common.js';

const root = document.getElementById('fig-neurons');
if (root) init(root);

function init(root) {
  const q = (role) => root.querySelector(`[data-role="${role}"]`);
  const net = q('net');
  const fnCanvas = q('fn');
  const { ctx, w: FW, h: FH } = setupCanvas(fnCanvas);

  // Original network: 2 inputs, 4 hidden neurons, 1 output.
  const W1 = [[1.5, -0.7], [-0.9, 1.3], [0.6, 1.2], [-1.2, -0.8]];
  const B1 = [0.3, -0.2, -0.6, 0.5];
  const W2 = [1.2, -1.0, 0.9, -0.8];
  const B2 = -0.15;
  const SUB = ['₁', '₂', '₃', '₄'];

  const state = {
    act: 'relu',
    compensate: true,
    order: [0, 1, 2, 3], // order[slot] = neuron id
    scale: [1, 1, 1, 1], // per neuron id
    selected: 0,
  };

  const sigma = (z) => (state.act === 'relu' ? Math.max(0, z) : Math.tanh(z));

  // Parameters as stored, slot by slot: what a metanetwork would actually read.
  function params() {
    const w1 = [], b1 = [], w2 = [];
    for (const id of state.order) {
      const s = state.scale[id];
      w1.push([s * W1[id][0], s * W1[id][1]]);
      b1.push(s * B1[id]);
      w2.push(state.compensate ? W2[id] / s : W2[id]);
    }
    return { w1, b1, w2, b2: B2 };
  }
  const original = { w1: W1, b1: B1, w2: W2, b2: B2 };
  const flat = (p) => [...p.w1.flat(), ...p.b1, ...p.w2, p.b2];

  function evalNet(p, x, y, act) {
    let out = p.b2;
    for (let k = 0; k < 4; k++) {
      const z = p.w1[k][0] * x + p.w1[k][1] * y + p.b1[k];
      out += p.w2[k] * (act === 'relu' ? Math.max(0, z) : Math.tanh(z));
    }
    return out;
  }

  // ---- network diagram ----
  const IN = [[48, 110], [48, 190]];
  const OUT = [332, 150];
  const HX = 190;
  const slotY = (s) => 45 + s * 70;
  const nodeY = [0, 1, 2, 3].map((id) => slotY(state.order.indexOf(id)));

  function edgeStyle(w, c) {
    const a = Math.abs(w);
    return {
      stroke: w >= 0 ? c.pos : c.neg,
      'stroke-width': Math.min(0.8 + 2.4 * Math.pow(a, 0.85), 9).toFixed(2),
      'stroke-opacity': '0.8',
      'stroke-linecap': 'round',
    };
  }

  function drawNet() {
    const c = colours();
    const p = params();
    net.replaceChildren();
    const gEdges = el('g', {}, net);
    const gNodes = el('g', {}, net);

    state.order.forEach((id, slot) => {
      const y = nodeY[id];
      IN.forEach(([ix, iy], j) => el('line', { x1: ix, y1: iy, x2: HX, y2: y, ...edgeStyle(p.w1[slot][j], c) }, gEdges));
      el('line', { x1: HX, y1: y, x2: OUT[0], y2: OUT[1], ...edgeStyle(p.w2[slot], c) }, gEdges);
    });

    IN.forEach(([x, y], j) => {
      el('circle', { cx: x, cy: y, r: 13, class: 'node io' }, gNodes);
      const t = el('text', { x, y: y + 5, class: 'node-label' }, gNodes);
      t.textContent = `x${SUB[j]}`;
    });
    el('circle', { cx: OUT[0], cy: OUT[1], r: 13, class: 'node io' }, gNodes);
    const tu = el('text', { x: OUT[0], y: OUT[1] + 5, class: 'node-label' }, gNodes);
    tu.textContent = 'u';

    [0, 1, 2, 3].forEach((id) => {
      const y = nodeY[id];
      const g = el('g', { class: 'hidden-node' + (id === state.selected ? ' is-selected' : ''), tabindex: 0, role: 'button', 'aria-label': `hidden neuron ${id + 1}` }, gNodes);
      el('circle', { cx: HX, cy: y, r: 17, class: 'node hid' }, g);
      const t = el('text', { x: HX, y: y + 5, class: 'node-label' }, g);
      t.textContent = `h${SUB[id]}`;
      const s = state.scale[id];
      if (Math.abs(s - 1) > 1e-9) {
        const tq = el('text', { x: HX + 26, y: y + 4, class: 'node-scale' }, g);
        tq.textContent = `×${s.toFixed(2)}`;
      }
      g.addEventListener('pointerdown', (ev) => startDrag(ev, id));
      g.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          select(id);
        }
        if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
          ev.preventDefault();
          const slot = state.order.indexOf(id);
          const to = slot + (ev.key === 'ArrowUp' ? -1 : 1);
          if (to < 0 || to > 3) return;
          [state.order[slot], state.order[to]] = [state.order[to], state.order[slot]];
          tweenToSlots(() => net.querySelectorAll('.hidden-node')[id]?.focus());
        }
      });
    });
  }

  // ---- dragging to permute ----
  let drag = null;
  function startDrag(ev, id) {
    ev.preventDefault();
    select(id);
    drag = { id, dy: svgPoint(net, ev).y - nodeY[id] };
    net.setPointerCapture(ev.pointerId);
  }
  net.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    nodeY[drag.id] = Math.max(28, Math.min(272, svgPoint(net, ev).y - drag.dy));
    drawNet();
    drawFn();
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    state.order = [0, 1, 2, 3].sort((a, b) => nodeY[a] - nodeY[b]);
    tweenToSlots();
  };
  net.addEventListener('pointerup', endDrag);
  net.addEventListener('pointercancel', endDrag);

  function tweenToSlots(done) {
    const from = nodeY.slice();
    const to = [0, 1, 2, 3].map((id) => slotY(state.order.indexOf(id)));
    const t0 = performance.now();
    const dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260;
    const step = (now) => {
      const t = dur ? Math.min((now - t0) / dur, 1) : 1;
      const e = 1 - Math.pow(1 - t, 3);
      for (let id = 0; id < 4; id++) nodeY[id] = from[id] + (to[id] - from[id]) * e;
      redraw();
      if (t < 1) requestAnimationFrame(step);
      else if (done) done();
    };
    requestAnimationFrame(step);
  }

  // ---- function heatmap ----
  const N = 110;
  const R = 2.2;
  function grid(p, act) {
    const f = new Float32Array(N * N);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = -R + (2 * R * i) / (N - 1);
        const y = R - (2 * R * j) / (N - 1);
        f[j * N + i] = evalNet(p, x, y, act);
      }
    }
    return f;
  }

  let lastDiff = 0;
  function drawFn() {
    const c = colours();
    const ref = grid(original, state.act);
    const cur = grid(params(), state.act);
    let M = 0;
    for (const v of ref) M = Math.max(M, Math.abs(v));
    const div = ramp([c.neg, c.mid, c.pos]);
    paintField(ctx, cur, N, N, (v) => div(0.5 + v / (2 * M)), 0, 0, FW, FH);

    const sx = FW / (N - 1), sy = FH / (N - 1);
    // Original zero line, dotted.
    ctx.fillStyle = c.ink;
    contour(ref, N, N, 0).forEach(([a], k) => {
      if (k % 3) return;
      ctx.beginPath();
      ctx.arc(a[0] * sx, a[1] * sy, 1.3, 0, Math.PI * 2);
      ctx.fill();
    });
    // Current zero line, solid.
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const [a, b] of contour(cur, N, N, 0)) {
      ctx.moveTo(a[0] * sx, a[1] * sy);
      ctx.lineTo(b[0] * sx, b[1] * sy);
    }
    ctx.stroke();

    lastDiff = 0;
    for (let k = 0; k < cur.length; k++) lastDiff = Math.max(lastDiff, Math.abs(cur[k] - ref[k]));
  }

  // ---- parameter bars ----
  const paramsSvg = q('params');
  function drawParams() {
    const c = colours();
    const cur = flat(params());
    const orig = flat(original);
    paramsSvg.replaceChildren();
    const groups = [['W₁', 8], ['b₁', 4], ['W₂', 4], ['b₂', 1]];
    const left = 14, gap = 22, bw = 30, mid = 62, scale = 18;
    let x = left, k = 0;
    el('line', { x1: 0, y1: mid, x2: 760, y2: mid, class: 'zero' }, paramsSvg);
    for (const [name, n] of groups) {
      const x0 = x;
      for (let i = 0; i < n; i++, k++) {
        const v = Math.max(-3, Math.min(3, cur[k]));
        const h = Math.abs(v) * scale;
        el('rect', {
          x: x + 3, y: v >= 0 ? mid - h : mid, width: bw - 6, height: Math.max(h, 0.5),
          rx: 2, fill: cur[k] >= 0 ? c.pos : c.neg,
        }, paramsSvg);
        const o = Math.max(-3, Math.min(3, orig[k]));
        el('line', { x1: x + 1, x2: x + bw - 1, y1: mid - o * scale, y2: mid - o * scale, class: 'orig-tick' }, paramsSvg);
        x += bw;
      }
      const t = el('text', { x: (x0 + x) / 2, y: 116, class: 'group-label' }, paramsSvg);
      t.textContent = name;
      x += gap;
    }
    const d = Math.hypot(...cur.map((v, i) => v - orig[i]));
    q('dtheta').textContent = `‖θ′ − θ‖ = ${d.toFixed(2)}`;
  }

  function drawStatus() {
    const same = lastDiff < 1e-6;
    q('df').textContent = `max |u′ − u| = ${lastDiff < 5e-4 ? '0.000' : lastDiff.toFixed(3)}`;
    const s = q('status');
    s.textContent = same ? '✓ same function' : '✕ different function';
    s.className = 'status ' + (same ? 'ok' : 'bad');
  }

  function colours() {
    return {
      pos: css('--c-meta'),
      neg: css('--warm'),
      mid: css('--div-mid'),
      ink: css('--ink'),
    };
  }

  function redraw() {
    drawNet();
    drawFn();
    drawParams();
    drawStatus();
  }

  // ---- controls ----
  const qInput = q('q');
  function select(id) {
    state.selected = id;
    q('sel-name').textContent = `h${SUB[id]}`;
    qInput.value = String(state.scale[id]);
    q('q-val').textContent = state.scale[id].toFixed(2);
    drawNet();
  }

  qInput.addEventListener('input', () => {
    let v = Number(qInput.value);
    if (Math.abs(Math.abs(v) - 1) < 0.05) v = Math.sign(v); // snap to the sign flips
    if (Math.abs(v) < 0.15) v = 0.15 * (Math.sign(v) || 1); // q = 0 is not invertible
    state.scale[state.selected] = v;
    q('q-val').textContent = v.toFixed(2);
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

  q('shuffle').addEventListener('click', () => {
    const o = state.order.slice();
    do {
      for (let i = o.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [o[i], o[j]] = [o[j], o[i]];
      }
    } while (o.every((v, i) => v === state.order[i]));
    state.order = o;
    tweenToSlots();
  });

  q('reset').addEventListener('click', () => {
    state.order = [0, 1, 2, 3];
    state.scale = [1, 1, 1, 1];
    state.compensate = true;
    q('compensate').checked = true;
    select(state.selected);
    tweenToSlots();
  });

  onTheme(redraw);
  select(0);
  redraw();
}
