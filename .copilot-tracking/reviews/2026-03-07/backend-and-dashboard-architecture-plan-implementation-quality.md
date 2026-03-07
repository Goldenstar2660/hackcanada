<!-- markdownlint-disable-file -->
# Implementation Quality Validation: Backend and Dashboard Architecture

## Metadata

* Review date: 2026-03-07
* Scope: full-quality
* Related plan: .copilot-tracking/plans/2026-03-07/backend-and-dashboard-architecture-plan.instructions.md
* Related changes log: .copilot-tracking/changes/2026-03-07/backend-and-dashboard-architecture-changes.md
* Related research: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md

## Findings By Category

### Architecture

* Critical: The Phase 2 backend remains an SDK-agnostic scaffold rather than a deployable Firebase runtime. `services/backend-functions/src/index.ts` only re-exports factories and helpers, while repositories and latest-frame storage are backed by in-memory implementations instead of Firestore and Storage. Evidence: services/backend-functions/src/index.ts:1-20, services/backend-functions/src/firestore/repositories/index.ts:1-2, services/backend-functions/src/firestore/repositories/in-memory.ts:57-178, services/backend-functions/src/storage/latest-frame-storage.ts.
* Major: Analytics materialization is implemented as library logic, but no Firestore-triggered runtime path is exported. The ingest-event handler can invoke materialization directly, which does not satisfy the selected trigger-based backend architecture. Evidence: services/backend-functions/src/functions/ingest-event.ts:18-62, services/backend-functions/src/analytics/materializers/daily-rollups.ts:71-92, services/backend-functions/src/index.ts:1-20.

### UX And Behavior

* Critical: The live monitoring page never connects to live station data. It always creates a snapshot from `null`, so the page can only render the unavailable state instead of the live status, camera frame, detected item, disposal decision, and latest event required by the spec. Evidence: apps/web/src/pages/live-monitoring.tsx:12-24, apps/web/src/lib/firebase/live-monitoring.ts:79-121, spec/binbuddy-spec.md:107-113.
* Major: The delivered filter surface is informational only. The component renders current values and facet counts, but provides no interactive controls for station, floor, building, location, or time range changes. Evidence: apps/web/src/features/filters/filter-controls.tsx:9-58, spec/binbuddy-spec.md:90-105.

### Validation And Testability

* Major: Validation is incomplete in this environment. The exact workspace `corepack pnpm` path fails before pnpm starts, the tooling schema validator cannot run because `json-schema-to-typescript` is unavailable, and the configured Python environment does not include `pytest`. Evidence from this review session: `corepack pnpm run lint` failed with a Corepack signing-key error, `node packages/tooling/scripts/schema-tooling.mjs validate` failed with `ERR_MODULE_NOT_FOUND`, and `C:/Users/hello/Documents/Projects/hackcanada/.venv/Scripts/python.exe -m pytest -p no:cacheprovider devices/pi-station/tests` failed with `No module named pytest`.
* Major: Automated coverage for the new TypeScript backend and dashboard surface is missing. The reviewed changes add new ingestion, query, auth, and dashboard composition paths without corresponding TypeScript tests; the only changed automated test is the Pi smoke test file. Evidence: devices/pi-station/tests/test_smoke.py:1-104, services/backend-functions/src/functions/get-event-history.ts:1-16, services/backend-functions/src/functions/get-analytics-summary.ts:1-16, apps/web/src/pages/live-monitoring.tsx:1-35.
* Minor: Phase 1 still depends on a temporary contracts declaration shim and TS path alias bridge instead of normal generated declarations. Evidence: packages/contracts/package.json:1-11, packages/contracts/src/index.d.ts, tsconfig.base.json.

## Severity Summary

* Critical: 2
* Major: 4
* Minor: 1

## Residual Risks

* Direct TypeScript fallback compilation passed for `services/backend-functions` and `apps/web`, and editor diagnostics were clean, but that does not replace the missing package-manager, tooling, and Python validation paths.
* The backend and dashboard structure is coherent, but the missing runtime adapters and disconnected live route mean the most visible demo workflows are not actually end-to-end complete.
