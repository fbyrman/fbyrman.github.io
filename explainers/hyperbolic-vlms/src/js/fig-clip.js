// Figure 1 (hover): CLIP-style contrastive pre-training. Captions go through the
// text encoder, images through the image encoder, and every image vector is
// compared with every text vector. Hovering a cell highlights what it compares.
(function () {
const { el, photo } = window.XP;

const root = document.getElementById('fig-clip');
if (!root) return;
const svg = root.querySelector('svg');

const PAIRS = window.XP.PAIRS;
const N = PAIRS.length;
const CELL = 75, MX = 572, MY = 150;          // similarity matrix
const colX = (j) => MX + CELL * (j + 0.5);
const rowY = (i) => MY + CELL * (i + 0.5);
const SUB = ['₁', '₂', '₃'];

function arrow(x1, y1, x2, y2) {
  el('line', { class: 'cl-arrow', x1, y1, x2, y2 }, svg);
  const a = Math.atan2(y2 - y1, x2 - x1), s = 7;
  el('path', {
    class: 'cl-head',
    d: `M${x2} ${y2}L${x2 - s * Math.cos(a - 0.45)} ${y2 - s * Math.sin(a - 0.45)}L${x2 - s * Math.cos(a + 0.45)} ${y2 - s * Math.sin(a + 0.45)}Z`,
  }, svg);
}

function vecLabel(x, y, letter, i) {
  const t = el('text', { class: 'cl-vec', x, y: y + 5, 'text-anchor': 'middle' }, svg);
  t.textContent = letter + SUB[i];
  return t;
}

let hover = null;

function draw() {
  svg.replaceChildren();

  // ---- text branch (top) ----
  el('rect', { class: 'cl-panel', x: 250, y: 22, width: 270, height: 84, rx: 4 }, svg);
  PAIRS.forEach((p, j) => {
    const t = el('text', { class: 'cl-caption' + (hover && hover[1] === j ? ' is-hi' : ''), x: 266, y: 48 + 24 * j }, svg);
    t.textContent = `“${p.caption}”`;
  });
  arrow(522, 56, 566, 56);
  el('rect', { class: 'cl-encoder', x: MX, y: 32, width: CELL * N, height: 48, rx: 6 }, svg);
  el('text', { class: 'cl-encoder-label', x: MX + (CELL * N) / 2, y: 61, 'text-anchor': 'middle' }, svg).textContent = 'Text encoder';
  PAIRS.forEach((_, j) => {
    arrow(colX(j), 82, colX(j), 98);
    el('rect', { class: 'cl-vbox' + (hover && hover[1] === j ? ' is-hi' : ''), x: colX(j) - 26, y: 102, width: 52, height: 30, rx: 4 }, svg);
    vecLabel(colX(j), 117, 'T', j);
  });

  // ---- image branch (left) ----
  PAIRS.forEach((p, i) => {
    photo(svg, p.img, 351, rowY(i), 58, 6);
    el('rect', { class: 'cl-tile' + (hover && hover[0] === i ? ' is-hi' : ''), x: 322, y: rowY(i) - 29, width: 58, height: 58, rx: 6 }, svg);
    arrow(384, rowY(i), 404, rowY(i));
  });
  el('rect', { class: 'cl-encoder', x: 408, y: MY, width: 70, height: CELL * N, rx: 6 }, svg);
  el('text', {
    class: 'cl-encoder-label', x: 443, y: MY + (CELL * N) / 2 + 5, 'text-anchor': 'middle',
    transform: `rotate(-90 443 ${MY + (CELL * N) / 2})`,
  }, svg).textContent = 'Image encoder';
  PAIRS.forEach((_, i) => {
    arrow(480, rowY(i), 506, rowY(i));
    el('rect', { class: 'cl-vbox' + (hover && hover[0] === i ? ' is-hi' : ''), x: 510, y: rowY(i) - 15, width: 52, height: 30, rx: 4 }, svg);
    vecLabel(536, rowY(i), 'I', i);
  });

  // ---- similarity matrix ----
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const diag = i === j, hi = hover && hover[0] === i && hover[1] === j;
      const g = el('g', { class: 'cl-cell' + (diag ? ' is-diag' : '') + (hi ? ' is-hi' : '') }, svg);
      el('rect', { x: MX + CELL * j + 2, y: MY + CELL * i + 2, width: CELL - 4, height: CELL - 4, rx: 3 }, g);
      const t = el('text', { x: colX(j), y: rowY(i) + 5, 'text-anchor': 'middle' }, g);
      t.textContent = `I${SUB[i]}·T${SUB[j]}`;
      g.addEventListener('pointerenter', () => { hover = [i, j]; draw(); });
    }
  }

  // ---- explanation of the hovered cell ----
  const lines = [];
  if (!hover) {
    lines.push(['cl-info-head', 'One comparison per cell']);
    lines.push(['cl-info', 'Every image vector is compared with']);
    lines.push(['cl-info', 'every text vector in the batch.']);
    lines.push(['cl-info', 'Hover over a cell.']);
  } else {
    const [i, j] = hover;
    const match = i === j;
    lines.push(['cl-info-head', match ? 'A matching pair' : 'A mismatch']);
    lines.push(['cl-info', `the ${PAIRS[i].short} photo with “${PAIRS[j].caption}”`]);
    lines.push(['cl-info', match ? 'Training pushes this similarity up.' : 'Training pushes this similarity down.']);
  }
  lines.forEach(([cls, text], k) => {
    el('text', { class: cls, x: 24, y: 196 + 24 * k }, svg).textContent = text;
  });
}

svg.addEventListener('pointerleave', () => { hover = null; draw(); });
draw();
})();
