---
title: Backend Feasibility Audit Research
description: Research audit of backend, contract, and live-data feasibility for wiring the Stitch-designed UI in the Hack Canada workspace.
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: reference
keywords:
  - backend
  - contracts
  - analytics
  - live status
  - stitch
estimated_reading_time: 10
---

## Research scope

This subagent research audits the current backend and shared-contract surface that could support the Stitch-designed UI in this workspace.

Requested focus:

1. Inspect `services/backend-functions/src` capabilities relevant to dashboard, analytics, devices, device details, auth, and live status.
2. Inspect shared contract and schema coverage in `packages/contracts` and `packages/analytics`.
3. Compare what data and endpoints already exist versus what the Stitch pages appear to need.
4. Record exact file references with line numbers.
5. Identify gaps that require backend, contract, or product work before wiring.

No applicable `.github/agents/**/researcher-subagent.agent.md` file exists in this workspace. The audit therefore follows the repo instructions and the product source of truth in `spec/binsight-spec.md`.

## Status

Complete.

## Executive summary

The current backend is already viable for a meaningful first pass of the operator UI. The available backend surface is narrow but coherent: three HTTP ingest handlers for device telemetry, three callable read handlers for analytics and operator data, and one Firestore-triggered analytics materializer. The shared contracts are stronger than the backend breadth. `packages/contracts` already defines canonical shapes for station metadata, live status, disposal events, analytics queries and summaries, event history, and station directory responses.

The best-supported Stitch areas today are:

* analytics overview and comparisons
* station list and station detail metadata
* single-station live monitoring built on direct Firestore reads

The least-supported Stitch areas today are:

* device registration and settings workflows
* richer multi-station live-status aggregation for the devices page
* camera-frame rendering as a first-class contract
* AI-generated insight copy
* social login buttons shown in the Stitch login comp

There are also two notable correctness risks:

* operator authorization is effectively too permissive because any authenticated user with a non-empty `uid` passes the operator gate
* event-history pagination appears inconsistent because the query orders by `timestamp` but uses an `eventId` as the returned cursor

## Backend capability inventory

### Public backend surface

The Firebase runtime currently exports exactly these deployable handlers:

* `ingestEvent` HTTP handler: `services/backend-functions/src/runtime/firebase-runtime.ts:36-41`
* `ingestLiveStatus` HTTP handler: `services/backend-functions/src/runtime/firebase-runtime.ts:43-48`
* `ingestCameraFrame` HTTP handler: `services/backend-functions/src/runtime/firebase-runtime.ts:50-56`
* `getAnalyticsSummary` callable: `services/backend-functions/src/runtime/firebase-runtime.ts:58-62`
* `getEventHistory` callable: `services/backend-functions/src/runtime/firebase-runtime.ts:64-68`
* `getStationDirectory` callable: `services/backend-functions/src/runtime/firebase-runtime.ts:70-74`
* `materializeAnalyticsOnDisposalEvent` Firestore trigger: `services/backend-functions/src/runtime/firebase-runtime.ts:76-79`

This is aligned with the spec's split of device ingress plus dashboard reads, but it also means there are no backend routes yet for device registration, station mutation, export generation, rules editing, or operator account administration.

### Device ingress

Device authentication is custom header-based and checks device ID, station ID, timestamp skew, and a derived signature. Evidence:

* header extraction and signature validation: `services/backend-functions/src/auth/device-auth.ts:62-103`
* missing header, unknown credential, skew, and signature failure branches: `services/backend-functions/src/auth/device-auth.ts:74-97`

Event ingestion is already canonicalized and can fan out into analytics materialization:

* handler entry and device-station ownership check: `services/backend-functions/src/functions/ingest-event.ts:22-31`
* deterministic event ID construction: `services/backend-functions/src/functions/ingest-event.ts:17-20`
* analytics materialization on first create: `services/backend-functions/src/functions/ingest-event.ts:35-43`

Live-status ingestion already normalizes device payloads into the operator-facing model:

* handler and station ownership check: `services/backend-functions/src/functions/ingest-live-status.ts:15-28`
* repository upsert and returned camera-feed status summary: `services/backend-functions/src/functions/ingest-live-status.ts:28-34`

Camera-frame ingestion exists and updates live-status camera metadata, but it is still a storage-centric path rather than a UI-ready image-delivery contract:

* frame payload validation including `stale_after_ms`: `services/backend-functions/src/functions/ingest-camera-frame.ts:17-18`, `services/backend-functions/src/functions/ingest-camera-frame.ts:47-52`
* inactive-feed path clears storage and patches live status: `services/backend-functions/src/functions/ingest-camera-frame.ts:72-88`
* active-feed path writes the latest frame and patches live status metadata: `services/backend-functions/src/functions/ingest-camera-frame.ts:93-103`

### Canonical normalization and live-state mapping

The backend already bridges device payload phases to the dashboard session model:

* phase mapping from device values to live dashboard states: `services/backend-functions/src/domain/normalization.ts:22-28`
* canonical live-status normalization: `services/backend-functions/src/domain/normalization.ts:105-119`
* canonical envelope creation for live status: `services/backend-functions/src/domain/normalization.ts:123-129`

This gives the UI a useful, normalized state model now: `idle`, `detecting-person`, `guiding-user`, `waiting-for-disposal`, `syncing`, and `error`.

### Analytics and read models

The analytics query service is the strongest backend area.

Supported filtering and result assembly:

* filtered station scope resolution: `services/backend-functions/src/analytics/query-service.ts:118-121`
* grouped rollup assembly: `services/backend-functions/src/analytics/query-service.ts:140-161`
* leaderboard assembly: `services/backend-functions/src/analytics/query-service.ts:163-165`
* optional response sections for contamination, worst times, bin purity, leaderboard, and chart series: `services/backend-functions/src/analytics/query-service.ts:172-191`

Station directory support is also solid:

* station directory handler call: `services/backend-functions/src/functions/get-station-directory.ts:13-16`
* directory filter facets for buildings, floors, locations, signage variants, and layout variants: `services/backend-functions/src/analytics/query-service.ts:243-255`
* direct live-status collection path surfaced to the client: `services/backend-functions/src/analytics/query-service.ts:257`

Event history exists, but pagination semantics need review:

* event-history response sets `nextCursor` from the final `eventId`: `services/backend-functions/src/analytics/query-service.ts:207-224`
* repository query orders by `timestamp`: `services/backend-functions/src/firestore/repositories/firestore.ts:155-157`
* repository pagination uses `startAfter(query.cursor)`: `services/backend-functions/src/firestore/repositories/firestore.ts:169`

That combination suggests cursor mismatch because the cursor returned is an `eventId`, but the Firestore query is ordered by `timestamp`.

### Rollups and storage

Analytics rollups already materialize at several scopes:

* rollup collections: `services/backend-functions/src/firestore/collections.ts:7-10`
* direct operator live read collection: `services/backend-functions/src/firestore/collections.ts:16`
* station, floor, building, and experiment seed creation: `services/backend-functions/src/analytics/materializers/daily-rollups.ts:24-79`
* application of each disposal event to every seeded rollup: `services/backend-functions/src/analytics/materializers/daily-rollups.ts:82-96`

Latest-frame storage exists, but the read path is incomplete:

* camera frame records include `publicUrl`: `services/backend-functions/src/storage/latest-frame-storage.ts:7-13`
* in-memory storage synthesizes `storage://...` URLs: `services/backend-functions/src/storage/latest-frame-storage.ts:36-37`, `services/backend-functions/src/storage/latest-frame-storage.ts:75-85`
* Firebase storage writer can emit `file.publicUrl()`: `services/backend-functions/src/storage/firebase-storage.ts:13-31`
* Firebase storage readback is not implemented and returns `null`: `services/backend-functions/src/storage/firebase-storage.ts:42-43`

## Shared contract and schema coverage

### Canonical contract package

`packages/contracts` is the canonical shared boundary and already covers most of the needed operator data shapes.

Core live and station models:

* `LiveStationStatus` with `currentDetectedItem`, `currentDisposalMethod`, `currentHandZone`, `deviceHealth`, `latestEvent`, and `cameraFeed`: `packages/contracts/src/index.ts:67-77`
* `StationMetadata` with building, floor, location, signage, layout, and active rules preset: `packages/contracts/src/index.ts:114-125`

Analytics and history models:

* `AnalyticsQuery` filter and comparison support: `packages/contracts/src/index.ts:159-173`
* `AnalyticsSummary` totals, grouped results, contamination, worst times, bin purity, leaderboard, and chart series: `packages/contracts/src/index.ts:183-227`
* `EventHistoryQuery`, `EventHistoryEntry`, and `EventHistoryResponse`: `packages/contracts/src/index.ts:228-254`
* `StationDirectoryResponse` including `liveStatusCollectionPath`: `packages/contracts/src/index.ts:274-278`

Device ingress models also already exist in the same package, including camera-feed ingress: `packages/contracts/src/index.ts:280-322`.

Schema coverage matches the TypeScript models well:

* analytics summary schema: `packages/contracts/schemas/analytics/analytics-summary.schema.json:1-194`
* analytics query schema: `packages/contracts/schemas/analytics/analytics-query.schema.json:1-113`
* live station status schema: `packages/contracts/schemas/domain/live-station-status.schema.json:1-157`
* disposal event schema: `packages/contracts/schemas/domain/disposal-event.schema.json:1-74`
* station metadata schema: `packages/contracts/schemas/domain/station-metadata.schema.json:1-133`
* rules preset schema: `packages/contracts/schemas/domain/rules-preset.schema.json:1-101`

### Analytics package coverage

`packages/analytics` does not currently add meaningful shared behavior. It only exports a minimal `AnalyticsMetricDefinition` interface: `packages/analytics/src/index.ts:1-3`.

That means the real shared contract surface is effectively all in `packages/contracts`, not `packages/analytics`.

## UI-to-backend fit

### Dashboard and analytics

The analytics Stitch page asks for:

* headline KPI cards: `spec/ui/analytics/code.html:79-101`
* an export action: `spec/ui/analytics/code.html:64`
* a comparison tool: `spec/ui/analytics/code.html:104-171`
* AI-powered insights copy: `spec/ui/analytics/code.html:173-191`
* classification trends over time: `spec/ui/analytics/code.html:194-260`

The backend can already support most of the data side of that page:

* KPI totals: `packages/contracts/src/index.ts:175-181`, `services/backend-functions/src/analytics/query-service.ts:169-171`
* grouped comparisons by building, location, signage variant, layout variant, station, and day: `packages/contracts/src/index.ts:147-173`, `apps/web/src/lib/query/dashboard-query.ts:224-287`
* contamination, worst times, bin purity, leaderboard, and charts: `services/backend-functions/src/analytics/query-service.ts:172-191`

Gaps for this page:

* no export/report endpoint or report job exists
* no AI-insight generation service exists
* no first-class concept of narrated comparative analysis exists beyond generic grouped analytics

### Devices page

The devices Stitch page asks for:

* active device count: `spec/ui/devices/code.html:73`
* device cards with live or offline state and location: `spec/ui/devices/code.html:99-115`, `spec/ui/devices/code.html:195`
* device registration: `spec/ui/devices/code.html:80`, `spec/ui/devices/code.html:214`

The current backend supports only part of this:

* station directory metadata for listing stations: `services/backend-functions/src/analytics/query-service.ts:228-257`
* direct live-status collection path for per-station status reads: `services/backend-functions/src/analytics/query-service.ts:257`, `services/backend-functions/src/firestore/collections.ts:16`
* live-status contract with device health and latest event: `packages/contracts/src/index.ts:67-77`

Gaps for this page:

* no backend mutation surface for registering or updating a device or station
* no backend aggregate read that joins all stations with their current live status in one operator-facing response
* no contract field on station directory entries for device thumbnail or resolved camera URL

### Device detail and live monitoring

The current app already exposes station detail and live-monitoring routes:

* station detail route: `apps/web/src/app/router.tsx:28`
* live monitoring route: `apps/web/src/app/router.tsx:34-35`

Current station-detail support already covers metadata that the device-detail UI will need:

* active rules preset: `apps/web/src/pages/station-detail.tsx:69-72`
* jurisdiction: `apps/web/src/pages/station-detail.tsx:75-77`
* signage and layout variants: `apps/web/src/pages/station-detail.tsx:81-84`
* nearby comparison links: `apps/web/src/pages/station-detail.tsx:91-98`

The Stitch device-detail comp also implies a map or network visualization plus device status detail:

* device map title: `spec/ui/device details/code.html:112`
* live network visualization label: `spec/ui/device details/code.html:129`
* status table column: `spec/ui/device details/code.html:154`

The live-monitoring route is present, but the current page explicitly limits itself to text-first status and says camera rendering is not part of the phase:

* live page title: `apps/web/src/pages/live-monitoring.tsx:101`
* text-first caveat: `apps/web/src/pages/live-monitoring.tsx:103`
* empty-state handling for missing live documents: `apps/web/src/pages/live-monitoring.tsx:108`
* stale live-status handling: `apps/web/src/pages/live-monitoring.tsx:110-112`

The web live client also already subscribes directly to Firestore station documents:

* fixed collection path: `apps/web/src/lib/firebase/live-status.ts:7`
* path builder: `apps/web/src/lib/firebase/live-status.ts:65-66`
* live-monitoring snapshot model with stale detection: `apps/web/src/lib/firebase/live-monitoring.ts:6-14`, `apps/web/src/lib/firebase/live-monitoring.ts:41-64`

Gaps for device detail and richer live monitoring:

* camera feed metadata exists, but there is no stable UI contract for a downloadable image URL
* there is no dedicated backend read endpoint for historical device health or session timelines
* the current device-detail Stitch comp looks richer than the current data model in areas such as network visualization and detailed operational diagnostics

### Login and auth

The Stitch login comp asks for:

* email and password login: `spec/ui/login/code.html:77-99`
* Google and GitHub social actions: `spec/ui/login/code.html:120-126`
* request-access flow: `spec/ui/login/code.html:131`

The current web app already supports Firebase email and password auth on the client:

* auth imports: `apps/web/src/app/providers.tsx:1`
* persistence and auth-state subscription: `apps/web/src/app/providers.tsx:245-247`
* email and password sign-in call: `apps/web/src/app/providers.tsx:337`
* sign-out: `apps/web/src/app/providers.tsx:415`

Backend-owned auth capabilities are thinner:

* the backend exports auth helpers, not login endpoints: `services/backend-functions/src/index.ts:16-17`
* callable reads rely on operator authorization checks: `services/backend-functions/src/functions/get-analytics-summary.ts:16`, `services/backend-functions/src/functions/get-event-history.ts:16`, `services/backend-functions/src/functions/get-station-directory.ts:15`

Important auth risk:

* backend operator auth currently grants access if `auth.uid.trim().length > 0`, even without operator claims: `services/backend-functions/src/auth/operator-auth.ts:33-52`
* the web live-status client repeats the same permissive pattern: `apps/web/src/lib/firebase/live-status.ts:40-58`

Additional login gaps:

* no evidence of Google or GitHub provider flows in the current web auth implementation
* no backend or admin flow for issuing operator claims is exposed in this audit surface
* no request-access workflow exists in the backend surface

## Gaps that require work before wiring

### Backend work

* Fix operator authorization so it requires operator claims rather than any authenticated `uid`. Evidence: `services/backend-functions/src/auth/operator-auth.ts:33-52`, `apps/web/src/lib/firebase/live-status.ts:40-58`.
* Fix event-history cursor semantics. Evidence: `services/backend-functions/src/analytics/query-service.ts:224`, `services/backend-functions/src/firestore/repositories/firestore.ts:155-169`.
* Add station or device mutation APIs if the Stitch devices page should support registration or settings. Evidence: `services/backend-functions/src/runtime/firebase-runtime.ts:36-79`, `services/backend-functions/src/firestore/repositories/types.ts:40-43`.
* Add an aggregate live-status read model if the devices page should render a full current fleet view without many per-station subscriptions.
* Add an export or reporting endpoint if the analytics Stitch page's export action is real product scope.

### Contract work

* Decide whether camera delivery belongs in `LiveStationStatus` as a resolved URL, a storage object path only, or a separate endpoint.
* Add a contract for device registration or station management if those flows are in scope.
* Add explicit auth and operator-role contracts if the login and access-request flows should be part of the product rather than Firebase console setup.

### Product work

* Decide whether AI-generated insights on the analytics page are a true feature or static explanatory copy.
* Decide whether social login buttons in the Stitch comp are real requirements or visual placeholders.
* Decide whether dashboard affordances that imply live operational actions should exist at all, because the spec keeps the real control loop on the station hardware, not in the web UI. Source of truth: `spec/binsight-spec.md:1-114`.

## Unresolved questions

* Should operator access be restricted by Firebase custom claims only, or is any signed-in team member intentionally allowed to read dashboard data?
* Should the devices page support true registration and settings, or is it only a read-only station directory for the demo?
* For camera frames, should the app read through Firebase Storage SDK, signed URLs, public URLs, or a backend proxy?
* Are Google and GitHub login options intended for the real product, or were they included only in the Stitch visual exploration?
* Should AI insights be generated from analytics data, manually authored, or deferred for the demo?

## Recommended next research

* Audit Firestore security rules and indexes against the live-status, event-history, and rollup query patterns.
* Inspect seeding and fixture flows to confirm whether the required station metadata, rollups, and live documents exist for the Stitch pages.
* Inspect current dashboard feature components under `apps/web/src/features/**` to see how much of the Stitch UI can be layered onto existing loaders without changing contracts.
* Trace how operator claims are provisioned today, if at all, because the current auth gates are not sufficient.
* Decide the camera-frame delivery contract before implementing the richer device cards and device-detail page.