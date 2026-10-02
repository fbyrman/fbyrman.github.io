// Figure 3 (interactive): a batch as a grid of pairs. With |B| image-caption
// pairs, the sigmoid loss scores all |B|^2 combinations, and only the |B| on the
// diagonal are matches, so a random pair is a match with probability 1/|B|.
(function () {
const { css, onTheme, setupCanvas } = window.XP;

const root = document.getElementById('fig-batch');
if (!root) return;
const q = (role) => root.querySelector(`[data-role="${role}"]`);
const canvas = q('canvas');
const slider = q('n');

const W = 860, H = 320;
const G = { x: 40, y: 20, s: 280 };   // the grid

let N = 8;

function draw() {
  const { ctx } = setupCanvas(canvas);
  ctx.clearRect(0, 0, W, H);
  const col = { ink: css('--ink'), soft: css('--ink-soft'), pos: css('--gold'), neg: css('--rule'), rule: css('--rule'), surface: css('--eq-bg') };

  // the grid: cells while they are big enough to see, a single diagonal after that
  const cell = G.s / N;
  if (cell >= 4) {
    const gap = cell >= 10 ? 2 : 1;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      ctx.fillStyle = i === j ? col.pos : col.neg;
      ctx.fillRect(G.x + j * cell + gap / 2, G.y + i * cell + gap / 2, cell - gap, cell - gap);
    }
  } else {
    ctx.fillStyle = col.neg; ctx.fillRect(G.x, G.y, G.s, G.s);
    ctx.strokeStyle = col.pos; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(G.x, G.y); ctx.lineTo(G.x + G.s, G.y + G.s); ctx.stroke();
  }
  ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.strokeRect(G.x - 0.5, G.y - 0.5, G.s + 1, G.s + 1);
  ctx.fillStyle = col.soft; ctx.font = '12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`${N} captions`, G.x + G.s / 2, G.y + G.s + 18);
  ctx.save(); ctx.translate(G.x - 12, G.y + G.s / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(`${N} images`, 0, 0); ctx.restore();

  // the counts, written out next to the grid
  const x = 400;
  const row = (y, swatch, big, small) => {
    if (swatch) { ctx.fillStyle = swatch; ctx.fillRect(x, y - 15, 16, 16); }
    ctx.fillStyle = col.ink; ctx.textAlign = 'left';
    ctx.font = '600 26px "Source Serif 4", Georgia, serif'; ctx.fillText(big, x + (swatch ? 28 : 0), y);
    const bw = ctx.measureText(big).width;
    ctx.font = '15px "Source Serif 4", Georgia, serif'; ctx.fillStyle = col.soft;
    ctx.fillText(small, x + (swatch ? 28 : 0) + bw + 10, y);
  };
  const fmt = (n) => n.toLocaleString('en-US');
  row(70, col.pos, fmt(N), N === 1 ? 'matching pair' : 'matching pairs');
  row(120, col.neg, fmt(N * N - N), 'mismatched pairs');
  ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(W - 30, 150); ctx.stroke();
  row(200, null, `1 in ${fmt(N)}`, 'pairs is a match');
  ctx.fillStyle = col.soft; ctx.font = '15px "Source Serif 4", Georgia, serif';
  ctx.fillText(`a batch prior of 1/|B| = ${(1 / N).toPrecision(2)}`, x, 232);
}

slider.addEventListener('input', () => {
  N = 2 ** Number(slider.value);
  q('n-val').textContent = N.toLocaleString('en-US');
  draw();
});
onTheme(draw);
draw();
})();
