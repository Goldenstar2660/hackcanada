# Web Dashboard Route-Loading Research

## Status
Complete

## Research Topics
- Investigate route-loading behavior in the web dashboard.
- Determine why page navigation shows a blocking loading screen that says it is waiting for the database.
- Compare the observed behavior with the product spec.
- Identify minimal frontend fixes and dependent risks.

## Relevant Files
- apps/web/src/app/providers.tsx
- apps/web/src/app/router.tsx
- apps/web/src/pages/stations.tsx
- apps/web/src/pages/station-detail.tsx
- apps/web/src/pages/event-history.tsx
- apps/web/src/pages/analytics.tsx
- apps/web/src/pages/comparisons.tsx
- apps/web/src/pages/live-monitoring.tsx
- apps/web/src/features/live/live-station-panel.tsx
- apps/web/src/lib/api/dashboard-gateway.ts
- apps/web/src/lib/query/dashboard-query.ts
- apps/web/src/lib/firebase/live-monitoring.ts
- spec/binsight-spec.md

## Findings
- Route navigation is globally gated in apps/web/src/app/providers.tsx. On every path change, DashboardBrowserApplication sets pageState to loading and awaits renderDashboardApplication before rendering the next page.
- renderDashboardApplication in apps/web/src/app/providers.tsx awaits renderDashboardRoute in apps/web/src/app/router.tsx, so each route loader is part of the critical path for navigation.
- Every dashboard page loader performs data fetches before render. Stations and station-detail fetch the station directory. History and analytics fetch the directory plus backend results. Comparisons fetches the directory plus six analytics requests through getComparisons.
- The live-monitoring route is the clearest match for a perceived "waiting for the database" blocker. loadLiveMonitoringPage first awaits getStationDirectory, then awaits loadInitialSnapshot. loadInitialSnapshot waits up to 1500 ms for the first Firestore snapshot before falling back to an empty snapshot.
- The current live page already has an in-page empty state for missing live data: "Waiting for the first live status document from the station." That means the route does not need to block on Firestore to render a usable live page shell.
- The spec requires the dashboard to show stations, event history, metrics, filters, comparisons, and a live monitoring page. The spec does not require full-page blocking on route changes while backend or Firestore data is loading.

## Evidence
- Global route-loading gate:
	- apps/web/src/app/providers.tsx:219 defines DashboardBrowserApplication.
	- apps/web/src/app/providers.tsx:289 sets pageState to loading on dependency or route change.
	- apps/web/src/app/providers.tsx:291 calls renderDashboardApplication(dependencies, { path: deferredPath }).
	- apps/web/src/app/providers.tsx:418 renders DashboardLoadingState when pageState.status is loading.
- Async route resolution:
	- apps/web/src/app/providers.tsx:61 defines renderDashboardApplication.
	- apps/web/src/app/router.tsx:116 defines renderDashboardRoute and awaits the selected page loader for every route.
- Page loaders on the route critical path:
	- apps/web/src/pages/stations.tsx:14 loadStationsPage awaits getStationDirectory.
	- apps/web/src/pages/station-detail.tsx:14 loadStationDetailPage awaits getStationDirectory.
	- apps/web/src/pages/event-history.tsx:14 loadEventHistoryPage awaits getStationDirectory and getEventHistory in parallel.
	- apps/web/src/pages/analytics.tsx:14 loadAnalyticsPage awaits getStationDirectory and getAnalytics in parallel.
	- apps/web/src/pages/comparisons.tsx:12 loadComparisonsPage awaits getStationDirectory and getComparisons in parallel.
	- apps/web/src/pages/live-monitoring.tsx:37 loadLiveMonitoringPage awaits getStationDirectory, then awaits live.loadInitialSnapshot.
- Heavier comparison fan-out:
	- apps/web/src/lib/api/dashboard-gateway.ts:59 getComparisons builds multiple requests.
	- apps/web/src/lib/query/dashboard-query.ts:216 createComparisonScenarioDefinitions creates six comparison scenarios.
- Live Firestore wait:
	- apps/web/src/lib/firebase/live-monitoring.ts:5 sets DEFAULT_INITIAL_LIVE_SNAPSHOT_TIMEOUT_MS to 1500.
	- apps/web/src/lib/firebase/live-monitoring.ts:71 loadInitialSnapshot waits for first subscription data or timeout.
	- apps/web/src/features/live/live-station-panel.tsx:84 renders the in-page empty state "Waiting for the first live status document from the station."
- Spec alignment:
	- spec/binsight-spec.md states Firestore is the database, backend Functions serve website backend needs, and live monitoring should show current station state in real time.
	- spec/binsight-spec.md does not define a route-level blocking database wait as required behavior.

## Root Cause Analysis
- Primary frontend cause: the app uses a route-level async render model rather than rendering a stable shell and letting each page manage its own loading state. Because DashboardBrowserApplication clears the page to a loading card before awaiting renderDashboardApplication, any backend latency becomes a blocking navigation experience.
- Live-route-specific cause: loadLiveMonitoringPage blocks navigation on Firestore readiness even though the page can already represent "no live document yet". The sequence is getStationDirectory -> loadInitialSnapshot -> render page, so a missing or delayed stationLiveStatus document holds the whole page behind the global loading card.
- Secondary performance cause: some routes fetch more than they need on each navigation. Comparisons is the worst case because getComparisons expands one route into six analytics queries. Even non-live routes will therefore feel like they are "waiting for the database" because the router treats all data loads as blocking.
- Repeated directory reads amplify the effect. Most routes call getStationDirectory independently even though the directory is shared filter/navigation context and is unlikely to change between clicks.

## Recommended Minimal Changes
- 1. Stop replacing the current page with DashboardLoadingState during route transitions.
	- In apps/web/src/app/providers.tsx, keep the last successful page rendered while the next route is loading.
	- Add a separate transition flag such as isNavigating instead of resetting pageState to loading on every navigation.
	- Reserve the full-page loading card for initial auth boot only, or for the very first page load when no prior result exists.
- 2. Remove the live-route Firestore wait from the navigation critical path.
	- In apps/web/src/pages/live-monitoring.tsx, return an initial unavailable snapshot immediately with createSnapshot(stationId, null) or createUnavailableSnapshot semantics.
	- Let the existing subscription effect populate the first real snapshot after render instead of awaiting loadInitialSnapshot during route loading.
	- If an initial fetch is still desired, start it after the page mounts and reconcile it into local state without blocking navigation.
- 3. Cache station directory reads in the frontend gateway or provider scope.
	- In apps/web/src/lib/api/dashboard-gateway.ts or in the provider layer, memoize getStationDirectory per signed-in session and invalidate only on explicit refresh or auth change.
	- This is a low-risk improvement because the directory is reused by stations, detail, history, analytics, comparisons, and live pages.
- 4. Consider downgrading comparisons from route-blocking to section-loading.
	- Minimal version: keep the shell and filters visible, then show per-scenario loading or partial content as analytics responses return.
	- If that is too broad for now, at least avoid the global full-page loading overlay so the latency is localized to the comparisons page content.

## Risks And Dependencies
- Keeping the previous page visible during navigation requires care around stale content. The UI should show a compact "loading next view" state so users know a transition is in progress.
- If getStationDirectory is cached, the cache must reset on auth change or explicit refresh to avoid showing stale station metadata after backend updates.
- Removing loadInitialSnapshot from the live route changes timing behavior for tests that assume the first live snapshot is loaded before the page renders.
- Comparisons latency is partly structural because createComparisonScenarioDefinitions intentionally issues six analytics queries. Fixing only the router UX will improve perceived performance, but not backend time-to-data.
- The live monitoring architecture itself is aligned with prior repo facts: direct Firestore listeners for live state and backend APIs for analytics/history. The problem is the blocking render strategy, not the hybrid architecture.

## Open Questions
- The exact user-facing phrase "waiting for the database" does not appear in the current source. The closest current strings are the full-page "Loading operator dashboard" card and the live-page empty state "Waiting for the first live status document from the station."
- If the user can share the exact route and screenshot, that would confirm whether the complaint is about the live page specifically or about all route transitions.

## Next Research
- Validate actual browser behavior against a running Firebase-backed environment once apps/web/.env and an operator account are available.
- Measure callable latency for getStationDirectory, getAnalyticsSummary, and getEventHistory to separate UX issues from backend slowness.
- Check whether existing tests cover route transitions or only data shaping.
