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

### Implementation Deviations

* `DD-07`: Full protected-route smoke validation for the redesigned station surfaces is still pending
  * Plan specifies: manual route smoke validation for `/stations`, `/stations/:stationId`, and `/stations/:stationId/live`
  * Implementation differs: only signed-out route responses could be verified because the local environment currently lands on the Firebase Auth gate for protected routes
  * Rationale: no authenticated operator session was available in this environment during Phase 2 execution

* `DD-08`: Full rendered-route smoke validation for analytics, comparisons, and history is still pending
  * Plan specifies: manual route smoke validation for `/analytics`, `/comparisons`, and `/history`
  * Implementation differs: route responses and browser open were verified, but the rendered protected-route content and filter interactions could not be inspected end to end in this environment
  * Rationale: browser page inspection and interactive validation tools were unavailable during Phase 3 execution

* `DD-09`: Final Phase 4 signoff remains partial because authenticated seeded-data validation could not be executed end to end
  * Plan specifies: final validation and demo-data readiness review for the redesigned web package
  * Implementation differs: TypeScript fallback validation and local production build passed, and seed sources were audited in code, but the protected routes could not be exercised against a live authenticated Firebase project in this environment
  * Rationale: no authenticated operator session, project-scoped Firebase env file, or seeded backend runtime was available during Phase 4 execution

* `DD-10`: The live-monitoring redesign intentionally preserves a text-first camera placeholder instead of Stitch-style embedded media
  * Plan specifies: keep deviations from Stitch explicit and route unsupported behavior to follow-on work
  * Implementation differs: the live route surfaces camera-feed status and storage-path metadata, but seeded demo data does not include camera frame metadata and the product scope does not require inline camera playback for signoff
  * Rationale: current contracts and seed workflow support live status, latest event, and camera-feed metadata seams, but not guaranteed demo-ready embedded camera imagery

## Phase 4 Final Audit

### Demo-data readiness

* The current seed workflow is broadly sufficient for the redesigned operator page set
  * Evidence: `services/backend-functions/scripts/seed-demo-data.mjs` seeds three stations with building, floor, location, signage, and layout variance; live-status documents for all three stations; ninety deterministic disposal events; and daily analytics rollups for station, floor, building, and experiment dimensions
  * Result: `/stations`, `/stations/:stationId`, `/stations/:stationId/live`, `/analytics`, `/comparisons`, and `/history` all have believable backing data shapes for the implemented UI copy and filters

* The seeded dataset still has demo-quality gaps that should remain explicit
  * No seeded camera-frame metadata exists, so the live route cannot present a real media frame during signoff
  * No seeded LLM-fallback event exists, so the history surface can show the field but not a positive fallback example out of the box
  * The before/after and A/B comparison cards are powered by grouped analytics queries over day and station dimensions, not by explicit campaign-change records or experiment annotations

### Stitch source disposition

* `spec/ui/login/code.html` was implemented for the signed-out auth surface, with social-login actions deferred because verified provider flows do not exist
* `spec/ui/devices/code.html` was implemented through the station-directory redesign, translated into station-centric copy and current route links
* `spec/ui/device details/code.html` was split across station detail, live monitoring, and history styling, with manual scan actions and unsupported diagnostics deferred
* `spec/ui/analytics/code.html` was implemented across analytics and comparisons, with export and AI insight actions kept intentionally non-functional
* `spec/ui/landing page/code.html` remains explicitly deferred because it is an optional public-facing marketing surface and does not belong to the current operator-only `apps/web` route set
* `spec/ui/dashboard/code.html` remains explicitly rejected as an invalid source because it duplicates the landing-page composition instead of providing a usable operator dashboard layout

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

* `WI-06`: Decide whether the remote `Space Grotesk` font import should stay remote or move to a local asset strategy (low)
  * Source: Implementation Phase 1, Step 1.1
  * Dependency: Web deployment and asset-loading decision for the production demo environment

* `WI-07`: Sign into the local dashboard and manually verify the redesigned station routes with seeded station data (medium)
  * Source: Implementation Phase 2, Step 2.3
  * Dependency: Authenticated operator credentials and a seeded station ID in the local environment

* `WI-08`: Decide whether the stations directory needs true per-station live badges backed by a fleet summary source (medium)
  * Source: Implementation Phase 2, Step 2.1
  * Dependency: Backend and contract support for directory-level live status aggregation

* `WI-09`: Manually verify the redesigned analytics, comparisons, and history routes with seeded data in an authenticated browser session (medium)
  * Source: Implementation Phase 3, Step 3.3
  * Dependency: Browser access with interactive inspection and authenticated operator credentials

* `WI-10`: Decide whether to expose history next-cursor navigation in a later UI iteration (medium)
  * Source: Implementation Phase 3, Step 3.2
  * Dependency: Product decision on whether raw event-history cursor navigation belongs in the operator surface

* `WI-11`: Seed at least one live camera-frame document and one LLM-fallback disposal event for demo polish (medium)
  * Source: Phase 4 demo-data readiness audit
  * Dependency: Demo-seed script updates and a confirmed operator story for when those states should appear during the rehearsal

* `WI-12`: Validate the redesigned protected routes against a real authenticated Firebase project before final demo signoff (high)
  * Source: `DD-09`
  * Dependency: `apps/web/.env`, deployed backend Functions, seeded Firestore data, and operator credentials