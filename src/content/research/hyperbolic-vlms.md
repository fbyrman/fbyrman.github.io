---
title: How Hyperbolic Are Hyperbolic Vision-Language Models?
summary: Existing hyperbolic vision-language models turn out to be close to Euclidean in practice. A new loss based on the Gromov product makes them actually hyperbolic.
year: 2026
venue: NeurReps 2026, under review
authors: <strong>F. Byrman</strong>, P. Das, S. Verdenius, P. Mettes
links:
  - label: OpenReview
    url: https://openreview.net/forum?id=zdTnWSMvsX
---

Hyperbolic vision-language models extend CLIP-style contrastive learning to hyperbolic
manifolds, on the premise that hyperbolic space suits the hierarchical structure of images
and text. This work asks whether the trained models actually use that geometry, and finds
that in practice they are close to Euclidean.

To fix this, I developed a loss based on the Gromov product that makes hyperbolic VLMs
actually hyperbolic. It reaches state-of-the-art performance at small scale. We are now
scaling it up together with Sapienza University of Rome.

This was my MSc thesis in Artificial Intelligence at the Universiteit van Amsterdam,
supervised by dr. Pascal Mettes and dr. Partha Das. It was submitted to the proceedings
track of the NeurIPS Workshop on Symmetry and Geometry in Neural Representations.

<!-- TODO: add one figure (e.g. a Poincaré disk plot of embeddings before and after the loss) and a code link if the repo can be public. -->
