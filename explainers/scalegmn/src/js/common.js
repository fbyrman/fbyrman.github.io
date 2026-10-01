// Shared helpers for the figures, exposed as window.XP. Loaded before every fig-*.js.
(function () {

// Read a CSS custom property from :root, so every figure follows the site theme.
function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Call fn now and again whenever the colour scheme flips.
function onTheme(fn) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', fn);
}

// Size a canvas's backing store to its CSS box times the device pixel ratio.
// Drawing code then works in CSS pixels of the canvas's intrinsic width/height.
function setupCanvas(canvas) {
  // The logical size is remembered on first setup, because setting
  // canvas.width below also rewrites the width attribute.
  if (!canvas.dataset.w) {
    canvas.dataset.w = canvas.getAttribute('width');
    canvas.dataset.h = canvas.getAttribute('height');
  }
  const w = Number(canvas.dataset.w);
  const h = Number(canvas.dataset.h);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.aspectRatio = `${w} / ${h}`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

// Pointer position in the canvas's own coordinate system.
function canvasPoint(canvas, ev, w, h) {
  const r = canvas.getBoundingClientRect();
  return [((ev.clientX - r.left) / r.width) * w, ((ev.clientY - r.top) / r.height) * h];
}

function svgPoint(svg, ev) {
  const p = svg.createSVGPoint();
  p.x = ev.clientX;
  p.y = ev.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Piecewise linear colour ramp through the given hex stops; t in [0, 1].
function ramp(stops) {
  const rgb = stops.map(hexToRgb);
  const n = rgb.length - 1;
  return (t) => {
    const x = Math.min(Math.max(t, 0), 1) * n;
    const i = Math.min(Math.floor(x), n - 1);
    const f = x - i;
    const a = rgb[i];
    const b = rgb[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };
}

// Paint a scalar field (rows of nx values, ny rows, row 0 at the top) into a
// region of a canvas. The field is drawn small and scaled up with smoothing,
// which gives a soft, continuous look at a fraction of the cost.
function paintField(ctx, field, nx, ny, colour, x, y, w, h) {
  const off = document.createElement('canvas');
  off.width = nx;
  off.height = ny;
  const octx = off.getContext('2d');
  const img = octx.createImageData(nx, ny);
  for (let k = 0; k < nx * ny; k++) {
    const c = colour(field[k]);
    img.data[4 * k] = c[0];
    img.data[4 * k + 1] = c[1];
    img.data[4 * k + 2] = c[2];
    img.data[4 * k + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(off, x, y, w, h);
  ctx.restore();
}

// Marching squares: line segments where the field crosses `level`.
// Returns segments in grid coordinates (column, row).
function contour(field, nx, ny, level) {
  const segs = [];
  const v = (i, j) => field[j * nx + i];
  const lerp = (a, b) => (level - a) / (b - a);
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), d = v(i, j + 1);
      const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const top = [i + lerp(a, b), j];
      const right = [i + 1, j + lerp(b, c)];
      const bottom = [i + lerp(d, c), j + 1];
      const left = [i, j + lerp(a, d)];
      switch (idx) {
        case 1: case 14: segs.push([left, bottom]); break;
        case 2: case 13: segs.push([bottom, right]); break;
        case 3: case 12: segs.push([left, right]); break;
        case 4: case 11: segs.push([top, right]); break;
        case 6: case 9: segs.push([top, bottom]); break;
        case 7: case 8: segs.push([left, top]); break;
        case 5: segs.push([left, top], [bottom, right]); break;
        case 10: segs.push([top, right], [left, bottom]); break;
      }
    }
  }
  return segs;
}

// Small seeded generator, so "new problems" are reproducible within a session.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function arrowHead(ctx, x0, y0, x1, y1, size) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - size * Math.cos(a - 0.42), y1 - size * Math.sin(a - 0.42));
  ctx.lineTo(x1 - size * Math.cos(a + 0.42), y1 - size * Math.sin(a + 0.42));
  ctx.closePath();
  ctx.fill();
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

  window.XP = { css, onTheme, setupCanvas, canvasPoint, svgPoint, hexToRgb, ramp, paintField, contour, rng, arrowHead, SVG_NS, el };
})();
