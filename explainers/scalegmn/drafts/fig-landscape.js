// Figure 1 (static): gradient descent zigzagging down a narrow curved valley,
// against a single amortized jump to the same minimum.
(function () {
const { css, onTheme, setupCanvas, ramp, paintField, contour, arrowHead } = window.XP;

const canvas = document.querySelector('#fig-landscape canvas');
if (!canvas) return;
const { ctx, w: W, h: H } = setupCanvas(canvas);

// Plot window in weight-space units; y range follows the aspect ratio.
const XR = 3.3;
const YR = (XR * H) / W;
const toPx = (p) => [((p[0] + XR) / (2 * XR)) * W, ((YR - p[1]) / (2 * YR)) * H];

// Narrow curved valley: steep across, shallow along. Plain gradient descent
// bounces between the walls and creeps along the floor.
const A = 4, K = 0.28, C0 = -1.0, B = 0.12, X0 = -0.6;
const loss = (x, y) => A * (y - K * x * x - C0) ** 2 + B * (x - X0) ** 2;
const grad = (x, y) => {
  const r = y - K * x * x - C0;
  return [-4 * A * K * x * r + 2 * B * (x - X0), 2 * A * r];
};

const START = [2.7, 1.6];
const LR = 0.065;
const path = [START];
for (let p = START, t = 0; t < 800; t++) {
  const g = grad(p[0], p[1]);
  p = [p[0] - LR * g[0], p[1] - LR * g[1]];
  path.push(p);
  if (Math.hypot(g[0], g[1]) < 2e-3) break;
}
const END = path[path.length - 1];

const steps = document.querySelector('#fig-landscape [data-role="sgd-steps"]');
if (steps) steps.textContent = `${path.length - 1} steps`;

function draw() {
  const c = {
    land: ramp([css('--land-0'), css('--land-1'), css('--land-2'), css('--land-3')]),
    ink: css('--ink'),
    bg: css('--eq-bg'),
    meta: css('--c-meta'),
    sgd: css('--c-sgd'),
  };
  ctx.clearRect(0, 0, W, H);

  // Loss field, compressed with a log so the valley floor stays readable.
  const nx = 200, ny = 122;
  const f = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = -XR + (2 * XR * i) / (nx - 1);
      const y = YR - (2 * YR * j) / (ny - 1);
      f[j * nx + i] = Math.min(Math.log1p(loss(x, y)) / Math.log1p(12), 1);
    }
  }
  paintField(ctx, f, nx, ny, c.land, 0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = c.ink;
  ctx.globalAlpha = 0.13;
  ctx.lineWidth = 0.8;
  const sx = W / (nx - 1), sy = H / (ny - 1);
  for (let k = 1; k <= 14; k++) {
    ctx.beginPath();
    for (const [a, b] of contour(f, nx, ny, k / 15)) {
      ctx.moveTo(a[0] * sx, a[1] * sy);
      ctx.lineTo(b[0] * sx, b[1] * sy);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Gradient descent path.
  ctx.save();
  ctx.strokeStyle = c.sgd;
  ctx.fillStyle = c.sgd;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  path.forEach((p, i) => {
    const [x, y] = toPx(p);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  for (const p of path.slice(1)) {
    const [x, y] = toPx(p);
    ctx.beginPath();
    ctx.arc(x, y, 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Amortized jump: one curved arrow from start to minimum.
  const s = toPx(START), e = toPx(END);
  const dx = e[0] - s[0], dy = e[1] - s[1];
  const cx = (s[0] + e[0]) / 2 - dy * 0.28, cy = (s[1] + e[1]) / 2 + dx * 0.28;
  ctx.save();
  ctx.strokeStyle = c.meta;
  ctx.fillStyle = c.meta;
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s[0], s[1]);
  ctx.quadraticCurveTo(cx, cy, e[0], e[1]);
  ctx.stroke();
  const t = 0.93;
  const ax = (1 - t) ** 2 * s[0] + 2 * (1 - t) * t * cx + t * t * e[0];
  const ay = (1 - t) ** 2 * s[1] + 2 * (1 - t) * t * cy + t * t * e[1];
  arrowHead(ctx, ax, ay, e[0], e[1], 12);
  ctx.restore();

  // Endpoints and labels.
  const dot = (p, r, fill) => {
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = c.bg;
    ctx.stroke();
  };
  dot(e, 5.5, c.ink);
  dot(s, 7.5, c.ink);
  ctx.save();
  ctx.font = 'italic 700 17px "Source Serif 4", Georgia, serif';
  ctx.fillStyle = c.ink;
  ctx.textAlign = 'center';
  ctx.fillText('θ', s[0] + 16, s[1] - 10);
  ctx.fillText('θ*', e[0] - 4, e[1] + 26);
  ctx.restore();
}

onTheme(draw);
draw();
// Redraw once the web font has loaded, so the labels use it.
if (document.fonts) document.fonts.ready.then(draw);
})();
