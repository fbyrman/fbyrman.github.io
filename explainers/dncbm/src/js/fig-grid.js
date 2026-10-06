// Figures 4 and 7 (interactive): top-activating images for four neurons at a
// time, one row per dataset. The images are the paper's own figures (best-aligned,
// worst-aligned, worst-aligned after fine-tuning), each a 16 x 4 sheet of tiles
// that is cut up here and redrawn with the page's own spacing. The sheets are
// embedded once, in Figure 4, and shared by both figures.
(function () {
const { css, setupCanvas, onTheme } = window.XP;

const img = (sheet) => document.querySelector(`img[data-sheet="${sheet}"]`);

const SETS = {
  high: [['plaid', 199], ['burgundy', 5183], ['turquoise', 5369], ['sweater', 7429]],
  low: [['zealand', 7301], ['silhouette', 7008], ['commissioned', 6123], ['sauna', 1895]],
  'low-ft': [['zealand', 7301], ['silhouette', 7008], ['commissioned', 6123], ['sauna', 1895]],
};
const ROWS = ['ImageNet', 'CIFAR-10', 'CIFAR-100', 'Places365'];

// Tile positions in the original 2356 x 519 sheets.
const SHEET_W = 2356;
const COL_X = [0, 136, 272, 409, 605, 742, 878, 1014, 1211, 1347, 1484, 1620, 1816, 1953, 2089, 2226];
const ROW_Y = [0, 131, 262, 394];
const TILE = 125;

const LABEL_W = 84, HEAD = 46, GAP = 14, PAD = 2;

// Some sheets have an empty (black) slot where a dataset had too few images.
function isEmpty(image, sx, sy, s) {
  const off = document.createElement('canvas');
  off.width = off.height = 8;
  const c = off.getContext('2d');
  c.drawImage(image, sx, sy, s, s, 0, 0, 8, 8);
  const d = c.getImageData(0, 0, 8, 8).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
  return sum / (64 * 3) < 6;
}

function setup(root) {
  const canvas = root.querySelector('canvas');
  const buttons = Array.from(root.querySelectorAll('[data-set]'));
  let current = buttons[0].dataset.set;

  function draw() {
    const image = img(current);
    if (!image.complete || !image.naturalWidth) return;
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const k = image.naturalWidth / SHEET_W;
    const gw = (w - LABEL_W - 3 * GAP) / 4;
    const pitch = gw / 4;
    const tile = pitch - PAD;
    const ink = css('--ink'), soft = css('--ink-soft'), rule = css('--rule');

    // row labels
    ctx.fillStyle = soft;
    ctx.font = '500 12px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    ROWS.forEach((r, j) => ctx.fillText(r, 0, HEAD + j * pitch + tile / 2));

    SETS[current].forEach(([name, idx], g) => {
      const gx = LABEL_W + g * (gw + GAP);
      ctx.fillStyle = ink;
      ctx.font = 'italic 700 16px "Source Serif 4", serif';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(name, gx, 20);
      ctx.fillStyle = soft;
      ctx.font = '400 11px Inter, sans-serif';
      ctx.fillText(`neuron ${idx}`, gx, 36);

      for (let j = 0; j < 4; j++) {
        for (let i = 0; i < 4; i++) {
          const sx = (COL_X[g * 4 + i] + 3) * k, sy = ROW_Y[j] * k, s = TILE * k;
          const x = gx + i * pitch, y = HEAD + j * pitch;
          if (isEmpty(image, sx, sy, s)) {
            ctx.strokeStyle = rule;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
            ctx.setLineDash([]);
          } else {
            ctx.drawImage(image, sx, sy, s, s, x, y, tile, tile);
          }
        }
      }
    });
  }

  buttons.forEach((b) => b.addEventListener('click', () => {
    current = b.dataset.set;
    buttons.forEach((o) => o.setAttribute('aria-checked', String(o === b)));
    draw();
  }));

  Object.keys(SETS).forEach((s) => img(s).addEventListener('load', () => { if (s === current) draw(); }));
  if (document.fonts) document.fonts.ready.then(draw);
  window.addEventListener('resize', draw);
  onTheme(draw);
  draw();
}

document.querySelectorAll('.grid-fig').forEach(setup);
})();
