<!-- markdownlint-disable-file -->
---
title: Stitch UI Implementation Research
description: Research handoff for redesigning the web UI to match the Stitch mockups under spec/ui as closely as possible while wiring only currently supported capabilities
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: overview
keywords:
  - stitch
  - ui
  - binsight
  - research
  - implementation
estimated_reading_time: 14
---

## Task Research: Stitch UI Implementation

The user explicitly overrides the earlier repo instruction for this task: `spec/ui` is the new source of truth for the visible web UI. For this handoff, the Stitch mockups now govern page layout, navigation language, and interaction shape. The current frontend, backend, and contract layers still govern what can be wired immediately. Anything shown in the mockups that is not backed by the present application seams is marked as future development rather than improvised.

## Task Implementation Requests

* Redesign the current web UI to match the Stitch mockups under `spec/ui` as closely as possible
* Integrate features that already exist in `apps/web`, `services/backend-functions`, and `packages/contracts`
* Preserve working auth, routing, data-loading, and live-data seams where they help deliver the mockups faster
* Mark mockup features that cannot be immediately hooked up as future development items

## Scope and Success Criteria

* Scope: Research the Stitch mockups as the primary UI authority, compare them to the existing web app and backend capabilities, recommend the safest implementation approach, and produce a page-by-page integration matrix
* Assumptions:
  * `spec/ui` is authoritative for the visible web experience in this task
  * The existing repo is still authoritative for current technical capabilities and constraints
  * Unsupported mockup actions should be deferred and labeled explicitly, not faked
* Success Criteria:
  * Every Stitch mockup is mapped to a real route or an explicit future-development decision
  * The research distinguishes immediate integrations from blocked features with supporting evidence
  * The selected implementation approach preserves working seams where that reduces risk without visibly diverging from the mockups
  * The handoff gives implementation planning enough detail to execute without redoing the research pass

## Outline

1. Audit the Stitch mockups in `spec/ui` as the primary UI source
2. Audit the current `apps/web` shell, routing, and reusable page seams
3. Audit backend and contract support for each mockup surface
4. Map mockup pages to current and proposed routes
5. Identify what can ship now and what must be future development
6. Select one implementation strategy

## Potential Next Research

* Confirm whether the duplicated `dashboard` mockup is a bad export or an intentional placeholder
  * Reasoning: the mockup set includes a navigation label for dashboard, but the exported page duplicates the landing page and is not a usable authenticated dashboard design
  * Reference: `../../../spec/ui/dashboard/code.html#L167-L197`, `../../../spec/ui/landing%20page/code.html#L167-L197`

* Verify whether `Settings` or `System` is intended to be a real route in this phase
  * Reasoning: the mockup navigation names it, but there is no supporting screen or backend capability in the current app
  * Reference: `../../../spec/ui/devices/code.html#L55-L57`, `../../../apps/web/src/app/router.tsx#L15-L63`

## Research Executed

### File Analysis

* Primary UI sources
  * `../../../spec/ui/landing%20page/code.html#L157-L197` defines a public landing page with navigation, a hero statement, a `System Login` call to action, and brand-level stats
  * `../../../spec/ui/login/code.html#L77-L131` defines the sign-in experience with email/password, social sign-in affordances, and access-request copy
  * `../../../spec/ui/analytics/code.html#L64-L260` defines the analytics overview page with KPI cards, comparisons, trends, export, and AI insight blocks
  * `../../../spec/ui/devices/code.html#L73-L214` defines the directory page with active-device counts, health summary, filters, cards, and device registration calls to action
  * `../../../spec/ui/device%20details/code.html#L112-L297` defines the drill-down page with live visualization, recent scans, AI summary, and scan-analysis details
  * `../../../spec/ui/dashboard/code.html#L167-L197` duplicates the landing page and is not a distinct dashboard source

* Current app seams that remain reusable under a mockup-first redesign
  * `../../../apps/web/src/main.tsx#L22-L54` boots Firebase Auth, Functions, and Firestore, then mounts a single browser application shell
  * `../../../apps/web/src/app/providers.tsx#L219-L321` owns auth gating, route state, API gateway construction, and live-data gateway construction
  * `../../../apps/web/src/app/providers.tsx#L353-L403` intercepts same-origin links and `GET` forms, which matters when converting mockup navigation and filter controls
  * `../../../apps/web/src/app/router.tsx#L15-L63` defines the current route set: `/stations`, `/stations/:stationId`, `/stations/:stationId/live`, `/history`, `/analytics`, and `/comparisons`
  * `../../../apps/web/src/pages/stations.tsx#L14-L30`, `../../../apps/web/src/pages/station-detail.tsx#L14-L96`, `../../../apps/web/src/pages/live-monitoring.tsx#L38-L110`, `../../../apps/web/src/pages/event-history.tsx#L14-L42`, `../../../apps/web/src/pages/analytics.tsx#L14-L45`, and `../../../apps/web/src/pages/comparisons.tsx#L12-L40` show the current thin-page pattern over reusable feature modules

* Backend and contract evidence for immediate hookups
  * `../../../services/backend-functions/src/runtime/firebase-runtime.ts#L36-L79` exports the current deployable handlers for event ingress, live-status ingress, camera-frame ingress, analytics summary, event history, station directory, and analytics materialization
  * `../../../packages/contracts/src/index.ts#L67-L77` defines `LiveStationStatus`, including current session and latest-event fields used by live drill-downs
  * `../../../packages/contracts/src/index.ts#L114-L125` defines `StationMetadata`, used by station or device detail and directory pages
  * `../../../packages/contracts/src/index.ts#L159-L278` defines analytics queries, analytics summaries, event history, and station directory responses
  * `../../../apps/web/src/lib/api/dashboard-api.ts#L9-L35` and `../../../apps/web/src/lib/api/dashboard-gateway.ts#L91-L119` show the current callable API surface used by the web app
  * `../../../apps/web/src/lib/firebase/live-status.ts#L7-L118` and `../../../apps/web/src/lib/firebase/live-monitoring.ts#L41-L140` show that single-station live monitoring is already wired through Firestore

* Supporting subagent audits
  * `../subagents/2026-03-08/ui-source-of-truth-audit-research.md` reframed route and information-architecture decisions around the mockups rather than the original sidebar-first app
  * `../subagents/2026-03-08/stitch-feature-hookup-matrix-research.md` produced the feature-by-feature hookup matrix used below
  * `../subagents/2026-03-08/spec-and-stitch-audit-research.md` and `../subagents/2026-03-08/frontend-baseline-audit-research.md` remain valid supporting evidence for the page inventory and current shell structure

### Code Search Results

* The current app has no public landing-page route and no `/login` route. Authentication is handled inside the signed-out provider state in `../../../apps/web/src/app/providers.tsx#L323-L350`
* The current app has dedicated `/history`, `/comparisons`, and `/stations/:stationId/live` routes, but those destinations are not first-class pages in the Stitch mockup set. Evidence: `../../../apps/web/src/app/router.tsx#L15-L63`
* No verified frontend implementation exists for Google or GitHub sign-in, device registration, settings mutation, export generation, or AI-generated insights in the current app surface. Supporting evidence: `../subagents/2026-03-08/stitch-feature-hookup-matrix-research.md`

### External Research

* No external research required. Repository sources and generated mockups are sufficient for this task.

### Project Conventions

* Standards referenced: user override for `spec/ui`, current repo architecture, repo memory facts for frontend validation
* Instructions followed: source-of-truth instruction with explicit user override, markdown instructions, writing-style instructions, task researcher mode instructions

## Key Discoveries

### Visible IA Must Shift to the Mockups

Treating `spec/ui` as the UI source of truth changes the visible information architecture. The mockup-backed primary pages are landing, login, analytics, devices, and device details. The current app's stations-first sidebar and top-level History, Comparisons, and Live View destinations do not match that visible model.

The current shell is still technically valuable, but it should become an implementation substrate rather than a UX authority. The route table, auth bootstrap, callable APIs, Firestore subscriptions, and thin-page composition model can remain under the hood while the visible nav, labels, and page hierarchy change to match the mockups.

### The Mockup Set Is Incomplete But Still Usable

The mockup set is strong enough to drive the redesign, but it does not provide a complete one-to-one screen inventory for the current product surface.

* `dashboard` is not a real dashboard design. It duplicates the landing page.
* There is no standalone history page.
* There is no standalone comparisons page.
* There is no standalone live-monitoring page.
* `Settings` or `System` appears in navigation language, but there is no corresponding mockup screen.

The practical consequence is that the redesign should follow the mockups closely for the pages that exist, then absorb current history, comparisons, and live functionality into the nearest mockup-aligned destinations or secondary routes.

### The Strongest Reuse Still Sits Below the Page Layer

The safest implementation seam remains the current page and provider boundaries.

* The signed-out login state can be redesigned into the Stitch login page without changing the underlying Firebase auth flow in `../../../apps/web/src/app/providers.tsx#L323-L350`
* The stations directory can be relabeled and reworked into the Devices mockup while keeping current station-directory reads and filters
* Station detail, live monitoring, and recent event history can be composed into the Device Details mockup using existing station metadata, live status, and event-history reads
* Analytics and comparisons can be visually merged behind the Analytics mockup while keeping current analytics and comparison loaders

## Mockup-First Route Mapping

| Mockup page | Recommended visible route | Current reusable route or seam | Decision |
| --- | --- | --- | --- |
| Landing page | `/` | None today | Add a new public route or public shell that mirrors the mockup closely |
| Login | `/login` or signed-out shell entry | `../../../apps/web/src/app/providers.tsx#L323-L350` | Keep current auth logic, replace UI with the mockup |
| Analytics | `/analytics` | `../../../apps/web/src/pages/analytics.tsx#L14-L45` and `../../../apps/web/src/pages/comparisons.tsx#L12-L40` | Make analytics the visible home for summary plus comparisons |
| Devices | `/devices` | `../../../apps/web/src/pages/stations.tsx#L14-L30` | Rename Stations to Devices in the visible UI and preserve the data seam |
| Device details | `/devices/:deviceId` | `../../../apps/web/src/pages/station-detail.tsx#L14-L96` plus `../../../apps/web/src/pages/live-monitoring.tsx#L38-L110` | Compose the detail route from metadata, live state, and recent events |
| Dashboard | `/dashboard` only if product insists | None trustworthy in mockups | Do not treat the current export as authoritative |
| Settings or System | Future route only | None today | Do not create unless scope is clarified |

### Compatibility Routing

The research supports keeping legacy compatibility routes during implementation even if the visible IA changes.

* `/stations` should redirect to `/devices`
* `/stations/:stationId` should redirect to `/devices/:deviceId`
* `/comparisons` can redirect to `/analytics` with comparison state preserved if practical
* `/history` and `/devices/:deviceId/live` can remain deep-linkable secondary routes if they simplify migration or preserve demos

## Immediate Integration vs Future Development

### Page-by-Page Hookup Matrix

| Mockup page | Features shown in UI | Immediate integration status | Supporting evidence | Future development items |
| --- | --- | --- | --- | --- |
| Landing page | Brand hero, nav, public CTA, headline stats | Partial | No current public route, but it is mostly static UI and can be added without backend dependency. Mockup source: `../../../spec/ui/landing%20page/code.html#L157-L197` | Public routing strategy, real dashboard destination, and meaningful stat sourcing if the footer metrics must be live |
| Login | Email/password sign-in, social buttons, access request | Partial | Email/password is already wired through Firebase Auth in `../../../apps/web/src/app/providers.tsx#L337-L343`; mockup source: `../../../spec/ui/login/code.html#L77-L131` | Google and GitHub provider flows, request-access workflow, operator-authorization hardening |
| Analytics | KPI cards, comparisons, trend charts, live badge | Strong | Analytics callable API and comparison assembly already exist in `../../../apps/web/src/lib/api/dashboard-api.ts#L9-L35`, `../../../apps/web/src/lib/query/dashboard-query.ts#L180-L278`, and `../../../packages/contracts/src/index.ts#L159-L227` | Export reports, AI-generated insights, any additional public-safe dashboard variant |
| Devices | Active-device count, status cards, location metadata, details links | Strong | Station directory and filter facets already exist in `../../../services/backend-functions/src/analytics/query-service.ts#L228-L257` and `../../../packages/contracts/src/index.ts#L274-L278`; mockup source: `../../../spec/ui/devices/code.html#L73-L214` | Device registration flow, settings mutations, richer fleet-wide live aggregation if the grid must show more than current directory data |
| Device details | Live visualization, recent scans, scan drill-down, AI summary | Partial | Station metadata, event history, and live monitoring already exist across `../../../apps/web/src/pages/station-detail.tsx#L14-L96`, `../../../apps/web/src/pages/live-monitoring.tsx#L38-L110`, and `../../../apps/web/src/pages/event-history.tsx#L14-L42` | Device map or network visualization, manual `New Scan`, richer scan-analysis modal data, AI summary generation, camera frame rendering |
| Dashboard | Distinct dashboard page | Weak | The export is a duplicate of the landing page in `../../../spec/ui/dashboard/code.html#L167-L197` | Correct dashboard mockup or explicit scope decision |
| Settings or System | Nav destination only | None | No current route, no mockup page, no backend support | Full feature definition, page mockup, route design, and backing APIs |

### Immediate-Ship Feature Set

The highest-confidence redesign scope is:

* Public landing page shell if the team wants it in `apps/web`
* Stitch login visuals backed by the current email/password auth flow
* Devices page backed by current station directory and filter data
* Device details page backed by station metadata, live status, and recent event history
* Analytics page backed by current analytics summaries and grouped comparisons

### Future Development Backlog Required by the Mockups

The following mockup features should be explicitly labeled as future development in planning and implementation:

* Social login buttons for Google and GitHub
* Request-access flow
* Device registration and add-device actions
* Device settings mutations
* Manual `New Scan` operator action
* Device map or live network visualization
* Export report generation
* AI-generated insight blocks and AI summaries
* Rich scan-analysis modal with technical breakdown beyond current contracts
* Stable camera-frame rendering in the UI
* A real Dashboard page if one is still required
* A real Settings or System page

## Technical Scenarios

### Mockup-First Redesign on Top of the Existing App Seams

The selected scenario is a mockup-first redesign that changes the visible page model to match the Stitch assets while keeping the current auth, routing engine, data gateways, and live subscriptions wherever they still serve the target UI.

**Requirements:**

* Match the visible UI to `spec/ui` as closely as practical
* Hook up real features immediately where backend and contracts already support them
* Mark unsupported features as future development instead of inventing placeholder behavior
* Avoid rewriting working auth and data infrastructure without evidence that the mockups require it

**Preferred Approach:**

* Rebuild the visible route set and page bodies around landing, login, analytics, devices, and device details; keep the existing provider shell, API gateways, live gateway, and thin-page data seams; preserve compatibility redirects for current routes during migration

```text
Recommended implementation sequence

1. Introduce a mockup-aligned public entry and login flow
2. Rename the visible station directory surface to Devices and redesign that route first
3. Merge station detail, live status, and recent-history concepts into a Device Details redesign
4. Fold comparisons visually into Analytics and redesign that route
5. Keep legacy routes as redirects or secondary deep links until the migration is complete
6. Track all unsupported mockup features as explicit future-development work
```

**Implementation Details:**

This approach fits the user's instruction best because it treats the mockups as the visible truth without throwing away the working application seams that already provide live auth, contract-backed reads, and real-time updates.

The current app shell should not remain the visible source of truth. Its sidebar labels and route emphasis do not match the mockups. At the same time, replacing the provider shell wholesale would recreate the most failure-prone parts of the system: auth gating, history interception, callable gateway construction, and Firestore live subscriptions in `../../../apps/web/src/app/providers.tsx#L219-L403`.

The lowest-risk compromise is to keep those underlying seams and replace what the user actually wants changed: visible page composition, route names, navigation language, and page layouts.

The page-level mapping supports that directly:

* Landing and login become new first-class visible entry points
* Devices replaces Stations in the visible IA
* Device Details absorbs the strongest parts of current station detail, live monitoring, and recent-event history
* Analytics absorbs comparisons visually because the mockups already present both concerns together
* History and live routes become secondary implementation details unless a later mockup adds them back as top-level destinations

```text
Files most likely to change first during implementation

apps/web/src/app/router.tsx
apps/web/src/app/layout.tsx
apps/web/src/app/providers.tsx
apps/web/src/pages/stations.tsx
apps/web/src/pages/station-detail.tsx
apps/web/src/pages/live-monitoring.tsx
apps/web/src/pages/analytics.tsx
apps/web/src/pages/comparisons.tsx
apps/web/src/pages/event-history.tsx
apps/web/src/app/dashboard.css
```

#### Considered Alternatives

1. Preserve the current visible IA and only restyle the existing pages

   Rejected because it conflicts with the user's explicit direction to treat `spec/ui` as the new source of truth. Keeping Stations, History, Comparisons, and Live View as the visible top-level model would preserve the current app, not the mockups.

2. Use the mockups as the visible source of truth while preserving current providers, gateways, and reusable data seams underneath

   Selected because it matches the requested redesign closely, preserves the working technical core, and gives the cleanest path to immediate feature integration plus explicit future-development labeling.

3. Rebuild the app from raw Stitch HTML and a new shell

   Rejected because the mockups are static Tailwind CDN exports, they do not cover the full current product surface, and a full shell rewrite would recreate auth and data behavior that already works.

## Recommended Next Steps

1. Start implementation planning from the mockup-first route mapping in this document
2. Treat the `dashboard` export as unusable until a corrected mockup or explicit product decision exists
3. Include a future-development section in the implementation plan for every blocked mockup feature listed above
4. Preserve compatibility redirects during rollout so current demo links and internal paths do not break
