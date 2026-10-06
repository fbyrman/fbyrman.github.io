// Figure 1: a toy concept bottleneck model. A photo is scored on six concepts,
// and a fixed linear layer turns the scores into a softmax over three classes.
// Dragging a concept's bar is a test-time intervention: the prediction is
// recomputed from the edited scores. The photo is the CIFAR-10 horse that is
// embedded once, in Figure 5.
(function () {
const { el, photo, svgPoint } = window.XP;

const root = document.getElementById('fig-cbm');
if (!root) return;
const svg = root.querySelector('svg');
const img = document.querySelector('img[data-photo="horse"]');

const CONCEPTS = [
  { name: 'mane', c: 0.9 },
  { name: 'hooves', c: 0.8 },
  { name: 'saddle', c: 0.7 },
  { name: 'grass', c: 0.85 },
  { name: 'stripes', c: 0.1 },
  { name: 'horns', c: 0.05 },
];
// One row of weights per class, one column per concept (same order as above).
const CLASSES = [
  { name: 'horse', w: [2, 1, 2, 0, -3, -2] },
  { name: 'zebra', w: [1.5, 1, -1, 0.5, 4, -2] },
  { name: 'cow', w: [-1, 1, -1, 1, -2, 3] },
];

const MID = 150;
const ROW_Y0 = 62, ROW_STEP = 36;
const WORD_X = 262, BAR_X = 340, BAR_W = 150;
const CLS_X = 628, CBAR_X = 690, CBAR_W = 100, CLS_Y0 = MID - 36, CLS_STEP = 36;

const scores = CONCEPTS.map((c) => c.c);
let bars = [], vals = [], rows = [], clsBars = [], clsVals = [], clsWords = [];

function arrow(x0, y0, x1, y1) {
  el('line', { class: 'arrow', x1: x0, y1: y0, x2: x1 - 7, y2: y1 }, svg);
  el('path', { class: 'head', d: `M${x1},${y1} l-8,-4.5 v9 z` }, svg);
}

function predict() {
  const logits = CLASSES.map((k) => k.w.reduce((s, w, i) => s + w * scores[i], 0));
  const m = Math.max(...logits);
  const e = logits.map((l) => Math.exp(l - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / z);
}

function update() {
  scores.forEach((s, i) => {
    bars[i].setAttribute('width', s * BAR_W);
    vals[i].textContent = s.toFixed(2);
    rows[i].classList.toggle('is-edited', Math.abs(s - CONCEPTS[i].c) > 0.005);
  });
  const p = predict();
  const best = p.indexOf(Math.max(...p));
  p.forEach((v, k) => {
    clsBars[k].setAttribute('width', v * CBAR_W);
    clsBars[k].classList.toggle('is-best', k === best);
    clsWords[k].classList.toggle('is-best', k === best);
    clsVals[k].textContent = `${Math.round(v * 100)}%`;
  });
}

function draw() {
  svg.replaceChildren();

  // the image and the concept predictor
  if (img) photo(svg, img.getAttribute('src'), 76, MID, 112, 6);
  arrow(136, MID, 162, MID);
  el('path', { class: 'box', d: `M164,${MID - 34} L222,${MID - 20} L222,${MID + 20} L164,${MID + 34} Z` }, svg);
  el('text', { class: 'lbl', x: 193, y: MID + 54, 'text-anchor': 'middle' }, svg).textContent = 'concept';
  el('text', { class: 'lbl', x: 193, y: MID + 69, 'text-anchor': 'middle' }, svg).textContent = 'predictor';
  arrow(224, MID, 250, MID);

  // the bottleneck: one draggable score per concept
  el('text', { class: 'stage', x: WORD_X, y: 26 }, svg).textContent = 'CONCEPTS';
  el('rect', { class: 'bottleneck', x: WORD_X - 12, y: ROW_Y0 - 28, width: BAR_X + BAR_W + 52 - WORD_X + 12, height: CONCEPTS.length * ROW_STEP + 6, rx: 5 }, svg);
  CONCEPTS.forEach((c, i) => {
    const y = ROW_Y0 + i * ROW_STEP;
    const g = el('g', { class: 'concept' }, svg);
    el('rect', { x: WORD_X - 6, y: y - 22, width: BAR_X + BAR_W + 44 - WORD_X, height: ROW_STEP - 2, fill: 'transparent' }, g);
    el('text', { class: 'word', x: WORD_X, y }, g).textContent = c.name;
    el('rect', { class: 'bar-bg', x: BAR_X, y: y - 15, width: BAR_W, height: 14, rx: 2 }, g);
    bars[i] = el('rect', { class: 'bar', x: BAR_X, y: y - 15, width: 0, height: 14, rx: 2 }, g);
    vals[i] = el('text', { class: 'val', x: BAR_X + BAR_W + 8, y: y - 3 }, g);
    rows[i] = g;

    const set = (ev) => {
      const x = svgPoint(svg, ev).x;
      scores[i] = Math.min(Math.max((x - BAR_X) / BAR_W, 0), 1);
      update();
    };
    g.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      g.setPointerCapture(ev.pointerId);
      set(ev);
      g.addEventListener('pointermove', set);
    });
    const stop = () => g.removeEventListener('pointermove', set);
    g.addEventListener('pointerup', stop);
    g.addEventListener('pointercancel', stop);
  });

  // linear layer and class probabilities
  arrow(552, MID, 616, MID);
  el('text', { class: 'lbl', x: 584, y: MID - 11, 'text-anchor': 'middle' }, svg).textContent = 'linear';
  el('text', { class: 'stage', x: CLS_X, y: 26 }, svg).textContent = 'PREDICTION';
  CLASSES.forEach((k, j) => {
    const y = CLS_Y0 + j * CLS_STEP;
    clsWords[j] = el('text', { class: 'cls', x: CLS_X, y }, svg);
    clsWords[j].textContent = k.name;
    el('rect', { class: 'bar-bg', x: CBAR_X, y: y - 15, width: CBAR_W, height: 14, rx: 2 }, svg);
    clsBars[j] = el('rect', { class: 'cls-bar', x: CBAR_X, y: y - 15, width: 0, height: 14, rx: 2 }, svg);
    clsVals[j] = el('text', { class: 'val', x: CBAR_X + CBAR_W + 8, y: y - 3 }, svg);
  });

  update();
}

root.querySelector('[data-role="reset"]').addEventListener('click', () => {
  CONCEPTS.forEach((c, i) => { scores[i] = c.c; });
  update();
});

draw();
})();
