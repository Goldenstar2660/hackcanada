<!-- markdownlint-disable-file -->

# Web Dashboard Stability Plan

## Overview And Objectives

User requirement source: investigate the current state of the web dashboard, determine whether frontend and backend behavior works according to the spec, and fix anything that is broken, especially the blocking loading screen and event-history failures.

Derived objectives:

* Preserve the current hybrid architecture: direct Firestore listeners for live state, backend APIs for analytics and history.
* Remove unnecessary route-level blocking during navigation.
* Restore event-history behavior for stale or mismatched callers without weakening the canonical contracts more than necessary.
* Improve backend error reporting so bad client input is surfaced correctly.

## Context Summary

Relevant instructions and sources:

* `.github/instructions/source-of-truth.instructions.md`
* `spec/binsight-spec.md`
* Markdown and writing-style instructions for tracking artifacts
* Repository memory in `/memories/repo/binbuddy-architecture-facts.md`
* Research documents under `.copilot-tracking/research/2026-03-07/` and `.copilot-tracking/research/subagents/2026-03-07/`

## Implementation Checklist

### Phase 1: Patch frontend navigation behavior <!-- parallelizable: false -->

- [x] Update `apps/web/src/app/providers.tsx` so route transitions keep the last successful page visible.
- [x] Add a compact transition indicator instead of reusing the full-screen loading state for every navigation.
- [x] Keep the full-screen loading state only for initial auth boot or first page load when no route content exists yet.

### Phase 2: Patch live-monitoring data flow <!-- parallelizable: true -->

- [x] Update `apps/web/src/pages/live-monitoring.tsx` to render immediately with an unavailable snapshot.
- [x] Keep the existing subscription effect as the mechanism that hydrates live data after mount.

### Phase 3: Patch dashboard data gateway <!-- parallelizable: true -->

- [x] Update `apps/web/src/lib/api/dashboard-gateway.ts` to cache station-directory requests per signed-in session.
- [x] Add a filter-normalization compatibility shim so scalar filter values are coerced to arrays before building event-history and analytics requests.

### Phase 4: Patch backend callable error handling <!-- parallelizable: true -->

- [x] Update `services/backend-functions/src/runtime/firebase-bridges.ts` to map `ValidationError` to Firebase `invalid-argument`.
- [x] Update backend validation or normalization helpers only as needed to support temporary scalar-to-array compatibility for filter inputs.

### Phase 5: Validate behavior <!-- parallelizable: false -->

- [x] Run targeted TypeScript and error checks for the edited frontend and backend files.
- [x] Run available workspace validation commands that cover the changed surfaces.
- [x] Record any residual deployment-only risks in the review artifacts.

## Planning Log Reference

* `.copilot-tracking/plans/logs/2026-03-07/web-dashboard-stability-log.md`

## Dependencies

* Research artifacts under `.copilot-tracking/research/2026-03-07/`
* Subagent findings under `.copilot-tracking/research/subagents/2026-03-07/`
* Existing contracts in `packages/contracts/src/index.ts`

## Success Criteria

* Dashboard route transitions are no longer globally blocked after initial load.
* The live-monitoring route can render without awaiting the first Firestore snapshot.
* Event-history requests accept both canonical array filters and temporary scalar compatibility inputs.
* Validation failures are reported as `invalid-argument`, not `internal`.
* Edited files compile without introducing new relevant errors.
