---
title: Backend And Dashboard Architecture Plan Phase 2 Validation
description: Validation of Implementation Phase 2 for BinBuddy backend ingress, operator access, aggregation, and dashboard APIs
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binbuddy
  - validation
  - phase 2
  - backend
  - dashboard
estimated_reading_time: 6
---

## Validation Summary

Status: Partial

Phase: 2

Plan through-line: Backend ingress, operator access, aggregation, and dashboard APIs

Overall assessment: Phase 2 establishes the intended TypeScript boundaries for ingress validation, operator authorization, station-directory joins, analytics rollups, and dashboard data-access seams, but it does not complete the Firebase-native runtime required by the plan, research, and spec. The implementation stops at SDK-agnostic factories, in-memory repositories, and transport abstractions rather than deployable Cloud Functions, Firestore-backed repositories, Storage-backed frame persistence, and Firestore-triggered materializers.

## Inputs

* Plan: `.copilot-tracking/plans/2026-03-07/backend-and-dashboard-architecture-plan.instructions.md`
* Changes log: `.copilot-tracking/changes/2026-03-07/backend-and-dashboard-architecture-changes.md`
* Research: `.copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md`
* Planning log: `.copilot-tracking/plans/logs/2026-03-07/backend-and-dashboard-architecture-log.md`
* Spec: `spec/binbuddy-spec.md`

## Phase Requirements

* Step 2.1: Partial.
  * Required behavior: authenticated HTTP Cloud Functions for event, live-status, and camera-frame ingress with validation, normalization, repository-only writes, latest-frame Storage overwrite behavior, and stale-feed metadata. Evidence: [plan](../../../plans/2026-03-07/backend-and-dashboard-architecture-plan.instructions.md#L71), [details](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L76), [details](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L88), [details](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L89), [research](../../../research/2026-03-07/backend-and-dashboard-research.md#L208), [research](../../../research/2026-03-07/backend-and-dashboard-research.md#L211), [spec](../../../../spec/binbuddy-spec.md#L109), [spec](../../../../spec/binbuddy-spec.md#L143), [spec](../../../../spec/binbuddy-spec.md#L144).
  * Verified implementation: ingress handlers validate and reject station mismatches in [ingest-event.ts](../../../../services/backend-functions/src/functions/ingest-event.ts#L28), [ingest-event.ts](../../../../services/backend-functions/src/functions/ingest-event.ts#L31), [ingest-live-status.ts](../../../../services/backend-functions/src/functions/ingest-live-status.ts#L21), [ingest-live-status.ts](../../../../services/backend-functions/src/functions/ingest-live-status.ts#L24), [ingest-camera-frame.ts](../../../../services/backend-functions/src/functions/ingest-camera-frame.ts#L64), and [ingest-camera-frame.ts](../../../../services/backend-functions/src/functions/ingest-camera-frame.ts#L67); event idempotency and live-status upserts are modeled in [in-memory.ts](../../../../services/backend-functions/src/firestore/repositories/in-memory.ts#L77), [in-memory.ts](../../../../services/backend-functions/src/firestore/repositories/in-memory.ts#L81), and [in-memory.ts](../../../../services/backend-functions/src/firestore/repositories/in-memory.ts#L124); single-frame camera retention and stale metadata are modeled in [ingest-camera-frame.ts](../../../../services/backend-functions/src/functions/ingest-camera-frame.ts#L72), [ingest-camera-frame.ts](../../../../services/backend-functions/src/functions/ingest-camera-frame.ts#L93), [ingest-camera-frame.ts](../../../../services/backend-functions/src/functions/ingest-camera-frame.ts#L103), and [latest-frame-storage.ts](../../../../services/backend-functions/src/storage/latest-frame-storage.ts#L77).
  * Gap: persistence and frame storage are only implemented through in-memory adapters in [in-memory.ts](../../../../services/backend-functions/src/firestore/repositories/in-memory.ts#L201) and [latest-frame-storage.ts](../../../../services/backend-functions/src/storage/latest-frame-storage.ts#L71), while [index.ts](../../../../services/backend-functions/src/index.ts#L1) only re-exports factories rather than deployed Cloud Function entry points.
* Step 2.2: Partial.
  * Required behavior: callable Cloud Functions for dashboard APIs, operator authorization, and direct Firestore listeners limited to authorized live-status reads. Evidence: [plan](../../../plans/2026-03-07/backend-and-dashboard-architecture-plan.instructions.md#L74), [details](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L103), [research](../../../research/2026-03-07/backend-and-dashboard-research.md#L208), [research](../../../research/2026-03-07/backend-and-dashboard-research.md#L210), [spec](../../../../spec/binbuddy-spec.md#L97), [spec](../../../../spec/binbuddy-spec.md#L98), [spec](../../../../spec/binbuddy-spec.md#L99), [spec](../../../../spec/binbuddy-spec.md#L100), [spec](../../../../spec/binbuddy-spec.md#L101), [spec](../../../../spec/binbuddy-spec.md#L102).
  * Verified implementation: callable handler factories enforce operator claims in [operator-auth.ts](../../../../services/backend-functions/src/auth/operator-auth.ts#L49), [get-analytics-summary.ts](../../../../services/backend-functions/src/functions/get-analytics-summary.ts#L16), [get-event-history.ts](../../../../services/backend-functions/src/functions/get-event-history.ts#L16), and [get-station-directory.ts](../../../../services/backend-functions/src/functions/get-station-directory.ts#L15); station-directory responses join the active rules preset in [contracts.ts](../../../../services/backend-functions/src/domain/contracts.ts#L15) and [query-service.ts](../../../../services/backend-functions/src/analytics/query-service.ts#L56); Firestore live-status reads are constrained in [firestore.rules](../../../../infra/firebase/firestore.rules#L4) and [firestore.rules](../../../../infra/firebase/firestore.rules#L15).
  * Gap: the web side still depends on abstract transport seams instead of concrete Firebase callable and listener bindings in [dashboard-api.ts](../../../../apps/web/src/lib/api/dashboard-api.ts#L15), [dashboard-api.ts](../../../../apps/web/src/lib/api/dashboard-api.ts#L25), [live-status.ts](../../../../apps/web/src/lib/firebase/live-status.ts#L16), and [live-status.ts](../../../../apps/web/src/lib/firebase/live-status.ts#L61).
* Step 2.3: Partial.
  * Required behavior: Firestore-triggered daily rollups and backend query services for analytics, station directory, and event history. Evidence: [plan](../../../plans/2026-03-07/backend-and-dashboard-architecture-plan.instructions.md#L76), [details](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L130), [details](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L141), [details](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L142), [details](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L152), [research](../../../research/2026-03-07/backend-and-dashboard-research.md#L208).
  * Verified implementation: rollup materializer and query composition exist in [daily-rollups.ts](../../../../services/backend-functions/src/analytics/materializers/daily-rollups.ts#L82), [daily-rollups.ts](../../../../services/backend-functions/src/analytics/materializers/daily-rollups.ts#L86), [query-service.ts](../../../../services/backend-functions/src/analytics/query-service.ts#L126), [query-service.ts](../../../../services/backend-functions/src/analytics/query-service.ts#L228), and [query-service.ts](../../../../services/backend-functions/src/analytics/query-service.ts#L257).
  * Gap: rollup generation is only invoked as an optional dependency from ingress in [ingest-event.ts](../../../../services/backend-functions/src/functions/ingest-event.ts#L43), not as a Firestore-triggered runtime entry point, and the rollup repository remains in-memory in [in-memory.ts](../../../../services/backend-functions/src/firestore/repositories/in-memory.ts#L201).
* Step 2.4: Partial.
  * Required behavior: backend package validation and workspace build after service exports are wired. Evidence: [plan](../../../plans/2026-03-07/backend-and-dashboard-architecture-plan.instructions.md#L78).
  * Verified implementation record: the changes log and planning log explicitly record a fallback validation path and acknowledge that Phase 2 remained SDK-agnostic in [changes](../../../changes/2026-03-07/backend-and-dashboard-architecture-changes.md#L104), [changes](../../../changes/2026-03-07/backend-and-dashboard-architecture-changes.md#L105), and [backend-and-dashboard-architecture-log.md](../../../plans/logs/2026-03-07/backend-and-dashboard-architecture-log.md#L26).
  * Gap: the phase was not validated against deployable Firebase integrations because those integrations were not implemented.

## Findings By Severity

### Critical

* Firebase-backed runtime entry points are not implemented, so Phase 2 does not satisfy the required Cloud Functions backend.
  * Why this matters: The spec requires Firebase Cloud Functions as the website backend and Pi publishing into Firebase for dashboard/live monitoring in [binbuddy-spec.md](../../../../spec/binbuddy-spec.md#L143) and [binbuddy-spec.md](../../../../spec/binbuddy-spec.md#L144). The Phase 2 plan and details require authenticated HTTP ingress, callable dashboard APIs, and Firestore-triggered materializers in [backend-and-dashboard-architecture-plan.instructions.md](../../../plans/2026-03-07/backend-and-dashboard-architecture-plan.instructions.md#L71), [backend-and-dashboard-architecture-plan.instructions.md](../../../plans/2026-03-07/backend-and-dashboard-architecture-plan.instructions.md#L74), [backend-and-dashboard-architecture-plan.instructions.md](../../../plans/2026-03-07/backend-and-dashboard-architecture-plan.instructions.md#L76), [backend-and-dashboard-architecture-details.md](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L76), [backend-and-dashboard-architecture-details.md](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L103), and [backend-and-dashboard-architecture-details.md](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L130).
  * Evidence: The backend surface exports library modules rather than deployed handlers in [index.ts](../../../../services/backend-functions/src/index.ts#L1), [index.ts](../../../../services/backend-functions/src/index.ts#L9), and [index.ts](../../../../services/backend-functions/src/index.ts#L12); the runtime is a custom abstraction in [runtime.ts](../../../../services/backend-functions/src/functions/runtime.ts#L1), [runtime.ts](../../../../services/backend-functions/src/functions/runtime.ts#L15), and [runtime.ts](../../../../services/backend-functions/src/functions/runtime.ts#L25); backend package dependencies only declare internal workspace packages in [package.json](../../../../services/backend-functions/package.json#L11), [package.json](../../../../services/backend-functions/package.json#L12), and [package.json](../../../../services/backend-functions/package.json#L13); the implementation record explicitly states that Phase 2 remained SDK-agnostic and deferred deployment wiring in [backend-and-dashboard-architecture-changes.md](../../../changes/2026-03-07/backend-and-dashboard-architecture-changes.md#L104), [backend-and-dashboard-architecture-changes.md](../../../changes/2026-03-07/backend-and-dashboard-architecture-changes.md#L105), and [backend-and-dashboard-architecture-log.md](../../../plans/logs/2026-03-07/backend-and-dashboard-architecture-log.md#L83).
* Firestore and Storage persistence are not implemented, so ingress and camera-feed writes are not backed by the data plane required by the product.
  * Why this matters: Phase 2 required repository-backed writes into Firestore and latest-frame camera persistence in Storage in [backend-and-dashboard-architecture-details.md](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L76), while live monitoring requires the current camera feed when active in [binbuddy-spec.md](../../../../spec/binbuddy-spec.md#L109).
  * Evidence: the only concrete repositories are in-memory in [in-memory.ts](../../../../services/backend-functions/src/firestore/repositories/in-memory.ts#L77), [in-memory.ts](../../../../services/backend-functions/src/firestore/repositories/in-memory.ts#L124), [in-memory.ts](../../../../services/backend-functions/src/firestore/repositories/in-memory.ts#L135), and [in-memory.ts](../../../../services/backend-functions/src/firestore/repositories/in-memory.ts#L201); the only concrete frame storage is in-memory in [latest-frame-storage.ts](../../../../services/backend-functions/src/storage/latest-frame-storage.ts#L71), [latest-frame-storage.ts](../../../../services/backend-functions/src/storage/latest-frame-storage.ts#L77), and [latest-frame-storage.ts](../../../../services/backend-functions/src/storage/latest-frame-storage.ts#L93).

### Major

* Analytics materialization is not implemented as a Firestore-triggered flow.
  * Why this matters: The plan requires Firestore-triggered materializers and retry-safe trigger handling in [backend-and-dashboard-architecture-details.md](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L130) and [backend-and-dashboard-architecture-details.md](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L152), and research selected the same architecture in [backend-and-dashboard-research.md](../../../research/2026-03-07/backend-and-dashboard-research.md#L208).
  * Evidence: materialization logic exists in [daily-rollups.ts](../../../../services/backend-functions/src/analytics/materializers/daily-rollups.ts#L82) and [daily-rollups.ts](../../../../services/backend-functions/src/analytics/materializers/daily-rollups.ts#L86), but it is only invoked opportunistically from the ingest handler in [ingest-event.ts](../../../../services/backend-functions/src/functions/ingest-event.ts#L43). No trigger entry point is exported from [index.ts](../../../../services/backend-functions/src/index.ts#L1).
* The dashboard transport layer is selected but not end-to-end integrated with Firebase callable functions or live listeners.
  * Why this matters: Phase 2 required callable Cloud Functions for operator APIs and direct Firestore listeners only for authorized live status in [backend-and-dashboard-architecture-details.md](../../../details/2026-03-07/backend-and-dashboard-architecture-details.md#L103) and [backend-and-dashboard-research.md](../../../research/2026-03-07/backend-and-dashboard-research.md#L210).
  * Evidence: the backend correctly checks operator claims in [operator-auth.ts](../../../../services/backend-functions/src/auth/operator-auth.ts#L49), [get-analytics-summary.ts](../../../../services/backend-functions/src/functions/get-analytics-summary.ts#L16), [get-event-history.ts](../../../../services/backend-functions/src/functions/get-event-history.ts#L16), and [get-station-directory.ts](../../../../services/backend-functions/src/functions/get-station-directory.ts#L15), and Firestore rules limit live-status reads in [firestore.rules](../../../../infra/firebase/firestore.rules#L14), [firestore.rules](../../../../infra/firebase/firestore.rules#L15), and [firestore.rules](../../../../infra/firebase/firestore.rules#L16). However, the web side still depends on a generic invoker and listener transport in [dashboard-api.ts](../../../../apps/web/src/lib/api/dashboard-api.ts#L15), [dashboard-api.ts](../../../../apps/web/src/lib/api/dashboard-api.ts#L25), [live-status.ts](../../../../apps/web/src/lib/firebase/live-status.ts#L16), and [live-status.ts](../../../../apps/web/src/lib/firebase/live-status.ts#L61).

### Minor

* No additional phase-related implementation files were identified outside the changes log inventory during workspace inspection.
  * Evidence: the files inspected for ingress, auth, repositories, analytics, dashboard API, and Firebase rules all correspond to entries already recorded in [backend-and-dashboard-architecture-changes.md](../../../changes/2026-03-07/backend-and-dashboard-architecture-changes.md#L32), [backend-and-dashboard-architecture-changes.md](../../../changes/2026-03-07/backend-and-dashboard-architecture-changes.md#L33), and [backend-and-dashboard-architecture-changes.md](../../../changes/2026-03-07/backend-and-dashboard-architecture-changes.md#L36).

## Coverage Assessment

Coverage is partial.

* Implemented and verified:
  * Device ingress validation, normalization, and station-identity checks are present in the HTTP handler factories.
  * Repository interfaces support idempotent event writes and live-status upserts.
  * Camera-feed metadata supports single latest-frame semantics and stale or inactive state handling.
  * Operator-claim checks, station-directory rules-preset joins, dashboard query composition, and Firestore live-status read restrictions are present.
* Missing or incomplete:
  * Deployable Firebase HTTP, callable, and trigger entry points.
  * Firestore-backed repositories and Storage-backed frame persistence.
  * Firestore-triggered analytics materialization.
  * Concrete Firebase callable and listener transports in the web data-access layer.

Coverage estimate: approximately 55 to 65 percent of the Phase 2 intent is implemented. The domain logic and boundaries exist, but the runtime and persistence work that makes the architecture operational are still missing.

## Clarifying Questions

None at this time.
