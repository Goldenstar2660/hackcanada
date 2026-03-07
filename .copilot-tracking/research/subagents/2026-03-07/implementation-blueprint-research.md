---
title: Backend and Dashboard Implementation Blueprint Research
description: Implementation-oriented research note for the BinBuddy backend, dashboard, and Firestore layout grounded in exact repository evidence
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binbuddy
  - backend
  - dashboard
  - firestore
  - architecture
estimated_reading_time: 10
---

## Research scope

* Start from the product spec as the authoritative scope and business logic source.
* Identify the strongest repository evidence for architecture boundaries and current implementation gaps.
* Produce a concrete backend package layout for `services/backend-functions`.
* Produce a concrete dashboard package layout for `apps/web`.
* Recommend a Firestore collection layout with clear write and read ownership.
* Reject a short list of plausible alternatives that do not fit the repo and spec.

## Status

* Complete

## Executive recommendation

The strongest fit for the current repository is a backend that acts as a validation,
normalization, and read-model layer over Firebase, while the Raspberry Pi remains the owner
of the live control loop and the dashboard remains a read-heavy operator surface. The backend
should not absorb station-side business logic. Instead, it should accept station telemetry,
normalize it into the canonical contract shapes, persist raw history plus materialized
rollups, and expose a narrow dashboard-facing API for station lists, live monitoring,
event history, analytics summaries, and rules preset lookup.

The dashboard should be organized by feature, not by page alone. The key features are
stations, live monitoring, analytics, filters, events, and rules presets. That structure fits
the spec, the current workspace boundaries, and the expected reuse of shared contracts.

## Exact repo evidence for boundaries and gaps

### Architecture boundaries

* The repository explicitly prefers a surface-first split and assigns the Raspberry Pi to the
  live control loop boundary: `README.md:26-29`.
* The same root README says shared boundaries should be data-first rather than shared
  cross-runtime business logic: `README.md:29` and `README.md:39`.
* The Pi runtime README is even more explicit that the Pi owns session start, item
  classification, local rules evaluation, disposal guidance, disposal detection, event
  creation, and translation to cloud-facing payloads: `devices/pi-station/README.md:10-15`.
* The backend package exists specifically to host Firebase Cloud Functions and stay separate
  from the Pi so the live control loop stays local: `services/backend-functions/README.md:8`
  and `services/backend-functions/src/index.ts:1-4`.
* The web package exists specifically for station insights and live monitoring: `apps/web/README.md:8-15`
  and `apps/web/src/index.ts:1-4`.
* Firebase infrastructure already points Cloud Functions at the backend package, which makes
  `services/backend-functions` the intended deployment target rather than a generic server:
  `infra/firebase/firebase.json:3-5`.
* The spec locks in Firestore as the database, Cloud Functions as the website backend, and Pi
  publication of events plus live status into Firebase: `spec/binbuddy-spec.md:142-144`.

### Current gaps that matter for implementation

* The backend package is still a shell. Its README says runtime wiring, emulator support, and
  HTTP surface definitions are deferred: `services/backend-functions/README.md:19`.
* The web package is also still a shell. Its README says framework selection, routing, and UI
  implementation are deferred: `apps/web/README.md:19`.
* Firestore currently blocks every read and write, so no current ingestion path or dashboard
  access path exists yet: `infra/firebase/firestore.rules:3-5`.
* The contracts package is not yet exposing real runtime-facing exports. Its public source is
  still a placeholder: `packages/contracts/src/index.ts:1-4`.
* The Pi live-status seam is intentionally not bound to Firebase yet: `devices/pi-station/src/binbuddy_station/live_status.py:16-17`.
* The Pi disposal event shape does not match the canonical schema. The Python model uses
  snake_case fields and a boolean `success` flag: `devices/pi-station/src/binbuddy_station/events.py:11-19`.
  The canonical contract requires camelCase fields and `attemptResult`: `packages/contracts/schemas/domain/disposal-event.schema.json:9-14`, `packages/contracts/schemas/domain/disposal-event.schema.json:33-57`.
* The Pi live-status shape is also incomplete relative to the canonical schema. The Python
  model currently exposes only `station_id`, `phase`, `predicted_item`, and `disposal_method`:
  `devices/pi-station/src/binbuddy_station/live_status.py:9-24`. The canonical schema requires
  at least `stationId`, `timestamp`, `sessionState`, `cameraFeedActive`, and `deviceHealth`:
  `packages/contracts/schemas/domain/live-station-status.schema.json:9-13`,
  `packages/contracts/schemas/domain/live-station-status.schema.json:73-121`.
* The spec requires dashboard filters and comparisons by station, floor, building, location,
  signage variant, layout variant, and time range: `spec/binbuddy-spec.md:98-105`.
  The analytics query schema already encodes those exact filters and comparison axes:
  `packages/contracts/schemas/analytics/analytics-query.schema.json:57-139`.
* The spec requires rules preset visibility per station and configurable business rules.
  Station metadata already carries the active preset reference, and the rules preset schema is
  versioned and jurisdiction-aware: `packages/contracts/schemas/domain/station-metadata.schema.json:11-18`,
  `packages/contracts/schemas/domain/station-metadata.schema.json:56-66`,
  `packages/contracts/schemas/domain/rules-preset.schema.json:9-15`,
  `packages/contracts/schemas/domain/rules-preset.schema.json:38-99`.

## Recommended backend package layout

This layout keeps the backend focused on ingestion, normalization, Firestore persistence,
analytics read models, and dashboard-facing APIs. It does not duplicate Pi-owned disposal
logic.

```text
services/backend-functions/
├── src/
│   ├── index.ts
│   ├── app/
│   │   └── register-functions.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── firebase-admin.ts
│   ├── contracts/
│   │   ├── disposal-event-normalizer.ts
│   │   ├── live-status-normalizer.ts
│   │   ├── station-payload-types.ts
│   │   └── validators.ts
│   ├── firestore/
│   │   ├── collections.ts
│   │   ├── ids.ts
│   │   ├── converters/
│   │   │   ├── station-converter.ts
│   │   │   ├── event-converter.ts
│   │   │   ├── live-status-converter.ts
│   │   │   └── rollup-converter.ts
│   │   └── repositories/
│   │       ├── stations-repository.ts
│   │       ├── events-repository.ts
│   │       ├── live-status-repository.ts
│   │       ├── rules-presets-repository.ts
│   │       └── analytics-rollups-repository.ts
│   ├── features/
│   │   ├── ingestion/
│   │   │   ├── ingest-disposal-event.ts
│   │   │   ├── ingest-live-status.ts
│   │   │   └── enrich-with-station-metadata.ts
│   │   ├── stations/
│   │   │   ├── list-stations.ts
│   │   │   ├── get-station-detail.ts
│   │   │   └── list-station-events.ts
│   │   ├── live-monitoring/
│   │   │   └── get-live-monitor-view.ts
│   │   ├── analytics/
│   │   │   ├── parse-analytics-query.ts
│   │   │   ├── build-analytics-summary.ts
│   │   │   ├── query-rollups.ts
│   │   │   ├── query-raw-events.ts
│   │   │   └── leaderboard.ts
│   │   └── rules-presets/
│   │       └── get-rules-preset.ts
│   ├── http/
│   │   ├── station-routes.ts
│   │   ├── live-monitoring-routes.ts
│   │   ├── analytics-routes.ts
│   │   └── rules-routes.ts
│   ├── jobs/
│   │   ├── materialize-hourly-rollups.ts
│   │   └── materialize-daily-rollups.ts
│   └── shared/
│       ├── clock.ts
│       ├── result.ts
│       └── errors.ts
├── package.json
└── tsconfig.json
```

### Why this backend layout fits the repo

* The backend package already depends on shared contracts and rules assets, which aligns with
  normalization plus rules lookup rather than station-side decision logic:
  `services/backend-functions/package.json:12-13`.
* The normalizer layer is required because the current Pi payloads do not match the canonical
  schemas yet.
* The repository and spec both assign the Pi, not the backend, to the live control loop, so
  backend feature modules should stay strictly cloud-oriented.
* Analytics needs both raw-event access and materialized rollup access because the spec demands
  event history, headline metrics, historical charts, leaderboards, contamination items,
  worst-time analysis, and comparison workflows: `spec/binbuddy-spec.md:98-105` and
  `packages/contracts/generated/typescript/analytics/analytics-summary.d.ts:10-78`.

### Recommended backend responsibilities by module

* `contracts/`: Map Pi-authored payloads into the schema-first shapes used by the rest of the
  cloud stack.
* `firestore/repositories/`: Isolate document paths, converters, and query constraints so the
  analytics and route layers do not hand-build Firestore access.
* `features/ingestion/`: Accept telemetry from the station, enrich raw events with station
  metadata dimensions, and fan out writes to raw history plus live status.
* `features/analytics/`: Serve analytics summaries from rollups where possible and fall back to
  raw event scans only for narrow detail views.
* `jobs/`: Maintain hour and day rollups used by charting, purity, contamination, and
  leaderboard queries.

## Recommended dashboard package layout

The dashboard should be feature-first. It will need strong separation between query state,
operator filters, live monitoring, and analytics composition.

```text
apps/web/
├── src/
│   ├── index.ts
│   ├── app/
│   │   ├── bootstrap.ts
│   │   ├── router.ts
│   │   ├── providers.ts
│   │   └── shell/
│   │       ├── app-shell.ts
│   │       ├── navigation.ts
│   │       └── page-layout.ts
│   ├── lib/
│   │   ├── firebase.ts
│   │   ├── api-client.ts
│   │   ├── date-range.ts
│   │   └── formatters.ts
│   ├── features/
│   │   ├── stations/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   ├── station-list-view.ts
│   │   │   └── station-detail-view.ts
│   │   ├── live-monitoring/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   ├── live-status-panel.ts
│   │   │   ├── current-decision-panel.ts
│   │   │   └── latest-event-panel.ts
│   │   ├── events/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   └── event-history-table.ts
│   │   ├── analytics/
│   │   │   ├── api.ts
│   │   │   ├── query-mappers.ts
│   │   │   ├── hooks.ts
│   │   │   ├── metrics-cards.ts
│   │   │   ├── contamination-chart.ts
│   │   │   ├── purity-chart.ts
│   │   │   ├── time-series-chart.ts
│   │   │   └── leaderboard-table.ts
│   │   ├── filters/
│   │   │   ├── filter-state.ts
│   │   │   ├── filter-options.ts
│   │   │   └── analytics-query-builder.ts
│   │   └── rules-presets/
│   │       ├── api.ts
│   │       └── rules-preset-card.ts
│   └── shared/
│       ├── loading-state.ts
│       ├── empty-state.ts
│       └── error-state.ts
├── package.json
└── tsconfig.json
```

### Why this dashboard layout fits the repo

* The web package already depends on contracts and analytics packages, which fits a dashboard
  organized around typed data access and rendered read models:
  `apps/web/package.json:12-13`.
* The spec requires both station-centric views and cross-station comparison workflows, so a
  single page-folder layout would quickly mix filters, analytics query construction, and live
  monitoring concerns.
* The analytics query schema already declares the filter axes, comparison axis, and optional
  bucketing that the UI must compose: `packages/contracts/schemas/analytics/analytics-query.schema.json:57-139`.
* The live monitoring page needs device status, current decision context, and latest event in
  real time: `spec/binbuddy-spec.md:107-112`. That warrants a dedicated feature module instead
  of folding it into a generic station detail page.

### Recommended dashboard surface breakdown

* `features/stations/`: Station list, station detail header, and station metadata panels.
* `features/live-monitoring/`: Live status, camera-active indicator, current item and disposal
  guidance, and the latest event card.
* `features/events/`: Event history list and station-scoped history filtering.
* `features/analytics/`: Summary cards, charts, contamination analysis, purity analysis,
  historical trends, and leaderboard views.
* `features/filters/`: One source of truth for station, building, floor, location, signage,
  layout, time range, group by, compare by, and time bucket state.

## Recommended Firestore collection layout

The key design decision is to keep raw history append-only, live status mutable, station and
rules configuration authoritative, and analytics materialized into explicit read models.

| Collection path | Purpose | Writes | Reads |
| --- | --- | --- | --- |
| `stations/{stationId}` | Canonical station metadata, including building, floor, location, signage, layout, and active rules preset reference | Backend admin/config workflows only | Backend station APIs, dashboard station list/detail, analytics enrichment |
| `rulesPresets/{presetId}` | Latest preset pointer and stable preset identity | Backend/admin workflows only | Backend rules lookup, dashboard station detail |
| `rulesPresets/{presetId}/versions/{version}` | Immutable versioned rules preset payloads | Backend/admin workflows only | Backend rules lookup, dashboard preset inspection |
| `stationLiveStatus/{stationId}` | Current live station snapshot for the monitoring page | Backend ingestion from Pi live-status submissions | Dashboard live monitoring, backend station detail |
| `stations/{stationId}/events/{eventId}` | Append-only disposal event history, denormalized with station metadata dimensions captured at write time | Backend ingestion from Pi disposal-event submissions | Backend analytics, dashboard event history |
| `analyticsRollups/{rollupId}` | Materialized hour/day aggregates keyed by scope and time bucket | Backend jobs and aggregation workflows | Backend analytics endpoint only |

### Surface ownership recommendation

* Pi runtime should not write directly to Firestore. It should call backend ingestion endpoints.
  That matches the current deny-all rules, the backend boundary in Firebase config, and the need
  to normalize current Python payloads into canonical contract shapes.
* Backend functions should be the only Firestore writer for telemetry collections.
* The dashboard should read through backend APIs for analytics and may read live status either
  through backend APIs or directly through a locked-down read path later. In the first
  implementation, keeping the dashboard on backend APIs is simpler and consistent.

### Why this Firestore layout fits the spec and contracts

* The dashboard needs station metadata, active preset, event history, and tracked metrics:
  `spec/binbuddy-spec.md:98-101`.
* The dashboard also needs live device status and latest event in real time:
  `spec/binbuddy-spec.md:107-112`.
* Station metadata dimensions line up directly with required filter and comparison needs:
  `packages/contracts/schemas/domain/station-metadata.schema.json:31-66`.
* Analytics summary and query contracts imply a backend that can answer grouped and comparative
  reads without forcing the web client to aggregate raw events itself:
  `packages/contracts/schemas/analytics/analytics-query.schema.json:57-139` and
  `packages/contracts/schemas/analytics/analytics-summary.schema.json:46-236`.

### Recommended document-shape notes

* Event documents should denormalize `buildingId`, `floorId`, `locationLabel`, `signageVariant`,
  `layoutVariant`, and `activeRulesPresetId` at event-write time. That keeps historical analysis
  stable even if station metadata changes later.
* Live status documents should include the canonical live-status fields and a compact latest-event
  summary. The current shared schema already expects `latestEvent`.
* Rollup documents should include `scopeType`, `scopeId`, `bucketType`, `bucketStart`, headline
  totals, and derived metric slices used by contamination, purity, and leaderboard views.

## Short list of rejected alternatives

### Direct Pi writes to Firestore

Rejected because the current repository already routes backend deployment through Cloud Functions,
Firestore rules currently deny all access, and the Pi payloads do not yet match the canonical
contracts. A backend normalization layer is required first.

### Client-side analytics over raw event history only

Rejected because the spec requires grouped comparisons, leaderboards, historical charts, purity,
and contamination analysis. Firestore is a poor fit for pushing all of that aggregation into the
dashboard, and the analytics query and summary schemas clearly assume a backend reporting layer.

### Moving disposal-session business logic into backend functions

Rejected because the repo explicitly assigns the live control loop to the Raspberry Pi. Moving
classification, guidance, or drop-detection logic into the cloud would break the documented
boundary and add latency to the core station interaction.

### One mixed telemetry collection for live status, events, and metadata

Rejected because those records have different update patterns, retention needs, and query shapes.
Live status is mutable current state, events are append-only history, metadata is slow-changing
configuration, and analytics are read models.

## Clarifying questions that remain open

* The spec says the live monitoring page should show the current camera feed when active, but the
  current shared live-status contract only includes `cameraFeedActive` and no transport or URL.
  The repository does not yet define whether this will be a snapshot URL, a proxied stream, or a
  station-served feed.
* The repository does not yet define how operator-authored station metadata and rules presets will
  be managed. The blueprint assumes backend-owned writes for those collections.

## Best blueprint summary

Implement the backend first as a Cloud Functions package that validates and normalizes station
payloads, writes raw event history and live status into Firestore, materializes hourly and daily
analytics rollups, and exposes dashboard-facing read APIs. Then build the dashboard as a
feature-first web app with dedicated stations, live monitoring, events, analytics, filters, and
rules-preset modules. Keep all live disposal logic on the Raspberry Pi and treat the backend as a
cloud adapter plus reporting layer.