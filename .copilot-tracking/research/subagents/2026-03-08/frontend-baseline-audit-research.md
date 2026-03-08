---
title: Frontend Baseline Audit Research
description: Baseline research on the current apps/web frontend structure, reusable UI patterns, data flow, and Stitch migration risks.
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: reference
keywords:
  - frontend
  - routing
  - ui
  - contracts
  - stitch
estimated_reading_time: 8
---

## Research scope

This subagent research covers the current web application under `apps/web` with emphasis on these questions:

1. What route structure, page entry points, and navigation patterns exist today?
2. How are UI components organized, and what reusable styling patterns already exist?
3. How do data loading, state management, mock or live data usage, and contracts consumption work now?
4. Which existing pages and behaviors could support Stitch-delivered pages with minimal change?
5. What exact file references and line numbers support the findings?
6. What are the main risks in replacing the UI without breaking routing or behavior?

## Status

Complete.

## Findings

### Route structure, entry points, and navigation

The current web app is a Vite-hosted React dashboard, not a framework router app. It boots from `apps/web/src/main.tsx`, initializes Firebase App, Auth, Firestore, and Functions, then renders `DashboardBrowserApplication` with the current browser path. Evidence: `apps/web/src/main.tsx:3-8`, `apps/web/src/main.tsx:22-45`, `apps/web/src/main.tsx:54`; `apps/web/README.md:19`, `apps/web/README.md:29`, `apps/web/README.md:48-58`.

Routing is custom and centralized in `apps/web/src/app/router.tsx`. The route table currently defines six route entries:

* `/stations`
* `/stations/:stationId`
* `/stations/:stationId/live`
* `/history`
* `/analytics`
* `/comparisons`

Evidence: `apps/web/src/app/router.tsx:15-63`.

Navigation is derived from the same route table through `showInNavigation`, so the sidebar is data-driven rather than hard-coded per page. The station detail route is intentionally excluded from primary navigation but remains deep-linkable from station cards and live views. Evidence: `apps/web/src/app/router.tsx:20-61`, `apps/web/src/app/router.tsx:93-94`, `apps/web/src/app/layout.tsx:15-43`, `apps/web/src/features/stations/station-directory.tsx:27`, `apps/web/src/pages/station-detail.tsx:60`, `apps/web/src/features/live/live-station-panel.tsx:33`.

The browser shell handles navigation itself. `DashboardBrowserApplication` normalizes the path, listens for `popstate`, pushes history on in-app navigation, intercepts same-origin anchor clicks, and intercepts `GET` form submissions to convert filter forms into route query strings. There is no React Router, URL object router, or global store. Evidence: `apps/web/src/app/providers.tsx:111-116`, `apps/web/src/app/providers.tsx:219-225`, `apps/web/src/app/providers.tsx:272-280`, `apps/web/src/app/providers.tsx:312-321`, `apps/web/src/app/providers.tsx:353-382`, `apps/web/src/app/providers.tsx:384-403`.

If a route does not match, the router falls back logically to `/stations`. That protects the app from total failure on unknown URLs, but it also means a Stitch page introduced under a new path will not render unless the route table is updated first. Evidence: `apps/web/src/app/router.tsx:97-114`.

### UI component organization and reusable styling

The app is organized in three layers:

* `src/app`: shell, layout, providers, router, and shared CSS
* `src/pages`: route-level loaders and page composition
* `src/features`: reusable view panels for filters, stations, analytics, comparisons, events, and live state

Evidence: `apps/web/src/index.ts:1-8`, directory layout under `apps/web/src`, and page and feature entry points at `apps/web/src/pages/stations.tsx:14-30`, `apps/web/src/pages/station-detail.tsx:14-96`, `apps/web/src/pages/live-monitoring.tsx:38-110`, `apps/web/src/pages/event-history.tsx:14-42`, `apps/web/src/pages/analytics.tsx:14-45`, `apps/web/src/pages/comparisons.tsx:12-40`.

The page modules are thin. Each page loader gathers data and renders one or two feature components. This separation is the strongest existing seam for a Stitch migration because it allows page presentation to change without rewriting data acquisition. Evidence: `apps/web/src/pages/stations.tsx:14-30`, `apps/web/src/pages/event-history.tsx:14-42`, `apps/web/src/pages/analytics.tsx:14-45`, `apps/web/src/pages/comparisons.tsx:12-40`.

Reusable UI building blocks are CSS-class based rather than component-library based. The main repeated patterns are:

* Shell and chrome: `.dashboard-shell`, `.dashboard-header`, `.dashboard-body`, `.dashboard-sidebar`
* Reusable containers: `.dashboard-card`, `.dashboard-card--dark`, `.dashboard-section-stack`
* Layout helpers: `.dashboard-grid`, `.dashboard-grid--stats`, `.dashboard-grid--cards`, `.dashboard-grid--wide`, `.dashboard-row`
* Form primitives: `.dashboard-field`, `.dashboard-input`, `.dashboard-select`, `.dashboard-button`, `.dashboard-button--ghost`
* Data display primitives: `.dashboard-detail-list`, `.dashboard-table`, `.dashboard-status`, `.dashboard-note`

Evidence: `apps/web/src/app/dashboard.css:1-45`, `apps/web/src/app/dashboard.css:120-160`, `apps/web/src/app/dashboard.css:170-244`, `apps/web/src/app/dashboard.css:302-356`.

The most reusable feature modules already exposed by composition are:

* `FilterControls` for every route with query-backed filters: `apps/web/src/features/filters/filter-controls.tsx:28-192`
* `StationDirectory` for station card grids: `apps/web/src/features/stations/station-directory.tsx:8-53`
* `LiveStationPanel` for device detail live state: `apps/web/src/features/live/live-station-panel.tsx:20-96`
* `AnalyticsSummaryPanel` for KPI and trend summaries: `apps/web/src/features/analytics/analytics-summary-panel.tsx:9-67`
* `EventHistoryPanel` for tabular event review: `apps/web/src/features/events/event-history-panel.tsx:7-40`
* `ComparisonOverview` for experiment and cohort comparison summaries: `apps/web/src/features/comparisons/comparison-overview.tsx:7-31`

### Data loading, state management, live data, and contracts consumption

State management is local React state plus async loaders. The browser app uses `useState`, `useEffect`, `useMemo`, `useDeferredValue`, and `startTransition` to manage auth state, route state, and page rendering. There is no Redux, Zustand, TanStack Query, or React Router data API. Evidence: `apps/web/src/app/providers.tsx:2`, `apps/web/src/app/providers.tsx:219-321`.

The provider layer creates two data dependencies after sign-in:

* `api`: Firebase callable-based backend gateway
* `live`: Firestore-based live monitoring gateway

Evidence: `apps/web/src/app/providers.tsx:227-241`.

The backend API surface is contract-first. `createDashboardApiClient` calls three callable functions, `getStationDirectory`, `getEventHistory`, and `getAnalyticsSummary`, and all request and response types come from `@binsight/contracts`. Evidence: `apps/web/src/lib/api/dashboard-api.ts:1-35`, `apps/web/src/lib/api/dashboard-gateway.ts:91-119`.

The dashboard gateway caches station directory reads in-memory for the session and derives comparisons by expanding the current filter state into multiple analytics requests. Evidence: `apps/web/src/lib/api/dashboard-gateway.ts:92-103`, `apps/web/src/lib/api/dashboard-gateway.ts:114-119`; scenario generation in `apps/web/src/lib/query/dashboard-query.ts:224-278`.

Filter state is route-backed, not component-store backed. `parseDashboardFilters` reads query parameters, `normalizeDashboardFilters` sanitizes them, `matchesStationFilters` applies them client-side for the station directory, and request builders translate them into backend query payloads for history and analytics. Evidence: `apps/web/src/lib/query/dashboard-query.ts:83-143`, `apps/web/src/lib/query/dashboard-query.ts:145-153`, `apps/web/src/lib/query/dashboard-query.ts:180-222`.

Data loading behavior by route is currently split this way:

* `StationsPage`: loads station directory once and filters client-side: `apps/web/src/pages/stations.tsx:14-21`
* `StationDetailPage`: loads station directory once and derives the selected station and nearby comparison set client-side: `apps/web/src/pages/station-detail.tsx:14-32`
* `LiveMonitoringPage`: loads station directory via API, then subscribes to Firestore live status for one station: `apps/web/src/pages/live-monitoring.tsx:38-58`, `apps/web/src/pages/live-monitoring.tsx:65-82`
* `EventHistoryPage`: loads station directory plus backend history in parallel: `apps/web/src/pages/event-history.tsx:14-28`
* `AnalyticsPage`: loads station directory plus backend analytics in parallel: `apps/web/src/pages/analytics.tsx:14-31`
* `ComparisonsPage`: loads station directory plus backend comparison analyses in parallel: `apps/web/src/pages/comparisons.tsx:12-26`

Live monitoring is the only view with real-time state. It uses the Firestore collection path `stationLiveStatus/{stationId}`, requires an authenticated operator session, and derives stale or unavailable status in the frontend gateway. Evidence: `apps/web/src/lib/firebase/live-status.ts:7`, `apps/web/src/lib/firebase/live-status.ts:57-82`, `apps/web/src/lib/firebase/live-status.ts:111-118`, `apps/web/src/lib/firebase/live-monitoring.ts:5-6`, `apps/web/src/lib/firebase/live-monitoring.ts:41-140`.

The app consumes `@binsight/contracts` broadly across pages, features, and data layers. The Vite config aliases `@binsight/contracts` and `@binsight/analytics` directly to workspace source, but the web app currently imports only `@binsight/contracts` in `src`. There is no in-app mock data module under `apps/web/src`; the only "demo" usage found is explanatory text for the live page. Evidence: `apps/web/vite.config.ts:7-14`, `apps/web/package.json:12-15`, imports at `apps/web/src/lib/api/dashboard-api.ts:1-5`, `apps/web/src/lib/query/dashboard-query.ts:1-7`, `apps/web/src/pages/analytics.tsx:1`, plus a repo-wide search in `apps/web/src` showing no `@binsight/analytics` imports and no mock or fixture module hits.

### Existing pages and behaviors that can support Stitch with minimal change

The least risky migration path is to keep the current shell and data layer, then replace only route bodies or feature panels with Stitch-generated markup.

The existing surfaces that are already good Stitch landing zones are:

* `DashboardLayout` for global chrome and route-driven sidebar: `apps/web/src/app/layout.tsx:15-43`
* `renderDashboardRoute` as the single switchboard for swapping page implementations behind stable URLs: `apps/web/src/app/router.tsx:116-169`
* The route-level page modules as thin composition wrappers: `apps/web/src/pages/*.tsx`
* `FilterControls` as a shared filter affordance that already works across directory, history, analytics, comparisons, and station detail/live views: `apps/web/src/features/filters/filter-controls.tsx:28-192`

Specific low-change mapping opportunities:

* Stitch station list or device index pages can likely reuse `StationsPage` loader plus `StationDirectory` data shape, with only card markup replaced.
* Stitch station detail or device detail pages can likely reuse `loadStationDetailPage` and `LiveStationPanel`, keeping the current `/stations/:stationId` and `/stations/:stationId/live` URL structure.
* Stitch analytics, comparisons, and history pages can preserve current route paths and filter query behavior by swapping only the body panels while retaining `FilterControls` and the existing loaders.
* Stitch page shells can preserve same-origin anchor links and `GET` forms so the current navigation interception continues to work without adding a routing dependency.

### Risks in replacing the UI without breaking routing or behavior

The highest-risk areas are structural rather than visual:

* Route compatibility risk: changing URLs, adding new pages, or renaming the existing six paths without updating `dashboardRoutes` will silently fall back to `/stations` behavior instead of rendering the intended page. Evidence: `apps/web/src/app/router.tsx:15-65`, `apps/web/src/app/router.tsx:97-114`.
* Navigation semantics risk: the shell relies on plain same-origin `<a>` elements and `GET` forms. If Stitch emits buttons with custom click handlers or non-GET filter submissions, the current browser router will not capture them. Evidence: `apps/web/src/app/providers.tsx:353-403`.
* Query contract risk: filter names must remain `stationId`, `buildingId`, `floorId`, `location`, `signage`, `layout`, `timeStart`, `timeEnd`, and `timeLabel` or the current filter parser and request builders will stop working. Evidence: `apps/web/src/lib/query/dashboard-query.ts:123-143`, `apps/web/src/features/filters/filter-controls.tsx:46-162`.
* Auth and provider risk: every route depends on Firebase Auth sign-in and provider construction before rendering. A Stitch shell that bypasses `DashboardBrowserApplication` would drop operator gating, callable setup, or Firestore live subscriptions. Evidence: `apps/web/src/main.tsx:31-45`, `apps/web/src/app/providers.tsx:219-321`.
* Live data boundary risk: live monitoring is the only real-time surface and depends on Firestore document shape plus frontend stale-state logic. Replacing it with a generic card layout without preserving `LiveStationSnapshot` behavior would remove meaningful operator cues. Evidence: `apps/web/src/pages/live-monitoring.tsx:38-110`, `apps/web/src/lib/firebase/live-monitoring.ts:41-140`, `apps/web/src/features/live/live-station-panel.tsx:20-96`.
* Visual consistency risk: styling is currently centralized in one CSS file with many reusable utility-like classes. Replacing pages with isolated CSS-in-JS or per-page class systems will fragment the shell quickly unless the new pages continue to consume the same primitives or intentionally replace the entire design system. Evidence: `apps/web/src/app/dashboard.css:1-361`.

## Key discoveries

* The app already has a clean seam between route loaders and feature panels, which makes a Stitch body-layer swap feasible with modest churn.
* Routing is custom, small, and fragile to contract drift. Stable URLs and plain anchors matter more than any individual JSX structure.
* Shared filters are part of the routing contract, not only a UI concern.
* The live page is the only surface that mixes backend API reads with Firestore subscriptions.
* The web package is contract-first and has no local mock data layer in `src`, so Stitch pages should be designed against real contracts and gateway outputs.

## Next research

* Inspect the generated Stitch artifacts and compare their navigation semantics against the current anchor-and-GET-form router contract
* Audit whether any backend callable response shapes have changed since the current page loaders were written
* Map the Stitch page set directly against the six existing route IDs to decide whether routes can stay stable or need expansion
* Decide whether `FilterControls` should remain intact, be wrapped, or be reimplemented with identical query keys
* Validate live monitoring against a real operator account and seeded Firestore data because the current README explicitly notes that live login and reads were not verified in this workspace without environment variables and credentials

## Open questions

* Will Stitch deliver only page body components, or will it also replace the app shell and navigation chrome?
* Are the target Stitch pages expected to preserve the current route paths, especially `/stations/:stationId` and `/stations/:stationId/live`?
* Should the shared filter experience remain route-query driven, or is a new interaction model expected while preserving existing backend behavior?