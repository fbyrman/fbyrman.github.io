// Figure 7 (interactive): the distance ratio as a volume and a slice through it.
// It depends on (r1, r2, theta) at a given curvature, so it fills a cube. Left: the cube, cut at the chosen r1. Right: that cut, the 2D slice over
// (theta, r2) that the paper reports.
(function () {
const { css, onTheme, setupCanvas, ramp } = window.XP;
const G = window.XP.geo;

const root = document.getElementById('fig-cube');
if (!root) return;
const q = (role) => root.querySelector(`[data-role="${role}"]`);
const canvas = q('canvas');

const W = 860, H = 470;
const R_MIN = 0.05, R_MAX = 1.5;                 // range of both radii
const SL = { x: 500, y: 30, w: 330, h: 320 };    // slice panel
const NF = 64;                                   // grid per cube face
const NS = 120;                                  // grid of the slice

const state = { r1: 0.8, c: 1 };

const rad = (t) => R_MIN + t * (R_MAX - R_MIN);
const value = (u, v, w) => G.ratioD(rad(w), rad(v), Math.max(1e-4, Math.min(Math.PI - 1e-4, u * Math.PI)), state.c);

// ---- cube projection: u = theta (right), v = r2 (up), w = r1 (into the page) ----
const S = 260, OX = 58, OY = 380, DX = 0.5 * S * Math.cos(Math.PI / 6), DY = 0.5 * S * Math.sin(Math.PI / 6);
const proj = (u, v, w) => [OX + S * u + DX * w, OY - S * v - DY * w];

// Paint a field over a parallelogram face: (s, t) in [0,1]^2 -> world (u, v, w).
function face(ctx, colour, map, n) {
  const off = document.createElement('canvas');
  off.width = n; off.height = n;
  const octx = off.getContext('2d');
  const img = octx.createImageData(n, n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const [u, v, w] = map((i + 0.5) / n, (j + 0.5) / n);
    const c = colour(value(u, v, w));
    const k = 4 * (j * n + i);
    img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  const o = proj(...map(0, 0)), a = proj(...map(1, 0)), b = proj(...map(0, 1));
  ctx.save();
  ctx.transform((a[0] - o[0]) / n, (a[1] - o[1]) / n, (b[0] - o[0]) / n, (b[1] - o[1]) / n, o[0], o[1]);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, 0, 0);
  ctx.restore();
}

function draw() {
  const { ctx } = setupCanvas(canvas);
  ctx.clearRect(0, 0, W, H);
  const col = { ink: css('--ink'), soft: css('--ink-soft'), rule: css('--rule'), surface: css('--eq-bg'), accent: css('--accent') };

  // colour scale: fitted to the largest deviation from 1 in the slice
  const slice = new Float64Array(NS * NS);
  for (let j = 0; j < NS; j++) for (let i = 0; i < NS; i++) slice[j * NS + i] = value((i + 0.5) / NS, 1 - (j + 0.5) / NS, wOf(state.r1));
  let span = 1e-4;
  slice.forEach((x) => { span = Math.max(span, Math.abs(x - 1)); });
  const base = ramp([css('--div-lo'), css('--div-mid'), css('--div-hi')]);
  const colour = (x) => base(0.5 + (x - 1) / (2 * span));

  // ---- the cube, cut at w = ws: the part behind the cut is solid ----
  const ws = wOf(state.r1);
  const shade = (map, alpha) => {   // darken a face a little so the block reads as 3D
    const pts = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([s, t]) => proj(...map(s, t)));
    ctx.globalAlpha = alpha; ctx.fillStyle = col.ink;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  };
  const top = (s, t) => [s, 1, 1 - t * (1 - ws)], side = (s, t) => [1, 1 - t, ws + s * (1 - ws)];
  face(ctx, colour, top, NF); shade(top, 0.06);
  face(ctx, colour, side, NF); shade(side, 0.12);
  face(ctx, colour, (s, t) => [s, 1 - t, ws], NF);                       // the cut itself
  // the part of the cube in front of the cut: dashed wireframe, then the cut's outline
  const line = (pts, style, width, dash) => {
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = proj(...p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    ctx.setLineDash([]);
  };
  line([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]], col.soft, 1, [3, 3]);
  [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([u, v]) => line([[u, v, 0], [u, v, ws]], col.soft, 1, [3, 3]));
  line([[0, 0, ws], [1, 0, ws], [1, 1, ws], [0, 1, ws], [0, 0, ws]], col.ink, 2);
  // and the outer edges of the solid part behind it
  line([[1, 0, ws], [1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 1, ws]], col.soft, 1);
  line([[1, 1, ws], [1, 1, 1]], col.soft, 1);

  // axis labels on the cube
  ctx.fillStyle = col.ink;
  ctx.font = 'italic 700 15px "Source Serif 4", Georgia, serif';
  ctx.textAlign = 'center';
  let p = proj(0.5, 0, 0); ctx.fillText('θ', p[0], p[1] + 22);
  p = proj(0, 0.5, 0); ctx.fillText('r₂', p[0] - 18, p[1]);
  p = proj(1, 0, 0.5); ctx.textAlign = 'left'; ctx.fillText('r₁', p[0] + 14, p[1] + 16);
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillStyle = col.soft;
  p = proj(0, 0, 0); ctx.textAlign = 'center'; ctx.fillText('0', p[0], p[1] + 18);
  p = proj(1, 0, 0); ctx.fillText('π', p[0], p[1] + 18);
  p = proj(0, 1, ws); ctx.textAlign = 'left'; ctx.fillStyle = col.ink; ctx.font = '600 12px Inter, system-ui, sans-serif';
  ctx.fillText(`cut at r₁ = ${state.r1.toFixed(2)}`, p[0], p[1] - 8);

  // ---- the slice, flat ----
  const off = document.createElement('canvas');
  off.width = NS; off.height = NS;
  const octx = off.getContext('2d');
  const img = octx.createImageData(NS, NS);
  for (let k = 0; k < NS * NS; k++) { const c = colour(slice[k]); img.data[4 * k] = c[0]; img.data[4 * k + 1] = c[1]; img.data[4 * k + 2] = c[2]; img.data[4 * k + 3] = 255; }
  octx.putImageData(img, 0, 0);
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, SL.x, SL.y, SL.w, SL.h); ctx.restore();
  ctx.strokeStyle = col.ink; ctx.lineWidth = 2; ctx.strokeRect(SL.x, SL.y, SL.w, SL.h);
  const yOf = (r2) => SL.y + ((R_MAX - r2) / (R_MAX - R_MIN)) * SL.h;

  // slice axes and title
  ctx.fillStyle = col.ink; ctx.font = '600 13px Inter, system-ui, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`Distance ratio at r₁ = ${state.r1.toFixed(2)}`, SL.x, SL.y - 10);
  ctx.fillStyle = col.soft; ctx.font = '12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
  ['0', 'π/4', 'π/2', '3π/4', 'π'].forEach((t, i) => ctx.fillText(t, SL.x + (i / 4) * SL.w, SL.y + SL.h + 18));
  ctx.textAlign = 'right';
  for (let r = 0.25; r <= R_MAX + 1e-9; r += 0.25) ctx.fillText(r.toFixed(2), SL.x - 6, yOf(r) + 4);
  ctx.fillStyle = col.ink; ctx.font = 'italic 700 15px "Source Serif 4", Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText('θ', SL.x + SL.w / 2, SL.y + SL.h + 38);
  ctx.save(); ctx.translate(SL.x - 50, SL.y + SL.h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('r₂', 0, 0); ctx.restore();

  // shared colour bar
  const bx = 58, bw = W - 58 - 30, by = 418, bh = 12;
  const bar = document.createElement('canvas'); bar.width = 200; bar.height = 1;
  const bctx = bar.getContext('2d'); const bimg = bctx.createImageData(200, 1);
  for (let i = 0; i < 200; i++) { const c = base(i / 199); bimg.data[4 * i] = c[0]; bimg.data[4 * i + 1] = c[1]; bimg.data[4 * i + 2] = c[2]; bimg.data[4 * i + 3] = 255; }
  bctx.putImageData(bimg, 0, 0);
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(bar, bx, by, bw, bh); ctx.restore();
  ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  ctx.fillStyle = col.soft; ctx.font = '11.5px Inter, system-ui, sans-serif';
  const digits = span < 0.02 ? 3 : 2;
  [-1, -0.5, 0, 0.5, 1].forEach((t, i) => {
    ctx.textAlign = i === 0 ? 'left' : i === 4 ? 'right' : 'center';
    ctx.fillText((1 + t * span).toFixed(digits), bx + ((t + 1) / 2) * bw, by + bh + 16);
  });
  ctx.textAlign = 'center';
  ctx.fillText('ratio = 1: the exponential map leaves the operation unchanged', bx + bw / 2, by + bh + 34);
}

function wOf(r1) { return (r1 - R_MIN) / (R_MAX - R_MIN); }

// ---- controls -------------------------------------------------------------------
const r1s = q('r1'), cs = q('c');
function sync() {
  r1s.value = String(state.r1);
  q('r1-val').textContent = state.r1.toFixed(2);
  cs.value = String(Math.log10(state.c));
  q('c-val').textContent = state.c < 1 ? state.c.toFixed(2) : state.c.toFixed(1);
  draw();
}
r1s.addEventListener('input', () => { state.r1 = Number(r1s.value); sync(); });
cs.addEventListener('input', () => { state.c = 10 ** Number(cs.value); sync(); });

onTheme(draw);
sync();
})();
