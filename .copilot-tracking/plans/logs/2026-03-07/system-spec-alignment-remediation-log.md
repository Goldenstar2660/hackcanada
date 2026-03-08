---
title: System Spec Alignment Remediation Log
description: Planning log for the cross-project spec-alignment remediation plan
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - planning log
  - spec alignment
  - remediation
estimated_reading_time: 4
---
<!-- markdownlint-disable-file -->

# Planning Log: System Spec Alignment Remediation

## Discrepancy Log

Gaps and differences identified between research findings and the implementation plan.

### Unaddressed Research Items

* None after revision.

### Plan Deviations from Research

* DD-01
  * Research recommends: Lock the runtime boundary and fallback behavior first, then complete the
    Pi-side perception and spec-complete event path next, and separate the live runtime labels
    from broad demo seeding before widening frontend and seed work.
  * Plan implements: A dedicated taxonomy and asset-bundle phase before the Pi-side perception
    phase, with Step 3.1 depending on Step 2.2.
  * Rationale: This is a deliberate sequencing change to avoid finalizing the live perception loop
    against an unverified model-label contract. The deviation is justified by the supporting
    workstream research, which says the runtime-versus-demo taxonomy boundary should be designed
    before the final runtime-sensing implementation is locked.

## Implementation Paths Considered

### Selected: Pi-owned perception with a broad demo preset

* Approach: Move hand presence and zone tracking onto the Pi camera path, keep the ESP focused on
  LEDs and device health, and enforce the three-class live model separately from the broader demo
  rules preset.
* Rationale: This aligns with the current spec's one-camera runtime and preserves broad demo
  analytics without inventing duplicate presets prematurely.
* Evidence: `.copilot-tracking/research/2026-03-07/system-spec-alignment-remediation-research.md`
  (Lines 45-50)

### IP-01: ESP-backed hand telemetry with placeholder-friendly contracts

* Approach: Keep hand presence and zone sensing as an ESP responsibility and improve the existing
  telemetry path.
* Trade-offs: Smaller short-term firmware delta in the Pi runtime, but it keeps the live loop
  dependent on hardware paths that do not match the spec's camera-centric wording.
* Rejection rationale: It preserves the weakest current seam instead of fixing the root alignment
  issue.

### IP-02: Narrow the shared Ottawa preset to the three live items

* Approach: Reduce the demo preset so runtime and analytics use the same minimal item catalog.
* Trade-offs: Simpler runtime validation, but it weakens the seeded comparison story and forces
  demo analytics to mirror live-model limits.
* Rejection rationale: The spec and user scope both require broad seeded demo variety.

## Suggested Follow-On Work

* WI-01: Add runtime observability for model version and perception mode. Medium priority.
  * Source: plan synthesis from runtime and dashboard workstreams
  * Dependency: core spec-alignment implementation complete
* WI-02: Add optional live camera-frame presentation to the monitoring page if operators need it.
  * Source: open UI scope noted in supplemental research
  * Dependency: dashboard parity work complete