---
title: System Spec Alignment Remediation Research
description: Planning-oriented research that reconciles the current BinSight spec with earlier March 7 gap analysis
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - spec alignment
  - remediation
  - planning
estimated_reading_time: 4
---
<!-- markdownlint-disable-file -->

## Task Research

Align the implementation plan to the current authoritative spec, not to stale conclusions in the
earlier March 7 gap research.

## Corrected Baseline

* The spec already requires always-on detection with no low-power wake-up or person-trigger
  sensor.
* The spec requires behavior, not three separate committed model artifacts: item identification,
  hand presence tracking, hand zone tracking, guidance, drop inference, and event creation.
* The spec still requires complete event provenance, including `modelConfidence` and
  `llmFallbackUsed`.
* The spec still requires broad seeded demo data that supports intervention stories and
  comparisons.

## Planning-Relevant Findings

* The remaining alignment gap is implementation, not more removal of low-power or person
  detection language from the spec.
* The largest live-loop gap is placeholder disposal sensing: committed firmware still stands in
  for `handPresent` and `handZone`, and the fallback classifier path is still stubbed.
* Backend contracts and normalization are already strong enough that frontend parity is the next
  dashboard blocker, not a large backend redesign.
* The project needs a deliberate split between the narrow live runtime label set and the broader
  seeded demo taxonomy.

## Selected Planning Defaults

* Default architecture path: Pi-owned perception. The Pi camera path should own item
  classification, hand presence, and hand zone tracking. The ESP should be reduced to LEDs,
  device health, and transport.
* Default taxonomy path: Keep the Ottawa rules preset broad for seeded demo analytics and
  comparisons, but constrain the live runtime to the three real detectable classes through model
  metadata or runtime configuration.
* Default UI path: Treat event-history, live-monitoring, and analytics parity as implementation
  work because the contracts already carry most of the required fields.

## Dependencies and Risks

* Uncommitted local model assets may still affect the exact runtime label bundle and validation
  steps.
* If Pi-owned hand tracking requires new shared schemas or live-status fields, `packages/contracts`
  and backend normalization must stay synchronized.
* If seeded intervention markers need new contract fields, backend and frontend changes must land
  together.

## Recommended Plan Shape

1. Lock the live runtime boundary and fallback behavior first.
2. Complete the Pi-side perception and spec-complete event path next.
3. Separate live runtime labels from broad demo seeding before widening frontend and seed work.
4. Run dashboard parity and richer seed-data work in parallel after contracts stabilize.
5. Finish with documentation and full validation.