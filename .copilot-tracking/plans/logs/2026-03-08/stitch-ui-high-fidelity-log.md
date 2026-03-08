---
title: Stitch UI High-Fidelity Planning Log
description: Discrepancy tracking, implementation path decisions, and follow-on work for the Stitch UI implementation plan
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: overview
keywords:
  - stitch
  - ui
  - planning-log
  - binsight
estimated_reading_time: 6
---
<!-- markdownlint-disable-file -->

## Discrepancy Log

Gaps and differences identified between the research findings, the Stitch source pages, and the implementation plan.

### Unaddressed Research Items

No active `DR-` items remain after revalidation. The updated plan now covers live-status and demo-data validation in the implementation details, records the required Stitch exception audit, and includes explicit handling for history cursor verification.

### Plan Deviations from Research

No active `DD-` items remain after revalidation. The updated plan follows the research-recommended incremental page-body replacement approach and preserves the shell, routes, contracts, and live data seams that the research identified as non-negotiable.

## Implementation Paths Considered

### Selected: High-fidelity page-body replacement inside the existing shell

* Approach: Preserve the current routes, providers, contracts, and data seams while rebuilding each route body and its styling to match the Stitch sources as closely as current behavior allows
* Rationale: This is the only path that simultaneously protects product-correct behavior and allows the final appearance to be driven by Stitch instead of the legacy UI
* Evidence: `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md`

### `IP-01`: Full shell and route rewrite from Stitch exports

* Approach: Replace the current router, provider composition, and page structure with a new app shell modeled directly from the Stitch HTML exports
* Trade-offs: Maximizes literal reuse of exported layouts, but duplicates critical auth, navigation, and data-loading behavior that already matches the product spec
* Rejection rationale: The current shell is behaviorally correct and the Stitch exports do not represent a complete application architecture

### `IP-02`: Ship static Stitch prototypes alongside the existing app

* Approach: Add new preview routes or static pages for the Stitch designs without replacing the current operator routes yet
* Trade-offs: Low risk to the existing app, but fails the requirement to replace the current UI and increases surface-area drift
* Rejection rationale: It does not satisfy the task and would create a second UI that diverges from production behavior

## Suggested Follow-On Work

* `WI-01`: Add verified social auth providers if the Stitch login actions must become real controls (medium)
  * Source: Research login mapping and `DD-03`
  * Dependency: Auth-provider review and Firebase Auth configuration updates

* `WI-02`: Add richer live camera delivery and fleet-wide live aggregation for station surfaces (high)
  * Source: Research wireable-now versus blocked analysis and `DR-01`
  * Dependency: Backend and contract changes in live-status and station-directory data

* `WI-03`: Add analytics export and AI narrative capabilities (medium)
  * Source: Research analytics mapping and `DD-06`
  * Dependency: New backend endpoints, contracts, and product approval

* `WI-04`: Validate and, if necessary, fix event-history cursor behavior before polishing advanced history interactions (medium)
  * Source: Research history mapping and `DR-02`
  * Dependency: Backend event-history verification

* `WI-05`: Decide whether to build a separate public-facing landing page outside `apps/web` from the Stitch landing asset (low)
  * Source: Research route-to-Stitch mapping and `DR-03`
  * Dependency: Product scope clarification for non-operator web surfaces