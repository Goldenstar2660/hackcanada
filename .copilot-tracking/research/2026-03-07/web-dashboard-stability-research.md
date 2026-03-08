<!-- markdownlint-disable-file -->

## Scope

Investigate the current Binsight web dashboard state across frontend and backend, determine whether the dashboard behavior matches the spec, and fix the confirmed issues around blocking page transitions and broken event-history loading.

## User-Observed Problems

* Navigating between dashboard pages shows a noticeable blocking loading screen.
* Some pages fail to load.
* `getEventHistory` returns HTTP 500 with `Validation failed at eventHistoryQuery.stationIds`.

## Source Of Truth

* [spec/binsight-spec.md](../../../spec/binsight-spec.md)
* [.github/instructions/source-of-truth.instructions.md](../../../.github/instructions/source-of-truth.instructions.md)
* Repository memory confirms the intended dashboard architecture: direct Firestore listeners for live state and backend APIs for analytics and filtered history.

## Key Findings

* The current browser app uses route-level async rendering. Every route transition sets the whole page back to a loading state before awaiting all destination data.
* That global gate lives in `apps/web/src/app/providers.tsx`, so any backend latency becomes a full-screen route transition delay.
* The live-monitoring route unnecessarily blocks navigation on the first Firestore snapshot even though the page already supports an in-page empty state for missing live data.
* The spec requires live monitoring, event history, and analytics visibility. It does not require blocking route changes while the app waits on Firestore or backend responses.
* The deployed `getEventHistory` failure is caused by request validation at the callable boundary. `stationIds` is arriving in an invalid shape for at least one caller.
* The current frontend source already builds `stationIds` as `string[] | undefined`, so the likely runtime problem is deployment skew or another caller. Even so, the backend currently reports validation failures as `internal`, which incorrectly surfaces client input errors as HTTP 500.

## Selected Approach

1. Keep the last successfully rendered page visible during route transitions and show only a small transition indicator instead of a full-page loading state.
2. Stop blocking the live-monitoring route on the initial Firestore snapshot. Render an initial unavailable snapshot immediately and let the live subscription update the page after mount.
3. Improve backend callable error mapping so `ValidationError` becomes Firebase `invalid-argument` instead of `internal`.
4. Add a temporary compatibility normalization step for callable filter arrays so stale callers sending scalar values do not break event-history loading during rollout.
5. Cache station-directory fetches per signed-in browser session to reduce repeated backend calls across routes.

## Alternatives Considered

* Leave the backend strict and fix only the deployed caller.
  Rejected because it does not address the immediate production breakage and still leaves bad client input reported as HTTP 500.
* Rebuild the dashboard around per-page Suspense or a larger data-layer refactor.
  Rejected because the current task is a targeted stabilization pass.
* Remove all loading states.
  Rejected because the initial auth boot and first page load still need explicit feedback.

## Expected File Changes

* `apps/web/src/app/providers.tsx`
* `apps/web/src/lib/api/dashboard-gateway.ts`
* `apps/web/src/pages/live-monitoring.tsx`
* `services/backend-functions/src/runtime/firebase-bridges.ts`
* `services/backend-functions/src/domain/validation.ts`
* Possibly related tests or validation artifacts if needed

## Success Criteria

* Route changes no longer blank the whole dashboard behind a blocking loader after the initial load.
* Live monitoring renders immediately, even when no live document is present yet.
* Event-history pages load successfully with current frontend filters.
* Malformed callable filter input no longer produces HTTP 500 for validation failures.
* The changes remain aligned with the spec and existing hybrid dashboard architecture.
