// Figure 6 (interactive): the three geometric operations before and after the
// exponential map. Encoder outputs v1, v2 live in the flat plane on the left; the
// map carries them to x1, x2 on the hyperboloid on the right. Each row of the
// figure (.op-row, with data-op = dist | ext | aper) draws one operation in both spaces:
// the distance between the points, the exterior angle at the first point, or
// the half-aperture of the entailment cone at the first point.
(function () {
const { css, onTheme, setupCanvas, canvasPoint } = window.XP;
const G = window.XP.geo;

const fig = document.getElementById('fig-ops');
if (!fig) return;
const rows = [...fig.querySelectorAll('.op-row')].map(setup);

// one curvature slider and one reset for all three rows
const slider = fig.querySelector('[data-role="c"]');
function setC(c) {
  slider.value = String(Math.log10(c));
  fig.querySelector('[data-role="c-val"]').textContent = c < 1 ? c.toFixed(2) : c.toFixed(1);
  rows.forEach((r) => r.setC(c));
}
slider.addEventListener('input', () => setC(10 ** Number(slider.value)));
fig.querySelector('[data-role="reset"]').addEventListener('click', () => { rows.forEach((r) => r.reset()); setC(1); });
setC(1);

function setup(root) {
const OP = root.dataset.op;
const q = (role) => root.querySelector(`[data-role="${role}"]`);
const plane = q('plane');
const hyp = q('hyp');

const VIEW = 1.5;        // the plane shows [-VIEW, VIEW]^2
const MESH_CAP = 3;      // the hyperboloid mesh stops at sqrt(c) r = MESH_CAP
const ARC = 0.3;         // radius of the exterior-angle arc, in units of length

const polar = (r, deg) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
const START = OP === 'aper' ? { v1: polar(0.9, 25), v2: polar(1.1, 60) } : { v1: polar(0.55, 25), v2: polar(1.1, 60) };
const state = { v1: START.v1.slice(), v2: START.v2.slice(), c: 1, yaw: -0.55, pitch: 0.7, drag: null };
const POINTS = OP === 'aper' ? ['v1'] : ['v1', 'v2'];

const norm = (v) => Math.hypot(v[0], v[1]);
const angleOf = (v) => Math.atan2(v[1], v[0]);

function colours() {
  return {
    ink: css('--ink'), soft: css('--ink-soft'), rule: css('--rule'), accent: css('--accent'),
    gold: css('--gold'), p1: css('--c-p1'), p2: css('--c-p2'), surface: css('--eq-bg'),
  };
}

function dot(ctx, x, y, r, fill, ring) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = ring;
  ctx.stroke();
}

function label(ctx, text, sub, x, y, colour) {
  ctx.fillStyle = colour;
  ctx.font = 'italic 700 16px "Source Serif 4", Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  const w = ctx.measureText(text).width;
  ctx.font = '700 11px "Source Serif 4", Georgia, serif';
  ctx.fillText(sub, x + w + 1, y + 5);
}

// Label a point on the side facing away from the origin o (canvas coordinates).
function pointLabel(ctx, text, sub, p, o, colour) {
  let dx = p[0] - o[0], dy = p[1] - o[1];
  const n = Math.hypot(dx, dy);
  if (n < 1e-6) { dx = 1; dy = -1; } else { dx /= n; dy /= n; }
  const x = p[0] + 17 * dx, y = p[1] + 17 * dy;
  ctx.font = 'italic 700 16px "Source Serif 4", Georgia, serif';
  const w = ctx.measureText(text).width + 8;
  label(ctx, text, sub, x - w / 2 + (dx * w) / 2, y, colour);
}

function polyline(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
}

// Signed exterior angle at v1 toward v2, in the plane.
function extSignedE(v1, v2) {
  const u = [v1[0] / norm(v1), v1[1] / norm(v1)];
  const d = [v2[0] - v1[0], v2[1] - v1[1]];
  return Math.atan2(u[0] * d[1] - u[1] * d[0], u[0] * d[0] + u[1] * d[1]);
}

// Signed exterior angle at x1 toward x2, on the hyperboloid, in the frame (a, e).
function extSignedL(v1, x2, c) {
  const { a, e } = G.frameAt(v1, c);
  return Math.atan2(G.lor(x2, e), G.lor(x2, a));
}

// ---------------------------------------------------------------- the plane
function drawPlane(col) {
  const { ctx, w, h } = setupCanvas(plane);
  const s = (w / 2 - 14) / VIEW;
  const P = (v) => [w / 2 + v[0] * s, h / 2 - v[1] * s];
  const { v1, v2, c } = state;
  const r1 = norm(v1);
  ctx.clearRect(0, 0, w, h);

  // polar grid: the same rings and rays are drawn on the hyperboloid
  ctx.strokeStyle = col.rule;
  ctx.lineWidth = 1;
  for (let r = 0.25; r <= VIEW * 1.45; r += 0.25) {
    ctx.globalAlpha = Math.abs(r % 1) < 1e-9 ? 1 : 0.55;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r * s, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.55;
  for (let k = 0; k < 12; k++) {
    polyline(ctx, [P([0, 0]), P(polar(VIEW * 1.45, k * 30))]);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // entailment cone at v1 and the ball it avoids
  if (OP === 'aper') {
    const R = G.ballR(c);
    ctx.fillStyle = col.accent;
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, R * s, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = col.accent;
    ctx.stroke();
    ctx.setLineDash([]);

    const ap = G.aperE(r1, c), phi = angleOf(v1), L = 4;
    const at = (t) => [v1[0] + L * Math.cos(t), v1[1] + L * Math.sin(t)];
    const b1 = at(phi + ap), b2 = at(phi - ap);
    const wedge = [P(v1)];
    for (let i = 0; i <= 32; i++) wedge.push(P(at(phi - ap + (2 * ap * i) / 32)));
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = col.gold;
    polyline(ctx, wedge);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = col.gold;
    ctx.lineWidth = 1.4;
    polyline(ctx, [P(b1), P(v1), P(b2)]);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // outward continuation of the ray through v1
  const u = [v1[0] / r1, v1[1] / r1];
  if (OP !== 'dist') {
    ctx.strokeStyle = col.soft;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    polyline(ctx, [P([0, 0]), P(v1), P([v1[0] + 0.55 * u[0], v1[1] + 0.55 * u[1]])]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // the exterior angle at v1, between the outward ray and the direction to v2
  if (OP === 'ext') {
    const ext = extSignedE(v1, v2), phi = angleOf(v1);
    const arc = [];
    for (let i = 0; i <= 40; i++) {
      const t = phi + (ext * i) / 40;
      arc.push(P([v1[0] + ARC * Math.cos(t), v1[1] + ARC * Math.sin(t)]));
    }
    ctx.strokeStyle = col.gold;
    ctx.lineWidth = 3;
    polyline(ctx, arc);
    ctx.stroke();
  }

  // the geodesic: a straight segment
  if (OP !== 'aper') {
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = OP === 'dist' ? 3 : 1.6;
    polyline(ctx, [P(v1), P(v2)]);
    ctx.stroke();
  }

  const O = P([0, 0]);
  dot(ctx, O[0], O[1], 4, col.soft, col.surface);
  ctx.fillStyle = col.soft;
  ctx.font = '600 12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('0', O[0] - 6, O[1] + 4);

  [[v1, col.p1, '1'], [v2, col.p2, '2']].slice(0, POINTS.length).forEach(([v, fill, sub]) => {
    const p = P(v);
    dot(ctx, p[0], p[1], 7, fill, col.surface);
    pointLabel(ctx, 'v', sub, p, O, col.ink);
  });

  return { s, P };
}

// ----------------------------------------------------------- the hyperboloid
function drawHyp(col) {
  const { ctx, w, h } = setupCanvas(hyp);
  const { v1, v2, c } = state;
  const sc = Math.sqrt(c);
  const r1 = norm(v1), r2 = norm(v2);
  ctx.clearRect(0, 0, w, h);

  // The camera frames the mesh (and the points, if they lie beyond it).
  const rMesh = Math.min(VIEW, MESH_CAP / sc);
  const rFit = Math.max(rMesh, r1, r2);
  const t0 = 1 / sc;
  const tMax = Math.cosh(sc * rFit) / sc;
  const sMax = Math.sinh(sc * rFit) / sc;
  const centre = (t0 + tMax) / 2;
  const scale = (w / 2 - 22) / Math.hypot(sMax, (tMax - t0) / 2 + 0.15 * sMax);
  const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
  const cp = Math.cos(state.pitch), spch = Math.sin(state.pitch);
  // Projection to the canvas, plus a depth in [-1, 1] (positive = far away).
  const P = (x) => {
    const xr = x[0] * cy - x[1] * sy;
    const yr = x[0] * sy + x[1] * cy;
    const t = x[2] - centre;
    return [w / 2 + scale * xr, h / 2 + 0.1 * h - scale * (t * cp + yr * spch), (yr * cp - t * spch) / (sMax + 1e-9)];
  };

  // A curve on the surface, fainter where it runs along the back.
  function curve(pts3, colour, width, alpha, dash) {
    const pts = pts3.map(P);
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.setLineDash(dash || []);
    for (let i = 1; i < pts.length; i++) {
      const depth = (pts[i - 1][2] + pts[i][2]) / 2;
      ctx.globalAlpha = alpha * (depth > 0 ? 1 - 0.55 * Math.min(depth, 1) : 1);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }

  const ring = (r, n = 120) => Array.from({ length: n + 1 }, (_, i) => G.expO(polar(r, (360 * i) / n), c));
  const ray = (deg, rTo, n = 40) => Array.from({ length: n + 1 }, (_, i) => G.expO(polar((rTo * i) / n, deg), c));

  // tangent plane at the origin, where the encoder outputs live before the map
  const lifted = (v) => [v[0], v[1], t0];
  const tp = Array.from({ length: 121 }, (_, i) => lifted(polar(rMesh, (360 * i) / 120)));
  curve(tp, col.soft, 1, 0.45, [2, 4]);

  // mesh: images of the plane's rings and rays
  for (let r = 0.25; r <= rMesh + 1e-9; r += 0.25) curve(ring(r), col.soft, Math.abs(r % 1) < 1e-9 ? 1.3 : 1, 0.4);
  if (rMesh % 0.25 > 1e-6) curve(ring(rMesh), col.soft, 1.3, 0.4);
  for (let k = 0; k < 12; k++) curve(ray(k * 30, rMesh), col.soft, 1, 0.32);

  const x1 = G.expO(v1, c), x2 = G.expO(v2, c);
  const { a, e } = G.frameAt(v1, c);

  if (OP === 'aper') {
    // inside this circle the half-aperture is saturated at pi/2, like the ball on the left
    const rSat = Math.asinh(2 * G.K) / sc;
    curve(ring(rSat), col.accent, 1.2, 0.8, [4, 4]);

    const ap = G.aperL(r1, c);
    const L = 1.4 * Math.max(rMesh - r1, 0.6);
    const side = (sgn) => Array.from({ length: 41 }, (_, i) =>
      G.expAt(x1, G.comb(((L * i) / 40) * Math.cos(ap), a, sgn * ((L * i) / 40) * Math.sin(ap), e), c));
    const s1 = side(1), s2 = side(-1);
    const rim = Array.from({ length: 33 }, (_, i) => {
      const t = ap - (2 * ap * i) / 32;
      return G.expAt(x1, G.comb(L * Math.cos(t), a, L * Math.sin(t), e), c);
    });
    const fill = [...s1, ...rim, ...s2.slice().reverse()].map(P);
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = col.gold;
    polyline(ctx, fill);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    curve(s1, col.gold, 1.4, 0.9);
    curve(s2, col.gold, 1.4, 0.9);
  }

  // lift lines: from v on the tangent plane down to x = exp(v) on the surface
  [[v1, x1], [v2, x2]].slice(0, POINTS.length).forEach(([v, x]) => {
    const p = P(lifted(v)), q2 = P(x);
    ctx.strokeStyle = col.soft;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    polyline(ctx, [p, q2]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(p[0], p[1], 3.5, 0, 2 * Math.PI);
    ctx.strokeStyle = col.soft;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });

  // radial geodesic through x1 and its outward continuation
  const u = [v1[0] / r1, v1[1] / r1];
  if (OP !== 'dist') {
    const radial = Array.from({ length: 41 }, (_, i) => G.expO([u[0] * (r1 + 0.55) * i / 40, u[1] * (r1 + 0.55) * i / 40], c));
    curve(radial, col.soft, 1.4, 1, [5, 4]);
  }

  // exterior angle, drawn as a small arc of geodesic radius ARC around x1
  if (OP === 'ext') {
    const ext = extSignedL(v1, x2, c);
    const arc = Array.from({ length: 41 }, (_, i) => {
      const t = (ext * i) / 40;
      return G.expAt(x1, G.comb(ARC * Math.cos(t), a, ARC * Math.sin(t), e), c);
    });
    curve(arc, col.gold, 3, 1);
  }

  // the geodesic between x1 and x2
  if (OP !== 'aper') curve(G.geodesic(x1, x2, c, 80), col.ink, OP === 'dist' ? 3 : 1.6, 1);

  const O = P([0, 0, t0]);
  dot(ctx, O[0], O[1], 4, col.soft, col.surface);
  ctx.fillStyle = col.soft;
  ctx.font = '600 12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillText('0', O[0] - 16, O[1] - 3);
  ctx.font = '600 9px Inter, system-ui, sans-serif';
  ctx.fillText('L', O[0] - 8, O[1] + 1);

  [[x1, col.p1, '1'], [x2, col.p2, '2']].slice(0, POINTS.length).forEach(([x, fill, sub]) => {
    const p = P(x);
    dot(ctx, p[0], p[1], 7, fill, col.surface);
    pointLabel(ctx, 'x', sub, p, O, col.ink);
  });
}

// ---------------------------------------------------------------- readout
function fmt(x) { return x.toFixed(3); }
function deg(x) { return ((x * 180) / Math.PI).toFixed(1) + '°'; }

function readout() {
  const { v1, v2, c } = state;
  const r1 = norm(v1), r2 = norm(v2);
  let th = Math.abs(angleOf(v2) - angleOf(v1));
  if (th > Math.PI) th = 2 * Math.PI - th;
  const [E, L, R] = {
    dist: [fmt(G.distE(r1, r2, th)), fmt(G.distL(r1, r2, th, c)), G.ratioD(r1, r2, th, c)],
    ext: [deg(G.extE(r1, r2, th)), deg(G.extL(r1, r2, th, c)), G.ratioExt(r1, r2, th, c)],
    aper: [deg(G.aperE(r1, c)), deg(G.aperL(r1, c)), G.ratioAper(r1, c)],
  }[OP];
  q('E').textContent = E;
  q('L').textContent = L;
  q('R').textContent = R.toFixed(3);
}

function draw() {
  const col = colours();
  drawPlane(col);
  drawHyp(col);
  readout();
}

// ---------------------------------------------------------------- controls
function setC(c) {
  state.c = c;
  draw();
}
function reset() {
  state.v1 = START.v1.slice();
  state.v2 = START.v2.slice();
  state.yaw = -0.55;
  state.pitch = 0.7;
}

// Drag v1 or v2 on the plane.
function planeWorld(ev) {
  const w = Number(plane.dataset.w), h = Number(plane.dataset.h);
  const [px, py] = canvasPoint(plane, ev, w, h);
  const s = (w / 2 - 14) / VIEW;
  return [(px - w / 2) / s, (h / 2 - py) / s];
}
plane.addEventListener('pointerdown', (ev) => {
  const p = planeWorld(ev);
  const s = (Number(plane.dataset.w) / 2 - 14) / VIEW;
  const d1 = Math.hypot(p[0] - state.v1[0], p[1] - state.v1[1]) * s;
  const d2 = POINTS.length > 1 ? Math.hypot(p[0] - state.v2[0], p[1] - state.v2[1]) * s : Infinity;
  const hit = Math.min(d1, d2) < 18 ? (d1 <= d2 ? 'v1' : 'v2') : null;
  if (!hit) return;
  state.drag = hit;
  plane.setPointerCapture(ev.pointerId);
  plane.classList.add('is-dragging');
});
plane.addEventListener('pointermove', (ev) => {
  const p = planeWorld(ev);
  if (!state.drag) {
    const s = (Number(plane.dataset.w) / 2 - 14) / VIEW;
    const near = POINTS.map((k) => state[k]).some((v) => Math.hypot(p[0] - v[0], p[1] - v[1]) * s < 18);
    plane.style.cursor = near ? 'grab' : 'default';
    return;
  }
  let r = norm(p);
  // keep points off the origin (the exterior angle needs a direction) and in view
  const rr = Math.min(Math.max(r, 0.08), VIEW);
  if (r < 1e-9) r = 1;
  state[state.drag] = [(p[0] / r) * rr, (p[1] / r) * rr];
  draw();
});
const endDrag = () => { state.drag = null; plane.classList.remove('is-dragging'); };
plane.addEventListener('pointerup', endDrag);
plane.addEventListener('pointercancel', endDrag);

// Rotate the hyperboloid by dragging it.
let rot = null;
hyp.addEventListener('pointerdown', (ev) => {
  rot = { x: ev.clientX, y: ev.clientY, yaw: state.yaw, pitch: state.pitch };
  hyp.setPointerCapture(ev.pointerId);
});
hyp.addEventListener('pointermove', (ev) => {
  if (!rot) return;
  state.yaw = rot.yaw + (ev.clientX - rot.x) * 0.01;
  state.pitch = Math.min(1.45, Math.max(-0.2, rot.pitch + (ev.clientY - rot.y) * 0.01));
  drawHyp(colours());
});
hyp.addEventListener('pointerup', () => { rot = null; });
hyp.addEventListener('pointercancel', () => { rot = null; });

onTheme(draw);
window.addEventListener('resize', draw);
return { setC, reset };
}
})();
