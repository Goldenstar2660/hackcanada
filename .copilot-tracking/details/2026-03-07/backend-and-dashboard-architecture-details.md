<!-- markdownlint-disable-file -->
# Implementation Details: Backend and Dashboard Architecture

## Context Reference
Sources: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md, spec/binbuddy-spec.md, and the current workspace package manifests for validation commands.

## Implementation Phase 1: Canonical contracts and Firebase data model

<!-- parallelizable: false -->

### Step 1.1: Finalize ingestion contracts and normalization boundaries

Use the contract package and backend domain layer to separate device ingress payloads from canonical persisted documents. Model the Pi payloads as ingress DTOs, then map them into the canonical `DisposalEvent` and `LiveStationStatus` shapes before any Firestore writes.

Files:
* packages/contracts/src/index.ts - Export ingress request types and canonical domain types needed by backend and dashboard code
* packages/contracts/schemas/domain/disposal-event.schema.json - Confirm persisted disposal event shape and required enums
* packages/contracts/schemas/domain/live-station-status.schema.json - Confirm live status shape for operator monitoring
* services/backend-functions/src/domain/contracts.ts - Define device ingress payload types and canonical mapping targets
* services/backend-functions/src/domain/validation.ts - Centralize runtime validation for inbound device and dashboard requests

Success criteria:
* The backend has an explicit mapping boundary between device payloads and canonical documents
* Shared TypeScript surfaces reference canonical contracts instead of ad hoc payload shapes

Context references:
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 194-199) - Selected backend and dashboard architecture
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 285-291) - Normalization boundary requirement
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 316-319) - Follow-on work for contracts and payload alignment

Dependencies:
* packages/contracts remains the canonical cross-surface vocabulary
* Downstream Firestore and dashboard work depends on stable canonical request and document shapes

### Step 1.2: Define Firestore collections, converters, and access rules

Establish root-level collections and day-bucket analytics documents around the query patterns identified in research. Pair the collection map with initial Firebase rules and composite-index placeholders so later phases do not depend on undocumented storage assumptions.

Files:
* services/backend-functions/src/firestore/collections.ts - Name and document canonical collection paths and rollup keys
* services/backend-functions/src/firestore/converters.ts - Encode Firestore serialization for events, live status, metadata, and analytics views
* infra/firebase/firestore.rules - Permit only the read and write paths required by device ingress and operator views
* infra/firebase/firestore.indexes.json - Add the first composite indexes for event history and grouped dashboard filters
* packages/contracts/schemas/domain/station-metadata.schema.json - Confirm metadata fields required for grouping and filters
* packages/contracts/schemas/domain/rules-preset.schema.json - Confirm the active rules-preset shape exposed to stations and dashboard views

Success criteria:
* Collection names and key structures are documented once and reused consistently
* Firestore rules and indexes reflect the planned data access paths
* Station records and station-directory responses expose the active rules preset needed by operator views

Context references:
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 141-146) - Hybrid split and root-level collections
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 179-190) - Canonical Firestore collection layout
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 317-318) - Firestore document shape and API boundary follow-on work

Dependencies:
* Step 1.1 completion
* Firebase remains the selected backend platform for this task

### Step 1.3: Validate phase changes

Run package-scoped type checks after contract and data-model changes, then run the root validation commands once the shared surfaces compile cleanly.

Validation commands:
* corepack pnpm --filter @binbuddy/contracts run lint - Contract package type validation
* corepack pnpm --filter @binbuddy/backend-functions run lint - Backend type validation for Firestore and domain modules
* corepack pnpm run lint - Workspace-wide TypeScript validation after shared contract changes

## Implementation Phase 2: Backend ingress, aggregation, and dashboard APIs

<!-- parallelizable: false -->

### Step 2.1: Implement authenticated device ingestion functions and camera-frame transport

Add HTTP Cloud Functions for disposal events, live station status, and current camera frames. These endpoints should authenticate the Pi, validate ingress payloads, normalize them into canonical documents, and write only through the repository layer. For the demo camera-feed path, use an authenticated latest-frame upload model: the Pi posts the current JPEG frame only while the station is active, the backend overwrites a single latest-frame object in Firebase Storage, and the live-status document carries the storage reference, last-update timestamp, and active-state metadata that the dashboard needs to refresh the image and detect stale feed state.

Files:
* services/backend-functions/src/functions/ingest-event.ts - HTTP ingress for disposal attempts with idempotent event writes
* services/backend-functions/src/functions/ingest-live-status.ts - HTTP ingress for station live status upserts
* services/backend-functions/src/functions/ingest-camera-frame.ts - HTTP ingress for the current camera frame and latest-frame metadata updates
* services/backend-functions/src/auth/device-auth.ts - Device authentication and signature verification
* services/backend-functions/src/firestore/repositories/ - Encapsulate event and live status persistence
* services/backend-functions/src/storage/ - Encapsulate latest-frame writes, retention, and path conventions for station camera images
* services/backend-functions/src/index.ts - Export deployed function entry points

Success criteria:
* Device ingress does not bypass validation or normalization code paths
* Event writes and live-status writes are idempotent at the repository boundary
* Camera-feed transport has explicit producer ownership, operator read path, stale-feed handling, and single-frame retention behavior for the demo

Context references:
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 196-203) - Firebase-native backend-for-frontend selection
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 210-223) - Recommended backend module layout
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 316-319) - Planning priorities for ingress contracts and payload alignment
* spec/binbuddy-spec.md (Lines 107-110) - Live monitoring requires the current camera feed when active

Dependencies:
* Implementation Phase 1 completion

### Step 2.2: Establish callable dashboard APIs and operator authorization

Select callable Cloud Functions as the initial dashboard API surface because the web app can rely on Firebase-authenticated operator sessions while the Pi continues to use HTTP ingress. Define the operator-auth module, apply authorization checks in callable handlers, and codify which Firestore listener paths remain readable for authenticated operators.

Files:
* services/backend-functions/src/auth/operator-auth.ts - Verify operator identity and claims for callable functions and Firestore access assumptions
* services/backend-functions/src/functions/get-analytics-summary.ts - Expose analytics via callable function entry points
* services/backend-functions/src/functions/get-event-history.ts - Expose filtered event history via callable function entry points
* services/backend-functions/src/functions/get-station-directory.ts - Expose station directory, active rules preset metadata, and filter metadata via callable function entry points
* apps/web/src/lib/api/ - Invoke callable dashboard APIs with a single client boundary
* apps/web/src/lib/firebase/ - Limit direct Firestore listeners to authorized live-status reads
* infra/firebase/firestore.rules - Encode operator-facing read constraints for live station state

Success criteria:
* The initial dashboard API transport is selected and applied consistently across web and backend code
* Operator-facing API calls and live listeners enforce explicit authorization rules before data access
* Station-directory and station-detail query models include the active rules preset required by the product spec

Context references:
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 196-208) - Selected backend and dashboard split
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 210-223) - Recommended backend auth and function layout
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 318-318) - Open decision on callable versus HTTP dashboard APIs

Dependencies:
* Implementation Phase 1 completion
* Device ingress remains on HTTP and should not share operator auth assumptions

### Step 2.3: Materialize analytics read models and dashboard query services

Build Firestore-triggered materializers for daily rollups plus dashboard-facing query functions for analytics summary, station directory, and event history. Keep the materializers idempotent because trigger delivery is at least once and unordered.

Files:
* services/backend-functions/src/analytics/materializers/ - Build rollup writers for station, floor, building, and experiment views
* services/backend-functions/src/analytics/mappers/ - Transform raw event documents into aggregate counters and chart-ready series
* services/backend-functions/src/analytics/query-service.ts - Compose analytics and comparison responses for the dashboard
* services/backend-functions/src/functions/get-analytics-summary.ts - Dashboard analytics endpoint
* services/backend-functions/src/functions/get-event-history.ts - Dashboard history endpoint
* services/backend-functions/src/functions/get-station-directory.ts - Dashboard station lookup endpoint

Success criteria:
* Dashboard analytics are served from materialized read models rather than browser-side Firestore composition
* Event history and station lookup endpoints encapsulate query complexity behind backend APIs

Context references:
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 204-208) - Preferred backend, data, and dashboard split
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 285-291) - Why analytics composition belongs in the backend
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 302-309) - Rejected alternatives that should not shape implementation

Dependencies:
* Step 2.1 completion
* Step 2.2 completion
* Firestore trigger handlers must tolerate retries and reordering

### Step 2.4: Validate phase changes

Run backend package validation after each function and materializer slice lands, then run the workspace build once the service exports are wired.

Validation commands:
* corepack pnpm --filter @binbuddy/backend-functions run lint - Backend type validation
* corepack pnpm --filter @binbuddy/backend-functions run build - Backend transpilation check
* corepack pnpm run build - Workspace build after backend entry points compile

## Implementation Phase 3: Dashboard shell, live monitoring, and analytics views

<!-- parallelizable: false -->

### Step 3.1: Scaffold the React dashboard application structure

Replace the current shell with an application layout that separates routing, providers, feature modules, and shared data-access libraries. Keep live state listeners in Firebase helpers and backend calls in API clients so data paths remain explicit.

Files:
* apps/web/src/app/router.tsx - Define routes for station list, station detail, live monitoring, analytics, and comparison pages
* apps/web/src/app/providers.tsx - Register Firebase and query providers
* apps/web/src/app/layout.tsx - Shared page frame and navigation
* apps/web/src/lib/firebase/ - Firestore listener wrappers for live status
* apps/web/src/lib/api/ - Backend function clients for analytics, event history, and station directory
* apps/web/src/lib/query/ - Shared query serialization and state helpers

Success criteria:
* The dashboard has explicit modules for live listeners versus backend API calls
* Route and provider structure supports the feature set from the product spec and research

Context references:
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 204-208) - Selected dashboard split between Firestore listeners and backend APIs
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 225-261) - Recommended web package and feature layout
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 320-320) - Scaffolding next step for apps/web

Dependencies:
* Implementation Phase 1 completion
* Phase 2 APIs can evolve in parallel as long as client interfaces remain contract-driven

### Step 3.2: Implement live station views, event history, and analytics pages

Build the initial dashboard pages around station directory, live status, filtered history, KPI summaries, and comparison charts. Make the filter surface explicit by covering station, floor, building, location, and time-range controls. Make the comparison surface explicit by covering signage and layout variants plus before-after and A/B historical analysis views. Keep chart adapters separate from transport models so view code does not depend on raw backend response shapes. Render the live camera feed from the latest-frame storage reference carried in live status, refresh it only while the station is active, and show an unavailable or stale state when the frame timestamp ages past the defined threshold.

Files:
* apps/web/src/features/stations/ - Station directory and grouping UI
* apps/web/src/features/live/ - Station live monitoring widgets, latest-frame camera-feed rendering, and stale-feed handling
* apps/web/src/features/events/ - Paginated event history and filter controls
* apps/web/src/features/analytics/ - KPI cards and trend charts
* apps/web/src/features/comparisons/ - Cross-station, building, signage-variant, and layout-variant comparison views
* apps/web/src/features/filters/ - Reusable station, floor, building, location, and time-range controls
* apps/web/src/pages/ - Route-level composition for the feature modules

Success criteria:
* Operator views consume canonical live status and dashboard query models
* Analytics and comparison pages do not query Firestore directly for historical rollups
* Station list and station detail views show the active rules preset surfaced by backend directory data
* Comparison views explicitly cover before-after and A/B analysis plus grouping by building and location
* The live monitoring page renders the current camera frame when active and degrades cleanly to a stale or unavailable state when updates stop

Context references:
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 194-208) - End-to-end architecture and dashboard responsibilities
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 293-300) - Dashboard service-boundary example
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 52-61) - Remaining question about live camera feed transport

Dependencies:
* Step 3.1 completion
* Phase 2 query endpoints available or mocked against final contracts

### Step 3.3: Validate phase changes

Run web package validation after routing and data-access changes, then run workspace checks once the dashboard compiles against shared contracts.

Validation commands:
* corepack pnpm --filter @binbuddy/web run lint - Dashboard type validation
* corepack pnpm --filter @binbuddy/web run build - Dashboard transpilation check
* corepack pnpm run build - Workspace build after dashboard modules compile

## Implementation Phase 4: Cross-surface integration hardening

<!-- parallelizable: false -->

### Step 4.1: Align Raspberry Pi emitters and operational configuration

Decide whether to move the Python emitters fully to canonical payloads or to preserve a stable device shape and formalize backend-only normalization. In either case, codify the decision in device code, backend adapters, and operator-facing documentation so the integration boundary stops drifting.

Files:
* devices/pi-station/src/binbuddy_station/events.py - Match event emission to the selected canonical mapping strategy
* devices/pi-station/src/binbuddy_station/live_status.py - Match live status emission to the selected canonical mapping strategy
* devices/pi-station/src/binbuddy_station/esp_client.py - Preserve any device identifiers or auth headers needed by backend ingress
* devices/pi-station/README.md - Document device-to-cloud payload responsibilities
* services/backend-functions/src/domain/normalization.ts - Keep backend mapping logic explicit if Python payloads remain device-optimized

Success criteria:
* Device and backend owners share one documented payload contract boundary
* Authentication and payload versioning assumptions are captured before field testing

Context references:
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 84-94) - Verified contract drift in current Python payloads
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 285-291) - Backend normalization requirement
* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 319-319) - Next planning step for payload alignment

Dependencies:
* Implementation Phase 2 completion
* Any device authentication strategy must match backend ingress assumptions

### Step 4.2: Validate phase changes

Run device and workspace validation after cross-surface contract changes, keeping Python smoke coverage in scope for the Pi runtime.

Validation commands:
* uv run pytest -p no:cacheprovider devices/pi-station/tests - Pi smoke and integration guardrails
* corepack pnpm run lint - Workspace TypeScript validation after cross-surface updates
* corepack pnpm run build - Workspace build after integration hardening

## Implementation Phase 5: Final validation and release readiness

<!-- parallelizable: false -->

### Step 5.1: Run full project validation

Execute the full workspace validation suite after all feature work completes.

Validation commands:
* corepack pnpm run lint
* corepack pnpm run build
* corepack pnpm run test
* uv run pytest -p no:cacheprovider devices/pi-station/tests

### Step 5.2: Fix minor validation issues

Resolve straightforward type, schema, and smoke-test regressions discovered in final validation. If failures require broad contract redesign or architectural changes, stop and return to planning instead of expanding scope inline.

### Step 5.3: Report blocking issues

Record any unresolved schema, auth, query, or camera-feed blockers with affected files and recommended follow-up planning before implementation continues.

## Dependencies

* Firebase project access and emulator or deployment configuration for Functions and Firestore validation
* A Python environment capable of running `uv` and `pytest` for device smoke coverage

## Success Criteria

* The backend, Firestore, and dashboard implementation follows the selected hybrid architecture from research
* Validation commands cover shared TypeScript packages, Firebase backend code, web dashboard code, and Pi smoke tests