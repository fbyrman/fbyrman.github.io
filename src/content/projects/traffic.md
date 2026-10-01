---
title: Live Dutch highway traffic forecasting
summary: Forecasting traffic on Dutch highways in real time with time series foundation models, on top of a collector that reads the national open data feed every minute.
year: 2026
status: active
stack: [Python, Polars, httpx, lxml, uv]
links: []
---

The NDW, the Dutch national road traffic data portal, publishes flow and speed
measurements from sensors along the highways every minute as open DATEX II feeds. This
project collects that feed and uses it to forecast traffic with time series foundation
models.

What exists so far:

- A parser for the NDW feeds: the measurement site table and the per-minute flow and speed data.
- A polling collector that reads the feed every minute and writes per-site aggregates to Parquet. It is meant to become a cloud ingestion job.
- Exploratory analysis of the collected data.

Next: the forecasting models, and a public dashboard.

<!-- TODO: GitHub link once the repo is public; a screenshot or map from the EDA notebook; confirm "Next". -->
