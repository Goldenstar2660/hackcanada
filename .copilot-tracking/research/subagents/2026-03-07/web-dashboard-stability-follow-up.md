---
title: Web dashboard stability follow-up research
description: Ranked follow-up work after the 2026-03-07 dashboard stabilization pass
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - dashboard
  - stabilization
  - follow-up
  - testing
estimated_reading_time: 5
---

## Status

Complete

## Research scope

Review the current dashboard-stabilization artifacts and changed files, then identify the highest-value follow-up work based on impact, dependency order, and effort.

Reviewed inputs:

* [.copilot-tracking/research/2026-03-07/web-dashboard-stability-research.md](../../research/2026-03-07/web-dashboard-stability-research.md)
* [.copilot-tracking/plans/2026-03-07/web-dashboard-stability-plan.instructions.md](../../plans/2026-03-07/web-dashboard-stability-plan.instructions.md)
* [.copilot-tracking/reviews/2026-03-07/web-dashboard-stability-plan-review.md](../../reviews/2026-03-07/web-dashboard-stability-plan-review.md)
* [apps/web/src/app/providers.tsx](../../../../apps/web/src/app/providers.tsx)
* [apps/web/src/lib/api/dashboard-gateway.ts](../../../../apps/web/src/lib/api/dashboard-gateway.ts)
* [apps/web/src/pages/live-monitoring.tsx](../../../../apps/web/src/pages/live-monitoring.tsx)
* [services/backend-functions/src/runtime/firebase-bridges.ts](../../../../services/backend-functions/src/runtime/firebase-bridges.ts)
* [services/backend-functions/src/domain/validation.ts](../../../../services/backend-functions/src/domain/validation.ts)

## Key findings

* The stabilization changes are coherent and aligned with the spec. The main remaining risks are proof, rollback safety, and lifecycle cleanup rather than basic implementation mismatch.
* The review artifact still records one validation-environment gap: the direct Vite build path failed even though [apps/web/package.json](../../../../apps/web/package.json) expects `vite build` to work locally.
* The changed surfaces have little or no direct regression coverage. The workspace review artifacts recommend tests, and current file searches did not surface dedicated dashboard or callable-boundary test files for these changes.
* The backend compatibility work is intentionally temporary. Both the frontend gateway and backend validator now normalize stale scalar filter inputs, but no sunset criteria or telemetry were added.
* The dashboard still has known runtime-risk areas that were not fully exercised in this pass: coordinated web-plus-functions deployment, actual signed-in browser navigation under latency, and heavier comparison analytics fan-out.

## Recommended follow-up work

### 1. Add frontend regression tests for preserved-page navigation and live-monitoring hydration

Priority: P1

Rationale:

* [apps/web/src/app/providers.tsx](../../../../apps/web/src/app/providers.tsx) now keeps stale page content visible during route transitions, which is the core UX fix. That behavior is easy to regress during future router or auth changes.
* [apps/web/src/pages/live-monitoring.tsx](../../../../apps/web/src/pages/live-monitoring.tsx) now renders an unavailable snapshot first and relies on the realtime subscription to hydrate. That timing change also deserves explicit coverage.
* This is high impact and relatively contained work because the changed logic is local to the app shell and one page model.

### 2. Add backend boundary tests for callable validation mapping and scalar-array compatibility

Priority: P1

Rationale:

* [services/backend-functions/src/runtime/firebase-bridges.ts](../../../../services/backend-functions/src/runtime/firebase-bridges.ts) now maps `ValidationError` to `invalid-argument`, which materially changes the API contract observed by clients.
* [services/backend-functions/src/domain/validation.ts](../../../../services/backend-functions/src/domain/validation.ts) mutates known filter fields before validation. That is the right stabilization move, but it should be pinned down with focused tests so future validation refactors do not silently reintroduce HTTP 500 behavior.
* This is high impact, low-to-medium effort work because it does not require a full deployed environment.

### 3. Restore deterministic web build validation in the workspace

Priority: P2

Rationale:

* The review artifact explicitly leaves the Vite build path unresolved, which means the release path still lacks one production-style check.
* [apps/web/package.json](../../../../apps/web/package.json) declares a standard `vite build`, so the current failure points to environment or install-layout drift rather than intended app behavior.
* This should happen before any broader stabilization closeout because it affects confidence in every future frontend change, not only this task.

### 4. Run a coordinated runtime smoke validation of the deployed web app and backend functions together

Priority: P2

Rationale:

* The original event-history problem was most consistent with deployment skew or an alternate caller, and the current artifacts still describe that as a live possibility.
* The code now depends on web-side normalization in [apps/web/src/lib/api/dashboard-gateway.ts](../../../../apps/web/src/lib/api/dashboard-gateway.ts) and backend-side normalization plus error mapping in [services/backend-functions/src/domain/validation.ts](../../../../services/backend-functions/src/domain/validation.ts) and [services/backend-functions/src/runtime/firebase-bridges.ts](../../../../services/backend-functions/src/runtime/firebase-bridges.ts). Those pieces need to be verified together in a signed-in browser session.
* This is slightly higher effort because it depends on a working environment and deployable artifacts, but it closes the most important remaining uncertainty.

### 5. Define the exit plan for temporary compatibility and add minimal observability for dashboard request health

Priority: P3

Rationale:

* The current normalization in [apps/web/src/lib/api/dashboard-gateway.ts](../../../../apps/web/src/lib/api/dashboard-gateway.ts) and [services/backend-functions/src/domain/validation.ts](../../../../services/backend-functions/src/domain/validation.ts) is explicitly a rollout shim. Without a removal trigger, temporary compatibility tends to become permanent hidden behavior.
* The route UX is improved, but heavier data paths such as comparisons still fan out multiple analytics calls, and the artifacts recommend measuring callable latency rather than assuming the UX fix solved the whole problem.
* A small amount of logging or metrics around malformed filter inputs, station-directory reuse, and slow dashboard callables would support both cleanup and further performance work.

## Dependency order

1. Add frontend and backend regression tests.
2. Restore deterministic web build validation.
3. Run coordinated runtime smoke validation against the deployed stack.
4. Use the runtime evidence to set a removal date or threshold for the temporary compatibility path and target any remaining latency hotspots.

## Clarifying questions

* None at this time.