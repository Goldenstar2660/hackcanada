---
title: Stitch UI Mockup-First Implementation Details
description: Step-by-step implementation details for aligning the visible web experience to the Stitch mockups while preserving supported app seams
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: how-to
keywords:
  - stitch
  - ui
  - planning
  - web
estimated_reading_time: 10
---
<!-- markdownlint-disable-file -->

## Context Reference

Sources:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md`
* `/memories/repo/binbuddy-architecture-facts.md`
* `/memories/repo/binbuddy-phase2-validation-facts.md`
* `spec/ui/landing page/code.html`
* `spec/ui/login/code.html`
* `spec/ui/analytics/code.html`
* `spec/ui/devices/code.html`
* `spec/ui/device details/code.html`

## Implementation Phase 1: Route architecture and shared shell foundation

<!-- parallelizable: false -->

### Step 1.1: Introduce the mockup-first visible route model and compatibility redirects

Update the visible route model so the primary navigation, labels, and page hierarchy match the Stitch mockups rather than the current stations-first IA. Add first-class public and authenticated entries for landing, login, analytics, devices, and device details. Preserve legacy routes as redirects or secondary deep links when they protect existing demos or already supported flows.

Files:
* `apps/web/src/app/router.tsx` - add or remap visible routes for `/`, `/login`, `/analytics`, `/devices`, and `/devices/:deviceId`
* `apps/web/src/app/layout.tsx` - align shared navigation and authenticated shell framing to the mockup page set
* `apps/web/src/app/providers.tsx` - keep provider-owned navigation interception and auth gating aligned with the revised route set

Discrepancy references:
* `DR-01`
* `DR-02`

Success criteria:
* The route table makes the mockup-backed pages the visible top-level experience
* `/stations`, `/stations/:stationId`, and `/comparisons` have an intentional migration disposition instead of remaining the visible IA by default

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - mockup-first route mapping and compatibility-routing guidance

Dependencies:
* Existing provider lifecycle remains the behavioral shell contract

### Step 1.2: Build shared Stitch-aligned shell and styling primitives without replacing the working provider core

Translate the Stitch layouts into local React and CSS primitives that reproduce navigation, cards, filters, charts, form treatments, and detail sections without importing the static Tailwind CDN pages directly. Reuse the working provider, gateway, and live-data seams underneath the new visible shell.

Files:
* `apps/web/src/app/dashboard.css` - add the shared design tokens, layout primitives, page shells, cards, badges, tables, and form treatments needed across the mockup-aligned pages
* `apps/web/src/app/layout.tsx` - add the shared navigation and page-frame composition required by the new visible IA
* `apps/web/src/pages` - update page bodies to consume the shared shell primitives instead of legacy layouts

Success criteria:
* Shared primitives are sufficient to reproduce the target mockup language across public and authenticated pages
* The implementation preserves current gateway and subscription seams rather than rebuilding them from raw Stitch exports

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - selected implementation scenario and strongest-reuse guidance

Dependencies:
* Step 1.1 completion

### Step 1.3: Validate route-shell changes

Validation commands:
* `npx --yes -p typescript@5.8.2 tsc -p apps/web/tsconfig.json --noEmit` - validate route and shell changes when pnpm remains unavailable
* Workspace Problems check on `apps/web/src/app/router.tsx`, `apps/web/src/app/layout.tsx`, and `apps/web/src/app/providers.tsx` - confirm there are no new relevant diagnostics

## Implementation Phase 2: Public entry and login experience

<!-- parallelizable: false -->

### Step 2.1: Add the public landing experience from the Stitch landing-page mockup

Create or revise the public entry surface so `/` matches the Stitch landing page closely in navigation language, hero composition, CTA emphasis, and brand-level framing. If live stats are not yet supported for the landing surface, keep the metric presentation static or explicitly marked until product scope confirms live sourcing.

Files:
* `apps/web/src/pages` - add a landing-page component or route body for the public entry experience
* `apps/web/src/app/router.tsx` - map `/` to the landing page and ensure authenticated navigation still reaches the protected app
* `apps/web/src/app/dashboard.css` - add landing-page hero, navigation, CTA, and stat-strip styling

Discrepancy references:
* `DR-03`

Success criteria:
* `/` renders a Stitch-faithful landing experience instead of falling directly into the operator shell
* The landing page does not invent unsupported live metrics or dashboard destinations

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - landing-page mapping and immediate-ship assessment

Dependencies:
* Step 1.2 completion

### Step 2.2: Replace the signed-out auth surface with the Stitch login page while keeping current email/password auth

Rebuild the signed-out state so the login experience matches the Stitch login screen in layout, copy hierarchy, and primary form treatment. Keep email/password authentication as the only active sign-in behavior unless audited provider flows are added later, keep unsupported social buttons or access-request controls visibly deferred rather than interactive, and record operator-authorization hardening as required follow-on work before the redesigned login is treated as a reliable operator gate.

Files:
* `apps/web/src/app/providers.tsx` - replace the signed-out auth UI while preserving the existing Firebase Auth flow
* `apps/web/src/app/dashboard.css` - add login-page-specific form and layout styling

Discrepancy references:
* None. Operator-authorization hardening is tracked as follow-on work `WI-08` in the planning log rather than as an unresolved research-plan discrepancy.

Success criteria:
* Signed-out users see the Stitch login design instead of the legacy auth surface
* Social login and request-access affordances are clearly marked as unavailable or future development by design
* Operator-authorization hardening is tracked explicitly as follow-on work or a release gate for production-like operator access

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - login mapping and blocked-feature matrix

Dependencies:
* Step 1.2 completion

### Step 2.3: Validate public and signed-out surfaces

Validation commands:
* `npx --yes -p typescript@5.8.2 tsc -p apps/web/tsconfig.json --noEmit` - validate landing and login route changes
* Manual route smoke test for `/` and signed-out login entry - confirm navigation, auth submission, and disabled deferred controls behave intentionally

## Implementation Phase 3: Devices and device-details surfaces

<!-- parallelizable: false -->

### Step 3.1: Rework the directory experience so the visible IA becomes Devices while preserving supported station-directory reads

Replace the visible stations-directory presentation with the Stitch Devices page composition. Preserve the existing directory query, filters, and link seams, but relabel and restructure the experience around the mockup-backed Devices IA. Keep compatibility redirects from `/stations` so old links remain valid during rollout.

Files:
* `apps/web/src/pages/stations.tsx` or a new `apps/web/src/pages/devices.tsx` - implement the new visible directory surface backed by current station-directory data
* `apps/web/src/app/router.tsx` - expose `/devices` as the visible route and redirect `/stations` appropriately
* `apps/web/src/app/dashboard.css` - add device-directory cards, filters, badges, search, and fleet-summary treatments

Success criteria:
* The visible directory route reads as Devices and matches the Stitch devices mockup closely
* Existing station-directory data remains the backend seam under the relabeled presentation

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - devices mapping and immediate integration evidence

Dependencies:
* Step 1.2 completion

### Step 3.2: Compose device details from station metadata, live status, and recent event history while keeping live monitoring as a secondary route

Build `/devices/:deviceId` from the current station metadata, live-status, and recent-event seams so it matches the Stitch device-details mockup as closely as supported data allows. Preserve the dedicated live route as a secondary destination when it protects already supported realtime behavior, and keep unsupported controls such as manual `New Scan`, AI summary generation, or embedded camera playback explicitly deferred.

Files:
* `apps/web/src/pages/station-detail.tsx` or a new `apps/web/src/pages/device-detail.tsx` - implement the primary mockup-aligned drill-down experience
* `apps/web/src/pages/live-monitoring.tsx` - retain or restyle the secondary live route in the same design language when it remains useful
* `apps/web/src/pages/event-history.tsx` - surface recent-scan styling patterns consistently with the new detail route where needed
* `apps/web/src/app/dashboard.css` - add detail-page grids, recent-scan rows, live panels, and status visualization treatments

Discrepancy references:
* None. Unsupported device-detail features are tracked as follow-on work in the planning log rather than as a research-plan discrepancy.

Success criteria:
* `/devices/:deviceId` is the primary visible drill-down route and uses supported metadata, live-state, and event-history seams
* Unsupported scan actions, AI summaries, and embedded media remain visibly deferred rather than simulated

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - device-details mapping and blocked-feature matrix

Dependencies:
* Step 3.1 completion

### Step 3.3: Validate devices and device-details flows

Validation commands:
* `npx --yes -p typescript@5.8.2 tsc -p apps/web/tsconfig.json --noEmit` - validate directory, detail, and live-route changes
* Manual route smoke test for `/devices`, `/devices/:deviceId`, redirected `/stations`, and any retained secondary live route - confirm navigation, loading, and realtime hydration still work

## Implementation Phase 4: Analytics, compatibility views, and deferred-feature audit

<!-- parallelizable: false -->

### Step 4.1: Make Analytics the visible home for summary plus comparisons while preserving supported secondary routes where useful

Restructure the visible analytics experience so the Stitch analytics page governs KPI, comparison, trend, and summary presentation. Keep current analytics summary and grouped-comparison data seams intact. If `/comparisons` remains useful as a compatibility route, make it a redirect or filtered entry into the broader analytics experience instead of a competing top-level IA branch.

Files:
* `apps/web/src/pages/analytics.tsx` - implement the primary mockup-aligned analytics surface
* `apps/web/src/pages/comparisons.tsx` - preserve only as a compatibility route or shared section entry if needed for migration
* `apps/web/src/app/router.tsx` - align visible navigation with analytics as the top-level destination
* `apps/web/src/app/dashboard.css` - add KPI-card, chart-shell, insight-block, and comparison-table treatments

Success criteria:
* `/analytics` visibly contains the summary and comparison language from the Stitch analytics mockup
* Existing analytics and grouped-comparison backend seams remain intact under the new presentation

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - analytics mapping and strong-hookup assessment

Dependencies:
* Step 1.2 completion

### Step 4.2: Preserve history and other secondary routes only where they reduce migration risk and do not compete with the mockup IA

Keep routes such as `/history` and retained live-monitoring links only when they protect supported behavior or simplify rollout. Restyle those surfaces to remain visually consistent with the mockup-driven UI, but do not let them become first-class navigation destinations unless a later mockup restores them.

Files:
* `apps/web/src/pages/event-history.tsx` - preserve as a secondary route with mockup-consistent recent-scan styling
* `apps/web/src/app/router.tsx` - keep secondary routes deep-linkable without promoting them into the main navigation
* `apps/web/src/app/layout.tsx` - ensure visible navigation emphasizes the mockup-backed page set only

Success criteria:
* Secondary routes remain available for supported functionality without conflicting with the visible mockup IA
* Navigation language and route prominence stay aligned to landing, login, analytics, devices, and device details

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - compatibility-routing recommendation and mockup set gaps

Dependencies:
* Steps 3.2 and 4.1 completion

### Step 4.3: Audit and label all unsupported mockup features as future development

Create an explicit future-development inventory for social login, request-access, operator-authorization hardening, device registration, settings mutations, manual new-scan actions, device maps or network visualization, export reports, AI-generated insights, richer scan-analysis modals, embedded camera frames, corrected dashboard work, and any Settings or System route. Ensure those gaps are represented intentionally in both planning and implementation rather than hidden behind inert UI that appears functional.

Files:
* `.copilot-tracking/plans/logs/2026-03-08/stitch-ui-mockup-first-log.md` - keep the deferred-work inventory and unresolved route questions current during implementation
* `apps/web/src/pages` and `apps/web/src/app/layout.tsx` - add visible labels, disabled states, or omission decisions that match the deferred-work inventory

Success criteria:
* Every unsupported mockup feature has an explicit disposition
* The UI does not imply working behavior where the current app has no verified support
* Operator-authorization hardening is carried forward explicitly instead of being left implicit in the redesigned login flow

Context references:
* `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md` - immediate integration versus future development matrix

Dependencies:
* All earlier implementation phases completed

## Implementation Phase 5: Final validation

<!-- parallelizable: false -->

### Step 5.1: Run full project validation

Execute all available web validation commands after implementation:
* `npx --yes -p typescript@5.8.2 tsc -p apps/web/tsconfig.json --noEmit`
* `Push-Location apps/web; npm run build; Pop-Location`
* Any route-level smoke validation available in the running app for the primary mockup-backed routes and retained compatibility routes

### Step 5.2: Fix minor validation issues

Iterate on straightforward TypeScript, build, styling, and route-wiring issues discovered during validation. Limit this phase to contained fixes that do not require new product or backend decisions.

### Step 5.3: Report blocking issues

When validation exposes missing backend capabilities, missing auth-provider configuration, unresolved dashboard or settings scope, or incompatible contracts, document the blockers and route them to follow-on work instead of inventing unsupported UI behavior.

## Dependencies

* Existing route, auth, and navigation behavior in `apps/web/src/app/providers.tsx`
* Existing route and page structure in `apps/web/src/app/router.tsx` and `apps/web/src/pages`
* Contracts in `packages/contracts/src/index.ts` and `packages/contracts/src/index.d.ts`
* Current backend gateway and Firestore live-monitoring seams in `apps/web/src/lib`

## Success Criteria

* The primary visible routes align to the Stitch mockups and the research-selected mockup-first IA
* Existing supported seams remain the implementation substrate under the redesigned UI
* Deferred features remain explicit and auditable throughout implementation and validation