---
title: Phase 3 Validation for Backend and Dashboard Architecture Plan
description: Validation of Implementation Phase 3 against the plan, changes log, research, planning log, and product spec
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - validation
  - rpi
  - backend
  - dashboard
  - phase 3
estimated_reading_time: 6
---

## Validation Status

Status: Failed

Phase: 3

Validated inputs:

* [Plan Phase 3](../../../plans/2026-03-07/backend-and-dashboard-architecture-plan.instructions.md#L81-L92)
* [Phase 3 detail steps](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L167-L228)
* [Changes log](../../../changes/2026-03-07/backend-and-dashboard-architecture-changes.md#L39-L64)
* [Planning log deviations](../../../plans/logs/2026-03-07/backend-and-dashboard-architecture-log.md#L16-L41)
* [Research architecture guidance](../../../research/2026-03-07/backend-and-dashboard-research.md#L194-L300)
* [Product spec dashboard and live-monitoring requirements](../../../../spec/binbuddy-spec.md#L96-L145)

## Scope

Phase 3 validation for dashboard shell, live monitoring, and analytics views.

## Plan Coverage

| Plan item | Expected outcome | Evidence | Result |
| --- | --- | --- | --- |
| Step 3.1 | Scaffold routes, providers, layout, Firebase live boundary, backend API client boundary, and shared query helpers | [apps/web/src/app/router.tsx](../../../../apps/web/src/app/router.tsx#L15-L172), [apps/web/src/app/providers.tsx](../../../../apps/web/src/app/providers.tsx#L18-L58), [apps/web/src/lib/api/dashboard-api.ts](../../../../apps/web/src/lib/api/dashboard-api.ts#L9-L42), [apps/web/src/lib/api/dashboard-gateway.ts](../../../../apps/web/src/lib/api/dashboard-gateway.ts#L25-L56), [apps/web/src/lib/firebase/live-status.ts](../../../../apps/web/src/lib/firebase/live-status.ts#L16-L77), [apps/web/src/lib/query/dashboard-query.ts](../../../../apps/web/src/lib/query/dashboard-query.ts#L14-L159) | Pass |
| Step 3.2 station and historical views | Deliver station directory/detail, backend-driven history, analytics, and comparison views with active rules preset context and comparison coverage | [apps/web/src/features/stations/station-directory.tsx](../../../../apps/web/src/features/stations/station-directory.tsx#L10-L64), [apps/web/src/pages/station-detail.tsx](../../../../apps/web/src/pages/station-detail.tsx#L17-L96), [apps/web/src/pages/event-history.tsx](../../../../apps/web/src/pages/event-history.tsx#L13-L42), [apps/web/src/pages/analytics.tsx](../../../../apps/web/src/pages/analytics.tsx#L13-L40), [apps/web/src/pages/comparisons.tsx](../../../../apps/web/src/pages/comparisons.tsx#L11-L35), [apps/web/src/lib/query/dashboard-query.ts](../../../../apps/web/src/lib/query/dashboard-query.ts#L161-L226) | Partial |
| Step 3.2 live monitoring | Render live device state and current camera frame from live-status metadata, using the Firestore listener split selected in research | [apps/web/src/pages/live-monitoring.tsx](../../../../apps/web/src/pages/live-monitoring.tsx#L17-L35), [apps/web/src/lib/firebase/live-monitoring.ts](../../../../apps/web/src/lib/firebase/live-monitoring.ts#L97-L147), [apps/web/src/lib/firebase/live-status.ts](../../../../apps/web/src/lib/firebase/live-status.ts#L61-L77) | Fail |
| Step 3.2 filter controls | Provide reusable station, floor, building, location, and time-range controls for dashboard views | [apps/web/src/features/filters/filter-controls.tsx](../../../../apps/web/src/features/filters/filter-controls.tsx#L15-L70), [apps/web/src/lib/query/dashboard-query.ts](../../../../apps/web/src/lib/query/dashboard-query.ts#L14-L159) | Partial |
| Step 3.3 validation | Run the planned web and workspace build validation commands | [backend-and-dashboard-architecture-details.md](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L221-L228), [backend-and-dashboard-architecture-changes.md](../../../changes/2026-03-07/backend-and-dashboard-architecture-changes.md#L98-L111), [backend-and-dashboard-architecture-log.md](../../../plans/logs/2026-03-07/backend-and-dashboard-architecture-log.md#L30-L41) | Partial |

## Findings

### Critical

1. The live monitoring route never consumes live station data, so the Phase 3 live page cannot satisfy the spec or the planned live-monitoring behavior.

Evidence:

* The Phase 3 plan requires the live page to render current camera state from live-status metadata and degrade to stale or unavailable only when updates stop: [backend-and-dashboard-architecture-plan.instructions.md](../../../plans/2026-03-07/backend-and-dashboard-architecture-plan.instructions.md#L87-L92), [backend-and-dashboard-architecture-details.md](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L192-L210)
* Research selected direct Firestore listeners only for live status, with backend APIs reserved for historical data: [backend-and-dashboard-research.md](../../../research/2026-03-07/backend-and-dashboard-research.md#L206-L211), [backend-and-dashboard-research.md](../../../research/2026-03-07/backend-and-dashboard-research.md#L290-L300)
* The spec requires the live page to show live device status, current camera feed when active, current detected item, current disposal decision, and latest event in real time: [binbuddy-spec.md](../../../../spec/binbuddy-spec.md#L107-L113)
* The implementation loads the station directory entry, then builds the page snapshot with `createSnapshot(stationId, null)`, which forces an unavailable snapshot instead of using the listener path: [apps/web/src/pages/live-monitoring.tsx](../../../../apps/web/src/pages/live-monitoring.tsx#L17-L24)
* The live listener boundary exists and is capable of subscribing to Firestore-backed station status, but it is not used by the route composition: [apps/web/src/lib/firebase/live-status.ts](../../../../apps/web/src/lib/firebase/live-status.ts#L61-L77), [apps/web/src/lib/firebase/live-monitoring.ts](../../../../apps/web/src/lib/firebase/live-monitoring.ts#L128-L145)
* The change log claims Phase 3 added live monitoring route composition and stale camera-feed handling, but the route does not actually connect to live state: [backend-and-dashboard-architecture-changes.md](../../../changes/2026-03-07/backend-and-dashboard-architecture-changes.md#L54-L64)

Impact:

The most user-visible Phase 3 feature is functionally absent. In the current implementation, the live page can only render the unavailable placeholder state, so the dashboard cannot show the required real-time station status or active camera frame.

### Major

1. The delivered filter surface is a read-only summary, not reusable filter controls.

Evidence:

* Phase 3 explicitly requires reusable station, floor, building, location, and time-range controls: [backend-and-dashboard-architecture-details.md](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L194-L203)
* The spec requires the dashboard to filter by station, floor, building, location, and time range: [binbuddy-spec.md](../../../../spec/binbuddy-spec.md#L96-L105)
* The implemented filter component only renders the current filter values and available facet counts in a definition list. It does not expose input elements, selection controls, or interaction handlers: [apps/web/src/features/filters/filter-controls.tsx](../../../../apps/web/src/features/filters/filter-controls.tsx#L15-L70)
* Query serialization and request shaping are implemented correctly behind the scenes, which means the gap is in the UI control layer rather than the query model: [apps/web/src/lib/query/dashboard-query.ts](../../../../apps/web/src/lib/query/dashboard-query.ts#L101-L159)
* The change log overstates this area as delivered reusable filter UI: [backend-and-dashboard-architecture-changes.md](../../../changes/2026-03-07/backend-and-dashboard-architecture-changes.md#L52-L58)

Impact:

Historical pages can accept filter state from outside the component boundary, but Phase 3 does not yet provide the operator-facing controls needed to change those filters from the dashboard itself.

### Minor

1. Phase 3 validation was documented with substitute compiler checks instead of the exact commands required by the plan.

Evidence:

* The Phase 3 detail step requires `corepack pnpm --filter @binbuddy/web run lint`, `corepack pnpm --filter @binbuddy/web run build`, and `corepack pnpm run build`: [backend-and-dashboard-architecture-details.md](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L221-L228)
* The changes log records that validation used direct `npx tsc` fallbacks because Corepack could not verify pnpm signing keys: [backend-and-dashboard-architecture-changes.md](../../../changes/2026-03-07/backend-and-dashboard-architecture-changes.md#L98-L111)
* The planning log records the same deviation for Phase 3 and Phase 5 validation: [backend-and-dashboard-architecture-log.md](../../../plans/logs/2026-03-07/backend-and-dashboard-architecture-log.md#L30-L41)

Impact:

This does not invalidate the implementation evidence by itself, but it means Step 3.3 was only partially satisfied against the literal plan.

## Verified Alignments

* The dashboard shell, routing, and provider composition are present and follow the planned split between route composition and data-access boundaries: [apps/web/src/app/router.tsx](../../../../apps/web/src/app/router.tsx#L15-L172), [apps/web/src/app/providers.tsx](../../../../apps/web/src/app/providers.tsx#L29-L58)
* Historical event history, analytics, and comparisons are routed through backend API and query helper layers instead of direct Firestore reads, which matches the selected architecture: [apps/web/src/lib/api/dashboard-api.ts](../../../../apps/web/src/lib/api/dashboard-api.ts#L19-L42), [apps/web/src/lib/api/dashboard-gateway.ts](../../../../apps/web/src/lib/api/dashboard-gateway.ts#L25-L56), [apps/web/src/pages/event-history.tsx](../../../../apps/web/src/pages/event-history.tsx#L17-L40), [apps/web/src/pages/analytics.tsx](../../../../apps/web/src/pages/analytics.tsx#L17-L38), [apps/web/src/pages/comparisons.tsx](../../../../apps/web/src/pages/comparisons.tsx#L15-L33)
* Comparison scenarios explicitly cover building, location, signage variant, layout variant, before-after, and A/B analysis as required: [apps/web/src/lib/query/dashboard-query.ts](../../../../apps/web/src/lib/query/dashboard-query.ts#L161-L226)
* Station directory and station detail views surface active rules preset context and experiment variants as required for operator monitoring: [apps/web/src/features/stations/station-directory.tsx](../../../../apps/web/src/features/stations/station-directory.tsx#L32-L58), [apps/web/src/pages/station-detail.tsx](../../../../apps/web/src/pages/station-detail.tsx#L57-L90)

## Coverage Assessment

Coverage is partial.

* Step 3.1 is substantially implemented.
* Step 3.2 is only partially implemented because station and historical views are present, but the live page is not wired to real live data and the filter surface is not interactive.
* Step 3.3 is partially implemented because substitute TypeScript validation was documented, while the exact plan commands remain blocked.

Overall assessment: the shell and historical analytics/comparison composition are in place, but Phase 3 should not be treated as complete because one required feature is missing outright and another is only scaffolded.

## Clarifying Questions

1. Was Phase 3 intentionally scoped as static route composition only, or was it expected to deliver a functioning live listener hookup and interactive filter controls as written in the plan and detail steps?