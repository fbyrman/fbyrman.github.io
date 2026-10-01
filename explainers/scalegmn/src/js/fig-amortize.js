// Figure 2 (static): what the paper does. Existing weights theta go into the
// metanetwork together with the architecture, and improved weights theta'
// come out: G-space x Theta -> Theta.
(function () {
const { mlpWeights, mlpFigure, rng } = window.XP;

const svg = document.querySelector('#fig-amortize svg');
if (!svg) return;

// Start from the weights of Figure 1, then shift each by a small fixed amount.
const before = mlpWeights(11);
const r = rng(5);
const after = before.map((w) => Math.round(Math.max(-1.2, Math.min(1.2, w + (r() - 0.5) * 0.6)) * 100) / 100);

mlpFigure(svg, {
  inWeights: before,
  outWeights: after,
  inLabel: [['existing weights '], ['θ', 'sym-bold']],
  outLabel: [['improved weights '], ['θ', 'sym-bold'], ['′']],
  boxMath: [['𝒢', 'sym'], [' × '], ['Θ', 'sym-up'], [' → '], ['Θ', 'sym-up']],
});
})();
