// Figure 3: scaling orbits of a one-neuron network u(x) = v ReLU(w x), and why
// a map on weights should be equivariant to them.
import { css, onTheme, setupCanvas, canvasPoint, ramp, paintField, arrowHead, el } from './common.js';

const root = document.getElementById('fig-orbits');
if (root) init(root);

function init(root) {
  const q = (role) => root.querySelector(`[data-role="${role}"]`);
  const plane = q('plane');
  const { ctx, w: W, h: H } = setupCanvas(plane);
  const sweep = q('sweep');

  // Plot area inside the canvas, and the weight-plane window it shows.
  const M = { l: 46, r: 14, t: 14, b: 40 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;
  const WMIN = 0, WMAX = 3.2, VMIN = -0.6, VMAX = 2.6;
  const toPx = (w, v) => [M.l + ((w - WMIN) / (WMAX - WMIN)) * PW, M.t + ((VMAX - v) / (VMAX - VMIN)) * PH];
  const toWV = (x, y) => [WMIN + ((x - M.l) / PW) * (WMAX - WMIN), VMAX - ((y - M.t) / PH) * (VMAX - VMIN)];

  const BASE = [0.7, 0.45];
  let base = BASE.slice();
  let logq = 0;
  const QSPAN = 1.1;

  const input = () => {
    const s = Math.exp(logq);
    return [base[0] * s, base[1] / s];
  };

  // Equivariant toy map: canonicalise to the balanced point |w| = |v| of the
  // orbit, improve the function there, then undo the canonicalisation.
  function equivariant([w, v]) {
    let p = w * v;
    if (Math.abs(p) < 1e-3) p = 1e-3 * (Math.sign(v) || 1);
    const wc = Math.sqrt(Math.abs(p));
    const s = w / wc;
    const p2 = p + 0.75 * (1 - p);
    const r = Math.sqrt(Math.abs(p2));
    return [r * s, (Math.sign(p2) * r) / s];
  }

  // Map without canonicalisation: one large gradient step on (wv - 1)^2.
  function broken([w, v]) {
    const e = 2 * (w * v - 1);
    const lr = 0.32;
    return [w - lr * e * v, v - lr * e * w];
  }

  function colours() {
    return {
      land: ramp([css('--land-0'), css('--land-1'), css('--land-2'), css('--land-3')]),
      ink: css('--ink'),
      muted: css('--ink-soft'),
      panel: css('--eq-bg'),
      meta: css('--c-meta'),
      broken: css('--c-broken'),
    };
  }

  // ---- weight plane ----
  function orbitPath(target, c0, from = WMIN + 0.01, to = WMAX) {
    target.beginPath();
    let started = false;
    for (let i = 0; i <= 300; i++) {
      const w = from + ((to - from) * i) / 300;
      const v = c0 / w;
      if (v < VMIN - 0.5 || v > VMAX + 0.5) {
        started = false;
        continue;
      }
      const [x, y] = toPx(w, v);
      if (!started) target.moveTo(x, y);
      else target.lineTo(x, y);
      started = true;
    }
  }

  function dot(x, y, r, fill, ring) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (ring) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = ring;
      ctx.stroke();
    }
  }

  function curvedArrow(a, b, colour, bend) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const cx = mx - dy * bend, cy = my + dx * bend;
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.quadraticCurveTo(cx, cy, b[0], b[1]);
    ctx.stroke();
    const t = 0.9;
    const px = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * cx + t * t * b[0];
    const py = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cy + t * t * b[1];
    if (Math.hypot(dx, dy) > 12) arrowHead(ctx, px, py, b[0], b[1], 9);
    ctx.restore();
  }

  function drawPlane() {
    const c = colours();
    ctx.clearRect(0, 0, W, H);

    // Loss field (wv - 1)^2, clipped for display.
    const nx = 120, ny = 110;
    const f = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const w = WMIN + ((WMAX - WMIN) * i) / (nx - 1);
        const v = VMAX - ((VMAX - VMIN) * j) / (ny - 1);
        f[j * nx + i] = Math.pow(Math.min((w * v - 1) ** 2, 3) / 3, 0.45);
      }
    }
    paintField(ctx, f, nx, ny, c.land, M.l, M.t, PW, PH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(M.l, M.t, PW, PH);
    ctx.clip();

    // Orbit family.
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.22;
    for (const c0 of [-1, -0.5, -0.2, 0.2, 0.5, 1.5, 2.2, 3.2, 4.5]) {
      orbitPath(ctx, c0);
      ctx.stroke();
    }
    // Solutions: the orbit wv = 1.
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([2, 4]);
    orbitPath(ctx, 1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    const th = input();
    const pin = th[0] * th[1];
    const eq = equivariant(th);
    const br = broken(th);

    // Input orbit, and the orbit the equivariant output lives on.
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1.8;
    orbitPath(ctx, pin);
    ctx.stroke();
    ctx.strokeStyle = c.meta;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 5]);
    orbitPath(ctx, eq[0] * eq[1]);
    ctx.stroke();
    ctx.setLineDash([]);

    const a = toPx(...th), e = toPx(...eq), b = toPx(...br);
    curvedArrow(a, b, c.broken, -0.18);
    curvedArrow(a, e, c.meta, 0.18);
    dot(b[0], b[1], 6, c.broken, c.panel);
    dot(e[0], e[1], 6, c.meta, c.panel);
    dot(a[0], a[1], 7.5, c.ink, c.panel);
    ctx.restore();

    // Label for the solution orbit.
    ctx.save();
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = c.ink;
    ctx.globalAlpha = 0.75;
    const lp = toPx(2.75, 1 / 2.75);
    ctx.fillText('wv = 1', lp[0] - 18, lp[1] - 8);
    ctx.restore();

    // Axes.
    ctx.save();
    ctx.strokeStyle = c.muted;
    ctx.fillStyle = c.muted;
    ctx.lineWidth = 1;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const w of [0, 1, 2, 3]) {
      const [x] = toPx(w, 0);
      ctx.fillText(String(w), x, H - M.b + 16);
    }
    ctx.textAlign = 'right';
    for (const v of [0, 1, 2]) {
      const [, y] = toPx(0, v);
      ctx.fillText(String(v), M.l - 8, y + 4);
    }
    ctx.font = 'italic 700 15px Charter, Georgia, serif';
    ctx.fillStyle = c.ink;
    ctx.textAlign = 'center';
    ctx.fillText('w', M.l + PW / 2, H - 6);
    ctx.fillText('v', 14, M.t + PH / 2);
    ctx.restore();

    q('p-in').textContent = `slope ${pin.toFixed(3)}`;
    q('p-eq').textContent = `slope ${(eq[0] * eq[1]).toFixed(3)}`;
    q('p-br').textContent = `slope ${(br[0] * br[1]).toFixed(3)}`;
  }

  // ---- sweep: returned slope against position on the input orbit ----
  function drawSweep() {
    const c = colours();
    sweep.replaceChildren();
    const m = { l: 42, r: 12, t: 16, b: 46 };
    const sw = 300 - m.l - m.r, sh = 400 - m.t - m.b;
    const qs = Array.from({ length: 121 }, (_, i) => -QSPAN + (2 * QSPAN * i) / 120);
    const at = (lq) => {
      const s = Math.exp(lq);
      return [base[0] * s, base[1] / s];
    };
    const eqv = qs.map((lq) => { const o = equivariant(at(lq)); return o[0] * o[1]; });
    const brv = qs.map((lq) => { const o = broken(at(lq)); return o[0] * o[1]; });
    const pin = base[0] * base[1];
    let lo = Math.min(0, pin, ...eqv, ...brv), hi = Math.max(1.2, pin, ...eqv, ...brv);
    lo = Math.max(lo, -1.5);
    hi = Math.min(hi, 3);
    const pad = (hi - lo) * 0.06;
    lo -= pad;
    hi += pad;
    const X = (lq) => m.l + ((lq + QSPAN) / (2 * QSPAN)) * sw;
    const Y = (v) => m.t + ((hi - Math.max(lo, Math.min(hi, v))) / (hi - lo)) * sh;

    // Grid and ticks.
    const step = hi - lo > 2.4 ? 1 : 0.5;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      el('line', { x1: m.l, x2: m.l + sw, y1: Y(v), y2: Y(v), class: 'grid' }, sweep);
      const t = el('text', { x: m.l - 7, y: Y(v) + 4, class: 'tick', 'text-anchor': 'end' }, sweep);
      t.textContent = String(+v.toFixed(1));
    }
    for (const qq of [0.5, 1, 2]) {
      const x = X(Math.log(qq));
      const t = el('text', { x, y: m.t + sh + 18, class: 'tick', 'text-anchor': 'middle' }, sweep);
      t.textContent = String(qq);
    }
    const xl = el('text', { x: m.l + sw / 2, y: 392, class: 'axis-label', 'text-anchor': 'middle' }, sweep);
    xl.textContent = 'position on the input orbit, q';
    const yl = el('text', { x: 12, y: m.t + sh / 2, class: 'axis-label', 'text-anchor': 'middle', transform: `rotate(-90 12 ${m.t + sh / 2})` }, sweep);
    yl.textContent = 'slope of the returned function';

    // Target slope and input slope.
    el('line', { x1: m.l, x2: m.l + sw, y1: Y(1), y2: Y(1), class: 'ref' }, sweep);
    const tl = el('text', { x: m.l + sw - 2, y: Y(1) - 5, class: 'tick', 'text-anchor': 'end' }, sweep);
    tl.textContent = 'target';
    el('line', { x1: m.l, x2: m.l + sw, y1: Y(pin), y2: Y(pin), class: 'ref input' }, sweep);
    const il = el('text', { x: m.l + sw - 2, y: Y(pin) + 14, class: 'tick', 'text-anchor': 'end' }, sweep);
    il.textContent = 'input';

    const line = (vals, colour) =>
      el('polyline', {
        points: qs.map((lq, i) => `${X(lq).toFixed(1)},${Y(vals[i]).toFixed(1)}`).join(' '),
        fill: 'none', stroke: colour, 'stroke-width': 2, 'stroke-linejoin': 'round',
      }, sweep);
    line(brv, c.broken);
    line(eqv, c.meta);

    const cx = X(logq);
    el('line', { x1: cx, x2: cx, y1: m.t, y2: m.t + sh, class: 'cursor' }, sweep);
    const th = input();
    const e = equivariant(th), b = broken(th);
    el('circle', { cx, cy: Y(b[0] * b[1]), r: 5, fill: c.broken, class: 'ringed' }, sweep);
    el('circle', { cx, cy: Y(e[0] * e[1]), r: 5, fill: c.meta, class: 'ringed' }, sweep);
  }

  function redraw() {
    drawPlane();
    drawSweep();
  }

  // ---- interaction ----
  let dragging = false;
  const onDrag = (ev) => {
    const [x, y] = canvasPoint(plane, ev, W, H);
    let [w, v] = toWV(x, y);
    w = Math.max(0.12, Math.min(WMAX - 0.05, w));
    v = Math.max(VMIN + 0.05, Math.min(VMAX - 0.05, v));
    const s = Math.exp(logq);
    base = [w / s, v * s];
    redraw();
  };
  plane.addEventListener('pointerdown', (ev) => {
    const [x, y] = canvasPoint(plane, ev, W, H);
    const a = toPx(...input());
    if (Math.hypot(x - a[0], y - a[1]) > 26) return;
    dragging = true;
    plane.setPointerCapture(ev.pointerId);
  });
  plane.addEventListener('pointermove', (ev) => {
    if (dragging) onDrag(ev);
    else {
      const [x, y] = canvasPoint(plane, ev, W, H);
      const a = toPx(...input());
      plane.style.cursor = Math.hypot(x - a[0], y - a[1]) <= 26 ? 'grab' : 'default';
    }
  });
  plane.addEventListener('pointerup', () => (dragging = false));
  plane.addEventListener('pointercancel', () => (dragging = false));

  const slider = q('logq');
  slider.addEventListener('input', () => {
    logq = Number(slider.value);
    q('q-val').textContent = Math.exp(logq).toFixed(2);
    redraw();
  });
  q('reset').addEventListener('click', () => {
    base = BASE.slice();
    logq = 0;
    slider.value = '0';
    q('q-val').textContent = '1.00';
    redraw();
  });

  onTheme(redraw);
  redraw();
}
