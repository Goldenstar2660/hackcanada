---
title: Repository Fit Research for Backend and Dashboard
description: Verified repository structure and implementation constraints relevant to backend and dashboard architecture
ms.date: 2026-03-07
date: 2026-03-07
status: Complete
scope: repo-only verification unless external tooling documentation is required
---

## Research Topics

- Package manager and workspace shape
- TypeScript app and package setup
- Existing contracts, analytics, rules, and backend function packages
- Python device code integration points that affect backend contracts
- Conventions and gaps that should influence architecture recommendations

## Repository Fit Summary

- The repository is intentionally surface-first. The TypeScript workspace covers the dashboard, backend functions, and shared packages, while the Raspberry Pi runtime and ESP8266 firmware remain outside the Node workspace.
- The product spec is explicit about the target architecture: Firestore is the database, Cloud Functions is the website backend, and the Pi publishes event and live-status data for dashboard consumption.
- The strongest implemented backend and dashboard boundary is the JSON Schema contract set under packages/contracts/schemas. Most TypeScript packages and the backend package are still scaffold-level.
- The Python station runtime already models the live control loop, but its current event and live-status dataclasses do not yet match the canonical schemas exactly.

## Verified Findings

### Package manager and workspace shape

- The root package uses `pnpm@10.6.3` and exposes recursive `build`, `lint`, and `test` scripts from the workspace root.
- The pnpm workspace is limited to `apps/*`, `services/*`, and `packages/*`. The Python device code and firmware are intentionally outside that workspace.
- The TypeScript baseline uses `module` and `moduleResolution` set to `NodeNext`, `target` set to `ES2022`, `strict` mode enabled, and declaration output turned on.
- The root `justfile` confirms the intended split workflow: `web` runs the app package, `backend` runs the backend package, `pi` runs the Python station with `uv`, and `firmware` uses PlatformIO.
- The root README states that shared boundaries should be data-first and schema-first rather than shared cross-runtime business logic.

### TypeScript app and package setup

- The web package is a minimal TypeScript shell. It has no UI framework dependency and its source exports only a `webSurface` object describing the dashboard purpose.
- The backend-functions package is also a minimal TypeScript shell. It has no Firebase SDK dependency, no function registration code, and its source exports only a `backendSurface` object.
- Both the web and backend packages compile with plain `tsc`. There is no bundler, router, dev server, emulator script, or test harness in either package.
- The web package depends on `@binbuddy/analytics` and `@binbuddy/contracts`.
- The backend package depends on `@binbuddy/contracts` and `@binbuddy/rules`.
- The package layout implies that backend and dashboard code should consume shared contract packages, but the current shared package entrypoints do not yet expose the generated domain contracts in a usable way.

### Contracts, analytics, rules, and tooling

- The most concrete shared assets are the canonical JSON Schemas in `packages/contracts/schemas` and the generated TypeScript declaration files in `packages/contracts/generated/typescript`.
- Domain schemas currently define `DisposalEvent`, `LiveStationStatus`, `RulesPreset`, and `StationMetadata`.
- Analytics schemas currently define `AnalyticsQuery` and `AnalyticsSummary` with enough detail to drive dashboard filtering, grouping, comparison views, leaderboards, contamination reports, and time-bucketed charts.
- The generated TypeScript declarations are produced by `packages/tooling/scripts/schema-tooling.mjs`, which validates that each schema is Draft 2020-12, object-shaped, documented, and `additionalProperties: false` before generating `.d.ts` files via `json-schema-to-typescript`.
- The contracts package source entrypoint is still a placeholder and does not export the generated declaration surface. That means the canonical contracts exist, but they are not yet wired into package consumption ergonomics.
- The analytics package source only defines a minimal `AnalyticsMetricDefinition` interface. The real metric vocabulary currently lives in schema and README content, not executable code.
- The rules package source only defines a `RulesPresetReference` interface. The `packages/rules/presets` directory contains guidance only and no actual preset artifact files.
- The analytics metrics directory is also placeholder-only. It documents which metrics matter but does not implement formulas or aggregation specs.

### Backend and Firebase constraints

- The product spec, root README, services README, and backend README all align on Firebase Cloud Functions as the backend surface and Firestore as the database.
- `infra/firebase/firebase.json` points Firebase Functions at `services/backend-functions` and enables Firestore and emulator ports for UI, Functions, and Firestore.
- Firestore security rules currently deny all reads and writes, and Firestore indexes are empty. This is a deliberate placeholder, not an implementation-ready data model.
- The backend OpenAPI directory contains only a README. No callable or HTTP API descriptions exist yet.
- No Firebase runtime packages, emulator scripts, or Firestore collection definitions are present in the backend package today.

### Python device integration points that affect backend contracts

- The Python runtime owns the live control loop. `StationRuntime` loads runtime settings, begins detection, performs classification, maps the item through rules, sends ESP guidance, and creates disposal events after a drop is observed.
- The runtime settings already include `station_id`, `low_confidence_threshold`, `rules_preset_version`, `esp_endpoint`, and `firebase_project_id`, which shows the intended backend-facing configuration seam.
- `LiveStatusPublisher` is explicitly described as cloud-facing without being bound to Firebase yet, which is a strong indication that publishing should remain behind an adapter layer.
- The Pi runtime currently creates `DisposalEvent` and `LiveStatus` Python dataclasses locally rather than serializing against the canonical JSON Schema artifacts.

### Verified contract drift and implementation gaps

- The Python `DisposalEvent` model uses `station_id` and `success`, while the canonical schema requires `stationId` and `attemptResult` with enum values `success` or `failure`.
- The Python `LiveStatus` model exposes only `station_id`, `phase`, `predicted_item`, and `disposal_method`, while the canonical schema requires `stationId`, `timestamp`, `sessionState`, `cameraFeedActive`, and a structured `deviceHealth` object, with optional current-zone and latest-event fields.
- The Python session state values do not match the live-status schema values. The schema expects states such as `detecting-person`, `identifying-item`, `guiding-user`, `waiting-for-disposal`, and `syncing`, while the Python enum currently uses `detecting`, `guiding`, `waiting_for_disposal`, and `complete`.
- The Python rules model is not yet schema-complete. The canonical rules preset includes `presetId`, `jurisdiction`, `supportedItems`, `itemMappings`, `zoneMapping`, and `lowConfidenceThreshold`, while the Python loader currently returns only `version`, item mappings, and zone mappings.
- The Python runtime does not yet surface station metadata, although the dashboard and analytics contracts depend on `StationMetadata` fields such as building, floor, signage variant, and layout variant.
- The Pi README states that Firebase publishing, hardware integration details, model execution, and the Pi-to-ESP wire format remain follow-on work.
- The absence of actual preset files, metric definitions, and backend HTTP or callable endpoints means the schema layer is currently ahead of the implementation layer.

## Architecture Constraints for Backend and Dashboard Work

- Keep Firebase Cloud Functions and Firestore as the default backend direction unless the product spec is intentionally changed.
- Keep the Raspberry Pi as the owner of detection, classification, rules evaluation, disposal detection, and event creation. Do not move live loop logic into the dashboard or backend.
- Treat `packages/contracts/schemas` as the canonical domain boundary for backend and dashboard work. New backend and dashboard code should be shaped around those contracts, not the current placeholder TypeScript entrypoints.
- Add adapter layers at boundaries instead of coupling directly to current Python dataclasses. The Python runtime is not yet schema-aligned.
- Design backend ingestion to accept canonical event and live-status payloads and validate them before persistence.
- Expect station metadata to be a first-class backend concern because analytics queries and dashboard grouping depend on building, floor, location, signage, and layout fields that are not emitted by the Pi runtime today.
- Keep rules presets and analytics semantics data-first and language-neutral. The repo repeatedly warns against embedding Firestore assumptions into preset assets.
- Assume dashboard implementation is greenfield within the `apps/web` package. There is no existing framework or routing choice to preserve.
- Assume backend API design is also greenfield within `services/backend-functions`. OpenAPI and Firebase transport layers have not been defined yet.

## Conventions That Should Guide Recommendations

- Preserve the surface-first repo layout.
- Prefer schema-first integration between Python and TypeScript surfaces.
- Keep Firebase persistence concerns in backend and infra layers, not in Pi or firmware code.
- Keep firmware protocols narrow and Pi-facing rather than cloud-facing.
- Use shared packages for vocabulary and contracts, but avoid shared cross-runtime business logic.

## Outstanding Gaps

- No implemented Firebase Functions runtime code.
- No Firestore collection model, write path, or read-model design.
- No OpenAPI or callable API documents.
- No actual rules preset data files.
- No implemented analytics formula catalog beyond schema and README placeholders.
- No station metadata authoring or synchronization path.
- No contract validation bridge between Python payloads and TypeScript schema artifacts.
- No UI framework choice or dashboard composition structure.

## Recommended Next Research

- [ ] Define a concrete Firestore collection and document layout that fits `DisposalEvent`, `LiveStationStatus`, `StationMetadata`, and analytics read models.
- [ ] Decide whether dashboard-to-backend access should use HTTP functions, callable functions, direct Firestore reads, or a hybrid.
- [ ] Define a schema-aligned serialization contract for the Pi runtime so Python payloads can match the canonical JSON shapes.
- [ ] Decide how rules presets are authored, versioned, stored, and delivered to stations.
- [ ] Decide whether analytics will be computed on demand, materialized incrementally, or both.

## Evidence

- `spec/binbuddy-spec.md`
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `justfile`
- `README.md`
- `apps/web/package.json`
- `apps/web/src/index.ts`
- `apps/web/README.md`
- `services/backend-functions/package.json`
- `services/backend-functions/src/index.ts`
- `services/backend-functions/README.md`
- `services/backend-functions/openapi/README.md`
- `packages/contracts/schemas/domain/disposal-event.schema.json`
- `packages/contracts/schemas/domain/live-station-status.schema.json`
- `packages/contracts/schemas/domain/rules-preset.schema.json`
- `packages/contracts/schemas/domain/station-metadata.schema.json`
- `packages/contracts/schemas/analytics/analytics-query.schema.json`
- `packages/contracts/schemas/analytics/analytics-summary.schema.json`
- `packages/contracts/generated/typescript/README.md`
- `packages/contracts/generated/typescript/domain/disposal-event.d.ts`
- `packages/contracts/generated/typescript/domain/live-station-status.d.ts`
- `packages/contracts/generated/typescript/domain/rules-preset.d.ts`
- `packages/contracts/generated/typescript/domain/station-metadata.d.ts`
- `packages/contracts/generated/typescript/analytics/analytics-query.d.ts`
- `packages/contracts/generated/typescript/analytics/analytics-summary.d.ts`
- `packages/contracts/src/index.ts`
- `packages/analytics/README.md`
- `packages/analytics/metrics/README.md`
- `packages/analytics/src/index.ts`
- `packages/rules/presets/README.md`
- `packages/rules/src/index.ts`
- `packages/tooling/scripts/schema-tooling.mjs`
- `devices/pi-station/README.md`
- `devices/pi-station/pyproject.toml`
- `devices/pi-station/src/binbuddy_station/main.py`
- `devices/pi-station/src/binbuddy_station/session.py`
- `devices/pi-station/src/binbuddy_station/classification.py`
- `devices/pi-station/src/binbuddy_station/rules.py`
- `devices/pi-station/src/binbuddy_station/events.py`
- `devices/pi-station/src/binbuddy_station/live_status.py`
- `devices/pi-station/src/binbuddy_station/esp_client.py`
- `devices/pi-station/tests/test_smoke.py`
- `infra/firebase/firebase.json`
- `infra/firebase/firestore.rules`
- `infra/firebase/firestore.indexes.json`
- `infra/README.md`
- `services/README.md`
- `firmware/README.md`

## Clarifying Questions

- None. The repo provided enough evidence for a structural assessment.
