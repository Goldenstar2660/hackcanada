---
title: Web Surface Research
description: Research on the current web dashboard and live monitoring implementation against the Binsight product spec
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: overview
keywords:
  - binsight
  - dashboard
  - live monitoring
  - research
estimated_reading_time: 8
---

## Research scope

* Research the current implementation of the web dashboard and live monitoring surface in this repository.
* Use `/spec/binsight-spec.md` as the authoritative source of truth.
* Focus on `apps/web` and directly related contracts and backend files.
* Identify implemented behavior that matches the spec.
* Identify required features that appear missing or partial.
* Identify behavior outside the spec or in conflict with it.
* Capture evidence with exact file paths and line numbers.
* Note architectural implications, placeholders, and open questions discovered during research.

## Status

Complete.

## Findings

### Implemented behavior that matches the spec

* The web surface has first-class routes for stations, event history, analytics, comparisons, and live monitoring. This matches the dashboard and live-monitoring surface defined by the spec. Evidence: `spec/binsight-spec.md:96-112`; `apps/web/src/app/router.tsx:15-63`.
* Station browsing, station metadata, and active rules preset details are implemented. The station directory shows location, rules preset, zone mapping, and experiment variants, while station detail shows the active preset and jurisdiction. Evidence: `spec/binsight-spec.md:97-99,122-128`; `apps/web/src/pages/stations.tsx:14-20,23-34`; `apps/web/src/features/stations/station-directory.tsx:149-199`; `apps/web/src/pages/station-detail.tsx:50-68,85-123`.
* The dashboard filter surface implements the required station, floor, building, location, and time-range filters. It also includes signage and layout filters, which are useful for the comparison use cases in the spec. Evidence: `spec/binsight-spec.md:102-105`; `apps/web/src/features/filters/filter-controls.tsx:51-119,121-195`; `apps/web/src/lib/query/dashboard-query.ts:221-311`.
* Disposal event history is implemented through a backend API and rendered in the web UI. The displayed event fields match the spec's event model at a high level: timestamp, station, predicted item, correct disposal method, actual disposal zone, and outcome. Evidence: `spec/binsight-spec.md:51-58,100`; `packages/contracts/src/index.ts:35-44,228-255`; `apps/web/src/pages/event-history.tsx:14-45`; `apps/web/src/features/events/event-history-panel.tsx:54-95`; `services/backend-functions/src/functions/get-event-history.ts:50-57`; `services/backend-functions/src/analytics/query-service.ts:257-283`.
* Analytics summary cards cover total attempts, total correct sorts, first-try correct rate, and participation or compliance score. The page also renders top contamination items, worst times of day, leaderboard entries, grouped results, and trend series, which aligns with most of the directly tracked metrics and inferred comparison goals in the spec. Evidence: `spec/binsight-spec.md:69-94,101,103-105`; `packages/contracts/src/index.ts:132-226`; `apps/web/src/pages/analytics.tsx:14-31,34-47`; `apps/web/src/features/analytics/analytics-summary-panel.tsx:58-135`; `apps/web/src/features/analytics/chart-adapters.ts:159-189`; `services/backend-functions/src/analytics/query-service.ts:176-254`.
* The comparisons surface supports grouped analysis across locations, signage variants, layout variants, and stations, and it includes named before/after and A/B scenarios. Evidence: `spec/binsight-spec.md:87-94,103-105`; `apps/web/src/pages/comparisons.tsx:109-139`; `apps/web/src/features/comparisons/comparison-overview.tsx:148-179`; `apps/web/src/lib/query/dashboard-query.ts:230-280`; `apps/web/src/lib/api/dashboard-gateway.ts:88-96`.
* The live monitoring page surfaces live device health, current session state, current detected item, current disposal method, and the latest event summary. That matches the core live-monitoring requirements at the field level. Evidence: `spec/binsight-spec.md:107-112`; `packages/contracts/src/index.ts:67-78`; `apps/web/src/pages/live-monitoring.tsx:18-31,34-49`; `apps/web/src/features/live/live-station-panel.tsx:69-139`; `services/backend-functions/src/functions/ingest-live-status.ts:15-35`.

### Required features that appear missing or partial

* The live monitoring page is not actually live at the UI layer. The page loader takes a single initial snapshot with `loadInitialSnapshot`, but no page or component subscribes to `subscribeToStation` afterward. The provider layer renders a request-scoped JSX tree without any stateful client subscription path. This makes the "latest event from the station in real time" requirement only partially implemented. Evidence: `spec/binsight-spec.md:107-112`; `apps/web/src/pages/live-monitoring.tsx:19-24`; `apps/web/src/lib/firebase/live-monitoring.ts:27-35,130-208`; `apps/web/src/features/live/live-station-panel.tsx:69-139`; `apps/web/src/app/providers.tsx:38-77`.
* Bin purity is computed and carried through the contracts, query builder, and backend analytics service, but the analytics UI never renders it. The display model stores `binPurity`, yet the panel only renders headline cards, grouped results, contamination, worst times, leaderboard, and trend series. This leaves one of the spec's directly displayed metrics missing from the dashboard. Evidence: `spec/binsight-spec.md:69-77`; `packages/contracts/src/index.ts:204-210`; `apps/web/src/lib/query/dashboard-query.ts:137-147`; `apps/web/src/features/analytics/chart-adapters.ts:145-152,183-188`; `apps/web/src/features/analytics/analytics-summary-panel.tsx:68-133`; `services/backend-functions/src/analytics/query-service.ts:239-242`.
* Event history pagination is only partially implemented. The web query hard-codes `pageSize: 50`, the backend returns `nextCursor`, and the panel prints the next cursor value, but there is no UI control to request the next page. Evidence: `apps/web/src/lib/query/dashboard-query.ts:278-288`; `packages/contracts/src/index.ts:228-255`; `apps/web/src/features/events/event-history-panel.tsx:92-94`; `services/backend-functions/src/analytics/query-service.ts:282-283`.
* Before/after and A/B analysis are implemented as generic analytics presets, not as intervention-aware analyses tied to signage updates, campaign dates, cohort metadata, or known change points. "Before / after" is just grouped-by-day analytics, and "A/B" is grouped-by-station analytics. That is enough for a demo shell, but it is thinner than the spec's historical-analysis intent. Evidence: `spec/binsight-spec.md:87-94,105,114-120`; `apps/web/src/lib/query/dashboard-query.ts:261-278`; `apps/web/src/features/comparisons/comparison-overview.tsx:158-175`; repository search found `demo` only in `spec/binsight-spec.md:114-120`.
* Demo-data marking and filtering are absent from the web-facing implementation. The spec explicitly requires seeded records to be marked as demo data for presentation and filtering, but there is no demo flag in the shared contracts, dashboard filters, or backend query surface. Evidence: `spec/binsight-spec.md:114-120`; `packages/contracts/src/index.ts:159-279`; `apps/web/src/features/filters/filter-controls.tsx:51-195`; repository search found `demo` only in `spec/binsight-spec.md:114-120`.

### Behavior outside the spec or in conflict with it

* The live monitoring page includes a "Current camera frame" panel and the route description advertises "latest-frame camera monitoring," while the spec says camera preview is developer-only and opens on the operator laptop when Pi code is run over SSH. The camera frame surface is therefore outside the documented product scope and likely conflicts with the spec's stated access model. Evidence: `spec/binsight-spec.md:153-154`; `apps/web/src/app/router.tsx:32-37,136-141`; `apps/web/src/features/live/live-station-panel.tsx:111-126`; `apps/web/src/lib/firebase/live-monitoring.ts:37-49,99-127`.

### Architectural implications and placeholders

* Historical dashboard data is intentionally routed through callable backend APIs, while live monitoring reads the Firestore live-status document directly after an operator-claim check. This split is consistent across the codebase and matters for future changes to auth, caching, or SSR. Evidence: `apps/web/src/lib/api/dashboard-api.ts:19-41`; `apps/web/src/lib/api/dashboard-gateway.ts:67-97`; `apps/web/src/lib/firebase/live-status.ts:64-91`; `services/backend-functions/src/functions/get-station-directory.ts:11-17`; `services/backend-functions/src/functions/get-analytics-summary.ts:30-37`; `services/backend-functions/src/functions/get-event-history.ts:50-57`.
* The comparisons page is a client-side composition layer over repeated `getAnalyticsSummary` calls rather than a dedicated comparison API or comparison read model. That is workable for the current surface, but it limits scenario-specific behavior unless the query model grows. Evidence: `apps/web/src/lib/api/dashboard-gateway.ts:88-96`; `apps/web/src/lib/query/dashboard-query.ts:230-280`; `apps/web/src/pages/comparisons.tsx:114-123`.
* The primary navigation exposes the dynamic live route directly. Because the layout uses `route.path` as the `href`, the sidebar link for Live view resolves to `/stations/:stationId/live` instead of a real station-specific path. This looks like a placeholder or unfinished information architecture rather than a usable navigation entry. Evidence: `apps/web/src/app/router.tsx:32-37`; `apps/web/src/app/layout.tsx:22-34`.
* The app composition is request and render oriented rather than an interactive client surface. The provider tree is a pass-through wrapper, route matching is path-based, and page rendering happens before the final JSX tree is returned. That architecture explains why live data currently stops at an initial snapshot and why pagination and richer comparison interactions are not yet present. Evidence: `apps/web/src/app/providers.tsx:27-77`; `apps/web/src/app/types.ts:1-41`; `apps/web/src/app/router.tsx:97-172`.

## Next research

* Review the seed-data and repository implementations to confirm whether intervention metadata, campaign dates, or demo-data flags exist outside the web and contract surface.
* Verify whether there is an external host app that hydrates these JSX surfaces and adds live subscriptions outside `apps/web/src`.
* Check whether the `Live view` navigation issue is already tracked elsewhere as a known placeholder.

## Clarifying questions

None.
