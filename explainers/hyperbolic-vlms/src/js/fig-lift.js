// Figure 5 (interactive): the exponential map. Top: where it sits in a
// hyperbolic VLM, after Euclidean encoders. Bottom: an encoder output v lives in
// the tangent plane at the origin of the hyperboloid; the map rolls it onto the
// surface, to the point x at geodesic distance ||v|| in the direction of v.
(function () {
const { el, css, onTheme, setupCanvas, photo } = window.XP;
const G = window.XP.geo;

const root = document.getElementById('fig-lift');
if (!root) return;
const q = (role) => root.querySelector(`[data-role="${role}"]`);
const svg = q('pipeline');
const canvas = q('scene');
const PAIRS = window.XP.PAIRS;

// ---- pipeline diagram -----------------------------------------------------------
function arrow(x1, y, x2) {
  el('line', { class: 'cl-arrow', x1, y1: y, x2, y2: y }, svg);
  el('path', { class: 'cl-head', d: `M${x2} ${y}l-7 -4v8z` }, svg);
}
function box(x, y, w, h, text, cls) {
  el('rect', { class: cls, x, y: y - h / 2, width: w, height: h, rx: 6 }, svg);
  el('text', { class: 'cl-encoder-label', x: x + w / 2, y: y + 5, 'text-anchor': 'middle' }, svg).textContent = text;
}
function pipeline() {
  svg.replaceChildren();
  el('rect', { class: 'lf-band', x: 150, y: 6, width: 420, height: 128, rx: 6 }, svg);
  el('rect', { class: 'lf-band is-hyp', x: 676, y: 6, width: 170, height: 128, rx: 6 }, svg);
  el('text', { class: 'lf-band-label', x: 360, y: 24, 'text-anchor': 'middle' }, svg).textContent = 'Euclidean';
  el('text', { class: 'lf-band-label', x: 761, y: 24, 'text-anchor': 'middle' }, svg).textContent = 'hyperbolic';
  const rows = [
    { y: 56, input: () => photo(svg, PAIRS[0].img, 112, 56, 40, 5), enc: 'Image encoder' },
    { y: 108, input: () => { el('text', { class: 'tr-caption', x: 134, y: 113, 'text-anchor': 'end' }, svg).textContent = `“${PAIRS[0].caption}”`; }, enc: 'Text encoder' },
  ];
  rows.forEach(({ y, input, enc }) => {
    input();
    arrow(140, y, 168);
    box(172, y, 150, 34, enc, 'cl-encoder');
    arrow(324, y, 352);
    el('text', { class: 'cl-vec', x: 378, y: y + 5, 'text-anchor': 'middle' }, svg).textContent = 'v ∈ ℝⁿ';
    arrow(408, y, 436);
    box(440, y, 110, 34, 'exp map', 'lf-exp');
    arrow(552, y, 700);
    const t = el('text', { class: 'cl-vec', x: 744, y: y + 5, 'text-anchor': 'middle' }, svg);
    t.textContent = 'x ∈ 𝕃';
    el('tspan', { 'font-size': '10px', dy: -7 }, t).textContent = 'n';
    el('tspan', { 'font-size': '10px', dx: -6, dy: 12 }, t).textContent = 'c';
  });
}

// ---- the map, in 3D -------------------------------------------------------------
const C = 1, R_MAX = 2;
const state = { r: 1.4, dir: 35, yaw: -0.5, pitch: 0.45 };

function scene() {
  const { ctx, w, h } = setupCanvas(canvas);
  const col = { ink: css('--ink'), soft: css('--ink-soft'), accent: css('--accent'), p1: css('--c-p1'), p2: css('--c-p2'), surface: css('--eq-bg'), gold: css('--gold') };
  ctx.clearRect(0, 0, w, h);

  const sMax = Math.sinh(R_MAX), tMax = Math.cosh(R_MAX), t0 = 1;
  const centre = (t0 + tMax) / 2;
  const scale = (h / 2 - 16) / Math.hypot((tMax - t0) / 2, 0.45 * sMax);
  const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw), cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
  const P = (x) => {
    const xr = x[0] * cy - x[1] * sy, yr = x[0] * sy + x[1] * cy, t = x[2] - centre;
    return [w / 2 + scale * xr, h / 2 + 0.12 * h - scale * (t * cp + yr * sp), (yr * cp - t * sp) / sMax];
  };
  function curve(pts, colour, width, alpha, dash) {
    const ps = pts.map(P);
    ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    for (let i = 1; i < ps.length; i++) {
      const depth = (ps[i - 1][2] + ps[i][2]) / 2;
      ctx.globalAlpha = alpha * (depth > 0 ? 1 - 0.55 * Math.min(depth, 1) : 1);
      ctx.beginPath(); ctx.moveTo(ps[i - 1][0], ps[i - 1][1]); ctx.lineTo(ps[i][0], ps[i][1]); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.setLineDash([]);
  }
  const polar = (r, deg) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
  const lift = (v) => [v[0], v[1], t0];

  // hyperboloid mesh
  for (let r = 0.5; r <= R_MAX + 1e-9; r += 0.5) curve(Array.from({ length: 121 }, (_, i) => G.expO(polar(r, 3 * i), C)), col.soft, 1, 0.35);
  for (let k = 0; k < 12; k++) curve(Array.from({ length: 41 }, (_, i) => G.expO(polar((R_MAX * i) / 40, k * 30), C)), col.soft, 1, 0.28);

  // tangent plane at the origin: a translucent square with a light grid
  const S = R_MAX;
  const corners = [[-S, -S], [S, -S], [S, S], [-S, S]].map((v) => P(lift(v)));
  ctx.globalAlpha = 0.16; ctx.fillStyle = col.accent;
  ctx.beginPath(); corners.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  for (let g = -S; g <= S + 1e-9; g += 0.5) {
    curve([lift([g, -S]), lift([g, S])], col.accent, 1, 0.25);
    curve([lift([-S, g]), lift([S, g])], col.accent, 1, 0.25);
  }

  // v in the plane, and its image: the geodesic from the origin, of the same length
  const v = polar(state.r, state.dir);
  const x = G.expO(v, C);
  const O = P([0, 0, t0]);
  const vt = P(lift(v)), xt = P(x);
  curve([lift([0, 0]), lift(v)], col.p1, 3, 1);
  const a = Math.atan2(vt[1] - O[1], vt[0] - O[0]);
  ctx.fillStyle = col.p1;
  ctx.beginPath(); ctx.moveTo(vt[0], vt[1]);
  ctx.lineTo(vt[0] - 11 * Math.cos(a - 0.4), vt[1] - 11 * Math.sin(a - 0.4));
  ctx.lineTo(vt[0] - 11 * Math.cos(a + 0.4), vt[1] - 11 * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
  const u = state.r > 1e-9 ? [v[0] / state.r, v[1] / state.r] : [1, 0];
  curve(Array.from({ length: 61 }, (_, i) => G.expO([u[0] * (state.r * i) / 60, u[1] * (state.r * i) / 60], C)), col.p2, 3, 1);
  // how the map moves points: from the tip of v down onto the surface
  curve([lift(v), x], col.soft, 1.2, 0.9, [3, 4]);

  const dot = (p, r, fill) => { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col.surface; ctx.stroke(); };
  dot(O, 4.5, col.ink);
  dot(xt, 7, col.p2);
  const lab = (t, sub, p, dx, dy) => {
    ctx.fillStyle = col.ink; ctx.font = 'italic 700 16px "Source Serif 4", Georgia, serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(t, p[0] + dx, p[1] + dy);
    if (sub) { const tw = ctx.measureText(t).width; ctx.font = '600 10px Inter, sans-serif'; ctx.fillText(sub, p[0] + dx + tw + 1, p[1] + dy + 5); }
  };
  lab('v', '', vt, 10, -12);
  lab('x', '', xt, 12, 4);
  lab('0', 'L', O, -22, -12);

}

// ---- controls -------------------------------------------------------------------
q('r').addEventListener('input', (ev) => { state.r = Number(ev.target.value); q('r-val').textContent = state.r.toFixed(2); scene(); });
q('dir').addEventListener('input', (ev) => { state.dir = Number(ev.target.value); q('dir-val').textContent = `${state.dir}°`; scene(); });
let rot = null;
canvas.addEventListener('pointerdown', (ev) => { rot = { x: ev.clientX, y: ev.clientY, yaw: state.yaw, pitch: state.pitch }; canvas.setPointerCapture(ev.pointerId); });
canvas.addEventListener('pointermove', (ev) => {
  if (!rot) return;
  state.yaw = rot.yaw + (ev.clientX - rot.x) * 0.01;
  state.pitch = Math.min(1.4, Math.max(-0.1, rot.pitch + (ev.clientY - rot.y) * 0.01));
  scene();
});
const end = () => { rot = null; };
canvas.addEventListener('pointerup', end);
canvas.addEventListener('pointercancel', end);

pipeline();
scene();
onTheme(scene);
window.addEventListener('resize', scene);
})();
