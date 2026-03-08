<!-- markdownlint-disable-file -->
---
title: Stitch UI Implementation Research
description: Research handoff for replacing the current web UI with Stitch-designed pages while aligning to the product spec and existing application capabilities
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: overview
keywords:
  - stitch
  - ui
  - binsight
  - research
  - implementation
estimated_reading_time: 12
---

## Task Research: Stitch UI Implementation

Research the work needed to replace the current web UI with the Stitch-designed pages under `spec/ui`, using `spec/binsight-spec.md` as the product source of truth and the current codebase as the implementation baseline.

The evidence shows that the current application structure already matches the product spec more closely than the Stitch exports do. The strongest path is to keep the existing `apps/web` route table, provider setup, data loaders, and contract boundaries, then translate the Stitch pages into those existing application seams instead of rebuilding the shell around the exported HTML.

## Task Implementation Requests

* Replace the current application UI with the Stitch-designed pages from `spec/ui`
* Reuse existing routes, data flows, components, and behaviors where they already support the required pages
* Identify what can be wired immediately versus what needs backend, contract, or product follow-up
* Recommend one implementation approach for integrating the Stitch designs into the existing app

## Scope and Success Criteria

* Scope: Research the current web application, the product spec, and the Stitch page assets; map designed pages to current routes and data capabilities; evaluate implementation approaches for introducing the new UI
* Assumptions: The primary implementation target is the web app under `apps/web`; Stitch files in `spec/ui` are authoritative for visual and interaction design only; product behavior remains constrained by `spec/binsight-spec.md`
* Success Criteria:
  * Each relevant Stitch page is mapped to an existing or proposed app route or feature area
  * The research distinguishes between immediately wireable UI behavior and blocked integrations
  * The document recommends a specific implementation strategy grounded in current repo patterns
  * The handoff includes concrete file references, identified gaps, and next implementation steps

## Outline

1. Inspect the product spec and demo scope in `spec/binsight-spec.md`
2. Inspect the Stitch UI artifacts in `spec/ui`
3. Inspect the current web app routing, page structure, data access, and shared UI patterns
4. Compare designed pages against current capabilities and identify deltas
5. Evaluate implementation strategies and select one recommended approach

## Potential Next Research

* Verify seeded demo data against the selected page set
  * Reasoning: implementation success depends on whether current stations, live-status docs, and analytics rollups exist for the redesigned surfaces
  * Reference: `services/backend-functions/src/firestore`, `apps/web/README.md`

* Decide the styling translation strategy before implementation starts
  * Reasoning: the Stitch exports are Tailwind CDN HTML, while the web app currently uses local CSS primitives
  * Reference: `../../../spec/ui/devices/code.html#L6-L16`, `../../../apps/web/package.json#L12-L23`, `../../../apps/web/src/app/dashboard.css#L1-L361`

## Research Executed

### File Analysis

* Product source of truth
  * `../../../spec/binsight-spec.md#L9-L16` defines the demo scope as one tabletop station, one camera view, three disposal zones, LED guidance, LCD live feedback, and a dashboard
  * `../../../spec/binsight-spec.md#L20-L58` defines the core live workflow from item detection through event creation
  * `../../../spec/binsight-spec.md#L96-L112` defines required dashboard capabilities, including station browsing, event history, analytics, comparisons, filters, and a dedicated live monitoring page

* Stitch UI assets
  * `../../../spec/ui/landing%20page/code.html#L157-L197` is a marketing-style landing page, not an operator surface
  * `../../../spec/ui/login/code.html#L77-L131` is a plausible sign-in page for the operator dashboard
  * `../../../spec/ui/analytics/code.html#L64-L260` covers KPI cards, comparisons, and trends, with some unsupported actions such as export and AI-generated insights
  * `../../../spec/ui/devices/code.html#L73-L214` is the closest match for the stations directory route, though the taxonomy is generic device inventory rather than station operations
  * `../../../spec/ui/device%20details/code.html#L112-L297` is the closest match for station detail plus live monitoring, though it mixes history, diagnostics, and operator-triggered actions in a way that conflicts with the spec
  * `../../../spec/ui/dashboard/code.html#L167-L197` duplicates the landing-page treatment and is not a usable dashboard source

* Frontend architecture
  * `../../../apps/web/src/main.tsx#L22-L54` boots Firebase app services and mounts the custom browser shell
  * `../../../apps/web/src/app/providers.tsx#L219-L321` owns auth gating, route state, backend gateway creation, and live Firestore gateway creation
  * `../../../apps/web/src/app/providers.tsx#L353-L403` intercepts same-origin anchor clicks and `GET` form submissions, which constrains how Stitch interactions can be translated safely
  * `../../../apps/web/src/app/router.tsx#L15-L63` defines the current route map: `/stations`, `/stations/:stationId`, `/stations/:stationId/live`, `/history`, `/analytics`, and `/comparisons`
  * `../../../apps/web/src/pages/stations.tsx#L14-L30`, `../../../apps/web/src/pages/station-detail.tsx#L14-L96`, `../../../apps/web/src/pages/live-monitoring.tsx#L38-L110`, `../../../apps/web/src/pages/event-history.tsx#L14-L42`, `../../../apps/web/src/pages/analytics.tsx#L14-L45`, and `../../../apps/web/src/pages/comparisons.tsx#L12-L40` show a thin-page pattern over reusable feature panels

* Backend and contracts
  * `../../../services/backend-functions/src/runtime/firebase-runtime.ts#L36-L79` exports current deployable handlers for event ingress, live-status ingress, camera-frame ingress, analytics summary, event history, station directory, and analytics materialization
  * `../../../packages/contracts/src/index.ts#L67-L77` defines `LiveStationStatus`, including `currentDetectedItem`, `currentDisposalMethod`, `latestEvent`, and `cameraFeed`
  * `../../../packages/contracts/src/index.ts#L114-L125` defines `StationMetadata`, including building, floor, location, signage, layout, and active rules preset
  * `../../../packages/contracts/src/index.ts#L159-L278` defines analytics queries, analytics summaries, event history, and station directory responses
  * `../../../apps/web/src/lib/api/dashboard-api.ts#L9-L35` and `../../../apps/web/src/lib/api/dashboard-gateway.ts#L91-L119` show the current callable API surface consumed by the web app
  * `../../../apps/web/src/lib/firebase/live-status.ts#L7-L118` and `../../../apps/web/src/lib/firebase/live-monitoring.ts#L41-L140` show that single-station live monitoring is already wired through Firestore

### Code Search Results

* Route implementation aligns to the spec-required operator surfaces through the current route table in `../../../apps/web/src/app/router.tsx#L15-L63`
* No meaningful `@binsight/analytics` usage was found in the web package, which confirms that `packages/contracts` is the real UI contract boundary today
* No local mock-data layer was found in `apps/web/src`, which means the Stitch redesign should target current gateway outputs rather than new mock-only shapes

### External Research

* No external research required at this stage; repository sources are primary

### Project Conventions

* Standards referenced: `spec/binsight-spec.md`, repository markdown guidance, repository memory facts
* Instructions followed: source-of-truth instructions, markdown instructions, writing style instructions, task researcher mode instructions

## Key Discoveries

### Project Structure

The product spec is explicit about the operator workflow, and the existing application already reflects that operator-first structure. The spec requires station browsing, station metadata, event history, analytics, comparisons, filters, and live monitoring at `../../../spec/binsight-spec.md#L96-L112`. The current app exposes those same concerns through stable routes in `../../../apps/web/src/app/router.tsx#L15-L63`.

The current web app is not a generic website shell. It is a custom-routed React dashboard whose providers own auth, navigation, callable APIs, and live Firestore subscriptions in `../../../apps/web/src/app/providers.tsx#L219-L403`. Replacing that shell wholesale would duplicate critical behavior, not just visuals.

The frontend is also deliberately split into thin page wrappers and reusable feature modules. That separation makes route-body replacement practical without reworking the data layer or route semantics.

### Implementation Patterns

Three implementation patterns are already in place and should be preserved during the redesign:

* Thin page wrappers call into reusable data and presentation seams. Evidence: `../../../apps/web/src/pages/stations.tsx#L14-L30`, `../../../apps/web/src/pages/analytics.tsx#L14-L45`, `../../../apps/web/src/pages/comparisons.tsx#L12-L40`
* Filters are part of the routing contract, not a local widget concern. Evidence: `../../../apps/web/src/lib/query/dashboard-query.ts#L123-L278` and `../../../apps/web/src/features/filters/filter-controls.tsx#L28-L192`
* Live monitoring is the only real-time surface and is built around Firestore subscription behavior plus stale-state handling. Evidence: `../../../apps/web/src/pages/live-monitoring.tsx#L38-L110` and `../../../apps/web/src/lib/firebase/live-monitoring.ts#L41-L140`

The current styling system is class-based and centralized in `../../../apps/web/src/app/dashboard.css#L1-L361`. The Stitch exports are static Tailwind CDN pages. That makes direct copy-paste adoption a poor fit unless the team first chooses to add Tailwind as a supported build dependency.

### Complete Examples

```text
Current route map

/stations                -> station directory
/stations/:stationId     -> station detail
/stations/:stationId/live -> live monitoring
/history                 -> disposal event history
/analytics               -> analytics overview
/comparisons             -> grouped comparisons
```

### API and Schema Documentation

The current shared contracts already cover the highest-value stitched pages:

* Station directory and station metadata: `../../../packages/contracts/src/index.ts#L114-L125` and `../../../packages/contracts/src/index.ts#L274-L278`
* Live station monitoring: `../../../packages/contracts/src/index.ts#L67-L77`
* Analytics queries and summaries: `../../../packages/contracts/src/index.ts#L159-L227`
* Event history: `../../../packages/contracts/src/index.ts#L228-L254`

The backend runtime already exposes the callable and ingestion handlers needed for those surfaces in `../../../services/backend-functions/src/runtime/firebase-runtime.ts#L36-L79`.

The largest contract-level gaps for the Stitch pages are not in analytics or station detail. They are in device registration, fleet-wide live aggregation, export/report generation, camera-image delivery, and AI-generated narrative insights.

### Configuration Examples

```text
Current web runtime dependencies

Firebase Auth      -> operator sign-in gating
Firebase Functions -> getStationDirectory, getEventHistory, getAnalyticsSummary
Firestore          -> stationLiveStatus/{stationId} live subscriptions
Contracts package  -> canonical request and response shapes
```

### Route-to-Stitch Mapping

| Product surface | Current route or module | Stitch source | Implementation fit | Notes |
| --- | --- | --- | --- | --- |
| Operator sign-in | Signed-out state in `../../../apps/web/src/app/providers.tsx#L323-L350` | `../../../spec/ui/login/code.html#L77-L131` | Strong | Email/password login can be wired now. Social buttons are not backed by audited provider flows. |
| Station directory | `../../../apps/web/src/pages/stations.tsx#L14-L30` | `../../../spec/ui/devices/code.html#L73-L214` | Strong | Rename device-centric copy to station-centric copy. Keep links pointing to existing station routes. |
| Station detail | `../../../apps/web/src/pages/station-detail.tsx#L14-L96` | `../../../spec/ui/device%20details/code.html#L138-L297` | Partial | Good fit for metadata, recent events, and diagnostics. Avoid operator-triggered `New Scan` behavior because it conflicts with always-on detection in `../../../spec/binsight-spec.md#L20-L23`. |
| Live monitoring | `../../../apps/web/src/pages/live-monitoring.tsx#L38-L110` | `../../../spec/ui/device%20details/code.html#L112-L138` | Partial | The Stitch asset lacks some required live fields from `../../../spec/binsight-spec.md#L107-L112`, but the current contract already exposes them. |
| Analytics overview | `../../../apps/web/src/pages/analytics.tsx#L14-L45` | `../../../spec/ui/analytics/code.html#L64-L260` | Strong | KPI cards, comparisons, and trends can be wired now. Export and AI insight features remain blocked. |
| Comparisons | `../../../apps/web/src/pages/comparisons.tsx#L12-L40` | `../../../spec/ui/analytics/code.html#L108-L171` | Strong | Existing grouped-comparison behavior fits the visual direction. |
| Event history | `../../../apps/web/src/pages/event-history.tsx#L14-L42` | `../../../spec/ui/device%20details/code.html#L138-L252` | Partial | No dedicated Stitch history page exists. Reuse the recent-scans visual language for the `/history` route. |
| Landing page | No current operator-app route | `../../../spec/ui/landing%20page/code.html#L157-L197` | Weak | This is optional and may not belong in `apps/web`, which is currently an operator dashboard package. |
| Dashboard page | No valid source | `../../../spec/ui/dashboard/code.html#L167-L197` | Invalid | The exported dashboard is a duplicate landing page and should not drive implementation. |

### Wireable Now vs Blocked

| Area | Can wire now | Blocked or incomplete |
| --- | --- | --- |
| Login | Email/password sign-in shell | Social Google or GitHub buttons from Stitch are not backed by verified frontend flows |
| Stations list | Station cards, location metadata, basic status, deep links | Device registration, settings, and add-device flows |
| Station detail | Metadata, nearby comparisons, recent event summaries, rules preset display | Camera map and richer network visualization lack a complete product definition |
| Live monitoring | Current session state, detected item, disposal method, latest event, stale handling | Rich camera rendering and fleet-wide live aggregation |
| Analytics | KPI summaries, grouped comparisons, trends, filterable analytics | Export report generation and AI-generated insight text |
| History | Event list or recent scans styled from Stitch patterns | Pagination may need backend correction because cursor behavior appears inconsistent |

## Technical Scenarios

### Replacing the Existing Web UI with Stitch Pages

The correct technical scenario is not a full UI rebuild. It is an operator-dashboard redesign that preserves existing app seams while translating the Stitch pages into the current route and contract structure.

**Requirements:**

* Align every implemented page to product behavior in `spec/binsight-spec.md`
* Preserve existing routing and app behaviors where possible
* Avoid inventing backend behavior that does not exist in contracts or services

**Preferred Approach:**

* Keep the existing routes, providers, gateway contracts, and live Firestore subscriptions, then replace route bodies incrementally with Stitch-derived React implementations that preserve current links, query keys, and data-loading seams

```text
Recommended implementation sequence

1. Replace the signed-out login surface with the Stitch login design
2. Replace the stations directory with the Stitch devices visual language, renamed for stations
3. Redesign station detail and live monitoring together using the device-details source
4. Redesign analytics and comparisons using the analytics source
5. Rework event history using the recent-scans pattern because there is no dedicated Stitch history page
6. Defer optional landing page and invalid dashboard export until product scope is clarified
```

**Implementation Details:**

This approach is recommended because it preserves the parts of the system that already encode product behavior correctly.

The route map already matches the spec-required surfaces better than the Stitch files do. Evidence: `../../../spec/binsight-spec.md#L96-L112` versus `../../../apps/web/src/app/router.tsx#L15-L63`. The current providers also carry critical behavior for auth, client creation, navigation interception, and route-backed filters in `../../../apps/web/src/app/providers.tsx#L219-L403`. Replacing that shell would add churn in exactly the areas where the current implementation is already correct.

The best migration seam is the thin page layer. Each current route can keep its loader and data dependencies while receiving new JSX, new CSS, or translated design tokens behind stable URLs. That preserves deep links, keeps current query semantics, and avoids introducing duplicate data-fetch logic.

The design translation should treat the Stitch files as visual references, not canonical HTML to embed. The exports are static Tailwind CDN pages, while the current app uses its own CSS system and has no Tailwind dependency in `../../../apps/web/package.json#L12-L23`. A direct import path would either force a design-system fork or require adding Tailwind and refactoring the entire shell. That is unnecessary for the goal of replacing the visible UI.

The first implementation wave should cover only pages with strong contract support now:

* Login shell
* Stations directory
* Station detail and live monitoring
* Analytics and comparisons
* Event history restyled from the recent-scans pattern

The following items should be tracked as explicit follow-up work, not improvised in the UI:

* Device registration and settings mutations
* Fleet-wide live status aggregation for the stations list
* Export report generation
* AI-generated insight text
* Camera image delivery contract
* Social login providers if those buttons must be real
* Event-history pagination correction if the current cursor mismatch is confirmed in implementation

```text
Files most likely to change first during implementation

apps/web/src/app/providers.tsx                # signed-out screen
apps/web/src/pages/stations.tsx              # stations visual redesign
apps/web/src/pages/station-detail.tsx        # station detail redesign
apps/web/src/pages/live-monitoring.tsx       # live monitoring redesign
apps/web/src/pages/analytics.tsx             # analytics redesign
apps/web/src/pages/comparisons.tsx           # comparisons redesign
apps/web/src/pages/event-history.tsx         # history redesign
apps/web/src/app/dashboard.css               # existing design system extension or replacement
```

#### Considered Alternatives

1. Full shell-and-route rewrite from Stitch pages

   Rejected because the current shell in `../../../apps/web/src/app/providers.tsx#L219-L403` owns behavior that is easy to break and expensive to reproduce: auth gating, route state, query-backed forms, same-origin anchor interception, and live backend dependency setup. It also solves the wrong problem because the current route taxonomy already matches the product spec.

2. Keep existing routes and data loaders, then replace page bodies incrementally

   Selected because it preserves the operator workflow that already aligns with the spec, keeps the current contracts and routes stable, and limits design work to the visible surfaces. This is the lowest-risk path that still satisfies the user goal of replacing the current UI with the Stitch-designed pages.

3. Embed Stitch pages as static prototypes alongside the current app

   Rejected because it does not actually replace the current UI, would create a second drifting surface, and would fail the requirement to hook the pages up to current data and behaviors wherever possible.

## Recommended Next Steps

1. Start planning from this document with the incremental page-body replacement strategy
2. Decide whether to translate Stitch visuals into the existing CSS system or to adopt Tailwind intentionally before implementation begins
3. Treat the Stitch dashboard export as invalid and use the devices, device-details, analytics, and login assets as the real design sources
4. Track blocked features as explicit product or backend work items instead of inventing placeholder UI behavior
