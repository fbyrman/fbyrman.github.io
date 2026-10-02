// Figure 8: the distance ratio for each trained model. Each panel is the
// slice of Figure 7 at that model's most common text radius r1, at the converged
// curvature c = 0.1, over the image radius r2 and the angle theta. All panels share
// one colour scale.
(function () {
const { css, onTheme, setupCanvas, ramp, MODELS } = window.XP;
const G = window.XP.geo;

const root = document.getElementById('fig-models');
if (!root) return;
const q = (role) => root.querySelector(`[data-role="${role}"]`);
const canvas = q('canvas');

const W = 860, C = 0.1;
const R_MIN = 0.05, R_MAX = 1.5, N = 90;
const M = { l: 48, t: 30, gap: 18, r: 10 };
const PW = (W - M.l - M.r - 3 * M.gap) / 4, PH = 186;
const px = (k) => M.l + k * (PW + M.gap);
const thOf = (i) => ((i + 0.5) / N) * Math.PI;
const r2Of = (j) => R_MAX - ((j + 0.5) / N) * (R_MAX - R_MIN);
const yOf = (r2) => M.t + ((R_MAX - r2) / (R_MAX - R_MIN)) * PH;

const fields = MODELS.map((m) => {
  const f = new Float64Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) f[j * N + i] = G.ratioD(m.r1, r2Of(j), thOf(i), C);
  return f;
});
let span = 1e-4;
fields.forEach((f) => f.forEach((x) => { span = Math.max(span, Math.abs(x - 1)); }));

function draw() {
  const { ctx } = setupCanvas(canvas);
  ctx.clearRect(0, 0, W, 330);
  const col = { ink: css('--ink'), soft: css('--ink-soft'), rule: css('--rule'), surface: css('--eq-bg') };
  const base = ramp([css('--div-lo'), css('--div-mid'), css('--div-hi')]);
  const colour = (x) => base(0.5 + (x - 1) / (2 * span));

  MODELS.forEach((m, k) => {
    const x0 = px(k);
    const off = document.createElement('canvas'); off.width = N; off.height = N;
    const octx = off.getContext('2d'); const img = octx.createImageData(N, N);
    fields[k].forEach((v, n) => { const c = colour(v); img.data.set([c[0], c[1], c[2], 255], 4 * n); });
    octx.putImageData(img, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, x0, M.t, PW, PH); ctx.restore();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, M.t + 0.5, PW - 1, PH - 1);

    ctx.fillStyle = col.ink; ctx.font = '600 13px Inter, system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(m.name, x0, M.t - 10);
    ctx.fillStyle = col.soft; ctx.font = '12px Inter, system-ui, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(`r₁ = ${m.r1.toFixed(2)}`, x0 + PW, M.t - 10);
    ['0', 'π/2', 'π'].forEach((t, i) => {
      ctx.textAlign = ['left', 'center', 'right'][i];
      ctx.fillText(t, x0 + (i / 2) * PW, M.t + PH + 16);
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = col.ink; ctx.font = 'italic 700 14px "Source Serif 4", Georgia, serif';
    ctx.fillText('θ', x0 + PW / 2, M.t + PH + 32);
  });

  // shared r2 axis on the left
  ctx.fillStyle = col.soft; ctx.font = '12px Inter, system-ui, sans-serif'; ctx.textAlign = 'right';
  for (let r = 0.5; r <= R_MAX + 1e-9; r += 0.5) ctx.fillText(r.toFixed(1), M.l - 6, yOf(r) + 4);
  ctx.save(); ctx.translate(14, M.t + PH / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = col.ink; ctx.font = 'italic 700 14px "Source Serif 4", Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText('r₂', 0, 0); ctx.restore();

  // shared colour bar
  const bx = M.l, bw = W - M.l - M.r, by = 268, bh = 12;
  const bar = document.createElement('canvas'); bar.width = 200; bar.height = 1;
  const bctx = bar.getContext('2d'); const bimg = bctx.createImageData(200, 1);
  for (let i = 0; i < 200; i++) { const c = base(i / 199); bimg.data.set([c[0], c[1], c[2], 255], 4 * i); }
  bctx.putImageData(bimg, 0, 0);
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(bar, bx, by, bw, bh); ctx.restore();
  ctx.strokeStyle = col.rule; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  ctx.fillStyle = col.soft; ctx.font = '11.5px Inter, system-ui, sans-serif';
  [-1, -0.5, 0, 0.5, 1].forEach((t, i) => {
    ctx.textAlign = i === 0 ? 'left' : i === 4 ? 'right' : 'center';
    ctx.fillText((1 + t * span).toFixed(3), bx + ((t + 1) / 2) * bw, by + bh + 16);
  });
  ctx.textAlign = 'center';
  ctx.fillText('distance ratio', bx + bw / 2, by + bh + 34);

}

onTheme(draw);
draw();
})();
