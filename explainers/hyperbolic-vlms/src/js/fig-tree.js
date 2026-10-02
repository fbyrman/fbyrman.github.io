// Figure 3 (hover): a hierarchy across modalities. Words at the top, captions
// below them, images at the bottom. Hovering a node highlights its path to the
// root: everything that node falls under.
(function () {
const { el, photo } = window.XP;

const root = document.getElementById('fig-tree');
if (!root) return;
const svg = root.querySelector('svg');
const PAIRS = window.XP.PAIRS;

const COL = [230, 460, 690];            // x of the three branches
const LEVEL = [40, 115, 190, 265, 345]; // y of each level
const NODES = [
  { id: 'thing', label: 'thing', x: 460, level: 0 },
  { id: 'animal', label: 'animal', x: (COL[0] + COL[1]) / 2, level: 1, parent: 'thing' },
  { id: 'vehicle', label: 'vehicle', x: COL[2], level: 1, parent: 'thing' },
  { id: 'dog', label: 'dog', x: COL[0], level: 2, parent: 'animal' },
  { id: 'cat', label: 'cat', x: COL[1], level: 2, parent: 'animal' },
  { id: 'car', label: 'car', x: COL[2], level: 2, parent: 'vehicle' },
  ...PAIRS.map((p, k) => ({ id: `cap${k}`, label: `“${p.caption}”`, x: COL[k], level: 3, parent: ['dog', 'cat', 'car'][k], kind: 'caption' })),
  ...PAIRS.map((p, k) => ({ id: `img${k}`, img: p.img, x: COL[k], level: 4, parent: `cap${k}`, kind: 'image' })),
];
const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

let hover = null;
function ancestors(id) {
  const out = new Set();
  for (let n = byId[id]; n; n = byId[n.parent]) out.add(n.id);
  return out;
}

function draw() {
  svg.replaceChildren();
  const on = hover ? ancestors(hover) : null;

  // general -> specific axis on the left
  el('line', { class: 'tr-axis', x1: 40, y1: LEVEL[0] - 8, x2: 40, y2: LEVEL[4] + 20 }, svg);
  el('path', { class: 'tr-axis-head', d: `M40 ${LEVEL[4] + 28}l-5 -9h10z` }, svg);
  el('text', { class: 'tr-axis-label', x: 52, y: LEVEL[0] + 4 }, svg).textContent = 'general';
  el('text', { class: 'tr-axis-label', x: 52, y: LEVEL[4] + 24 }, svg).textContent = 'specific';

  // edges
  NODES.filter((n) => n.parent).forEach((n) => {
    const p = byId[n.parent];
    const hi = on && on.has(n.id) && on.has(p.id);
    const y1 = LEVEL[p.level] + (p.kind === 'caption' ? 12 : 13);
    const y2 = LEVEL[n.level] - (n.kind === 'image' ? 32 : 13);
    el('line', { class: 'tr-edge' + (hi ? ' is-hi' : ''), x1: p.x, y1, x2: n.x, y2 }, svg);
  });

  // nodes
  NODES.forEach((n) => {
    const hi = on && on.has(n.id);
    const dim = on && !hi;
    const g = el('g', { class: 'tr-node' + (hi ? ' is-hi' : '') + (dim ? ' is-dim' : '') }, svg);
    const y = LEVEL[n.level];
    if (n.kind === 'image') {
      photo(g, n.img, n.x, y, 62, 6);
      el('rect', { class: 'tr-frame', x: n.x - 31, y: y - 31, width: 62, height: 62, rx: 6 }, g);
    } else {
      // the pill is sized to the label once the label has been laid out
      const pill = el('rect', { class: 'tr-pill', y: y - 13, height: 26, rx: 13 }, g);
      const t = el('text', { class: n.kind === 'caption' ? 'tr-caption' : 'tr-word', x: n.x, y: y + 5, 'text-anchor': 'middle' }, g);
      t.textContent = n.label;
      const w = t.getComputedTextLength();
      pill.setAttribute('x', n.x - w / 2 - 10);
      pill.setAttribute('width', w + 20);
    }
    g.addEventListener('pointerenter', () => { hover = n.id; draw(); });
  });
}

svg.addEventListener('pointerleave', () => { hover = null; draw(); });
draw();
if (document.fonts) document.fonts.ready.then(draw); // pills are sized to the final font
})();
