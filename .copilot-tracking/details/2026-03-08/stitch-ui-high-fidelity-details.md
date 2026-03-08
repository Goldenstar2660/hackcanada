---
title: Stitch UI High-Fidelity Implementation Details
description: Step-by-step implementation details for replacing the current web visuals with the Stitch page designs while preserving the existing application shell and data seams
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: how-to
keywords:
  - stitch
  - ui
  - planning
  - web
estimated_reading_time: 9
---
<!-- markdownlint-disable-file -->

## Context Reference

Sources:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md`
* `spec/binsight-spec.md`
* `/memories/repo/binbuddy-architecture-facts.md`
* `/memories/repo/binbuddy-phase2-validation-facts.md`

## Implementation Phase 1: Design foundation and shell alignment

<!-- parallelizable: false -->

### Step 1.1: Establish the Stitch translation rules and shared styling primitives

Translate the Stitch pages into a dedicated web styling layer that targets the exported layouts, spacing, typography, and interaction states without importing the Tailwind CDN pages directly. Preserve the existing route map, provider behavior, and query-backed navigation as non-negotiable shell constraints.

Files:
* `apps/web/src/app/dashboard.css` - add or replace layout, card, form, and table primitives required to match the Stitch surfaces
* `apps/web/src/app/router.tsx` - keep the current route taxonomy stable while remapping page bodies to the Stitch-derived layouts
* `apps/web/src/app/providers.tsx` - preserve auth gating, navigation interception, and route-backed form behavior

Discrepancy references:
* `DD-01`
* `DD-02`

Success criteria:
* Shared styling primitives can reproduce the Stitch layouts without adding Tailwind as a runtime dependency
* The implementation path preserves the current route semantics and provider lifecycle behavior

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - preferred approach, styling constraints, and route-to-Stitch mapping
* `spec/binsight-spec.md` - operator workflow and dashboard scope

Dependencies:
* Existing route and provider behavior remains the shell contract

### Step 1.2: Replace the signed-out auth surface with the Stitch login design

Update the signed-out view in the provider-managed shell so the login page matches the Stitch login screen closely in layout, copy hierarchy, input treatment, and primary action emphasis. Keep email and password login as the only active flow unless audited social providers are added later.

Files:
* `apps/web/src/app/providers.tsx` - replace the signed-out UI state with the Stitch-derived auth composition
* `apps/web/src/app/dashboard.css` - add login page-specific layout, brand, and form styles

Discrepancy references:
* `DD-03`

Success criteria:
* Signed-out users see a Stitch-faithful login page instead of the current placeholder shell
* Unsupported social sign-in actions are explicitly disabled, hidden, or labeled as unavailable by design

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - login mapping and blocked social-provider behavior

Dependencies:
* Step 1.1 completion

### Step 1.3: Validate phase changes

Validation commands:
* `npx --yes -p typescript@5.8.2 tsc -p apps/web/tsconfig.json --noEmit` - validate provider and route-shell changes if pnpm remains unavailable
* Workspace Problems check on `apps/web/src/app/providers.tsx` and `apps/web/src/app/dashboard.css` - confirm there are no new relevant diagnostics

## Implementation Phase 2: Stations directory and station detail/live redesign

<!-- parallelizable: false -->

### Step 2.1: Rebuild the stations directory to match the Stitch devices page

Replace the current stations route body with a station-centric translation of the Stitch devices page. Keep existing data loaders, route links, and filter/query seams, but do not preserve legacy layout choices when they conflict with the Stitch target.

Files:
* `apps/web/src/pages/stations.tsx` - recompose the stations page around the new layout and existing data seams
* `apps/web/src/features` - update or add supporting presentational components only where existing modules cannot reach the Stitch fidelity target
* `apps/web/src/app/dashboard.css` - add directory-specific tables, cards, badges, search, and filter styling

Discrepancy references:
* `DD-04`

Success criteria:
* `/stations` visually aligns to the Stitch devices page while retaining current routing and data behavior
* Device-centric labels are converted to station-centric language consistent with the product spec

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - station directory mapping, route fit, and wireable-now analysis
* `spec/binsight-spec.md` - station browsing and metadata requirements

Dependencies:
* Step 1.1 completion

### Step 2.2: Rebuild station detail and live monitoring from the Stitch device-details source

Implement the station detail and live monitoring pages as a coordinated design pair derived from the Stitch device-details page. Preserve the existing distinction between the detail route and the dedicated live route, but carry the same visual system, hierarchy, and status affordances across both surfaces.

Files:
* `apps/web/src/pages/station-detail.tsx` - align station metadata, recent events, and diagnostics to the Stitch detail layout
* `apps/web/src/pages/live-monitoring.tsx` - align real-time panels and stale-state handling to the Stitch live sections while keeping existing Firestore subscription behavior
* `apps/web/src/app/dashboard.css` - add detail-page, live-panel, camera, and event-timeline styling

Discrepancy references:
* `DD-05`
* `DR-01`

Success criteria:
* `/stations/:stationId` and `/stations/:stationId/live` read as one coherent Stitch-derived experience
* Unsupported controls such as operator-triggered `New Scan` actions are removed or explicitly restated as non-interactive status affordances
* Required live fields from the product spec remain present even where the Stitch design under-specifies them

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - station detail mapping, live-monitoring fit, and unsupported behaviors
* `spec/binsight-spec.md` - always-on detection flow and live-monitoring requirements

Dependencies:
* Step 2.1 completion because both Step 2.1 and Step 2.2 extend the shared `apps/web/src/app/dashboard.css` surface

### Step 2.3: Validate phase changes

Validation commands:
* `npx --yes -p typescript@5.8.2 tsc -p apps/web/tsconfig.json --noEmit` - validate stations, detail, and live page changes
* Manual route smoke test in the running web app for `/stations`, `/stations/:stationId`, and `/stations/:stationId/live` - confirm navigation, loading, and realtime hydration still work

## Implementation Phase 3: Analytics, comparisons, and event history redesign

<!-- parallelizable: false -->

### Step 3.1: Rebuild analytics and comparisons from the Stitch analytics page

Translate the Stitch analytics page into the existing analytics and comparisons routes with high fidelity for KPI cards, charts, grouped comparisons, filters, and supporting copy. Preserve current query contracts and backend gateway calls, and mark unsupported export or AI insight actions as explicit exceptions.

Files:
* `apps/web/src/pages/analytics.tsx` - recompose the analytics overview surface
* `apps/web/src/pages/comparisons.tsx` - apply the grouped-comparison sections of the Stitch analytics design
* `apps/web/src/features/filters` - keep current filter semantics while updating the presentation layer as needed
* `apps/web/src/app/dashboard.css` - add analytics-grid, comparison, and chart-shell styling

Discrepancy references:
* `DD-06`

Success criteria:
* `/analytics` and `/comparisons` present the Stitch KPI and comparison visual language without changing current query semantics
* Unsupported actions such as export reports and AI-generated insight buttons are explicitly non-functional by design and documented as follow-on work

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - analytics mapping, blocked capabilities, and contract coverage
* `spec/binsight-spec.md` - analytics and comparisons requirements

Dependencies:
* Step 1.1 completion

### Step 3.2: Restyle event history using the Stitch recent-scans pattern

Use the recent-scans and history sections from the Stitch device-details page as the design basis for the dedicated event-history route. Preserve the existing history route, filters, and backend contract, but reshape the presentation so it matches the Stitch visual language as closely as the current data permits.

Files:
* `apps/web/src/pages/event-history.tsx` - rebuild the history route body around the Stitch recent-scans patterns
* `apps/web/src/app/dashboard.css` - add history-list, scan-row, timeline, and filter result styling

Discrepancy references:
* `DR-02`

Success criteria:
* `/history` no longer reflects the legacy layout and instead reads as a Stitch-consistent event review surface
* Pagination or cursor gaps discovered during implementation are documented instead of masked in the UI

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - history mapping and pagination caution
* `spec/binsight-spec.md` - disposal event history requirements

Dependencies:
* Step 3.1 completion because both Step 3.1 and Step 3.2 extend the shared `apps/web/src/app/dashboard.css` surface

### Step 3.3: Validate phase changes

Validation commands:
* `npx --yes -p typescript@5.8.2 tsc -p apps/web/tsconfig.json --noEmit` - validate analytics, comparisons, and history changes
* Manual route smoke test in the running web app for `/analytics`, `/comparisons`, and `/history` - confirm filters and data rendering still match current backend outputs

## Implementation Phase 4: Final validation and exception audit

<!-- parallelizable: false -->

### Step 4.1: Run full project validation for the web package

Execute the available web validation commands after all UI work lands. Use the TypeScript fallback noted in repository memory if pnpm remains blocked in this environment.

### Step 4.2: Validate demo-data readiness against the selected page set

Confirm the seeded stations, live-status documents, and analytics rollups are sufficient to exercise the redesigned routes with believable content during implementation and demo validation. Record any gaps that block high-fidelity presentation before final signoff.

### Step 4.3: Audit all deviations from Stitch, including deferred Stitch sources

Confirm every retained deviation is explicit, intentional, and traceable to a product, backend, contract, or safety constraint. This audit must explicitly record the disposition of the optional landing page and the invalid Stitch dashboard export so they are deferred rather than silently dropped. Remove any accidental carryover from the legacy UI that survives only because it was already present.

### Step 4.4: Report blocking issues and follow-on work

When implementation exposes missing backend capabilities, incomplete contracts, or product ambiguities, document them in the execution log and route them to follow-on work instead of inventing unsupported UI behavior.

## Dependencies

* Existing route, auth, and navigation behavior in `apps/web/src/app/providers.tsx`
* Existing route map in `apps/web/src/app/router.tsx`
* Contracts in `packages/contracts/src/index.ts` and `packages/contracts/src/index.d.ts`
* Current backend gateway and Firestore live-monitoring seams in `apps/web/src/lib`

## Success Criteria

* The operator-facing routes under `apps/web` visually track the Stitch designs with explicit, documented exceptions only where current behavior or product scope requires them
* The current shell, routes, contracts, and live data seams remain intact unless a planned exception says otherwise
* Validation covers both TypeScript correctness and manual route-level smoke checks for the redesigned surfaces