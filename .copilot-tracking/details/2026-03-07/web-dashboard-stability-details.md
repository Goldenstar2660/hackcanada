<!-- markdownlint-disable-file -->

## Context References

* Plan: `.copilot-tracking/plans/2026-03-07/web-dashboard-stability-plan.instructions.md`
* Research: `.copilot-tracking/research/2026-03-07/web-dashboard-stability-research.md`
* Subagent research:
  * `.copilot-tracking/research/subagents/2026-03-07/web-dashboard-route-loading.md`
  * `.copilot-tracking/research/subagents/2026-03-07/backend-event-history-callable-failure.md`

## Phase Details

### Phase 1

Files:

* `apps/web/src/app/providers.tsx`

Work:

* Introduce a non-blocking navigation state.
* Preserve the previous render result while the next route resolves.
* Show a compact transition indicator only when a previous page exists.

Success criteria:

* Navigating between routes does not replace the entire page with the full-screen loading card.

### Phase 2

Files:

* `apps/web/src/pages/live-monitoring.tsx`

Work:

* Remove the awaited initial snapshot call from the route-loading path.
* Build the initial unavailable snapshot synchronously enough for first render and rely on the realtime subscription for updates.

Success criteria:

* The live page renders immediately and still updates from the realtime subscription.

### Phase 3

Files:

* `apps/web/src/lib/api/dashboard-gateway.ts`

Work:

* Cache station-directory requests within the gateway instance.
* Normalize incoming dashboard filters so scalar and array-like values are coerced to canonical arrays before request creation.

Success criteria:

* Station-directory fetches are reused across routes in one session.
* Event-history and analytics request builders receive canonical filter arrays.

### Phase 4

Files:

* `services/backend-functions/src/runtime/firebase-bridges.ts`
* `services/backend-functions/src/domain/validation.ts`

Work:

* Map `ValidationError` to Firebase `invalid-argument`.
* Add minimal scalar-array compatibility normalization for known filter-array properties before validation.

Success criteria:

* Bad callable inputs no longer surface as HTTP 500.
* Stale callers with single-string filters no longer break event-history requests.

### Phase 5

Validation:

* TypeScript checks on changed frontend and backend packages
* Workspace problems check on edited files
* Review pass against plan and spec
