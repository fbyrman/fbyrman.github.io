// Figures 5 and 8 (interactive): one image, explained by the original DN-CBM
// (Figure 5) or by the original next to our fine-tuned model (Figure 8), as set
// by the figure's data-models. Predictions, concepts and contributions are from
// the paper. Each model gets its own bar scale, since fine-tuning spreads
// activations over more neurons and every contribution shrinks. The photos are
// embedded once, in Figure 5.
(function () {
const { el, photo } = window.XP;

const src = (name) => document.querySelector(`img[data-photo="${name}"]`).getAttribute('src');

const EXAMPLES = {
  horse: {
    truth: 'horse',
    models: [
      { title: 'Original DN-CBM', cls: 'orig', pred: 'horse',
        concepts: [['pelican', 0.32], ['michigan', 0.23], ['aaliyah', 0.20], ['busty', 0.19], ['elephants', 0.14]] },
      { title: 'Fine-tuned (ours)', cls: 'ft', pred: 'horse',
        concepts: [['horses', 0.08], ['horseback', 0.07], ['equine', 0.06]] },
    ],
  },
  rainforest: {
    truth: 'rainforest',
    models: [
      { title: 'Original DN-CBM', cls: 'orig', pred: 'vegetable garden',
        concepts: [['ivy', 1.40], ['arnold', 1.16], ['cosmos', 1.13], ['labrador', 0.78], ['eleven', 0.78]] },
      { title: 'Fine-tuned (ours)', cls: 'ft', pred: 'field, wild',
        concepts: [['fields', 0.09], ['meadow', 0.07], ['flower', 0.07], ['crops', 0.07]] },
    ],
  },
};

function setup(root) {
  const svg = root.querySelector('svg');
  const buttons = Array.from(root.querySelectorAll('[data-ex]'));
  const shown = root.dataset.models.split(' ');
  const BW = shown.length === 1 ? 360 : 150;
  let current = buttons[0].dataset.ex;

  function draw() {
    svg.replaceChildren();
    const ex = EXAMPLES[current];

    photo(svg, src(current), 95, 128, 160, 6);
    el('text', { class: 'gt', x: 95, y: 30, 'text-anchor': 'middle' }, svg).textContent = `true class: ${ex.truth}`;

    ex.models.filter((m) => shown.includes(m.cls)).forEach((m, p) => {
      const x0 = 225 + p * 320;
      const max = Math.max(...m.concepts.map((c) => c[1]));
      el('text', { class: `panel-title ${m.cls}`, x: x0, y: 30 }, svg).textContent = m.title;
      const pr = el('text', { class: 'gt', x: x0, y: 50 }, svg);
      pr.textContent = 'predicts ';
      el('tspan', { class: m.pred === ex.truth ? 'ok' : '' }, pr).textContent = m.pred;
      m.concepts.forEach(([name, w], k) => {
        const y = 88 + k * 32;
        el('text', { class: 'word', x: x0, y }, svg).textContent = name;
        el('rect', { class: 'bar-bg', x: x0 + 100, y: y - 14, width: BW, height: 14, rx: 2 }, svg);
        el('rect', { class: `bar ${m.cls}`, x: x0 + 100, y: y - 14, width: (w / max) * BW, height: 14, rx: 2 }, svg);
        el('text', { class: 'val', x: x0 + 108 + BW, y: y - 2 }, svg).textContent = `+${w.toFixed(2)}`;
      });
    });
  }

  buttons.forEach((b) => b.addEventListener('click', () => {
    current = b.dataset.ex;
    buttons.forEach((o) => o.setAttribute('aria-checked', String(o === b)));
    draw();
  }));
  draw();
}

document.querySelectorAll('.explain-fig').forEach(setup);
})();
