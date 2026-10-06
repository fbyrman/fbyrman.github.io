// Figure 2: DN-CBM in two bands. Top: the sparse autoencoder is trained purely
// to reconstruct CLIP embeddings, after which the decoder is dropped. Bottom:
// one Places365 image goes through CLIP and the trained encoder; five neurons
// fire, each carries its name, and the bars show how much each adds to the
// predicted class (values from the paper).
(function () {
const { el, photo } = window.XP;

const root = document.getElementById('fig-pipeline');
if (!root) return;
const svg = root.querySelector('svg');
const src = root.querySelector('[data-role="photo"]').getAttribute('src');

const CONCEPTS = [
  { name: 'greenhouse', w: 2.59, neuron: 3 },
  { name: 'plants', w: 1.02, neuron: 6 },
  { name: 'contemporary', w: 0.91, neuron: 9 },
  { name: 'planting', w: 0.85, neuron: 12 },
  { name: 'garden', w: 0.85, neuron: 14 },
];
const N_NEURONS = 18;
const NX = 312, NY0 = 182, NSTEP = 14.5;
const MID = NY0 + ((N_NEURONS - 1) * NSTEP) / 2;
const ROW_Y0 = MID - 54, ROW_STEP = 34;
const WORD_X = 398, BAR_X = 516, BAR_W = 145;

function arrow(x0, y0, x1, y1, cls = '') {
  el('line', { class: `arrow ${cls}`, x1: x0, y1: y0, x2: x1 - 7, y2: y1 }, svg);
  el('path', { class: `head ${cls}`, d: `M${x1},${y1} l-8,-4.5 v9 z` }, svg);
}

function training() {
  const Y = 72;
  el('text', { class: 'stage', x: 20, y: 22 }, svg).textContent = '1  DISCOVER';

  el('rect', { class: 'box', x: 20, y: Y - 18, width: 112, height: 36, rx: 4 }, svg);
  el('text', { class: 'lbl', x: 76, y: Y + 4, 'text-anchor': 'middle' }, svg).textContent = 'CLIP embedding';
  arrow(134, Y, 172, Y);

  // encoder: narrow to wide
  el('path', { class: 'box', d: `M174,${Y - 14} L232,${Y - 32} L232,${Y + 32} L174,${Y + 14} Z` }, svg);
  el('text', { class: 'lbl', x: 203, y: Y - 40, 'text-anchor': 'middle' }, svg).textContent = 'encoder';

  // the wide, sparse layer
  for (let i = 0; i < 8; i++) {
    el('circle', { class: i === 2 || i === 5 ? 'neuron on' : 'neuron', cx: 254, cy: Y - 30 + i * 8.6, r: 3.4 }, svg);
  }

  // decoder: wide to narrow, used only while training
  el('path', { class: 'box ghost', d: `M276,${Y - 32} L334,${Y - 14} L334,${Y + 14} L276,${Y + 32} Z` }, svg);
  el('text', { class: 'lbl', x: 305, y: Y - 40, 'text-anchor': 'middle' }, svg).textContent = 'decoder';
  arrow(336, Y, 374, Y, 'ghost');
  el('rect', { class: 'box ghost', x: 376, y: Y - 18, width: 112, height: 36, rx: 4 }, svg);
  el('text', { class: 'lbl', x: 432, y: Y + 4, 'text-anchor': 'middle' }, svg).textContent = 'reconstruction';

  // the only training signal: reconstruct the input
  el('path', { class: 'loop', d: `M432,${Y + 20} C432,${Y + 64} 76,${Y + 64} 76,${Y + 20}` }, svg);
  el('path', { class: 'head ghost', d: `M76,${Y + 20} l-4.5,8 h9 z` }, svg);

  el('line', { class: 'divider', x1: 20, x2: 840, y1: 146, y2: 146 }, svg);
}

function inference() {
  el('text', { class: 'stage', x: 20, y: 170 }, svg).textContent = 'USING THE TRAINED ENCODER';
  el('text', { class: 'stage', x: WORD_X, y: 170 }, svg).textContent = '2  NAME';
  el('text', { class: 'stage', x: 740, y: 170 }, svg).textContent = '3  CLASSIFY';

  // the image and CLIP
  photo(svg, src, 72, MID, 104, 6);
  arrow(126, MID, 150, MID);
  el('path', { class: 'box', d: `M152,${MID - 34} L206,${MID - 22} L206,${MID + 22} L152,${MID + 34} Z` }, svg);
  el('text', { class: 'lbl-strong', x: 179, y: MID + 5, 'text-anchor': 'middle' }, svg).textContent = 'CLIP';

  // the trained SAE encoder
  arrow(208, MID, 232, MID);
  el('path', { class: 'box', d: `M234,${MID - 16} L284,${MID - 38} L284,${MID + 38} L234,${MID + 16} Z` }, svg);
  el('text', { class: 'lbl', x: 259, y: MID + 58, 'text-anchor': 'middle' }, svg).textContent = 'encoder';

  // neurons
  const ny = (i) => NY0 + i * NSTEP;
  const neurons = [];
  for (let i = 0; i < N_NEURONS; i++) {
    const on = CONCEPTS.some((c) => c.neuron === i);
    neurons[i] = el('circle', { class: on ? 'neuron on' : 'neuron', cx: NX, cy: ny(i), r: 5.5 }, svg);
  }

  // named concepts and their contributions
  const max = Math.max(...CONCEPTS.map((c) => c.w));
  el('text', { class: 'lbl', x: BAR_X, y: ROW_Y0 - 30 }, svg).textContent = 'contribution to the prediction';
  CONCEPTS.forEach((c, k) => {
    const y = ROW_Y0 + k * ROW_STEP;
    const link = el('path', { class: 'link', d: `M${NX + 7},${ny(c.neuron)} C${NX + 40},${ny(c.neuron)} ${WORD_X - 40},${y - 5} ${WORD_X - 8},${y - 5}` }, svg);
    const g = el('g', { class: 'contrib' }, svg);
    el('rect', { x: WORD_X - 6, y: y - 22, width: BAR_X + BAR_W + 48 - WORD_X, height: ROW_STEP - 2, fill: 'transparent' }, g);
    el('text', { class: 'word', x: WORD_X, y }, g).textContent = c.name;
    el('rect', { class: 'bar-bg', x: BAR_X, y: y - 15, width: BAR_W, height: 14, rx: 2 }, g);
    el('rect', { class: 'bar', x: BAR_X, y: y - 15, width: (c.w / max) * BAR_W, height: 14, rx: 2 }, g);
    el('text', { class: 'val', x: BAR_X + BAR_W + 8, y: y - 3 }, g).textContent = `+${c.w.toFixed(2)}`;
    const hi = (on) => {
      g.classList.toggle('is-hi', on);
      link.classList.toggle('is-hi', on);
      neurons[c.neuron].classList.toggle('is-hi', on);
    };
    g.addEventListener('mouseenter', () => hi(true));
    g.addEventListener('mouseleave', () => hi(false));
  });

  // linear probe and prediction
  arrow(712, MID, 752, MID);
  el('text', { class: 'lbl', x: 732, y: MID - 11, 'text-anchor': 'middle' }, svg).textContent = 'probe';
  el('text', { class: 'pred', x: 760, y: MID - 5 }, svg).textContent = 'greenhouse,';
  el('text', { class: 'pred', x: 760, y: MID + 15 }, svg).textContent = 'outdoor';
  el('text', { class: 'lbl', x: 760, y: MID + 39 }, svg).textContent = 'true: indoor';
}

svg.replaceChildren();
training();
inference();
})();
