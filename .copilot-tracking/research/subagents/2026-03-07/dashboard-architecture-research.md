---
title: Dashboard Architecture Research
description: Verified research on the best dashboard approach for the BinBuddy smart waste-sorting station
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binbuddy
  - dashboard
  - firebase
  - firestore
  - analytics
estimated_reading_time: 12
---

## Research scope

* Determine dashboard user needs from the product spec.
* Verify the current web, backend, and shared package boundaries in the monorepo.
* Recommend frontend architecture, page boundaries, data access patterns, and charting and query strategy.
* Compare a thin Firestore-driven dashboard against a richer analytics API layer.

## Status

Research complete.

## Executive recommendation

Use a hybrid dashboard architecture.

* Implement `apps/web` as a client-rendered React dashboard inside the existing TypeScript workspace, preferably with Vite, React Router, and a small feature-oriented module structure.
* Read live station state directly from Firestore with real-time listeners for low-latency monitoring views.
* Serve historical analytics, grouped comparisons, and event-history search through Firebase Cloud Functions rather than querying Firestore directly from the browser.
* Treat `packages/contracts` and `packages/analytics` as the source of truth for dashboard request and response shapes, and keep Firestore collection design as a backend concern.

This approach matches the product spec, fits the current monorepo boundaries, preserves Firestore's real-time strengths, and avoids pushing multi-dimensional analytics logic into browser-side Firestore queries.

## Dashboard user needs from the spec

The product spec defines two distinct dashboard modes with different data behavior.

The live monitoring mode needs current station state.

* Live device status.
* Current camera feed when active.
* Current detected item.
* Current disposal decision.
* Latest event from the station in real time.

The insights mode needs historical and comparative analysis.

* Station list and station metadata.
* Active rules preset per station.
* Disposal event history.
* Headline metrics: total attempts, total correct sorts, first-try correct rate, and participation or compliance score.
* Derived insight views: top contamination items, worst times of day, bin purity by hour or day, and floor or building leaderboard.
* Filters by station, floor, building, location, and time range.
* Grouping and comparison by station, floor, building, location, signage variant, and layout variant.
* Before or after analysis and A/B analysis over historical data.

These requirements imply two different access patterns.

* Mutable low-latency snapshots for live monitoring.
* Aggregated, paginated, and comparison-friendly read models for history and analytics.

## Verified repo findings

The repo already points to this split.

* The product spec states that Firestore is the database, Cloud Functions is the website backend, and the Pi sends both event and live-status data to Firebase.
* The dashboard package is intentionally a minimal TypeScript shell and depends on `@binbuddy/analytics` and `@binbuddy/contracts`.
* The backend functions package is also a shell, but its documented scope explicitly includes event ingestion, live status handling, analytics aggregation, and read-model support.
* The shared contracts already define `DisposalEvent`, `LiveStationStatus`, `StationMetadata`, `AnalyticsQuery`, and `AnalyticsSummary` as separate concerns.
* `AnalyticsSummary` is described as the canonical analytics read model returned by backend reporting endpoints and reused by the dashboard.
* Firestore rules currently deny all direct reads and writes, which means a browser-only Firestore dashboard is not the current default security posture.
* The Firebase indexes file is empty, so no compound analytics query surface has been modeled yet.

The repo also contains two contract mismatches that matter for dashboard planning.

* The Python runtime currently emits `success: bool` in `events.py`, while the canonical disposal event schema expects `attemptResult: "success" | "failure"`.
* The Python `LiveStatusPublisher` currently emits a minimal `phase`, `predicted_item`, and `disposal_method` shape, while the canonical live status schema expects `sessionState`, `cameraFeedActive`, `deviceHealth`, and optional `latestEvent`.

Those mismatches do not change the recommended dashboard architecture, but they are implementation gaps that must be resolved before the dashboard can rely on shared contracts.

## Recommended frontend architecture

Use a client-rendered SPA in `apps/web`.

Reasons:

* The current web package is a TypeScript shell with no established SSR framework.
* The product is operational and dashboard-heavy, not content-heavy.
* Live monitoring benefits from browser-held Firebase listeners.
* Existing backend scope already belongs in `services/backend-functions`, so introducing SSR routes in the web app would blur boundaries.

Recommended stack:

* React for the UI composition model.
* Vite for a lightweight build and dev setup that fits the current package shape better than a full-stack framework.
* React Router for route-level page boundaries.
* TanStack Query, or an equivalent query cache, for backend analytics requests.
* Firebase Web SDK for auth and Firestore listeners.
* Apache ECharts for charts that need comparison, dataset reuse, and transform-driven views.

Why not Next.js first:

* The repo already reserves Cloud Functions as the website backend.
* There is no current server-rendering requirement in the spec.
* Next.js would duplicate backend concerns that are already intended for `services/backend-functions`.

## Page and module boundaries

Recommended route structure:

* `/stations`: station directory with status badges, metadata, active rules preset, and quick KPIs.
* `/stations/:stationId`: station detail page with latest live status, recent event stream, event history table, and station-scoped trends.
* `/live`: live monitoring page optimized for operators, with current device health, active session state, and latest event updates.
* `/analytics`: overview page with headline metrics, trend charts, contamination items, worst times, purity charts, and leaderboards.
* `/compare`: comparison workspace for signage variant, layout variant, location, floor, building, and before or after views.

Recommended internal module split under `apps/web/src`:

* `app/`: router, providers, auth boundary, layout.
* `features/stations/`: station list, metadata cards, rules preset display.
* `features/live/`: live status listeners, device health, latest event, camera feed container.
* `features/events/`: event history filters, table, pagination, export-ready formatting.
* `features/analytics/`: summary cards, trend charts, leaderboard views, contamination analysis, purity views.
* `features/comparisons/`: comparison builder, before or after presets, variant selectors.
* `entities/contracts/`: adapters around generated contract types.
* `lib/firebase/`: Firestore initialization, listener hooks, auth wiring.
* `lib/api/`: callable or HTTP client for analytics and history endpoints.
* `lib/query/`: URL-state parsing, canonical query builders, cache keys.

This keeps live and historical concerns separated at the module boundary, which matches the spec and the shared contracts.

## Data access strategy

### Live status

Use direct Firestore listeners for live station state.

Reasons:

* Firestore supports document and query listeners with `onSnapshot()` for real-time updates.
* Query snapshots can surface incremental additions, modifications, and removals through `docChanges()`.
* This is the strongest fit for live device health, current detected item, current disposal guidance, and latest-event mirroring.

Recommended live collections:

* `stationMetadata/{stationId}` for relatively static metadata and filter vocabulary.
* `liveStationStatus/{stationId}` for mutable live station snapshots.

Recommended browser reads:

* Station directory: `stationMetadata` plus a small live-status query for visible stations.
* Live page: one listener per selected station, or a bounded query for the active operator view.

Avoid putting camera frames in Firestore documents. The spec requires a current camera feed, but the repo does not define the transport. Firestore is suitable for feed metadata or a stream URL, not frame transport itself.

### Historical event history

Use a backend endpoint for event history search and pagination.

Reasons:

* The product requires filters by station, floor, building, location, and time range.
* The canonical disposal event schema does not include building, floor, location, signage variant, or layout variant fields, so direct browser queries would either require joins against station metadata or persistence-only denormalization.
* Firestore query composition has hard limits around disjunction count, `in` values, and compound query shape.
* Event tables require cursor pagination, and Firestore best practices explicitly recommend cursors over offsets.

Recommended contract boundary:

* Keep a browser-level `EventHistoryQuery` separate from `AnalyticsQuery`, or extend the analytics vocabulary carefully.
* Return server-generated cursors rather than exposing Firestore query assembly directly to the client.

### Historical analytics

Use backend-owned analytics endpoints backed by pre-aggregated or partially materialized read models.

Reasons:

* Firestore aggregation queries support only `count()`, `sum()`, and `average()`.
* Aggregations are not available through real-time listeners and are served directly from the backend rather than the local cache.
* Aggregation latency grows with the number of index entries scanned, and requests that cannot resolve within 60 seconds fail with `DEADLINE_EXCEEDED`.
* The product needs grouped metrics, leaderboards, worst times, contamination rankings, purity by bucket, and A/B style comparison views. Those are broader than native Firestore aggregation coverage.

Recommended backend pattern:

* Accept a canonical `AnalyticsQuery` request.
* Resolve the query against read-model collections or precomputed rollups.
* Return a canonical `AnalyticsSummary` response.
* Keep raw Firestore collection structure behind the backend boundary.

## Recommended analytics and query model

Use `AnalyticsQuery` as the canonical dashboard filter state model, but keep two practical adjustments in mind.

First, use the existing schema as the core filter vocabulary.

* `timeRange`
* `stationIds`
* `buildingIds`
* `floorIds`
* `locationLabels`
* `signageVariants`
* `layoutVariants`
* `metrics`
* `groupBy`
* `compareBy`
* `timeBucket`

Second, fill the current gaps.

* The schema handles A/B-style dimension comparison through `compareBy`.
* The schema does not explicitly represent before or after analysis across two time windows.
* The cleanest fix is either two coordinated `AnalyticsQuery` requests in the client or a schema extension that adds `baselineTimeRange` and `comparisonTimeRange`.

Recommended filter flow:

* One global filter bar owns the canonical query state.
* Query state lives in the URL so analysis views are shareable.
* Feature modules derive specialized API requests from the canonical query instead of inventing local filter models.

Recommended materialization strategy for analytics:

* Store raw disposal events as the immutable source of truth.
* Materialize hourly and daily rollups by station and by comparison dimensions that matter in the spec: building, floor, location, signage variant, and layout variant.
* Compute leaderboard and contamination slices in backend code from those rollups.
* Keep read models narrow and purpose-built for the dashboard rather than mirroring raw events.

For a hackathon-scale first cut, the backend can calculate some summaries from raw events at request time, but the browser contract should still be `AnalyticsQuery -> AnalyticsSummary` so the frontend does not care when the implementation moves to materialized rollups.

## Charting strategy

Apache ECharts is the best fit for the required dashboard behavior.

Reasons:

* ECharts recommends using `dataset` to separate data from chart configuration and to let multiple series reuse the same source data.
* ECharts supports declarative dataset-to-series mapping through `series.encode`.
* ECharts supports built-in data transforms such as `filter` and `sort`, plus multi-dataset flows.
* Those features map well to BinBuddy's need for grouped comparisons, side-by-side views, and derived visual slices from one returned summary payload.

Recommended chart set:

* Metric cards for headline KPIs.
* Line charts for first-try correct rate and participation trend over time.
* Stacked or grouped bar charts for contamination items and building or floor comparisons.
* Heatmap or grid view for purity by hour and disposal method.
* Ranked bar chart for worst times of day.
* Leaderboard table for floor and building score ranking.
* Paired comparison charts for signage and layout variants.

Why not a simpler chart library first:

* A lighter library such as Recharts is viable for a fast prototype with only simple line and bar charts.
* The spec already calls for grouping, comparison, and before or after analysis. ECharts handles those richer combinations with less bespoke chart plumbing.

## Thin Firestore dashboard versus analytics API layer

### Option A: Thin dashboard over Firestore

Description:

* The web app queries Firestore directly for live status, events, and metric calculations.

Advantages:

* Fastest initial build for a very small demo.
* Lowest backend implementation effort at the start.
* Native real-time behavior for live views.

Disadvantages:

* Current Firestore rules deny all direct reads and writes.
* Historical analytics would require complex client-side query orchestration, index management, and metadata joins.
* Firestore aggregation support is too narrow for the spec's grouped and comparative analytics.
* Before or after analysis and A/B comparisons would shift too much analytical logic into the browser.
* Event-history filters across station metadata dimensions become awkward or expensive.

Assessment:

* Acceptable only as a throwaway prototype for one station and a handful of charts.
* Not the best fit for the repo's intended backend boundary.

### Option B: Full backend-owned dashboard data

Description:

* The browser talks only to backend endpoints. The backend owns all reads, including live state.

Advantages:

* Clear service boundary.
* Easier centralized auth and audit.
* No direct Firestore exposure to the client.

Disadvantages:

* Unnecessarily gives up Firestore's strongest live feature for station monitoring.
* Forces the backend to proxy highly dynamic operator views.
* Adds complexity and latency to the live monitoring page.

Assessment:

* Too heavy for the current product and misses the natural fit of Firestore listeners.

### Option C: Hybrid live-direct plus analytics API

Description:

* The browser subscribes directly to bounded live-status documents and queries backend endpoints for history and analytics.

Advantages:

* Best alignment with the product split between live monitoring and historical analysis.
* Keeps low-latency live monitoring simple.
* Keeps grouped metrics, comparisons, and history queries behind a stable backend contract.
* Matches the repo's existing package and schema boundaries.

Disadvantages:

* Two data-access paths instead of one.
* Requires careful auth and rules design for live collections.

Assessment:

* Best overall fit.

## Recommended backend interface shape

The repo does not define final transport yet, but the safest near-term path is a small Firebase-native API layer.

Recommended endpoints or callables:

* `getAnalyticsSummary(query: AnalyticsQuery): AnalyticsSummary`
* `getEventHistory(query): paginated event rows`
* `getStationDirectory(filters): station list with metadata and current status summary`

Callable functions are a good first fit because Firebase's callable client SDK automatically includes auth, FCM, and App Check tokens when available and validates auth tokens on the backend. If the project later needs broader interoperability or CDN-oriented caching, the same contracts can move behind standard HTTP endpoints.

## Evidence from authoritative external docs

Firestore live queries:

* Firestore supports real-time document and query listeners with `onSnapshot()`, including incremental `docChanges()` updates for query results.
* Listener events fire immediately for local writes, and `metadata.hasPendingWrites` distinguishes local from server-backed state.
* Source: [Get realtime updates with Cloud Firestore](https://firebase.google.com/docs/firestore/query-data/listen)

Firestore query constraints:

* Compound queries often require composite indexes.
* `OR`, `in`, and `array-contains-any` queries are limited by disjunctive-normal-form expansion, with a maximum of 30 disjunctions in Standard edition.
* `not-in` and `!=` have additional restrictions.
* Source: [Perform simple and compound queries in Cloud Firestore](https://firebase.google.com/docs/firestore/query-data/queries)

Firestore pagination:

* Cursor pagination uses `startAt`, `startAfter`, and `limit`, and Firestore recommends cursors over offsets.
* Source: [Paginate data with query cursors](https://firebase.google.com/docs/firestore/query-data/query-cursors) and [Best practices for Cloud Firestore](https://firebase.google.com/docs/firestore/best-practices)

Firestore aggregation limits:

* Native aggregations cover only `count()`, `sum()`, and `average()`.
* Aggregations are not real-time and are served from the backend.
* Performance scales with index entries scanned and can fail after 60 seconds.
* Source: [Summarize data with aggregation queries](https://firebase.google.com/docs/firestore/query-data/aggregation-queries)

Firestore scaling and indexing:

* High write rates to sequentially indexed fields can hit a 500 writes per second limit if the indexed field is sequential and queried.
* Automatic and composite indexes should be managed intentionally, and error messages can generate missing indexes.
* Source: [Best practices for Cloud Firestore](https://firebase.google.com/docs/firestore/best-practices) and [Manage indexes in Cloud Firestore](https://firebase.google.com/docs/firestore/query-data/indexing)

Callable backend APIs:

* Callable functions automatically include auth and App Check context when available and are designed for app-to-backend calls through Firebase SDKs.
* Source: [Call functions from your app](https://firebase.google.com/docs/functions/callable)

Charting model:

* ECharts recommends `dataset` for reusable data and supports `series.encode`, multi-dataset references, and built-in transform pipelines such as `filter` and `sort`.
* Source: [Dataset](https://echarts.apache.org/handbook/en/concepts/dataset/) and [Data Transform](https://echarts.apache.org/handbook/en/concepts/data-transform/)

## Outstanding gaps and follow-on work

The following gaps remain in the repo and should be resolved before implementation starts.

* Align the Python runtime payloads with the canonical `DisposalEvent` and `LiveStationStatus` schemas.
* Decide how the live camera feed is transported and referenced. The current repo does not define that path.
* Decide whether before or after analysis uses two separate `AnalyticsQuery` requests or an extended comparison schema.
* Define auth and Firestore rule strategy for operator access to live collections.
* Define persistence-only enrichment fields or backend joins for event history filters by building, floor, location, signage variant, and layout variant.
* Add the first composite indexes once the concrete event-history and live-list queries are finalized.

## Final recommendation

Build the dashboard as a React SPA in `apps/web`, use Firestore listeners only for live monitoring surfaces, and put event history and all analytics behind Cloud Functions that accept `AnalyticsQuery`-style inputs and return shared read models. This is the cleanest match to the spec, the current monorepo boundaries, and the verified capabilities and limits of Firestore.