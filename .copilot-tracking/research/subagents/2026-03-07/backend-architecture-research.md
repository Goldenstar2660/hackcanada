---
title: Backend Architecture Research
description: Verified research on the best backend approach for the BinBuddy smart waste-sorting station
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binbuddy
  - backend
  - firebase
  - firestore
  - cloud-functions
  - analytics
estimated_reading_time: 15
---

## Research scope

* Start from the product spec and the current monorepo state.
* Verify the current backend-related structure, contracts, and device responsibilities.
* Recommend the best Firebase backend shape for ingestion, live status, analytics, and station configuration.
* Compare Firestore data model options and Cloud Functions patterns.
* Cover demo-suitable authentication and authorization with a path to future hardening.
* Evaluate the alternative of keeping most logic on the Pi versus centralizing more logic in Cloud Functions.

## Status

Complete.

## Executive recommendation

Use a hybrid Firebase architecture that keeps the live control loop and classification path on the Raspberry Pi, accepts device writes through authenticated HTTP Cloud Functions, stores canonical telemetry in Firestore, maintains a single live-status document per station for realtime dashboards, and materializes analytics summary views with Firestore-triggered Cloud Functions.

This fits the product spec, matches the current surface boundaries in the repo, and avoids pushing latency-sensitive guidance logic into the cloud. It also gives the dashboard a practical split between direct Firestore listeners for live state and server-mediated reads for analytics and filtered history.

## Verified repo findings

### Product and boundary constraints

* The spec explicitly says the Pi runs offline on-device inference, the LLM is fallback only, Firestore is the database, and Firebase Cloud Functions is the website backend.
* The spec says the Pi sends event and live-status data to Firebase for dashboard and live monitoring.
* The repo root README reinforces that the Raspberry Pi owns the live control loop and should remain the translator between firmware and cloud-facing contracts.
* The backend-functions package README states its intended scope is event ingestion and validation, live status handling, analytics aggregation, and read-model support.
* The web package README states its intended scope is station insights, live monitoring, and consuming shared analytics and contracts.

### Existing monorepo backend shape

* The backend package exists at `services/backend-functions` but is still a TypeScript shell with only workspace dependencies on `@binbuddy/contracts` and `@binbuddy/rules`.
* Firebase config already points to that package as a Functions codebase and enables Firestore and emulator wiring.
* Firestore security rules currently deny all reads and writes.
* Firestore indexes are empty.
* Shared contracts already define canonical schemas for disposal events, live station status, rules presets, station metadata, analytics queries, and analytics summaries.

### Important contract mismatches already visible in the repo

* The Python disposal event model emits `success: bool`, but the canonical contract requires `attemptResult: "success" | "failure"`.
* The Python live status model emits `phase`, `predicted_item`, and `disposal_method`, but the canonical contract requires `sessionState`, `cameraFeedActive`, `deviceHealth`, and other richer fields.
* The Python session state values do not fully match the schema enum. For example, the Python code uses `detecting`, `guiding`, and `complete`, while the schema expects values like `detecting-person`, `guiding-user`, `waiting-for-disposal`, `syncing`, and `error`.
* Station metadata currently tracks only `activeRulesPresetId`, while the rules package already suggests a versioned preset reference with `presetId` and `version`.

These mismatches mean the first backend implementation should validate and normalize incoming device payloads against the shared contracts instead of trusting current Python shapes.

## Repo evidence

* `spec/binbuddy-spec.md`
* `README.md`
* `services/backend-functions/README.md`
* `services/backend-functions/src/index.ts`
* `infra/firebase/firebase.json`
* `infra/firebase/firestore.rules`
* `packages/contracts/schemas/domain/disposal-event.schema.json`
* `packages/contracts/schemas/domain/live-station-status.schema.json`
* `packages/contracts/schemas/domain/rules-preset.schema.json`
* `packages/contracts/schemas/domain/station-metadata.schema.json`
* `packages/contracts/schemas/analytics/analytics-query.schema.json`
* `packages/contracts/schemas/analytics/analytics-summary.schema.json`
* `devices/pi-station/src/binbuddy_station/main.py`
* `devices/pi-station/src/binbuddy_station/events.py`
* `devices/pi-station/src/binbuddy_station/live_status.py`
* `devices/pi-station/src/binbuddy_station/session.py`
* `devices/pi-station/src/binbuddy_station/rules.py`

## Authoritative external findings

### Firestore structure guidance

* Firebase documents three main structure patterns: nested data, subcollections, and root-level collections.
* Firebase recommends subcollections for data that grows over time and root-level collections for many-to-many style querying.
* This strongly favors root-level collections for cross-station event querying and separate live-status documents instead of embedding growing lists under station docs.

Source:

* Firebase docs, "Choose a data structure," updated 2026-03-04.

### Realtime listeners and aggregation limits

* Firestore document and query listeners are appropriate for live monitoring pages and emit initial and incremental snapshots.
* Read-time aggregation queries support only `count()`, `sum()`, and `average()`.
* Aggregation queries do not support realtime listeners or offline caching and can time out after 60 seconds.
* Firebase explicitly recommends write-time aggregations when you need realtime updates, caching, or lower cost at larger scan sizes.

Sources:

* Firebase docs, "Get realtime updates with Cloud Firestore," updated 2026-03-04.
* Firebase docs, "Summarize data with aggregation queries," updated 2026-03-04.
* Firebase docs, "Write-time aggregations," updated 2026-03-04.

### Cloud Functions trigger behavior

* Firestore triggers are at-least-once and event ordering is not guaranteed.
* Trigger handlers must therefore be idempotent and must not rely on exactly-once execution or strict ordering.
* Writing back to the same document that triggered the function can create loops if guards are not in place.
* Firestore-triggered functions and Firestore must be in the same Firebase project.

Source:

* Firebase docs, "Cloud Firestore triggers," updated 2026-03-04.

### HTTP versus callable functions

* HTTP functions are general-purpose endpoints and are the best fit for non-Firebase clients like the Raspberry Pi.
* Callable functions are designed for Firebase client SDKs and automatically include Auth and App Check tokens when available.
* Callable functions are a better fit for the web dashboard when the frontend already uses the Firebase SDK.

Sources:

* Firebase docs, "Call functions via HTTP requests," updated 2026-03-04.
* Firebase docs, "Call functions from your app," updated 2026-03-05.

### Firestore scale and indexing constraints

* Firebase warns against monotonically increasing document IDs because they can hotspot writes.
* Firebase notes that indexing sequential fields, such as timestamps, can limit a collection to 500 writes per second if those fields are indexed and traffic is high.
* Firebase recommends pruning unused indexes to reduce write latency and index fanout.
* Firebase also recommends gradual ramp-up for new high-traffic collections under the 500/50/5 rule.

Source:

* Firebase docs, "Best practices for Cloud Firestore," updated 2026-03-04.

### Auth and custom claims

* Firebase custom tokens are the supported way to authenticate users or devices against Firebase with identities issued by your own backend.
* Firebase custom claims are for access control, not general profile data, and are enforced through ID token validation and security rules.
* Security rules are not filters, so direct client queries must include constraints compatible with the rule logic.
* Server libraries and Admin SDK access bypass Firestore security rules, which makes Cloud Functions the right place for privileged joins and analytics composition.

Sources:

* Firebase docs, "Create Custom Tokens," updated 2026-03-04.
* Firebase docs, "Control Access with Custom Claims and Security Rules," updated 2026-03-04.
* Firebase docs, "Securely query data," updated 2026-03-04.

## Recommended backend architecture

### Core split of responsibilities

Keep on the Pi:

* Person detection and session start
* Image capture and item classification
* Fallback LLM invocation decision
* Rule lookup for immediate disposal guidance
* Hand tracking and drop-zone detection
* Final success or failure decision for the attempt
* ESP command emission and LCD behavior

Move to Firebase backend:

* Device ingress authentication and payload validation
* Canonical event persistence
* Canonical live-status persistence
* Dashboard-facing query APIs
* Analytics materialization and summary read models
* Station metadata and rules preset administration
* Future audit logging and operator authorization

Rationale:

* The spec and README both say the Pi owns the live control loop.
* Cloud round-trips would directly hurt the most visible interaction, which is disposal guidance and session completion.
* Cloud Functions and Firestore are still a good fit for telemetry, monitoring, and analytics because those paths tolerate eventual consistency better.

### Selected request and event flow

1. The Pi completes an attempt locally.
2. The Pi sends the canonicalized disposal event to an authenticated HTTP function.
3. The HTTP function validates the payload against the shared contract, adds server metadata such as `ingestedAt`, and writes to Firestore.
4. The Pi publishes periodic or state-change live-status snapshots to a separate authenticated HTTP function.
5. The live-status function upserts the current station live document.
6. A Firestore trigger on new disposal events updates summary view documents and the station's latest-event pointers.
7. The web dashboard reads live status directly from Firestore with listeners.
8. The web dashboard calls callable or HTTP functions for analytics summaries and filtered event-history endpoints.

This split is the best match for the current repo because the dashboard needs realtime monitoring and comparative analytics, while the backend package is already conceptually responsible for ingestion and aggregation.

## Recommended Firestore shape

### Station metadata

Recommended collection:

* `stations/{stationId}`

Recommended contents:

* Canonical station metadata fields from the current schema.
* A versioned rules reference such as `activeRulesPresetId` plus `activeRulesPresetVersion`.
* Optional operational fields such as `provisioningStatus`, `lastSeenAt`, and `deviceAuthMode`.

Why:

* Station metadata is relatively static.
* It is the natural anchor for filters like building, floor, location, signage variant, and layout variant.
* It should not be mixed into the high-churn live-status document.

### Rules presets

Recommended collection:

* `rulesPresets/{presetKey}` where `presetKey` is a stable versioned key such as `toronto-on__1.0.0`

Alternative for future editing workflows:

* `rulesPresets/{presetId}/versions/{version}`

Why the single versioned document collection is better now:

* The repo is demo-stage and does not yet have a rules authoring UI.
* Reads are simpler from both Pi bootstrap flows and dashboard admin views.
* The current shared rules reference already expects the station to know both preset ID and version.

### Live station status

Recommended collection:

* `stationLiveStatus/{stationId}`

Recommended contents:

* The canonical `LiveStationStatus` contract.
* `expiresAt` or `lastHeartbeatAt` for stale-station detection.
* Optional short retention of `latestEvent` inline for the live page.

Why a root-level collection is better than a subcollection here:

* The dashboard will likely need "all stations currently online" and "station by station" views.
* A root-level collection avoids the extra complexity of collection-group rules and queries.
* A single current document per station is ideal for listeners.

### Disposal events

Recommended collection:

* `disposalEvents/{eventId}` using Firestore auto IDs

Recommended base fields:

* The canonical `DisposalEvent` contract fields.
* Server metadata such as `ingestedAt`, `schemaVersion`, and `source`.

Recommended near-term addition for queryability:

* Add a denormalized station context snapshot, either by extending the contract or by maintaining a parallel enriched facts collection.
* Minimum useful fields are `buildingId`, `floorId`, `locationLabel`, `signageVariant`, `layoutVariant`, and the mapped `actualDisposalMethod`.

Why:

* The spec requires event history and analytics filtering by station, floor, building, location, signage variant, and layout variant.
* Firestore does not support joins, so either event docs or a derived facts collection must carry these dimensions.
* Using auto-generated IDs follows Firebase guidance and avoids sequential key hotspots.

### Analytics summary views

Recommended pattern:

* Materialized summary documents, updated on event write.

Recommended collections:

* `analyticsStationDay/{stationId_yyyymmdd}`
* `analyticsFloorDay/{buildingId_floorId_yyyymmdd}`
* `analyticsBuildingDay/{buildingId_yyyymmdd}`
* `analyticsExperimentDay/{dimension}_{value}_{yyyymmdd}` for `signageVariant` and `layoutVariant`

Recommended contents:

* Totals needed for `totalAttempts`, `totalCorrectSorts`, `firstTryCorrectRate`, and `participationComplianceScore`
* Contamination item counters
* Hour buckets for worst-times-of-day and purity views
* Optional latest chart points to reduce query fan-out

Why:

* Read-time aggregation alone is insufficient for the required KPI set.
* The required summary views include top-N lists, leaderboards, and purity rates by method and time bucket.
* Materialized daily documents give predictable query costs and avoid scanning the full event corpus for each dashboard request.

## Data model options considered

### Option 1: Station subcollections for events and live state

Shape:

* `stations/{stationId}/events/{eventId}`
* `stations/{stationId}/live/current`

Pros:

* Hierarchy is intuitive.
* Station-scoped reads are simple.

Cons:

* Cross-station analytics need collection-group queries.
* Event filtering by building, floor, signage variant, and layout variant still requires denormalization.
* Security rules for collection-group queries are stricter and easier to get wrong.

Verdict:

* Reasonable, but not the best default for this dashboard-heavy use case.

### Option 2: Root-level canonical collections plus materialized views

Shape:

* `stations/{stationId}`
* `rulesPresets/{presetKey}`
* `stationLiveStatus/{stationId}`
* `disposalEvents/{eventId}`
* `analytics*` view collections

Pros:

* Best fit for cross-station querying and dashboard reads.
* Easy to attach focused security rules by collection.
* Matches Firebase guidance for many-to-many query workloads.
* Keeps high-churn live state separate from slow-moving station metadata.

Cons:

* Requires conscious denormalization or summary materialization.
* Slightly less intuitive than deeply nested hierarchy.

Verdict:

* Best option for BinBuddy.

### Option 3: Canonical raw events only, compute everything at read time

Pros:

* Lowest write-time complexity.
* Minimal trigger logic.

Cons:

* Read-time aggregation cannot produce all required metrics cleanly.
* Aggregation queries are not realtime and support only count, sum, and average.
* Dashboard comparisons and top contamination calculations would become expensive and slow as data grows.

Verdict:

* Acceptable only for the smallest demo datasets and not recommended as the primary design.

## Cloud Functions pattern recommendation

### HTTP functions for device ingress

Use `onRequest` HTTP functions for:

* `POST /ingest/event`
* `POST /ingest/live-status`
* Optional `POST /device/bootstrap` to fetch the station's assigned metadata and active rules preset

Why:

* The Pi is not a standard Firebase client.
* HTTP endpoints give full control over request auth, retries, and payload normalization.
* This isolates device contract drift from the Firestore write path.

### Firestore-triggered functions for aggregation and derived state

Use Firestore triggers for:

* Updating analytics summary documents when an event is created.
* Updating station-level counters or latest event references.
* Optionally enriching a canonical raw event into a query-optimized facts document.

Important implementation note:

* Trigger handlers must be idempotent because Firestore events are at-least-once and order is not guaranteed.

### Callable functions for dashboard analytics and admin actions

Use callable functions, or authenticated HTTP functions if preferred, for:

* Analytics queries that compose summary documents into the `AnalyticsSummary` response.
* Filtered event history endpoints that may need backend-side joins or validation.
* Station metadata mutations and rules preset assignment.

Why:

* Callable functions automatically include Firebase Auth and App Check context when used from Firebase-supported web clients.
* Analytics and admin actions are not a good fit for unrestricted direct Firestore reads because rules are not filters and the query logic will become awkward quickly.

### Direct Firestore reads for the live page

Use direct Firestore reads and listeners for:

* `stations/{stationId}` metadata
* `stationLiveStatus/{stationId}` current status
* Optional station list and online-status overview queries

Why:

* The live page benefits most from realtime document listeners.
* The data is naturally document-shaped and small.
* This is where Firestore's native listener model adds the most value.

## Authentication and authorization recommendation

### For the dashboard demo

Recommended:

* Firebase Auth with Google sign-in for operators.
* Custom claims for operator roles such as `admin` or `viewer` if multiple privilege levels are needed.
* Firestore direct read access only for authenticated dashboard users and only on collections intended for realtime UI reads.
* Analytics and mutation endpoints protected by callable or HTTP functions that verify the user ID token.

Why:

* Firebase documents custom claims as the supported pattern for access control.
* Direct client queries must satisfy security rules exactly, so it is cleaner to keep privileged analytics logic on the server.

### For the Pi demo

Recommended:

* Do not let the Pi write directly to Firestore as an untrusted client.
* Authenticate the Pi against ingestion HTTP functions with a station-specific bearer secret or signed device token checked by the function.
* Map the authenticated device identity to `stationId` on the server side.

Why:

* The repo already assumes a backend boundary for ingestion.
* HTTP ingress is simpler for Python and easier to rotate or revoke than embedded broad Firestore credentials.

### Future growth path

Harden toward:

* Device provisioning records in `stations/{stationId}`.
* Backend-issued custom device tokens or short-lived signed credentials.
* Secret rotation and station revocation support.
* App Check on callable functions for the web dashboard.
* More granular claims such as `stationAdmin`, `analyst`, or `viewer`.

## Alternatives and why they were not selected

### Centralize more business logic in Cloud Functions

This would move classification, rules application, or correctness calculation into the backend.

Why not selected:

* It directly conflicts with the spec's offline-on-device inference note.
* It adds network dependency to the most latency-sensitive part of the station experience.
* It weakens the repo's explicit surface boundary that the Pi owns the live control loop.

### Let the Pi write directly to Firestore

Why not selected:

* It would force the device into a client-style Firestore auth and rules model.
* It makes schema normalization and drift handling harder.
* It increases the chance of over-broad credentials or overly permissive rules in a hurry-up demo.

### Skip materialized analytics views

Why not selected:

* Firebase aggregation queries do not cover the full KPI set and are not realtime.
* The spec requires comparisons, leaderboards, top contamination items, and purity views that are better served by write-time summaries.

## Recommended implementation order

1. Normalize the shared contracts and fix the Pi-to-contract mismatches.
2. Implement authenticated HTTP ingestion functions for events and live status.
3. Create Firestore collections for `stations`, `rulesPresets`, `stationLiveStatus`, and `disposalEvents`.
4. Add minimal indexes only for the first live and history queries.
5. Implement a Firestore trigger that materializes station-day summary documents.
6. Add callable or HTTP analytics endpoints that compose the `AnalyticsSummary` contract.
7. Open Firestore security rules only for the direct-read collections needed by the live dashboard.

## Outstanding gaps and clarifying questions

* The repo does not yet define the exact canonical device payload transport format, retry semantics, or idempotency key strategy for ingestion.
* The contracts do not yet include enough station-context data on events to support all dashboard filters without either enrichment or backend joins.
* The station metadata contract likely needs a versioned rules preset reference, not only `activeRulesPresetId`.
* The desired retention policy for live-status history versus current snapshot is not yet defined.
* The expected demo auth flow for the web dashboard is not yet documented.

## Recommended next research

* Define the exact ingestion API contracts, including idempotency behavior and server-added fields.
* Decide whether event docs themselves should be enriched with station context or whether a parallel facts collection should be introduced.
* Design the first concrete analytics summary document schemas and the indexes they require.
* Align the dashboard query model with the analytics view layout before building endpoints.