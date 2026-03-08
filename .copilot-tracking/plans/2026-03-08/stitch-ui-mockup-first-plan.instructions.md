---
description: Actionable implementation plan for a mockup-first Stitch UI rollout that aligns the visible web information architecture to spec/ui while preserving current supported seams
applyTo: '.copilot-tracking/changes/2026-03-08/stitch-ui-mockup-first-changes.md'
---
<!-- markdownlint-disable-file -->

## Overview

Implement the Stitch redesign with a mockup-first visible route model built around landing, login, analytics, devices, and device details while reusing the existing auth, routing engine, API gateways, contracts, and live-data seams wherever they already support the target UI.

## Objectives

### User Requirements

* Redesign the current web UI to match the Stitch mockups under `spec/ui` as closely as possible. Source: user request and `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md`
* Integrate features that already exist in `apps/web`, `services/backend-functions`, and `packages/contracts`. Source: user request and `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md`
* Preserve working auth, routing, data-loading, and live-data seams where they accelerate delivery without dictating the final UX. Source: user request
* Mark unsupported mockup features as future development instead of inventing placeholder behavior. Source: user request and `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md`

### Derived Objectives

* Shift the visible information architecture from the current stations-first model to the mockup-backed page set of landing, login, analytics, devices, and device details. Derived from: research route mapping and selected implementation scenario
* Preserve compatibility routes from `/stations`, `/stations/:stationId`, and `/comparisons` so existing demo links keep working during rollout. Derived from: research compatibility-routing recommendation
* Keep history and live-monitoring capabilities available as secondary deep links when they help preserve supported behavior not represented as top-level Stitch pages. Derived from: research compatibility-routing recommendation and current supported backend seams
* Treat dashboard, settings, social login, export, AI insight, device registration, and manual new-scan actions as explicit deferred work until supported by corrected mockups or backend capabilities. Derived from: research blocked-feature matrix and potential-next-research items

## Context Summary

### Project Files

* `apps/web/src/app/router.tsx` - current route map that must be reworked toward the mockup-first visible IA
* `apps/web/src/app/providers.tsx` - auth gating, callable gateway wiring, live-data gateway wiring, and same-origin navigation interception
* `apps/web/src/app/layout.tsx` - likely home for shared navigation and shell changes aligned to Stitch
* `apps/web/src/pages/stations.tsx` - current route body to evolve into the visible Devices page or redirect source
* `apps/web/src/pages/station-detail.tsx` - current station detail route body to evolve into device-details presentation
* `apps/web/src/pages/live-monitoring.tsx` - existing live-detail seam that can remain as a secondary deep link
* `apps/web/src/pages/analytics.tsx` - primary analytics route backed by supported contracts today
* `apps/web/src/pages/comparisons.tsx` - current comparison route to merge into the visible analytics IA or preserve as a compatibility entry
* `apps/web/src/pages/event-history.tsx` - current history surface to preserve as a secondary route when needed
* `apps/web/src/app/dashboard.css` - current shared styling surface and likely translation layer for Stitch-derived primitives

### References

* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - primary research for route mapping, hookup matrix, selected implementation strategy, and deferred features
* `/memories/repo/binbuddy-architecture-facts.md` - verified architecture constraints for live dashboard and backend boundaries
* `/memories/repo/binbuddy-phase2-validation-facts.md` - validation constraints and known TypeScript and build fallbacks for this workspace
* `spec/ui/landing page/code.html` - public landing-page source for mockup-driven layout and CTA copy
* `spec/ui/login/code.html` - login-page source for signed-out auth presentation
* `spec/ui/analytics/code.html` - analytics-page source for KPI, comparison, and insight presentation
* `spec/ui/devices/code.html` - devices-page source for directory and filter presentation
* `spec/ui/device details/code.html` - detail-page source for drill-down, recent scans, and live-status presentation

### Standards References

* `.github/instructions/source-of-truth.instructions.md` - research records the user override that makes `spec/ui` the visible UI source of truth for this task
* HVE markdown and writing-style instructions - required for planning artifacts under `.copilot-tracking`

## Implementation Checklist

### [x] Implementation Phase 1: Route architecture and shared shell foundation

<!-- parallelizable: false -->

* [x] Step 1.1: Introduce the mockup-first visible route model and compatibility redirects
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-mockup-first-details.md` (Lines 32-53)
* [x] Step 1.2: Build shared Stitch-aligned shell and styling primitives without replacing the working provider core
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-mockup-first-details.md` (Lines 55-72)
* [x] Step 1.3: Validate route-shell changes
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-mockup-first-details.md` (Lines 74-78)

### [ ] Implementation Phase 2: Public entry and login experience

<!-- parallelizable: false -->

* [x] Step 2.1: Add the public landing experience from the Stitch landing-page mockup
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-mockup-first-details.md` (Lines 84-104)
* [x] Step 2.2: Replace the signed-out auth surface with the Stitch login page while keeping current email/password auth
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-mockup-first-details.md` (Lines 106-126)
* [ ] Step 2.3: Validate public and signed-out surfaces
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-mockup-first-details.md` (Lines 128-132)

### [ ] Implementation Phase 3: Devices and device-details surfaces

<!-- parallelizable: false -->

* [x] Step 3.1: Rework the directory experience so the visible IA becomes Devices while preserving supported station-directory reads
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-mockup-first-details.md` (Lines 138-155)
* [x] Step 3.2: Compose device details from station metadata, live status, and recent event history while keeping live monitoring as a secondary route
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-mockup-first-details.md` (Lines 157-178)
* [ ] Step 3.3: Validate devices and device-details flows
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-mockup-first-details.md` (Lines 180-184)

### [x] Implementation Phase 4: Analytics, compatibility views, and deferred-feature audit

<!-- parallelizable: false -->

* [x] Step 4.1: Make Analytics the visible home for summary plus comparisons while preserving supported secondary routes where useful
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-mockup-first-details.md` (Lines 190-208)
* [x] Step 4.2: Preserve history and other secondary routes only where they reduce migration risk and do not compete with the mockup IA
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-mockup-first-details.md` (Lines 210-227)
* [x] Step 4.3: Audit and label all unsupported mockup features as future development
  * Details: `.copilot-tracking/details/2026-03-08/stitch-ui-mockup-first-details.md` (Lines 229-246)

### [x] Implementation Phase 5: Final validation

<!-- parallelizable: false -->

* [x] Step 5.1: Run full project validation
  * Execute all relevant web lint, build, and test commands that are available in this workspace
* [x] Step 5.2: Fix minor validation issues
  * Iterate on straightforward TypeScript, styling, and route-wiring issues discovered during validation
* [x] Step 5.3: Report blocking issues
  * Document blockers that require backend, contract, auth-provider, or product-scope follow-up instead of inventing unsupported behavior

## Planning Log

See [stitch-ui-mockup-first-log.md](.copilot-tracking/plans/logs/2026-03-08/stitch-ui-mockup-first-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Existing provider lifecycle and auth wiring in `apps/web/src/app/providers.tsx`
* Current gateway and Firestore live subscriptions in `apps/web/src/lib`
* Contract support in `packages/contracts/src/index.ts` and `packages/contracts/src/index.d.ts`
* Current backend callable and query support in `services/backend-functions/src/runtime/firebase-runtime.ts`
* Validation fallback via `npx --yes -p typescript@5.8.2 tsc` and `Push-Location apps/web; npm run build; Pop-Location` if `pnpm` remains unavailable

## Success Criteria

* The visible web information architecture is aligned to landing, login, analytics, devices, and device details rather than the legacy stations-first route presentation. Traces to: research route mapping and user request
* Existing auth, routing infrastructure, callable APIs, contracts, and live subscriptions are reused where they already support the mockup-driven UI. Traces to: research selected implementation scenario and repo memory architecture facts
* Unsupported mockup features are explicitly deferred and labeled in implementation rather than simulated. Traces to: research blocked-feature matrix, planning log `DR-01` through `DR-03`, and follow-on work item `WI-08`
* Compatibility redirects preserve current important paths during rollout without letting legacy route labels govern the final UX. Traces to: research compatibility-routing recommendation
* Final validation covers route wiring, TypeScript correctness, build success, and a discrepancy audit against deferred features and unresolved mockup gaps. Traces to: details validation steps and planning log