// Figure 1 (static): weight prediction. An architecture G without weights goes
// into a metanetwork, which returns weights theta for it: G-space -> Theta.
(function () {
const { mlpWeights, mlpFigure } = window.XP;

const svg = document.querySelector('#fig-predict svg');
if (!svg) return;

mlpFigure(svg, {
  inWeights: null,
  outWeights: mlpWeights(11),
  inLabel: [['architecture '], ['G', 'sym']],
  outLabel: [['initialized weights '], ['θ', 'sym-bold']],
  boxMath: [['𝒢', 'sym'], [' → '], ['Θ', 'sym-up']],
});
})();
