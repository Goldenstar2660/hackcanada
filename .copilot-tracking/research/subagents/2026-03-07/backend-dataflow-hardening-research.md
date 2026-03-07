---
title: Backend Dataflow Hardening Research
description: Audit of the merged Firebase backend, Firestore integration, contracts alignment, and cloud data flow for the Binsight demo
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - firebase
  - firestore
  - backend
  - contracts
estimated_reading_time: 12
---

## Research scope

* Audit the current merged state of the Firebase backend, Firestore integration, shared contracts usage, and cloud data flow for the Binsight demo
* Verify implemented backend functions, Firestore integration, ingestion, live status, and analytics surfaces
* Determine whether the backend is integrated correctly with the contracts and spec
* Identify missing endpoints, ingestion paths, dependencies, infra or emulator setup gaps, and validation blockers
* Identify what remains to be wired from station events and live status into Firebase and dashboard-facing reads
* Recommend the backend and data-flow hardening approach for the current cycle

## Status

* State: Complete
* Evidence sources:
  * `spec/binsight-spec.md`
  * `services/backend-functions/src/**`
  * `apps/web/src/**`
  * `devices/pi-station/src/binsight_station/**`
  * `infra/firebase/**`
  * package manifests and README files
  * existing research notes under `.copilot-tracking/research/2026-03-07/` and `.copilot-tracking/research/subagents/2026-03-07/`

## Implemented surfaces

### Firebase backend functions currently implemented

The merged backend code implements the intended Firebase surface in TypeScript, not just placeholders.

Implemented functions:

* HTTP ingestion:
  * `ingestEvent`
  * `ingestLiveStatus`
  * `ingestCameraFrame`
* Callable dashboard reads:
  * `getAnalyticsSummary`
  * `getEventHistory`
  * `getStationDirectory`
* Firestore trigger:
  * `materializeAnalyticsOnDisposalEvent`

Evidence:

* `services/backend-functions/src/index.ts`
* `services/backend-functions/src/runtime/firebase-runtime.ts`
* `services/backend-functions/src/functions/ingest-event.ts`
* `services/backend-functions/src/functions/ingest-live-status.ts`
* `services/backend-functions/src/functions/ingest-camera-frame.ts`
* `services/backend-functions/src/functions/get-analytics-summary.ts`
* `services/backend-functions/src/functions/get-event-history.ts`
* `services/backend-functions/src/functions/get-station-directory.ts`

### Firestore integration currently implemented

The backend already defines a concrete Firestore model and repository layer.

Collections modeled in code:

* `stations`
* `rulesPresets`
* `stationLiveStatus`
* `disposalEvents`
* `analyticsMaterializationLedger`
* `analyticsStationDay`
* `analyticsFloorDay`
* `analyticsBuildingDay`
* `analyticsExperimentDay`

Implemented repository capabilities:

* `DisposalEventRepository`
  * create-or-deduplicate event writes
  * event history listing with limited Firestore query pushdown
* `LiveStatusRepository`
  * upsert live station status
  * camera-feed metadata patching
* `StationRepository`
  * list stations
  * fetch station metadata and rules presets
* `AnalyticsRollupRepository`
  * upsert and list day rollups

Evidence:

* `services/backend-functions/src/firestore/collections.ts`
* `services/backend-functions/src/firestore/repositories/types.ts`
* `services/backend-functions/src/firestore/repositories/firestore.ts`

### Analytics surfaces currently implemented

The backend implements daily rollup materialization and dashboard read shaping for the spec metrics.

Implemented analytics behaviors:

* station, floor, building, and experiment day rollups
* total attempts
* total correct sorts
* first-try correct rate
* participation / compliance score
* top contamination items
* worst times of day
* bin purity by hour or day
* floor and building leaderboards
* chart series for core totals and rates

Evidence:

* `services/backend-functions/src/analytics/materializers/daily-rollups.ts`
* `services/backend-functions/src/analytics/mappers/event-rollup.ts`
* `services/backend-functions/src/analytics/query-service.ts`
* `packages/contracts/src/index.ts`

### Dashboard-facing read surfaces currently implemented in code

The web package contains page loaders, query shaping, and gateway abstractions for all dashboard pages required by the spec.

Implemented page-level surfaces:

* stations directory
* station detail
* live monitoring
* event history
* analytics summary
* comparisons

Evidence:

* `apps/web/src/pages/stations.tsx`
* `apps/web/src/pages/station-detail.tsx`
* `apps/web/src/pages/live-monitoring.tsx`
* `apps/web/src/pages/event-history.tsx`
* `apps/web/src/pages/analytics.tsx`
* `apps/web/src/pages/comparisons.tsx`
* `apps/web/src/lib/api/dashboard-api.ts`
* `apps/web/src/lib/api/dashboard-gateway.ts`
* `apps/web/src/lib/firebase/live-status.ts`
* `apps/web/src/lib/firebase/live-monitoring.ts`

## Contracts and spec alignment

### What is aligned correctly

The backend is strongly aligned with the shared contracts and with the spec at the boundary level.

Aligned behaviors:

* shared TypeScript contracts define the canonical disposal event, live status, station metadata, rules presets, and analytics DTOs
* backend validation enforces those contract shapes before persistence or response shaping
* backend normalization correctly maps device ingress snake_case into canonical camelCase
* the backend analytics surface covers the metrics explicitly named by the spec
* the Firestore live-status collection is intentionally exposed for operator reads only, matching the live-monitoring requirement

Evidence:

* `packages/contracts/src/index.ts`
* `packages/contracts/schemas/domain/disposal-event.schema.json`
* `packages/contracts/schemas/domain/live-station-status.schema.json`
* `services/backend-functions/src/domain/validation.ts`
* `services/backend-functions/src/domain/normalization.ts`
* `infra/firebase/firestore.rules`

### Where alignment breaks in the merged state

The end-to-end integration is not aligned yet even though the contracts and backend handlers are.

Key breakpoints:

* The Pi runtime still publishes local canonical payloads through a no-op seam instead of authenticated device ingress payloads to Firebase.
* The dashboard code defines interfaces for callable reads and Firestore subscriptions, but no concrete Firebase client implementation is present.
* There is no repository evidence of seeded `stations` documents or Firestore-seeded `rulesPresets` documents, so the backend read surfaces do not have guaranteed backing data.
* The live-status implementation in the Pi code has drifted away from both `main.py` and the tests.

Evidence:

* `devices/pi-station/src/binsight_station/publishers.py`
* `devices/pi-station/src/binsight_station/events.py`
* `devices/pi-station/src/binsight_station/live_status.py`
* `devices/pi-station/src/binsight_station/main.py`
* `devices/pi-station/tests/test_runtime_serialization.py`
* `devices/pi-station/tests/test_smoke.py`
* `apps/web/package.json`

## Missing wiring and blockers

### Missing ingestion wiring from station to Firebase

This is the main demo blocker.

Current state:

* `PublicationAdapter` defaults to no-op sinks.
* `publish_disposal_event()` uses `event.to_payload()` instead of the backend ingress shape `event.to_ingress_payload()`.
* `publish_live_status()` uses `status.to_payload()` instead of `status.to_ingress_payload()`.
* The Pi runtime never calls `ingestEvent`, `ingestLiveStatus`, or `ingestCameraFrame` over HTTP.
* The only concrete cloud-auth helper found on the Pi side is `BackendIngressIdentity.build_headers()`, but it is not wired into a publisher.

Impact:

* No disposal events reach Firestore.
* No live station status reaches Firestore.
* No analytics rollups can materialize from actual station activity.
* The live dashboard cannot show real station state.

Evidence:

* `devices/pi-station/src/binsight_station/publishers.py`
* `devices/pi-station/src/binsight_station/events.py`
* `devices/pi-station/src/binsight_station/live_status.py`
* `devices/pi-station/src/binsight_station/esp_client.py`

### Pi live-status implementation drift

The merged Pi runtime has a concrete internal inconsistency.

Observed drift:

* `main.py` calls `LiveStatusPublisher.build_status()` with `device_health` and `session_state_override` arguments.
* `live_status.py` does not define that `build_status()` signature.
* `live_status.py` contains duplicated `DeviceHealth` and `LatestEventSummary` class definitions.
* The tests expect `status.to_payload()` and canonical `sessionState` fields, but `live_status.py` only exposes `to_ingress_payload()` and a different internal shape.

Impact:

* The station-to-cloud boundary is not stable enough to harden without first reconciling the live-status model.

Evidence:

* `devices/pi-station/src/binsight_station/main.py`
* `devices/pi-station/src/binsight_station/live_status.py`
* `devices/pi-station/tests/test_runtime_serialization.py`
* `devices/pi-station/tests/test_smoke.py`

### Missing dashboard Firebase client integration

The dashboard-facing read model exists, but the actual transport layer is not wired.

Missing pieces:

* no Firebase web SDK dependency in `apps/web/package.json`
* no callable invoker implementation for `getAnalyticsSummary`, `getEventHistory`, or `getStationDirectory`
* no Firestore listener transport implementation for live station documents
* no Storage URL resolver implementation for camera frames
* no operator auth/session bootstrap in the web package

Impact:

* The web UI cannot currently call backend functions or subscribe to live station status from Firebase.

Evidence:

* `apps/web/package.json`
* `apps/web/src/lib/api/dashboard-api.ts`
* `apps/web/src/lib/firebase/live-status.ts`
* `apps/web/src/lib/firebase/live-monitoring.ts`

### Missing Firestore seed data for directory and analytics

The backend depends on `stations` and `rulesPresets`, but the repository does not include a concrete Firestore seeding path for them.

Observed state:

* there is one versioned rules preset asset in `packages/rules/presets/demo-canada-ottawa.1.0.0.json`
* there is no repository evidence of seed scripts or fixture documents for `stations`
* there is no backend bootstrap that loads rules preset assets into Firestore

Impact:

* `getStationDirectory()` has no guaranteed data source
* analytics materialization can fail because `daily-rollups.ts` requires station metadata for each event
* the dashboard filters, station detail, comparisons, and leaderboard scopes cannot be validated end to end

Evidence:

* `packages/rules/presets/demo-canada-ottawa.1.0.0.json`
* `services/backend-functions/src/analytics/materializers/daily-rollups.ts`
* `services/backend-functions/src/analytics/query-service.ts`
* `infra/firebase/firestore.indexes.json`

### Camera feed path exists but is not demo-ready

There is a backend ingestion path for latest camera frames, but it is not wired and has at least one implementation issue.

Observed gaps:

* the Pi runtime does not publish camera frames to `ingestCameraFrame`
* `FirebaseStorageLatestCameraFrameStorage.writeLatestFrame()` saves the incoming base64 string directly instead of decoding it into image bytes
* `getLatestFrame()` in the Firebase storage adapter always returns `null`
* there is no web-side storage URL resolver
* there are no storage rules or storage emulator settings in `infra/firebase/firebase.json`

Impact:

* the spec requirement to show the current camera feed when active is not wired end to end
* even if the ingress endpoint is called, the stored image object is likely not usable as an actual JPEG payload in its current implementation

Evidence:

* `services/backend-functions/src/functions/ingest-camera-frame.ts`
* `services/backend-functions/src/storage/firebase-storage.ts`
* `services/backend-functions/src/storage/latest-frame-storage.ts`
* `infra/firebase/firebase.json`

### Infra, dependency, and emulator setup gaps

The Firebase infra files exist, but local operability is incomplete.

Observed gaps:

* no `firebase-tools` dependency or workspace script for emulator or deploy workflows
* no documented setup for `BINSIGHT_DEVICE_CREDENTIALS_JSON`
* no documented setup for `BINSIGHT_STORAGE_BUCKET`
* no documented operator custom-claims provisioning path for callable access and live Firestore reads
* backend README still describes Firebase runtime wiring and emulator support as deferred even though partial runtime code now exists
* backend `openapi/` contains only a README, not actual API definitions
* there is no backend test suite in `services/backend-functions/`

Evidence:

* `package.json`
* `services/backend-functions/package.json`
* `services/backend-functions/README.md`
* `services/backend-functions/openapi/README.md`
* `infra/firebase/firebase.json`

### Query and validation limitations that matter for hardening

These are not immediate spec violations for a one-station demo, but they are real hardening issues.

Observed limitations:

* `getEventHistory()` can under-fetch because Firestore query pushdown only handles one `stationId` and one `attemptResult`; broader filters are applied in memory after a limited query window
* current indexes only cover a narrow subset of event and station query shapes
* `getAnalyticsSummary()` loads all rollups and filters them in memory
* there is no explicit backend test coverage for normalization, repository queries, or callable auth behavior

Impact:

* filtered history can become incomplete once more data exists
* event-history validation for comparisons across multiple stations or result filters is not robust yet
* current analytics implementation is fine for the demo scale but should be treated as demo-grade

Evidence:

* `services/backend-functions/src/firestore/repositories/firestore.ts`
* `services/backend-functions/src/analytics/query-service.ts`
* `infra/firebase/firestore.indexes.json`

## What remains to be wired

### Station events and live status into Firebase

Still required:

* implement a real Pi cloud publisher module that posts to `ingestLiveStatus`
* implement a real Pi cloud publisher module that posts disposal events to `ingestEvent`
* attach backend device-auth headers on every Pi request
* decide whether live status should publish on every phase transition only or also on a heartbeat interval
* publish camera frames during active sessions if live monitoring must show images in the demo

### Firebase to dashboard-facing reads

Still required:

* implement a Firebase callable invoker for the three dashboard callables
* implement operator auth/session handling in the web app
* implement Firestore subscription transport for `stationLiveStatus/{stationId}`
* implement camera frame URL resolution from Storage metadata
* seed at least one station document and one rules preset document so the station directory and analytics scopes have data

## Recommended hardening approach for this cycle

Use a thin-slice, one-station Firebase integration hardening pass rather than expanding scope.

### Recommended approach

1. Treat the existing backend handlers and contracts as the canonical cloud boundary.
2. Add one dedicated Pi HTTP publisher seam that sends only the backend ingress payloads and auth headers.
3. Reconcile the Pi live-status and event projection code so the runtime, tests, and backend ingress shapes agree.
4. Seed one demo station document and one rules preset document into Firestore.
5. Add a minimal web Firebase adapter layer for callable reads plus live Firestore subscription.
6. Fix the camera-frame storage path only if the live camera feed is required for this cycle's demo; otherwise defer image transport and keep live status text-only.
7. Add minimal emulator and environment documentation so the demo can be reproduced locally.

### Exact implementation order

1. Pi publisher hardening

* create a dedicated cloud publisher that uses `BackendIngressIdentity.build_headers()`
* send `DisposalEvent.to_ingress_payload()` to `ingestEvent`
* send `LiveStatus.to_ingress_payload()` to `ingestLiveStatus`
* keep local canonical projections separate from ingress serialization

2. Pi contract reconciliation

* make `live_status.py` match `main.py`, tests, and backend normalization expectations
* remove duplicated class definitions
* keep one authoritative live-status projection model and one ingress serializer

3. Firestore bootstrap

* seed `rulesPresets/demo-canada-ottawa`
* seed one `stations/demo-station-001` document that references that preset
* document `BINSIGHT_DEVICE_CREDENTIALS_JSON`, `BINSIGHT_STORAGE_BUCKET`, and operator claim requirements

4. Dashboard transport wiring

* add a Firebase web SDK dependency
* implement callable invoker wiring for analytics, history, and directory reads
* implement Firestore document subscription for live status
* add an initial operator-session strategy for demo use

5. Camera-feed decision

* if the demo requires image frames, fix base64 decoding in the backend storage adapter and add a web frame resolver
* if the demo can succeed with live status only, defer image transport and avoid half-wired storage complexity this cycle

### Why this is the right scope

This cycle should harden the cloud data path that the spec already defines, not redesign it.

Reasons:

* the backend contract and analytics model are already substantially implemented
* the main missing work is transport wiring and seed data, not business logic discovery
* one-station demo scope does not need scalable query architecture yet
* trying to solve full production-grade auth, indexing, and stream semantics now would slow the actual demo integration path

## Open questions

These are the only questions left open because the spec does not choose among the options.

* Should the live camera feed be delivered through Firebase Storage URLs, through a backend proxy, or be deferred entirely for this cycle if text-only live monitoring is acceptable?
* For operator-facing live monitoring, should the web app read `stationLiveStatus` directly from Firestore as the current code shape assumes, or should all reads be forced through backend functions for a stricter single-backend model?
* What is the intended demo auth posture for operators: real Firebase Auth custom claims, emulator-only permissive setup, or a temporary demo operator account bootstrap?

## Next research

* No additional research is required to choose the current cycle hardening path.
* Follow-on research would only be useful after implementation changes land and new validation evidence exists.