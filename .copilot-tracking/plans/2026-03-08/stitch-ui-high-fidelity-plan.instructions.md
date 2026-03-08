---
title: Stitch UI High-Fidelity Implementation Plan
description: Actionable implementation plan for replacing the current web UI with Stitch-designed pages while preserving the existing application shell, routes, and data seams
applyTo: '.copilot-tracking/changes/2026-03-08/stitch-ui-high-fidelity-changes.md'
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: how-to
keywords:
  - stitch
  - ui
  - planning
  - binsight
estimated_reading_time: 8
---
<!-- markdownlint-disable-file -->

## Overview

Replace the operator-facing web visuals with Stitch-faithful page implementations while preserving the current `apps/web` shell, route map, contracts, and live data seams unless an explicit exception is recorded in the planning log.

## Objectives

### User Requirements

* Replace the current application UI with the Stitch-designed pages from `spec/ui` while keeping the final appearance and interaction model close to Stitch. Source: user request and `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md`
* Reuse the current shell, routes, and data seams where practical, but do not let the legacy UI structure determine the final appearance. Source: user request
* Treat deviations from Stitch as exceptions that must be called out explicitly. Source: user request
* Reuse current routes, data flows, components, and behaviors where they already support the required pages. Source: `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md`

### Derived Objectives

* Preserve the existing route taxonomy and provider lifecycle because they already align to the product spec more closely than the raw Stitch exports. Derived from: `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` and `spec/binsight-spec.md`
* Translate the Stitch HTML into local React and CSS primitives instead of importing Tailwind CDN pages directly. Derived from: existing `apps/web` build constraints and research styling analysis
* Keep unsupported actions visibly explicit rather than inventing placeholder behavior for unbacked capabilities such as social login, export reports, AI insights, device registration, or operator-triggered scans. Derived from: research blocked-integration findings and product-scope constraints

## Context Summary

### Project Files

* `apps/web/src/app/providers.tsx` - provider-owned shell, auth gating, and signed-out UI state
* `apps/web/src/app/router.tsx` - current operator route map that should remain stable
* `apps/web/src/app/dashboard.css` - current shared styling surface and likely home for Stitch-derived primitives
* `apps/web/src/pages/stations.tsx` - station directory route body
* `apps/web/src/pages/station-detail.tsx` - station detail route body
* `apps/web/src/pages/live-monitoring.tsx` - dedicated live-monitoring route body
* `apps/web/src/pages/analytics.tsx` - analytics overview route body
* `apps/web/src/pages/comparisons.tsx` - comparisons route body
* `apps/web/src/pages/event-history.tsx` - event-history route body

### References

* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - route-to-Stitch mapping, blocked capabilities, and recommended implementation path
* `.copilot-tracking/plans/logs/2026-03-08/stitch-ui-high-fidelity-log.md` - discrepancy tracking, implementation paths, and follow-on work
* `spec/binsight-spec.md` - source of truth for operator workflow and dashboard scope
* `/memories/repo/binbuddy-architecture-facts.md` - current architecture guardrails
* `/memories/repo/binbuddy-phase2-validation-facts.md` - validation constraints and TypeScript fallback

### Standards References

* `.github/instructions/source-of-truth.instructions.md` - product behavior must remain aligned to the spec
* HVE markdown and writing-style instructions - tracking artifacts and planning language conventions

## Implementation Checklist

### [ ] Implementation Phase 1: Design foundation and shell alignment

<!-- parallelizable: false -->

* [ ] Step 1.1: Establish the Stitch translation rules and shared styling primitives
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-high-fidelity-details.md` (Lines 28-50)
* [ ] Step 1.2: Replace the signed-out auth surface with the Stitch login design
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-high-fidelity-details.md` (Lines 52-71)
* [ ] Step 1.3: Validate phase changes
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-high-fidelity-details.md` (Lines 73-77)

### [ ] Implementation Phase 2: Stations directory and station detail/live redesign

<!-- parallelizable: false -->

* [ ] Step 2.1: Rebuild the stations directory to match the Stitch devices page
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-high-fidelity-details.md` (Lines 83-104)
* [ ] Step 2.2: Rebuild station detail and live monitoring from the Stitch device-details source
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-high-fidelity-details.md` (Lines 106-129)
* [ ] Step 2.3: Validate phase changes
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-high-fidelity-details.md` (Lines 131-135)

### [ ] Implementation Phase 3: Analytics, comparisons, and event history redesign

<!-- parallelizable: false -->

* [ ] Step 3.1: Rebuild analytics and comparisons from the Stitch analytics page
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-high-fidelity-details.md` (Lines 141-163)
* [ ] Step 3.2: Restyle event history using the Stitch recent-scans pattern
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-high-fidelity-details.md` (Lines 165-185)
* [ ] Step 3.3: Validate phase changes
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-high-fidelity-details.md` (Lines 187-191)

### [ ] Implementation Phase 4: Final validation and exception audit

<!-- parallelizable: false -->

* [ ] Step 4.1: Run full project validation for the web package
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-high-fidelity-details.md` (Lines 197-199)
* [ ] Step 4.2: Validate demo-data readiness against the selected page set
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-high-fidelity-details.md` (Lines 201-203)
* [ ] Step 4.3: Audit all deviations from Stitch, including deferred Stitch sources
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-high-fidelity-details.md` (Lines 205-207)
* [ ] Step 4.4: Report blocking issues and follow-on work
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-high-fidelity-details.md` (Lines 209-211)

## Planning Log

See `.copilot-tracking/plans/logs/2026-03-08/stitch-ui-high-fidelity-log.md` for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Existing shell behavior in `apps/web/src/app/providers.tsx`
* Existing route map in `apps/web/src/app/router.tsx`
* Shared contracts in `packages/contracts/src/index.ts` and `packages/contracts/src/index.d.ts`
* Current backend gateway and Firestore live-monitoring seams in `apps/web/src/lib`
* TypeScript validation fallback via `npx --yes -p typescript@5.8.2 tsc` if `pnpm` remains unavailable in this environment

## Success Criteria

* The redesigned operator routes visibly match the Stitch designs with only explicit, logged exceptions or deferred research items. Traces to: user request and planning log items `DD-01` through `DD-06` plus `DR-01` through `DR-04`
* The current route shell, auth flow, data contracts, and realtime subscriptions stay intact unless an explicit exception is documented. Traces to: research recommended approach and `spec/binsight-spec.md`
* Each major Stitch source is mapped to an implemented or explicitly deferred operator surface, including the optional landing page and invalid dashboard export. Traces to: `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` and planning log item `DR-03`
* Validation covers TypeScript correctness, route smoke testing, demo-data readiness, and an exception audit against Stitch fidelity. Traces to: details steps 1.3, 2.3, 3.3, and 4.1-4.4