---
title: Stitch Feature Hookup Matrix Research
description: Research matrix mapping Stitch mockup features to current frontend, backend, and contract support in the Hack Canada workspace.
ms.date: 2026-03-08
ms.topic: reference
keywords:
  - stitch
  - ui
  - research
  - contracts
  - backend
  - frontend
---

## Research scope

* Determine which Stitch mockup features under `spec/ui` can be integrated immediately with the current seams in `apps/web`, `services/backend-functions`, and `packages/contracts`
* Identify blocked features and the exact future development required to support them
* Produce a page-by-page matrix with evidence from the current codebase

## Status

* Complete

## Pages under review

* `spec/ui/login`
* `spec/ui/landing page`
* `spec/ui/dashboard`
* `spec/ui/devices`
* `spec/ui/device details`
* `spec/ui/analytics`

## Current seam inventory

* Current operator web routes are `/stations`, `/stations/:stationId`, `/stations/:stationId/live`, `/history`, `/analytics`, and `/comparisons` in `apps/web/src/app/router.tsx`
* Current backend callable surface is limited to `getStationDirectory`, `getEventHistory`, and `getAnalyticsSummary` in `apps/web/src/lib/api/dashboard-api.ts` and `services/backend-functions/src/index.ts`
* Current shared contracts already cover `StationDirectoryResponse`, `EventHistoryResponse`, `AnalyticsSummary`, `LiveStationStatus`, and `CameraFeedMetadata` in `packages/contracts/src/index.ts`
* Current live monitoring is a direct Firestore listener to `stationLiveStatus/{stationId}` through `apps/web/src/lib/firebase/live-status.ts`, which matches the repo-memory architecture note that live state should use direct listeners while analytics and history should go through backend APIs
* The current app is already stronger than the Stitch folder names suggest for operator dashboard use cases: stations directory, station detail, live monitoring, history, analytics summary, and comparisons are real seams today
* The mockups overstate support for write flows and convenience actions. There is no shipped device registration flow, no settings mutation flow, no manual scan trigger, no report export backend, and no AI-generated insights backend

## Page-by-page matrix

### Login

| Mockup feature | Data needed | Current supporting files, contracts, endpoints | Immediate integration status | Exact future development for gaps |
| --- | --- | --- | --- | --- |
| Email and password sign-in | Firebase Auth user session only | `apps/web/src/app/providers.tsx`; `apps/web/src/main.tsx` | Ready now | Restyle existing auth form to match the mockup |
| Operator-only app shell after sign-in | Firebase user plus backend operator authorization | `apps/web/src/app/providers.tsx`; `services/backend-functions/src/auth/operator-auth.ts` | Partial | Fix backend authorization logic so operator claims are actually required; current logic accepts any non-empty `uid` |
| Google sign-in button | OAuth provider wiring | `apps/web/src/app/providers.tsx` | Blocked | Enable Firebase Google provider in web auth flow, configure project auth providers, and align backend operator-claim issuance |
| GitHub sign-in button | OAuth provider wiring | `apps/web/src/app/providers.tsx` | Blocked | Enable Firebase GitHub provider, configure project auth providers, and align backend operator-claim issuance |
| Forgot password | Password reset email flow | `apps/web/src/app/providers.tsx` | Blocked | Add Firebase password reset UI and handler |
| Request access | User provisioning or invite flow | No current contract or endpoint | Blocked | Add backend workflow for invite requests or access requests, then connect UI |

### Landing page

| Mockup feature | Data needed | Current supporting files, contracts, endpoints | Immediate integration status | Exact future development for gaps |
| --- | --- | --- | --- | --- |
| Public product hero and marketing copy | Static content only | No current route; current app starts at `/stations` in `apps/web/src/app/router.tsx` | Blocked as-is | Add a public route and layout outside the operator dashboard shell |
| System Login CTA | Navigation target only | Login UI already exists inside `apps/web/src/app/providers.tsx` | Partial | Add a public entry route that links into the existing login experience |
| Public stats on footprint, usage, or impact | Aggregated public-safe metrics | Current analytics are operator-facing only through `getAnalyticsSummary` | Partial | Decide whether public metrics are in scope; if yes, add a public-safe backend read model and route |
| Footer and informational sections | Static content only | No current public site surface | Ready with new route | Add marketing page components and route wiring |

### Dashboard

| Mockup feature | Data needed | Current supporting files, contracts, endpoints | Immediate integration status | Exact future development for gaps |
| --- | --- | --- | --- | --- |
| Top-level overview cards | Analytics summary metrics and station directory counts | `apps/web/src/pages/analytics.tsx`; `apps/web/src/pages/stations.tsx`; `services/backend-functions/src/functions/get-analytics-summary.ts`; `services/backend-functions/src/functions/get-station-directory.ts` | Ready with light composition work | Compose existing analytics and directory reads into a dedicated overview page if the mockup must exist as a separate route |
| Operator navigation to detailed pages | Existing routes only | `apps/web/src/app/layout.tsx`; `apps/web/src/app/router.tsx` | Ready now | Restyle nav only |
| Dashboard page as shown in Stitch | Mostly hero-style landing content, not the actual operator dashboard | `spec/ui/dashboard/code.html`; `apps/web/src/app/layout.tsx` | Not a true 1:1 match | Treat this mockup as a landing or shell concept, not as the source of current operator route structure |

### Devices

| Mockup feature | Data needed | Current supporting files, contracts, endpoints | Immediate integration status | Exact future development for gaps |
| --- | --- | --- | --- | --- |
| Device or station card grid with health and metadata | Station directory read model | `apps/web/src/pages/stations.tsx`; `apps/web/src/features/stations/station-directory.tsx`; `services/backend-functions/src/functions/get-station-directory.ts`; `packages/contracts/src/index.ts` | Ready now | Mostly visual adapter work to map station cards to the mockup |
| Status badges such as online, syncing, offline | `StationRecord.status` and live freshness | `packages/contracts/src/index.ts`; `apps/web/src/features/stations/station-directory.tsx`; live support in `apps/web/src/lib/firebase/live-status.ts` | Ready with minor UI logic | Decide whether to use directory status alone or enrich cards with live-status freshness |
| Links to details and live views | Route parameters and station id | `apps/web/src/app/router.tsx`; `apps/web/src/features/stations/station-directory.tsx` | Ready now | Only restyle CTA controls |
| Aggregate device count | Station directory list length | `apps/web/src/pages/stations.tsx` | Ready now | None beyond UI |
| Register New Device or Add New Device | Device onboarding mutation flow | No current contract or backend mutation endpoint | Blocked | Define a device registration contract, add backend callable or admin flow, persist station metadata, and add UI form |
| Settings button per device | Device configuration mutation flow | No current route or backend mutation endpoint | Blocked | Add settings route, shared config contract, backend authorization, persistence, and optimistic UI/state refresh |

### Device details

| Mockup feature | Data needed | Current supporting files, contracts, endpoints | Immediate integration status | Exact future development for gaps |
| --- | --- | --- | --- | --- |
| Station metadata and identifying info | Station directory record by `stationId` | `apps/web/src/pages/station-detail.tsx`; `apps/web/src/pages/stations.tsx`; `packages/contracts/src/index.ts` | Ready now | Visual adapter only |
| Recent classifications or disposal history | Event history filtered by `stationId` | `apps/web/src/pages/station-detail.tsx`; `apps/web/src/pages/event-history.tsx`; `services/backend-functions/src/functions/get-event-history.ts`; `packages/contracts/src/index.ts` | Ready now | None beyond layout work |
| Live operational panel | Firestore `LiveStationStatus` document | `apps/web/src/pages/live-monitoring.tsx`; `apps/web/src/features/live/live-station-panel.tsx`; `packages/contracts/src/index.ts`; `packages/contracts/schemas/domain/live-station-status.schema.json` | Ready now | Merge live panel patterns into the detail experience if the mockup wants a unified page |
| Device health, latest event, and camera feed freshness | `LiveStationStatus` plus `cameraFeed` metadata | `apps/web/src/features/live/live-station-panel.tsx`; `services/backend-functions/src/functions/ingest-camera-frame.ts`; `services/backend-functions/src/storage/latest-frame-storage.ts` | Partial | Existing UI shows status and storage path, but not embedded images; add a safe image URL strategy and render current frame thumbnails |
| New Scan button | Manual scan trigger | `apps/web/src/pages/station-detail.tsx` explicitly says manual scan is unsupported | Blocked | Define an explicit device command contract, command transport, device acknowledgement, backend auth, and UI state machine |
| Device Map or live network visualization | Spatial topology or facility map dataset | No current contract, backend read model, or route | Blocked | Define map domain model, backend read model, and visualization component; also decide whether this is in scope for the spec-driven demo |
| Select Location control | Cross-location filter or reassignment action | Existing filters exist for analytics and history only in `apps/web/src/lib/query/dashboard-query.ts` | Partial | If read-only, reuse existing filter state concepts; if it means device reassignment, add a mutation flow and persistence |

### Analytics

| Mockup feature | Data needed | Current supporting files, contracts, endpoints | Immediate integration status | Exact future development for gaps |
| --- | --- | --- | --- | --- |
| KPI cards, diversion, contamination, totals | `AnalyticsSummary` | `apps/web/src/pages/analytics.tsx`; `services/backend-functions/src/functions/get-analytics-summary.ts`; `packages/contracts/src/index.ts` | Ready now | Mostly visual restyling |
| Cross-location variance and grouped comparisons | Grouped analytics queries by building, location, signage, layout, day, or station | `apps/web/src/pages/comparisons.tsx`; `apps/web/src/lib/query/dashboard-query.ts`; `apps/web/src/lib/api/dashboard-gateway.ts`; backend analytics query service | Ready now | Align chart selection and labels to the mockup |
| Classification trends with day, week, month controls | Time-bucketed analytics series | `apps/web/src/features/analytics/chart-adapters.ts`; `apps/web/src/pages/analytics.tsx`; backend analytics summary grouping | Partial | Current seams support grouped and trend-like series, but dedicated day, week, month toggle semantics and exact mockup chart shells need front-end shaping and possibly backend query parameters for explicit buckets |
| Per-location charts such as Waterloo and Mississauga | Named grouping dimensions and chart series | Current analytics grouping and comparison scenarios support location/building splits | Ready with adapter work | Map grouped results into fixed-location panels if those locations are part of the seed/demo dataset |
| Comparison tool button | Comparison route | `apps/web/src/pages/comparisons.tsx` | Ready now | Link or surface the existing route from the analytics page |
| Event history drill-through | Event history query | `apps/web/src/pages/event-history.tsx`; `services/backend-functions/src/functions/get-event-history.ts` | Ready now | Link from analytics cards if desired |
| Export report | File export contract and backend report generation | `apps/web/src/pages/analytics.tsx` explicitly marks export unavailable; no backend export endpoint | Blocked | Define export format, backend endpoint or async job, authorization, and downloadable artifact flow |
| AI-powered insights | AI summary input and output contract | `apps/web/src/pages/analytics.tsx` explicitly marks AI insights deferred; no contract or endpoint | Blocked | Define prompt inputs, output contract, model call path, evaluation criteria, and operator-safe UX |

## Implemented screens that are stronger than the mockups imply

* The current codebase already has a real live monitoring screen in `apps/web/src/pages/live-monitoring.tsx` backed by Firestore `LiveStationStatus`
* The current codebase already has a real event history screen in `apps/web/src/pages/event-history.tsx` backed by `getEventHistory`
* The current codebase already has a real comparisons screen in `apps/web/src/pages/comparisons.tsx` backed by synthesized analytics queries
* These three routes are the strongest evidence that the existing seams are optimized for an operator dashboard, not for a public marketing site

## Strongest immediately-hookable screens

* `spec/ui/devices` is the cleanest direct fit to the existing `/stations` route and station directory contract
* `spec/ui/device details` is highly hookable if treated as a composition of current station detail plus live monitoring, but it must drop or defer `New Scan`, `Device Map`, and rich camera media until new seams exist
* `spec/ui/analytics` is highly hookable for KPI cards, contamination and diversion metrics, grouped comparisons, and trend visualizations, but not for export or AI insight generation
* `spec/ui/login` is partially hookable because email and password auth exists today, while social auth and reset flows do not

## Highest-priority blocked features

* Backend authorization correctness is the top functional risk: `services/backend-functions/src/auth/operator-auth.ts` currently treats any authenticated user with a non-empty `uid` as authorized because the `uid` check is part of the allow condition
* Device registration and settings are absent end to end: there is no contract, no backend mutation endpoint, no route, and no persistence workflow
* Manual scan initiation is absent end to end and conflicts with the current product note in `apps/web/src/pages/station-detail.tsx` that detection starts automatically when an item is presented
* Export report and AI-powered insights are intentionally deferred in the current analytics page and have no supporting contracts or backend endpoints
* Embedded camera or media presentation is only partially prepared: ingestion and latest-frame metadata exist, but the frontend does not yet resolve and render the current frame image

## Correctness risks

* Auth risk: callable backend access is too permissive today because the operator authorization guard allows any authenticated `uid`; this should be corrected before relying on the login mockup as an operator gate
* Scope risk: the Stitch `dashboard` and `landing page` mockups look like public or hybrid marketing surfaces, but the implemented application is an operator dashboard with no public route. Treating those mockups as direct route requirements would silently expand scope beyond the current spec-aligned demo seams
* Pagination UX risk: `EventHistoryResponse` already carries a cursor, but `apps/web/src/pages/event-history.tsx` does not expose cursor navigation controls yet, so large history sets are only partially surfaced in the current UX
* Contract drift risk: repo memory and current architecture notes still indicate that device-emitted payloads and canonical contracts must remain explicitly normalized at backend boundaries; new features should reuse that pattern rather than letting UI needs leak into device payload shapes

## Open questions

* Should the Stitch `landing page` and `dashboard` artifacts be treated as true in-scope routes, or only as visual inspiration for future public-facing work?
* Should the `device details` mockup be interpreted as a single unified page, or should it be split across the existing station detail and live monitoring routes?
* Is social sign-in actually required for the demo, or is email and password sufficient once operator authorization is corrected?
* Are public-safe summary metrics intentionally in scope, or should all analytics remain operator-gated per the current app architecture?