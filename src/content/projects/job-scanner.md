---
title: Job scanner
summary: Scans about 2,150 postings from 165 academic and industry sources in two minutes and ranks them for relevance in one interface.
year: 2026
stack: [Python, standard library]
links: []
draft: true
---

A scanner that collects job postings from two worlds into one ranked interface.

- **Academia:** 61 organizations on AcademicTransfer, covering every Dutch university, the UMCs and the research institutes, plus the ELLIS jobs board.
- **Industry:** 104 company boards across thirteen sectors, read directly from the applicant tracking system each company publishes through, with custom readers for four companies that have none.

Every posting is scored for relevance, and reruns flag what is new since last time. Roles
that require a doctorate or years of seniority are dropped before scoring. It uses only the
Python standard library, so there is nothing to install.

<!-- TODO: decide whether to publish this (draft: true hides it). Needs a public repo without personal application data. -->
