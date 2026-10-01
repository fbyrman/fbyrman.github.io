// Figure 5: row scalings applied to a dense layer and to a convolution written
// as a doubly-block Toeplitz matrix. Only uniform scaling keeps the convolution.
import { css, onTheme, ramp, el, svgPoint } from './common.js';

const root = document.getElementById('fig-toeplitz');
if (root) init(root);

function init(root) {
  const q = (role) => root.querySelector(`[data-role="${role}"]`);
  const SUB = ['₁', '₂', '₃', '₄'];

  // 2 x 2 kernel over a 3 x 3 input, stride 1, no padding (the paper's example).
  const K = [0.9, -0.5, 0.4, 1.1];
  // Kernel index per cell, -1 for a structural zero.
  const PATTERN = [
    [0, 1, -1, 2, 3, -1, -1, -1, -1],
    [-1, 0, 1, -1, 2, 3, -1, -1, -1],
    [-1, -1, -1, 0, 1, -1, 2, 3, -1],
    [-1, -1, -1, -1, 0, 1, -1, 2, 3],
  ];
  const DENSE = [
    [0.7, -0.3, 1.1, -0.9, 0.2, 0.5, -1.2, 0.8, -0.1],
    [-0.6, 0.9, 0.3, 0.4, -1.0, 0.1, 0.6, -0.4, 1.0],
    [0.2, -1.1, 0.8, 0.5, 0.3, -0.7, 0.9, 0.1, -0.5],
    [1.0, 0.4, -0.2, -0.8, 0.6, 1.2, -0.3, 0.7, 0.2],
  ];

  let scales = [1, 1, 1, 1];
  let hoverK = -1;

  // ---- row sliders ----
  const rows = q('rows');
  const sliders = scales.map((_, i) => {
    const label = document.createElement('label');
    label.className = 'ctl';
    label.innerHTML = `<span class="var">q</span>${SUB[i]} <input type="range" min="-1" max="1" step="0.01" value="0"> <output>1.00</output>`;
    rows.appendChild(label);
    const input = label.querySelector('input');
    const out = label.querySelector('output');
    input.addEventListener('input', () => {
      const v = Math.pow(2.5, Number(input.value));
      if (q('link').checked) scales = scales.map(() => v);
      else scales[i] = v;
      sync();
      draw();
    });
    return { input, out };
  });

  function sync() {
    sliders.forEach((s, i) => {
      s.input.value = String(Math.log(scales[i]) / Math.log(2.5));
      s.out.textContent = scales[i].toFixed(2);
    });
  }

  // ---- matrices ----
  const CW = 40, CH = 36, X0 = 52, Y0 = 12;

  function drawMatrix(svg, value, kernelOf) {
    const c = { pos: css('--c-meta'), neg: css('--warm'), mid: css('--div-mid'), ink: css('--ink'), broken: css('--c-broken') };
    const div = ramp([c.neg, c.mid, c.pos]);
    svg.replaceChildren();

    // Which kernel weights now take more than one value?
    const brokenK = new Set();
    if (kernelOf) {
      for (let k = 0; k < 4; k++) {
        const vals = [];
        PATTERN.forEach((row, i) => row.forEach((kk, j) => kk === k && vals.push(value(i, j))));
        if (Math.max(...vals) - Math.min(...vals) > 1e-9) brokenK.add(k);
      }
    }

    for (let i = 0; i < 4; i++) {
      const rl = el('text', { x: X0 - 8, y: Y0 + i * CH + CH / 2 + 4, class: 'row-label', 'text-anchor': 'end' }, svg);
      rl.textContent = `×${scales[i].toFixed(2)}`;
      for (let j = 0; j < 9; j++) {
        const x = X0 + j * CW, y = Y0 + i * CH;
        const k = kernelOf ? PATTERN[i][j] : 0;
        const zero = kernelOf && k < 0;
        const v = zero ? 0 : value(i, j);
        const rgb = div(0.5 + Math.max(-1, Math.min(1, v / 2.2)) / 2).map(Math.round);
        const dim = kernelOf && hoverK >= 0 && k !== hoverK;
        const g = el('g', { opacity: dim ? 0.3 : 1 }, svg);
        el('rect', {
          x: x + 1, y: y + 1, width: CW - 2, height: CH - 2, rx: 3,
          fill: zero ? 'none' : `rgb(${rgb.join(',')})`,
          class: zero ? 'cell zero' : 'cell',
        }, g);
        if (!zero) {
          if (kernelOf) {
            const kl = el('text', { x: x + CW / 2, y: y + 13, class: 'cell-k', 'text-anchor': 'middle' }, g);
            kl.textContent = `k${SUB[k]}`;
          }
          const t = el('text', { x: x + CW / 2, y: y + (kernelOf ? 28 : 22), class: 'cell-v', 'text-anchor': 'middle' }, g);
          t.textContent = v.toFixed(2);
          if (brokenK.has(k) && kernelOf) {
            el('rect', { x: x + 2, y: y + 2, width: CW - 4, height: CH - 4, rx: 3, fill: 'none', stroke: c.broken, 'stroke-width': 2.2 }, g);
          }
        }
      }
    }
    return brokenK;
  }

  function draw() {
    drawMatrix(q('mlp'), (i, j) => scales[i] * DENSE[i][j], false);
    const broken = drawMatrix(q('cnn'), (i, j) => scales[i] * K[PATTERN[i][j]], true);

    const ms = q('mlp-status');
    ms.className = 'mat-status ok';
    ms.textContent = '✓ still a dense layer: any matrix is one';
    const cs = q('cnn-status');
    if (broken.size === 0) {
      cs.className = 'mat-status ok';
      cs.textContent = '✓ still a convolution: every kernel weight has one value';
    } else {
      const names = [...broken].map((k) => `k${SUB[k]}`).join(', ');
      cs.className = 'mat-status bad';
      cs.textContent = `✕ no longer a convolution: ${names} now take${broken.size === 1 ? 's' : ''} several values`;
    }
  }

  // Hovering a CNN cell highlights every cell that shares its kernel weight.
  const cnn = q('cnn');
  const setHover = (k) => {
    if (k === hoverK) return;
    hoverK = k;
    draw();
  };
  cnn.addEventListener('pointermove', (ev) => {
    const p = svgPoint(cnn, ev);
    const j = Math.floor((p.x - X0) / CW), i = Math.floor((p.y - Y0) / CH);
    setHover(i >= 0 && i < 4 && j >= 0 && j < 9 ? PATTERN[i][j] : -1);
  });
  cnn.addEventListener('pointerleave', () => setHover(-1));

  q('link').addEventListener('change', (ev) => {
    if (ev.target.checked) {
      const v = scales[0];
      scales = scales.map(() => v);
      sync();
      draw();
    }
  });
  q('reset').addEventListener('click', () => {
    scales = [1, 1, 1, 1];
    sync();
    draw();
  });

  onTheme(draw);
  sync();
  draw();
}
