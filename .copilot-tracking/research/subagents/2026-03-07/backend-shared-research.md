---
title: Backend and shared package research
description: Research on the current backend, contracts, rules, analytics, and Firebase implementation against the Binsight spec
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - backend
  - firebase
  - contracts
  - analytics
  - rules
estimated_reading_time: 14
---

## Research scope

This note reviews the authored implementation in these areas against the product
spec in `spec/binsight-spec.md`:

* `services/backend-functions`
* `packages/contracts`
* `packages/rules`
* `packages/analytics`
* `infra/firebase`
* Package-level docs and config in those areas where they affect behavior or
  implementation status

## Source-of-truth anchors from the spec

The most relevant source-of-truth requirements for this research are:

* Disposal attempts must produce one event with station id, timestamp,
  predicted item, correct disposal method, actual disposal zone, success or
  failure, model confidence, and LLM fallback usage (`spec/binsight-spec.md:49-58`)
* Dashboard features must support stations, station status and metadata, active
  rules preset, event history, tracked metrics, historical charts, filtering,
  grouping, and comparison views (`spec/binsight-spec.md:96-105`)
* Live monitoring must show live device status, current session state, current
  detected item, current disposal decision, and the latest event in real time
  (`spec/binsight-spec.md:107-112`)
* Demo data seeding must include historical events, multi-station and
  multi-location coverage, known interventions, before or after patterns,
  time-of-day performance differences, and a demo-data marker for filtering
  (`spec/binsight-spec.md:114-120`)
* Configurable business rules must cover supported items, item-to-disposal
  mappings, city or province presets, zone mapping, low-confidence threshold,
  and station metadata (`spec/binsight-spec.md:122-128`)
* Firestore is the database, Cloud Functions is the backend, and the Pi sends
  event and live-status data to Firebase (`spec/binsight-spec.md:150-152`)
* Camera preview is developer-only on the operator laptop when Pi code runs over
  SSH (`spec/binsight-spec.md:153`)

## Implementation summary

The backend is no longer just scaffolding. The authored source already contains:

* Firebase HTTP ingestion for disposal events, live status, and camera frames
* Firebase callable handlers for analytics summary, event history, and station
  directory reads
* Firestore repositories for stations, rules presets, live status, events, and
  analytics rollups
* Shared TypeScript contracts and JSON Schemas for events, live status, station
  metadata, rules presets, analytics queries, and analytics summaries
* Analytics materialization logic that derives daily station, floor, building,
  and experiment rollups from disposal events

The strongest implementation coverage is around shared DTOs and backend query
logic. The weakest coverage is around seeded demo data, authored station data,
rules-preset breadth, and historical metadata needed for clean before or after
analysis.

## Implemented behavior that matches the spec

### Firebase backend surface exists and is wired to Firestore and Cloud Functions

The spec says Firestore is the database, Cloud Functions is the backend, and the
Pi sends event and live-status data to Firebase. The repo implements that shape.

Evidence:

* `infra/firebase/firebase.json:2-23` points Firebase Functions at
  `services/backend-functions` and configures Firestore rules and indexes
* `services/backend-functions/src/runtime/firebase-runtime.ts:36-79` exports HTTP
  ingestion for events and live status, callable reads, and an event-triggered
  analytics materializer
* `services/backend-functions/src/firestore/collections.ts:1-27` defines the
  expected backend collections for stations, presets, live status, events, and
  analytics rollups

### Disposal event contracts match the core event shape from the spec

The required event fields from the spec are present in both the shared TypeScript
contract and the canonical JSON Schema, and device ingress is normalized into the
canonical event shape.

Evidence:

* `packages/contracts/src/index.ts:35-44` defines canonical `DisposalEvent`
  fields: `stationId`, `timestamp`, `predictedItem`, `correctDisposalMethod`,
  `actualDisposalZone`, `attemptResult`, `modelConfidence`, and
  `llmFallbackUsed`
* `packages/contracts/schemas/domain/disposal-event.schema.json:8-69` requires
  the same fields in JSON Schema
* `services/backend-functions/src/domain/validation.ts:217-241` validates device
  event ingress fields including `success`, `model_confidence`, and
  `llm_fallback_used`
* `services/backend-functions/src/domain/normalization.ts:56-76` converts device
  ingress into canonical event fields and maps `success` to `attemptResult`
* `services/backend-functions/src/functions/ingest-event.ts:22-51` authenticates
  the device, validates ingress, normalizes the event, persists it, and returns
  a backend write result

### Live status contracts cover the live monitoring requirements

The live-status contract covers session state, current item, current disposal
method, device health, and latest event, which aligns with the live monitoring
page described in the spec.

Evidence:

* `packages/contracts/src/index.ts:67-78` defines `LiveStationStatus` with
  `sessionState`, `currentDetectedItem`, `currentDisposalMethod`, `deviceHealth`,
  `latestEvent`, and optional `cameraFeed`
* `packages/contracts/schemas/domain/live-station-status.schema.json:8-182`
  requires station id, timestamp, session state, camera-feed activity, and device
  health, and supports latest-event and current-guidance fields
* `services/backend-functions/src/domain/validation.ts:244-323` validates device
  live-status ingress, including `phase`, `predicted_item`, `disposal_method`,
  `latest_event`, and optional `camera_feed`
* `services/backend-functions/src/domain/normalization.ts:105-131` converts
  device ingress into canonical live status and maps device phases to session
  states
* `services/backend-functions/src/functions/ingest-live-status.ts:15-35`
  authenticates the device, validates ingress, normalizes the live status, and
  upserts it
* `infra/firebase/firestore.rules:14-20` allows authenticated operators to read
  `stationLiveStatus` directly

### Rules preset and station metadata contracts align with configurable business rules

The shared contracts cover the spec's configuration surface for supported items,
item mappings, zone mappings, low-confidence threshold, and station metadata.

Evidence:

* `packages/contracts/src/index.ts:96-125` defines `RulesPreset`,
  `RulesPresetSummary`, and `StationMetadata`
* `packages/contracts/schemas/domain/rules-preset.schema.json:8-104` requires
  `supportedItems`, `itemMappings`, `zoneMapping`, and `lowConfidenceThreshold`
* `packages/contracts/schemas/domain/station-metadata.schema.json:65-138`
  requires station, building, floor, location, signage, layout, and active rules
  preset identifiers
* `packages/rules/presets/demo-canada-ottawa.1.0.0.json:2-37` provides one real
  authored preset with jurisdiction, supported items, item mappings, zone mapping,
  and threshold
* `services/backend-functions/src/analytics/query-service.ts:228-257` joins
  station metadata to active rules presets and returns filter facets for building,
  floor, location, signage, and layout

### Analytics metric surface substantially matches the spec

The shared analytics DTOs and backend aggregation logic cover the spec's listed
metrics and comparison/filtering dimensions.

Evidence:

* `packages/contracts/src/index.ts:132-255` defines metric keys, analytics query
  filters, summary totals, contamination items, worst times of day, bin purity,
  leaderboard entries, chart series, and event-history query contracts
* `packages/contracts/schemas/analytics/analytics-query.schema.json:8-143`
  supports time range, station, building, floor, location, signage, layout,
  grouping, compare-by, and time-bucket fields
* `packages/contracts/schemas/analytics/analytics-summary.schema.json:67-240`
  defines totals, grouped results, top contamination items, worst times of day,
  bin purity, leaderboard, and chart series
* `services/backend-functions/src/analytics/mappers/event-rollup.ts:24-231`
  implements totals, compliance rate, contamination tracking, worst times,
  purity, charts, and leaderboard aggregation
* `services/backend-functions/src/analytics/materializers/daily-rollups.ts:24-98`
  materializes station, floor, building, and experiment daily rollups from events
* `services/backend-functions/src/analytics/query-service.ts:118-196` returns
  aggregated analytics summaries using the shared metric vocabulary

## Required features that appear missing or partial

### Demo-data seeding is largely missing in authored backend and config surfaces

The spec explicitly requires seeded historical events across multiple stations,
interventions, before or after patterns, time-of-day differences, and demo-data
markers. I did not find authored seed assets or seeding workflows for stations,
events, interventions, or demo markers in the researched areas.

Evidence:

* `packages/rules/presets/demo-canada-ottawa.1.0.0.json:1-38` is the only
  authored preset data file found in the researched rules/config surface
* `packages/rules/fixtures/README.md:8-22` says fixtures are reserved guidance,
  not implemented fixture assets
* `services/backend-functions/src/firestore/repositories/in-memory.ts:1-209`
  includes in-memory seed hooks for tests, but there is no authored Firestore
  seed dataset or backend seeding script in the researched directories

Assessment:

* Missing station metadata seed data for multiple buildings and floors
* Missing disposal-event seed data for historical comparisons
* Missing seeded intervention metadata such as signage updates or campaign dates
* Missing demo-data marker fields and query filters for presentation-only records

### Historical comparison support is partial because event history joins current station metadata

The spec requires before or after and A/B analysis using historical data. The
analytics rollup documents snapshot signage, layout, and location at
materialization time, but event-history responses join the current station record
at read time and fall back to `unknown` metadata if station records are missing.

Evidence:

* `services/backend-functions/src/analytics/materializers/daily-rollups.ts:29-38`
  copies `buildingId`, `floorId`, `locationLabel`, `signageVariant`, and
  `layoutVariant` into daily rollup seeds
* `services/backend-functions/src/analytics/query-service.ts:199-224` joins event
  history entries against the current station repository rather than historical
  metadata snapshots
* `packages/contracts/src/index.ts:114-125` and
  `packages/contracts/schemas/domain/station-metadata.schema.json:65-138` model
  only the current station metadata view, with no effective date, version, or
  historical change record

Assessment:

* Aggregated analytics can preserve experiment dimensions at event-processing time
* Event-history responses cannot reliably reconstruct the historical station state
* There is no schema field for campaign dates, signage-change dates, layout-change
  dates, or metadata effective windows

### Rules-preset coverage is real but very narrow

The contracts and schema are implemented, but authored data coverage is only one
Ottawa preset with four items.

Evidence:

* `packages/contracts/schemas/domain/rules-preset.schema.json:64-104` expects a
  reusable preset model
* `packages/rules/presets/demo-canada-ottawa.1.0.0.json:2-37` is one preset only
* `packages/rules/presets/README.md` describes versioning expectations, but no
  additional preset artifacts were present in the researched directory

Assessment:

* Partial support for the spec's city or province rules preset requirement
* No authored preset set for multiple demo locations or variant rule changes

### Live data coverage is good for operator status, but partial for spec-adjacent state

The live-status surface supports the live monitoring page well, but it does not
carry some state that would matter for full historical or operator context,
including station-counter state or active rules preset in the live snapshot.

Evidence:

* `packages/contracts/src/index.ts:67-78` includes session, item, disposal,
  health, latest event, and camera feed, but not station counter or active rules
  preset summary
* `packages/contracts/schemas/domain/live-station-status.schema.json:98-182`
  defines the same live fields and omits counter-style state

Assessment:

* This is not a direct violation of the live monitoring page spec
* It is still a notable schema gap if the live page is expected to reflect the LCD
  counter or the active preset without an extra station-directory join

### OpenAPI is still effectively unimplemented

The backend package contains an OpenAPI boundary README but no authored API
description documents.

Evidence:

* `services/backend-functions/openapi/README.md:6-15` describes intended usage
* No authored OpenAPI files were present under `services/backend-functions/openapi`

## Implemented behavior that is outside the spec or conflicts with it

### Camera-frame ingestion and dashboard-oriented camera metadata appear outside current spec scope

The spec's live monitoring page does not require a camera feed, and the technical
notes explicitly say the camera preview is developer-only on the operator laptop.
The backend nevertheless implements camera-frame ingestion, storage, and camera
feed metadata inside live status.

Evidence:

* `spec/binsight-spec.md:107-112` defines live monitoring without a camera feed
* `spec/binsight-spec.md:153` says camera preview is developer-only when the Pi
  is run over SSH
* `services/backend-functions/src/functions/ingest-camera-frame.ts:56-110`
  accepts uploaded base64 frames, writes latest-frame storage, and patches live
  status with camera-feed metadata
* `packages/contracts/src/index.ts:60-78` and
  `packages/contracts/schemas/domain/live-station-status.schema.json:75-96,172-181`
  expose `cameraFeed` in the shared live-status model
* `services/backend-functions/src/domain/normalization.ts:87-119` normalizes
  camera-feed metadata into the canonical live status snapshot

Assessment:

* This is currently outside the stated live-page requirements
* It may conflict with the spec's developer-only preview note unless the team
  explicitly intends to revise the spec

### Status documentation conflicts with the authored implementation

Two package-level docs still describe these areas as placeholders or deferred,
even though the source implementation is already present.

Evidence:

* `services/backend-functions/README.md:17-19` says backend runtime wiring and
  HTTP surface definitions are deferred
* `services/backend-functions/src/runtime/firebase-runtime.ts:36-79` proves the
  runtime wiring and handler exports already exist
* `packages/analytics/metrics/README.md:23-27` says Firestore rollup design is
  deferred until a later phase
* `services/backend-functions/src/analytics/materializers/daily-rollups.ts:24-98`
  and `services/backend-functions/src/analytics/mappers/event-rollup.ts:24-231`
  show the rollup design is already implemented in source

## Notable schema and config gaps

### Event shape gaps

Current strength:

* The event contract covers the exact core fields the spec requires

Current gaps:

* No `isDemoData` or equivalent demo-data marker for filtering seeded records
* No rules-preset id or rules-preset version on the event itself
* No snapshot of signage variant, layout variant, building, or floor on the event

Evidence:

* `packages/contracts/src/index.ts:35-44` and
  `packages/contracts/schemas/domain/disposal-event.schema.json:8-69` define the
  event shape without demo or historical-context fields
* `spec/binsight-spec.md:114-120` requires seeded demo data with a demo-data mark

Impact:

* Event-history responses need a secondary station lookup for context
* Historical filtering and seeded-data filtering cannot be done from event shape alone

### Station metadata gaps

Current strength:

* Station metadata supports building, floor, location, signage, layout, and
  active rules preset

Current gaps:

* No effective dates or versioning for metadata changes
* No campaign identifiers, signage-change records, or layout-change records
* No demo-data marker on station metadata

Evidence:

* `packages/contracts/src/index.ts:114-125` and
  `packages/contracts/schemas/domain/station-metadata.schema.json:65-138`
  define a current-state station record only
* `spec/binsight-spec.md:89-105,114-120` requires historical comparisons and
  seeded intervention-style demo data

### Rules-preset gaps

Current strength:

* The preset schema itself is appropriate for the spec

Current gaps:

* Only one authored preset exists in the researched areas
* No authored fixture set validates threshold edge cases or broader supported-item coverage
* No release-note or change-history artifact exists alongside preset evolution

Evidence:

* `packages/rules/presets/demo-canada-ottawa.1.0.0.json:2-37`
* `packages/rules/fixtures/README.md:12-22`

### Live-data gaps

Current strength:

* Live status supports session state, current item, current disposal decision,
  device health, and latest event

Current gaps:

* No station-counter field despite the spec's LCD counter concept
* No explicit person-present or hand-present raw state in the canonical live DTO
* No active rules preset summary in the live snapshot itself

Evidence:

* `spec/binsight-spec.md:60-65` defines the station counter concept
* `packages/contracts/src/index.ts:67-78` omits counter and preset-summary live fields

### Seeded demo-data gaps

Current strength:

* There is a demo rules preset artifact

Current gaps:

* No authored multi-station seed dataset
* No authored historical event seed dataset
* No authored intervention or campaign seed dataset
* No schema or query field to mark and filter demo data

Evidence:

* `packages/rules/presets/demo-canada-ottawa.1.0.0.json:1-38`
* `packages/rules/fixtures/README.md:8-22`
* `packages/contracts/src/index.ts:159-255` defines analytics and event-history
  query shapes without a demo-data filter dimension

## Bottom line

The current repository already implements a substantial backend and shared-model
surface that matches the spec around ingestion, station metadata joins, metrics,
and analytics rollups. The main gaps are not in the core TypeScript or JSON
Schema modeling. They are in authored demo data, historical metadata/versioning,
rules-preset breadth, and the lack of demo-data markers and filters.

The most significant spec tension is the camera-frame ingestion path. It is real,
shared across backend and contracts, and shaped for operator-facing live data,
but the current spec still treats camera preview as developer-only.

## Recommended next research

* Verify how `apps/web` currently consumes station directory, analytics summary,
  event history, and live-status data
* Check the Raspberry Pi runtime payload shapes against the backend ingress
  validators to confirm end-to-end field alignment
* Determine whether the spec should explicitly admit or reject operator-facing
  camera-feed support
* Design a historical metadata or intervention model if before or after analysis
  and seeded campaign data will be first-class demo features

## Clarifying questions

No clarifying questions were strictly necessary to complete this research pass.