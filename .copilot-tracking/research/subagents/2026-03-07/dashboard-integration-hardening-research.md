---
title: Dashboard Integration Hardening Research
description: Audit of the merged dashboard/web app state for station status, live monitoring, event history, analytics, comparisons, and demo readiness
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - dashboard
  - web
  - hackathon
  - research
  - integration
estimated_reading_time: 10
---

## Research scope

* Audit the current merged web dashboard state for station status, live monitoring, event history, analytics, comparisons, and demo readiness.
* Verify implementation across pages, routing, data access, and contracts.
* Determine whether the web app is integrated to backend systems or still using mock or local-only data.
* Identify missing data plumbing, missing dependencies, missing UI states, and hackathon demo gaps.
* Recommend the exact integration and hardening approach for the current cycle.

## Status

Complete.

## Evidence log

* Source of truth reviewed in [spec/binsight-spec.md](../../../spec/binsight-spec.md).
* Web routing, page loaders, and feature components reviewed in:
  * [apps/web/src/app/router.tsx](../../../apps/web/src/app/router.tsx)
  * [apps/web/src/app/providers.tsx](../../../apps/web/src/app/providers.tsx)
  * [apps/web/src/pages/stations.tsx](../../../apps/web/src/pages/stations.tsx)
  * [apps/web/src/pages/station-detail.tsx](../../../apps/web/src/pages/station-detail.tsx)
  * [apps/web/src/pages/live-monitoring.tsx](../../../apps/web/src/pages/live-monitoring.tsx)
  * [apps/web/src/pages/event-history.tsx](../../../apps/web/src/pages/event-history.tsx)
  * [apps/web/src/pages/analytics.tsx](../../../apps/web/src/pages/analytics.tsx)
  * [apps/web/src/pages/comparisons.tsx](../../../apps/web/src/pages/comparisons.tsx)
* Web data abstractions reviewed in:
  * [apps/web/src/lib/api/dashboard-api.ts](../../../apps/web/src/lib/api/dashboard-api.ts)
  * [apps/web/src/lib/api/dashboard-gateway.ts](../../../apps/web/src/lib/api/dashboard-gateway.ts)
  * [apps/web/src/lib/firebase/live-status.ts](../../../apps/web/src/lib/firebase/live-status.ts)
  * [apps/web/src/lib/firebase/live-monitoring.ts](../../../apps/web/src/lib/firebase/live-monitoring.ts)
  * [apps/web/src/lib/query/dashboard-query.ts](../../../apps/web/src/lib/query/dashboard-query.ts)
* Shared contracts and schemas reviewed in:
  * [packages/contracts/src/index.ts](../../../packages/contracts/src/index.ts)
  * [packages/contracts/schemas/domain/disposal-event.schema.json](../../../packages/contracts/schemas/domain/disposal-event.schema.json)
  * [packages/contracts/schemas/domain/live-station-status.schema.json](../../../packages/contracts/schemas/domain/live-station-status.schema.json)
  * [packages/contracts/schemas/domain/station-metadata.schema.json](../../../packages/contracts/schemas/domain/station-metadata.schema.json)
* Backend callable and Firestore support reviewed in:
  * [services/backend-functions/src/runtime/firebase-runtime.ts](../../../services/backend-functions/src/runtime/firebase-runtime.ts)
  * [services/backend-functions/src/runtime/bootstrap.ts](../../../services/backend-functions/src/runtime/bootstrap.ts)
  * [services/backend-functions/src/analytics/query-service.ts](../../../services/backend-functions/src/analytics/query-service.ts)
  * [services/backend-functions/src/firestore/repositories/firestore.ts](../../../services/backend-functions/src/firestore/repositories/firestore.ts)
  * [services/backend-functions/src/functions/get-station-directory.ts](../../../services/backend-functions/src/functions/get-station-directory.ts)
  * [services/backend-functions/src/functions/get-event-history.ts](../../../services/backend-functions/src/functions/get-event-history.ts)
  * [services/backend-functions/src/functions/get-analytics-summary.ts](../../../services/backend-functions/src/functions/get-analytics-summary.ts)
* Firebase access model reviewed in:
  * [infra/firebase/firebase.json](../../../infra/firebase/firebase.json)
  * [infra/firebase/firestore.rules](../../../infra/firebase/firestore.rules)
  * [infra/firebase/firestore.indexes.json](../../../infra/firebase/firestore.indexes.json)
* Manifests and setup docs reviewed in:
  * [apps/web/package.json](../../../apps/web/package.json)
  * [services/backend-functions/package.json](../../../services/backend-functions/package.json)
  * [apps/web/README.md](../../../apps/web/README.md)
  * [services/backend-functions/README.md](../../../services/backend-functions/README.md)
  * [justfile](../../../justfile)
* Existing dated research reused as supporting evidence:
  * [full-station-demo-integration-hardening-research.md](../full-station-demo-integration-hardening-research.md)
  * [station-runtime-implementation-research.md](../station-runtime-implementation-research.md)
  * [shared-contracts-research.md](./shared-contracts-research.md)
  * [runtime-integration-hardening-research.md](./runtime-integration-hardening-research.md)

## Findings

### Current implementation across pages, routing, data access, and contracts

The merged web package implements a typed dashboard surface with six routes and matching page loaders:

* Station directory and station detail in [apps/web/src/app/router.tsx](../../../apps/web/src/app/router.tsx)
* Live monitoring in [apps/web/src/pages/live-monitoring.tsx](../../../apps/web/src/pages/live-monitoring.tsx)
* Event history in [apps/web/src/pages/event-history.tsx](../../../apps/web/src/pages/event-history.tsx)
* Analytics in [apps/web/src/pages/analytics.tsx](../../../apps/web/src/pages/analytics.tsx)
* Comparisons in [apps/web/src/pages/comparisons.tsx](../../../apps/web/src/pages/comparisons.tsx)

The route model is coherent and aligned to the spec's dashboard scope. Filters cover station, building, floor, location, signage variant, layout variant, and time range in [apps/web/src/features/filters/filter-controls.tsx](../../../apps/web/src/features/filters/filter-controls.tsx) and [apps/web/src/lib/query/dashboard-query.ts](../../../apps/web/src/lib/query/dashboard-query.ts).

The contracts are also aligned. The web and backend both depend on the canonical station directory, event history, analytics summary, disposal event, and live status types in [packages/contracts/src/index.ts](../../../packages/contracts/src/index.ts), which match the schema set under [packages/contracts/schemas/domain](../../../packages/contracts/schemas/domain) and [packages/contracts/schemas/analytics](../../../packages/contracts/schemas/analytics).

The backend side for dashboard reads is implemented as Firebase callable handlers plus Firestore repositories, not as placeholders:

* Callable names and client contract are defined in [apps/web/src/lib/api/dashboard-api.ts](../../../apps/web/src/lib/api/dashboard-api.ts)
* Backing callable functions are exported in [services/backend-functions/src/runtime/firebase-runtime.ts](../../../services/backend-functions/src/runtime/firebase-runtime.ts)
* Query logic exists in [services/backend-functions/src/analytics/query-service.ts](../../../services/backend-functions/src/analytics/query-service.ts)

This means the merged state is not a blank scaffold anymore. It contains a real typed dashboard domain model and a real typed backend query surface.

### Whether the web app is integrated to backend or only mock or local data

The dashboard is conceptually integrated to backend and Firestore, but it is not operationally integrated end to end.

What is real:

* Historical reads are designed to come from backend callables, not mock data or direct Firestore reads. The station directory, event history, analytics, and comparison pages all call `context.providers.api` in their loaders.
* Live monitoring is designed to come from a Firestore `stationLiveStatus` document plus a storage-backed frame resolver through [apps/web/src/lib/firebase/live-status.ts](../../../apps/web/src/lib/firebase/live-status.ts) and [apps/web/src/lib/firebase/live-monitoring.ts](../../../apps/web/src/lib/firebase/live-monitoring.ts).
* Firestore rules explicitly allow authenticated operators to read `stationLiveStatus` and deny all other direct reads in [infra/firebase/firestore.rules](../../../infra/firebase/firestore.rules).

What is missing:

* There is no concrete browser-side Firebase client implementation in `apps/web`. The package exports abstractions only.
* There is no concrete callable invoker implementation for `DashboardApiClient` in `apps/web`.
* There is no browser application entrypoint, no bundler, no HTML shell, and no deployment runtime in `apps/web`. The package only builds with `tsc` according to [apps/web/package.json](../../../apps/web/package.json).
* There is no evidence that the current Pi runtime publishes to Firebase yet. Existing runtime research and [devices/pi-station/README.md](../../../devices/pi-station/README.md) still describe Firebase publication as follow-on work.

Conclusion: the dashboard is not using mock data by default, but it is also not yet wired to a concrete backend client or a running browser app. It is an integration-ready UI library layer, not a demo-ready deployed dashboard.

### Missing data plumbing

The largest plumbing gaps are:

* No concrete `CallableApiInvoker` implementation in `apps/web` for `getStationDirectory`, `getEventHistory`, and `getAnalyticsSummary`.
* No concrete `LiveStatusListenerTransport` implementation in `apps/web` for Firestore subscriptions.
* No concrete `CameraFrameResolver` implementation in `apps/web` for storage object URLs.
* No visible seed path for `stations` collection documents required by station directory and analytics joins.
* No visible seed path for `rulesPresets` documents, despite one usable preset file at [packages/rules/presets/demo-canada-ottawa.1.0.0.json](../../../packages/rules/presets/demo-canada-ottawa.1.0.0.json).
* No visible station metadata fixtures for building, floor, location, signage, and layout dimensions required by filters and comparisons.
* No confirmed Pi-to-backend publisher that writes live status, disposal events, and camera frame metadata into the Firebase-backed backend surface.

Without those pieces, the backend can answer queries only if the database is already populated by manual setup or by code that is not present in the repo.

### Missing dependencies and runtime infrastructure

The most concrete package-level gaps are:

* [apps/web/package.json](../../../apps/web/package.json) includes `react` and `react-dom`, but no Firebase browser SDK packages.
* [apps/web/package.json](../../../apps/web/package.json) includes only `tsc` build and watch scripts. There is no Vite, Next.js, or equivalent runtime.
* [apps/web](../../../apps/web) has no `index.html`, no `main.tsx`, and no browser mount point.
* [services/backend-functions/openapi/README.md](../../../services/backend-functions/openapi/README.md) is still a placeholder, so operator-facing API setup documentation is missing.
* [apps/web/README.md](../../../apps/web/README.md) and [services/backend-functions/README.md](../../../services/backend-functions/README.md) still describe the surfaces as minimal shells, which is now inaccurate and will mislead integration work.

### Missing UI states and UX hardening

The page and component set is implemented, but it is still thin from an operator-demo perspective.

Missing or weak UI states:

* No general loading state for any page loader.
* No explicit error state or retry path for failed callable requests.
* No empty-state UX for empty station directory, empty event history, empty analytics groups, or empty comparisons.
* No operator-auth state for unauthorized callable or Firestore access.
* No live reactivity in the rendered live monitoring page. [apps/web/src/pages/live-monitoring.tsx](../../../apps/web/src/pages/live-monitoring.tsx) only loads an initial snapshot. It does not subscribe after render.
* No pagination controls for event history despite surfacing `nextCursor` in [apps/web/src/features/events/event-history-panel.tsx](../../../apps/web/src/features/events/event-history-panel.tsx).
* No charts yet. Analytics and comparisons render textual lists in [apps/web/src/features/analytics/analytics-summary-panel.tsx](../../../apps/web/src/features/analytics/analytics-summary-panel.tsx) and [apps/web/src/features/comparisons/comparison-overview.tsx](../../../apps/web/src/features/comparisons/comparison-overview.tsx).
* No stale-data banner for historical pages even though live camera staleness is modeled.

These are not architecture blockers, but they are demo-quality blockers.

### Hackathon demo readiness gaps

The current merged dashboard is not ready for a reliable hackathon presentation yet.

Key gaps:

* The web package is not a deployable website yet.
* Live monitoring is not actually live after initial render.
* Historical views depend on backend callables and Firestore content, but the repo does not show the required client wiring or seed process.
* Station metadata and rules preset data required for filters and comparisons are not provisioned by a visible workflow.
* The Pi runtime still treats Firebase publishing as a seam, not a completed integration, based on [devices/pi-station/README.md](../../../devices/pi-station/README.md) and prior runtime research.
* Operator claim provisioning is required by both callable handlers and Firestore rules, but there is no visible setup workflow for issuing those claims.

### Blockers for presenting live monitoring and historical insights at a hackathon

Hard blockers:

* No browser runtime for the dashboard package.
* No concrete Firebase client wiring in the dashboard package.
* No post-render live subscription path in the live monitoring UI.
* No demonstrated end-to-end publisher from Pi runtime into backend ingestion and live status collections.
* No visible seeded station metadata for filter facets and station detail pages.

Important but secondary blockers:

* No event-history pagination UX.
* No polished analytics charts, only textual summaries.
* Stale package READMEs and setup docs that under-document the real integration path.
* No package-local test coverage for the web and backend packages, even though Pi tests exist under [devices/pi-station/tests](../../../devices/pi-station/tests).

## Recommended approach

### Exact dashboard integration and hardening approach for this cycle

This cycle should focus on shipping one narrow, end-to-end demo path rather than expanding dashboard scope.

Recommended sequence:

1. Turn `apps/web` into a real browser app with the smallest possible runtime choice.
   * Add a real app entrypoint and mount path.
   * Keep the existing route model, page loaders, and feature components.
   * Do not redesign the information architecture. The current route and filter model already matches the spec well enough.
2. Implement concrete Firebase client adapters inside `apps/web`.
   * One callable invoker for `getStationDirectory`, `getEventHistory`, and `getAnalyticsSummary`.
   * One Firestore document subscription transport for `stationLiveStatus`.
   * One storage URL resolver for current camera frames.
3. Wire the live monitoring page to an ongoing subscription, not only `loadInitialSnapshot`.
   * Keep the initial snapshot timeout behavior from [apps/web/src/lib/firebase/live-monitoring.ts](../../../apps/web/src/lib/firebase/live-monitoring.ts).
   * Add post-render subscription updates and explicit disconnected, stale, and unauthorized states.
4. Seed the minimum Firebase demo dataset.
   * One rules preset based on [packages/rules/presets/demo-canada-ottawa.1.0.0.json](../../../packages/rules/presets/demo-canada-ottawa.1.0.0.json).
   * One station metadata document with building, floor, location, signage, and layout values.
   * A small historical event set if Pi publishing is not finished early enough.
5. Complete the Pi-to-backend publishing seam only for the fields the current dashboard already consumes.
   * Live status
   * Latest event summary
   * Disposal events
   * Camera frame metadata and storage path
6. Harden operator-facing states.
   * Unauthorized
   * Empty result
   * Backend failure
   * Loading
   * Live feed unavailable or stale

This is the right cycle boundary because it preserves the current code investment. The existing abstractions are already shaped correctly for callable-backed historical reads and Firestore-backed live status. The missing work is runtime wiring, data seeding, and operator resilience, not a dashboard rewrite.

### Recommended scope cuts for hackathon readiness

If time is tight, keep these surfaces fully working:

* Station directory
* Station detail
* Live monitoring for one station
* Event history for one station or one small station set
* Analytics headline cards and one grouped result view

Defer or simplify these surfaces if needed:

* Full comparisons page breadth across all six scenarios
* Rich charting libraries
* Multi-page pagination UX beyond one next-page control
* Multi-station live views

This keeps the demo aligned to the spec while reducing integration risk.

## Working findings summary

* The dashboard route and data model are well aligned to the spec.
* The backend callable and Firestore query surface is implemented.
* The web package is not yet a running website.
* The live page is only initial-snapshot capable today.
* The end-to-end data path from Pi runtime to backend to dashboard is still incomplete.
* Demo readiness depends more on wiring and seed data than on new page development.

## Open questions

Only questions the spec does not answer remain:

* Which browser app runtime should be used for this cycle: a minimal Vite client, SSR wrapper, or another thin host around the existing `renderDashboardApplication` surface?
* How should operator claims be provisioned for the demo: pre-created Firebase Auth users with custom claims, emulator-only setup, or another operator-auth bootstrap path?
* If Pi publishing is not finished in time, is a seeded historical dataset acceptable for demo backup, or must all demo history come from live station runs?

## Next research

* Review the exact Pi publisher implementation plan once runtime integration work starts.
* Confirm the fastest acceptable browser host for `apps/web` before implementation begins.
* Define the minimal Firebase seed script for station metadata, rules preset, and optional fallback historical events.