// Lorentz-model geometry shared by the figures, exposed as window.XP.geo.
//
// Two encoder outputs are described by their radii r1, r2 and the angle theta
// between them; every primitive and every ratio of the paper depends on the pair
// only through (r1, r2, theta) and the curvature c (Appendix B). The forms below
// are the closed forms of the paper, rewritten with half-angle identities so
// they stay accurate when two points nearly coincide (arccos and arcosh lose all
// precision next to 1).
(function () {

const K = 0.1; // aperture constant of the entailment cones (Appendix A)

// ---- distance -------------------------------------------------------------
// d_E = sqrt(r1^2 + r2^2 - 2 r1 r2 cos theta)
function distE(r1, r2, th) {
  const s = Math.sin(th / 2);
  return Math.sqrt((r1 - r2) ** 2 + 4 * r1 * r2 * s * s);
}

// d_L = arcosh(A) / sqrt(c), with A - 1 = 2 sinh^2((a1-a2)/2) + 2 sinh a1 sinh a2 sin^2(theta/2)
// and a_i = sqrt(c) r_i, so that sinh(sqrt(c) d / 2) = sqrt((A - 1) / 2).
function distL(r1, r2, th, c) {
  const sc = Math.sqrt(c);
  const a1 = sc * r1, a2 = sc * r2;
  const h = Math.sinh((a1 - a2) / 2), s = Math.sin(th / 2);
  return (2 / sc) * Math.asinh(Math.sqrt(h * h + Math.sinh(a1) * Math.sinh(a2) * s * s));
}

// ---- exterior angle at point 1 toward point 2 -------------------------------
// Measured from the outward continuation of the ray through point 1. Both are
// written as atan2 of the components of the direction to point 2 along the
// outward radial direction and the direction perpendicular to it.
function extE(r1, r2, th) {
  return Math.abs(Math.atan2(r2 * Math.sin(th), r2 * Math.cos(th) - r1));
}

function extL(r1, r2, th, c) {
  const sc = Math.sqrt(c);
  const a1 = sc * r1, a2 = sc * r2;
  const along = Math.sinh(a2) * Math.cos(th) * Math.cosh(a1) - Math.cosh(a2) * Math.sinh(a1);
  return Math.abs(Math.atan2(Math.sinh(a2) * Math.sin(th), along));
}

// ---- half-aperture --------------------------------------------------------
// Euclidean ball radius R = 2K / sqrt(c), the matching rule of the paper, so
// both apertures agree to first order. arcsin saturates at pi/2.
const asinClamp = (x) => Math.asin(Math.min(1, x));
function aperE(r, c) { return asinClamp((2 * K) / (Math.sqrt(c) * r)); }
function aperL(r, c) { return asinClamp((2 * K) / Math.sinh(Math.sqrt(c) * r)); }
function ballR(c) { return (2 * K) / Math.sqrt(c); }

// ---- the three ratios -----------------------------------------------------
function ratioD(r1, r2, th, c) {
  const e = distE(r1, r2, th);
  return e < 1e-12 ? 1 : distL(r1, r2, th, c) / e;
}
function ratioExt(r1, r2, th, c) {
  const e = extE(r1, r2, th);
  return e < 1e-12 ? 1 : extL(r1, r2, th, c) / e;
}
function ratioAper(r, c) { return aperL(r, c) / aperE(r, c); }

// ---- points on the hyperboloid L^2_c, as [x, y, t] with t the time axis ----
// Exponential map at the origin [0, 0, 1/sqrt(c)] of a plane vector v.
function expO(v, c) {
  const sc = Math.sqrt(c);
  const r = Math.hypot(v[0], v[1]);
  const k = r < 1e-12 ? 1 : Math.sinh(sc * r) / (sc * r);
  return [k * v[0], k * v[1], Math.cosh(sc * r) / sc];
}

const lor = (a, b) => a[0] * b[0] + a[1] * b[1] - a[2] * b[2];
const comb = (p, a, q, b) => [p * a[0] + q * b[0], p * a[1] + q * b[1], p * a[2] + q * b[2]];

// Exponential map at a point x of the hyperboloid, for a tangent vector w.
function expAt(x, w, c) {
  const sc = Math.sqrt(c);
  const n = Math.sqrt(Math.max(lor(w, w), 0));
  if (n < 1e-12) return x.slice();
  return comb(Math.cosh(sc * n), x, Math.sinh(sc * n) / (sc * n), w);
}

// Points along the geodesic from x to y, n + 1 samples.
function geodesic(x, y, c, n) {
  const sc = Math.sqrt(c);
  const D = Math.acosh(Math.max(1, -c * lor(x, y)));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    out.push(D < 1e-9 ? comb(1 - s, x, s, y) : comb(Math.sinh((1 - s) * D) / Math.sinh(D), x, Math.sinh(s * D) / Math.sinh(D), y));
  }
  return out;
}

// Orthonormal tangent frame at expO(v): outward radial direction a and the
// counter-clockwise angular direction e (both of Lorentzian norm 1).
function frameAt(v, c) {
  const sc = Math.sqrt(c);
  const r = Math.hypot(v[0], v[1]);
  const u = r < 1e-12 ? [1, 0] : [v[0] / r, v[1] / r];
  return {
    a: [Math.cosh(sc * r) * u[0], Math.cosh(sc * r) * u[1], Math.sinh(sc * r)],
    e: [-u[1], u[0], 0],
  };
}

window.XP.geo = {
  K, distE, distL, extE, extL, aperE, aperL, ballR,
  ratioD, ratioExt, ratioAper, expO, expAt, geodesic, frameAt, lor, comb,
};

// Text-embedding radial modes at the converged curvature c = 0.1, ViT-S/16 (Fig. 3).
// The image-caption pairs of Figures 1 and 2. Photos from Wikimedia Commons,
// credited in the caption of Figure 1; build.js inlines them as data URIs.
window.XP.PAIRS = [
  { img: '{{data:img/dog.jpg}}', caption: 'a dog playing fetch', short: 'dog' },
  { img: '{{data:img/cat.jpg}}', caption: 'a cat asleep on a sofa', short: 'cat' },
  { img: '{{data:img/car.jpg}}', caption: 'a red car on a street', short: 'car' },
];

window.XP.MODELS = [
  { name: 'MERU', r1: 0.53 },
  { name: 'HyCoCLIP', r1: 0.40 },
  { name: 'ARGENT', r1: 0.74 },
  { name: 'PHyCLIP', r1: 0.47 },
];
})();
