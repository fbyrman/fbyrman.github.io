---
title: Symmetry-Aware Fully-Amortized Optimization with Scale Equivariant Graph Metanetworks
summary: A metanetwork that reads a trained network's weights and returns better ones in a single forward pass, built to respect the symmetries of weight space.
year: 2025
order: 1
venue: NeurIPS 2025 UniReps Workshop, Extended Abstract Track
authors: B. Kuipers*, <strong>F. Byrman</strong>*, D. Uyterlinde*, A. García-Castellanos <span class="muted">(* equal contribution)</span>
links:
  - label: Interactive explainer
    url: /explainers/scalegmn.html
  - label: OpenReview
    url: https://openreview.net/forum?id=5fY2uzBu1M
  - label: arXiv
    url: https://arxiv.org/abs/2510.08300
  - label: Code
    url: https://github.com/daniuyter/scalegmn_amortization
---

A metanetwork is a neural network that takes the weights of another network as input.
We train one to return improved weights in a single forward pass: fine-tuning a network,
or making it sparse, without iterative optimization. Because many different weight
settings compute the same function, the metanetwork is built to respect those symmetries,
using Scale Equivariant Graph Metanetworks.

On unseen CNNs, one forward pass beats 150 epochs of SGD fine-tuning. We also prove that
convolutions have strictly less scaling symmetry than dense layers, which explains why
the equivariance helps more on MLPs.

The [interactive explainer](/explainers/scalegmn.html) walks through the paper with
figures you can play with.

