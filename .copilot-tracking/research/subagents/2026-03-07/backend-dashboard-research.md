---
title: Backend Dashboard Research
description: Assessment of non-device Binsight spec coverage across backend functions, web dashboard, shared contracts, analytics package, and demo seed data
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - backend
  - dashboard
  - analytics
  - research
estimated_reading_time: 8
---

## Research status

Complete

## Research topics

* Assess how much of the non-device system required by `spec/binsight-spec.md` is implemented today
* Focus on event payload support, live status, dashboard metrics and trends, intervention and experiment support, seeded historical data, and user-facing output parity with the spec
* Verify the implemented surface across `services/backend-functions`, `apps/web`, `packages/contracts`, `packages/analytics`, and seeded Firestore data

## Research notes

* No matching `.github/agents/**/researcher-subagent.agent.md` file exists in this workspace, so the repository-wide instructions and researcher-subagent mode protocol were used
* The spec is the source of truth for the comparison, especially the required event payload, dashboard outputs, live monitoring outputs, and demo seeding requirements at `spec/binsight-spec.md#L50-L58`, `spec/binsight-spec.md#L96-L120`

## Spec baseline

* The spec requires each disposal event to include station ID, timestamp, predicted item, correct disposal method, actual disposal zone, success or failure, model confidence, and LLM fallback usage at `spec/binsight-spec.md#L50-L58`
* The dashboard must support station metadata and rules presets, event history, tracked metrics, historical charts, filtering by station and location dimensions, signage and layout comparisons, and before or after plus A/B analysis at `spec/binsight-spec.md#L98-L105`
* The live monitoring page must show live device status, current session state, current detected item, current disposal decision, and the latest event in real time at `spec/binsight-spec.md#L108-L112`
* Demo seeding must include multi-station historical events, known changes such as signage updates and campaign dates, visibly different before or after patterns, intervention-driven contamination improvements, and demo-data markers for filtering at `spec/binsight-spec.md#L115-L120`

## Implemented system capabilities

* Canonical shared contracts cover the full required disposal event payload and most of the required live state payload. `DisposalEvent` includes all spec-required event fields, while `LiveStationStatus` includes session state, detected item, disposal method, current hand zone, latest event, and optional camera-feed metadata at `packages/contracts/src/index.ts#L35-L43`, `packages/contracts/src/index.ts#L67-L77`, `packages/contracts/src/index.ts#L250-L278`, `packages/contracts/src/index.ts#L311-L322`
* Backend ingestion is present for device events, live status, and camera frames. The Firebase runtime exports `ingestEvent`, `ingestLiveStatus`, `ingestCameraFrame`, `getAnalyticsSummary`, `getEventHistory`, and `getStationDirectory` at `services/backend-functions/src/runtime/firebase-runtime.ts#L30-L67`, and the handler entry points exist at `services/backend-functions/src/functions/ingest-event.ts#L22`, `services/backend-functions/src/functions/ingest-live-status.ts#L15`, `services/backend-functions/src/functions/ingest-camera-frame.ts#L56`, `services/backend-functions/src/functions/get-analytics-summary.ts#L12`, `services/backend-functions/src/functions/get-event-history.ts#L12`, and `services/backend-functions/src/functions/get-station-directory.ts#L11`
* The backend normalizes device.v1 snake_case ingress into canonical contracts, including session-phase mapping, latest-event projection, hand-zone projection, camera-feed metadata, model confidence, and LLM fallback fields at `services/backend-functions/src/domain/normalization.ts#L23-L26`, `services/backend-functions/src/domain/normalization.ts#L46-L75`, `services/backend-functions/src/domain/normalization.ts#L87-L123`. Validation enforces the same fields on ingress and stored live status at `services/backend-functions/src/domain/validation.ts#L241-L338`, `services/backend-functions/src/domain/validation.ts#L354-L379`
* Analytics rollups are materially implemented, not only declared. The rollup document supports `station`, `floor`, `building`, and `experiment` scopes, with signage, layout, and experiment dimension fields at `services/backend-functions/src/firestore/repositories/types.ts#L59-L75`. The query service computes grouped results, contamination items, worst times of day, bin purity, leaderboards, chart series, station directory filters, and event history at `services/backend-functions/src/analytics/query-service.ts#L97-L107`, `services/backend-functions/src/analytics/query-service.ts#L118-L190`, `services/backend-functions/src/analytics/query-service.ts#L199-L226`, and `services/backend-functions/src/analytics/query-service.ts#L228-L255`
* The rollup mapper implements the spec headline metrics and derived datasets: total attempts, total correct sorts, first-try correct rate, participation or compliance score, contamination items, worst times of day, bin purity, chart series, and leaderboards at `services/backend-functions/src/analytics/mappers/event-rollup.ts#L27-L40`, `services/backend-functions/src/analytics/mappers/event-rollup.ts#L142-L158`, `services/backend-functions/src/analytics/mappers/event-rollup.ts#L160-L206`, `services/backend-functions/src/analytics/mappers/event-rollup.ts#L208-L245`, and `services/backend-functions/src/analytics/mappers/event-rollup.ts#L247-L274`
* Seeded backend data includes multiple stations, multi-day event history, live status snapshots, and experiment-aware rollups. The seed dataset defines three stations with different building, floor, location, signage, and layout variants at `services/backend-functions/scripts/seed-demo-data.mjs#L25-L58`; generates seeded events with model confidence and LLM fallback fields at `services/backend-functions/scripts/seed-demo-data.mjs#L214-L247`; builds live statuses and rollups at `services/backend-functions/scripts/seed-demo-data.mjs#L280-L329`; and materializes station, floor, building, and experiment rollups for `locationLabel`, `signageVariant`, and `layoutVariant` at `services/backend-functions/scripts/seed-demo-data.mjs#L337-L424`
* The web application exposes the major operator-facing surfaces required by the spec. Routes exist for stations, station detail, live monitoring, event history, analytics, and comparisons at `apps/web/src/app/router.tsx#L13-L50`. The station directory and detail pages expose active rules presets and experiment variants at `apps/web/src/features/stations/station-directory.tsx#L13-L57` and `apps/web/src/pages/station-detail.tsx#L37-L99`. The live page subscribes to Firestore-backed live status at `apps/web/src/pages/live-monitoring.tsx#L26-L48`, `apps/web/src/lib/firebase/live-status.ts#L56-L71`, and `apps/web/src/lib/firebase/live-monitoring.ts#L33-L120`
* The dashboard query layer supports station, building, floor, location, signage, layout, and time filters, plus comparison scenarios for building, location, signage variant, layout variant, before or after, and A/B analyses at `apps/web/src/lib/query/dashboard-query.ts#L13-L27`, `apps/web/src/lib/query/dashboard-query.ts#L120-L188`, and `apps/web/src/lib/query/dashboard-query.ts#L224-L287`

## Major missing or divergent features

* The user-facing live page explicitly omits camera rendering even though contracts and backend storage support camera-feed metadata and camera-frame ingestion. The route still describes "latest-frame camera monitoring" at `apps/web/src/app/router.tsx#L29-L34`, but the page says it is "text-first" and that camera capture, storage, and rendering remain outside the current phase at `apps/web/src/pages/live-monitoring.tsx#L101-L112`. The live panel repeats that camera media is intentionally omitted at `apps/web/src/features/live/live-station-panel.tsx#L75-L77`. This is a deliberate divergence from the fuller live-monitoring surface implied by the spec and route text
* Event payload support exists in contracts and backend storage, but the event-history UI does not expose all spec-required event fields. The event contract includes `modelConfidence` and `llmFallbackUsed` at `packages/contracts/src/index.ts#L35-L43`, and the event history response returns the full event object at `packages/contracts/src/index.ts#L250-L255`. The event-history table renders only timestamp, station, predicted item, correct method, actual zone, and outcome at `apps/web/src/features/events/event-history-panel.tsx#L19-L24`, so confidence and fallback provenance are not visible to operators
* The analytics backend computes bin purity, but the analytics page does not visibly render a dedicated bin-purity section. The summary contract includes `binPurity` at `packages/contracts/src/index.ts#L191-L197`, and the query service populates it at `services/backend-functions/src/analytics/query-service.ts#L180-L183`. The analytics panel renders grouped results, contamination items, worst times, leaderboards, and trend series at `apps/web/src/features/analytics/analytics-summary-panel.tsx#L32-L80`, but there is no matching bin-purity block in that component
* The main analytics page is fixed to a building-grouped daily summary rather than a richer configurable analysis surface. `loadAnalyticsPage` always requests `groupBy: ["buildingId"]` with `timeBucket: "day"` at `apps/web/src/pages/analytics.tsx#L14-L23`. That means the route shows one opinionated summary view, while the spec calls for broader station and location grouping and historical analysis support at `spec/binsight-spec.md#L98-L105`
* The comparisons page advertises before-after, A/B, signage, layout, building, and location analysis, but the rendered UI is shallow. Scenario definitions exist at `apps/web/src/lib/query/dashboard-query.ts#L224-L287`, and the comparison overview states those analyses route through backend queries at `apps/web/src/features/comparisons/comparison-overview.tsx#L11-L13`. In practice, each card only shows compliance score, total attempts, and grouped compliance results at `apps/web/src/features/comparisons/comparison-overview.tsx#L21-L31`, so users do not see contamination shifts, purity deltas, or historical trend evidence per scenario
* Demo seeding only partially models interventions. The seed script varies success plans by day and station and persists experiment-aware rollups, which is enough to support implicit comparison by signage, layout, and location at `services/backend-functions/scripts/seed-demo-data.mjs#L60-L118`, `services/backend-functions/scripts/seed-demo-data.mjs#L337-L424`. However, it does not create explicit intervention or campaign records for signage updates, campaign dates, or change boundaries, and no contract or Firestore collection exists for those entities beyond generic experiment dimensions at `services/backend-functions/src/firestore/collections.ts#L1-L20` and `packages/contracts/src/index.ts#L117-L173`
* Seeded records are not consistently marked as demo data where the spec expects filtering support. The script writes `source: "seed-demo-data"` only to the analytics materialization ledger at `services/backend-functions/scripts/seed-demo-data.mjs#L510-L514`, while live statuses and disposal events are written without any `isDemo` or equivalent flag at `services/backend-functions/scripts/seed-demo-data.mjs#L499-L503` and `services/backend-functions/scripts/seed-demo-data.mjs#L518-L522`. This falls short of `spec/binsight-spec.md#L120`
* `packages/analytics` is effectively unused scaffolding for this feature area. Its source currently exports only `AnalyticsMetricDefinition` at `packages/analytics/src/index.ts#L1-L4`, so the shared analytics logic lives in backend functions rather than in a reusable package

## Capability-by-capability assessment

### Event payload support

* Implemented at the contract, validation, normalization, ingestion, and storage layers
* Partially surfaced in the operator UI because model confidence and LLM fallback are not shown in event history

### Live status

* Implemented for session state, detected item, disposal decision, device health, latest event, stale detection, and Firestore subscription flow at `packages/contracts/src/index.ts#L67-L77`, `apps/web/src/lib/firebase/live-monitoring.ts#L7-L21`, `apps/web/src/lib/firebase/live-monitoring.ts#L37-L58`, `apps/web/src/pages/live-monitoring.tsx#L71-L90`, and `apps/web/src/features/live/live-station-panel.tsx#L36-L61`
* Camera-feed metadata is implemented in contracts and backend ingestion at `packages/contracts/src/index.ts#L60-L77`, `services/backend-functions/src/functions/ingest-camera-frame.ts#L73-L108`, and `services/backend-functions/src/storage/latest-frame-storage.ts#L39-L68`, but omitted from the live UI

### Dashboard metrics and trends

* Implemented in the backend read model for all named metrics in the spec at `packages/contracts/src/index.ts#L131-L173`, `services/backend-functions/src/analytics/query-service.ts#L163-L190`, and `services/backend-functions/src/analytics/mappers/event-rollup.ts#L142-L274`
* Only partially surfaced in the analytics and comparisons UI because bin purity is not shown and comparison cards do not expose metric-specific trend details

### Intervention and experiment support

* Implemented structurally for signage, layout, and location experiments through station metadata, analytics groupings, filters, and experiment rollups at `packages/contracts/src/index.ts#L117-L173`, `services/backend-functions/src/firestore/collections.ts#L15-L20`, `services/backend-functions/src/firestore/repositories/types.ts#L61-L75`, and `apps/web/src/lib/query/dashboard-query.ts#L224-L287`
* Not implemented as explicit intervention entities or dated change records, which weakens true before or after storytelling and explicit campaign analysis versus what the spec calls for at `spec/binsight-spec.md#L116-L118`

### Seeded historical data

* Implemented for multi-station, multi-day event history, live statuses, and rollups across floors and buildings at `services/backend-functions/scripts/seed-demo-data.mjs#L25-L58`, `services/backend-functions/scripts/seed-demo-data.mjs#L250-L329`, and `services/backend-functions/scripts/seed-demo-data.mjs#L477-L545`
* Only partially aligned to spec because explicit campaign dates, signage-update records, intervention markers, and demo-data flags on user-queryable records are missing

### User-facing output parity

* Station directory, station detail, live state text feed, analytics overview, event history, and comparison entry points are implemented at `apps/web/src/app/router.tsx#L13-L50`
* The operator UI still under-delivers against the spec in three visible places: it omits camera media, hides event confidence and fallback provenance, and does not fully express purity and intervention-driven comparison outputs

## Recommended integration gaps to mention in the final comparison

* The backend and contracts are substantially ahead of the dashboard presentation layer. The core ingestion, normalization, analytics materialization, and comparison query surfaces exist, but the web app currently exposes a reduced subset of that data
* Event-history presentation should expose `modelConfidence` and `llmFallbackUsed` because those are spec-required event fields and are already available in the stored event contract
* Live monitoring should either render camera-feed metadata and latest-frame state explicitly or the route and copy should be narrowed so the user-facing promise matches the actual demo output
* Analytics UI should add a first-class bin-purity view and scenario-specific trend details so the frontend matches the backend read model and the spec metrics list
* Before or after and A/B support is present as query structure and seeded variant data, but it lacks explicit intervention or campaign entities and date markers. That should be called out as partial implementation rather than complete compliance
* Demo data should be marked directly on disposal events, live statuses, and rollups, not only in the materialization ledger, if presentation-time filtering of demo records is a requirement
* `packages/analytics` does not currently provide reusable domain logic, so the analytics boundary is still concentrated in backend-functions. That matters if the final comparison discusses maintainability or shared computation strategy

## Recommended next research

- [ ] Verify whether Firestore rules and indexes currently permit the intended operator reads for live status, history, and analytics at runtime
- [ ] Compare device-side emitters in `devices/pi-station` against the canonical ingress contracts to confirm the backend normalization assumptions still match live payloads
- [ ] Inspect seeded Firestore documents after a real seed run to confirm the actual stored shapes match the code paths reviewed here
- [ ] Review whether any dashboard CSS or hidden components already exist for a richer purity or camera presentation surface that is not yet routed in

## Clarifying questions

* None from repository research alone