<!-- markdownlint-disable-file -->
# Review Log: Backend and Dashboard Architecture

## Metadata

* Review date: 2026-03-07
* Related plan: .copilot-tracking/plans/2026-03-07/backend-and-dashboard-architecture-plan.instructions.md
* Changes log: .copilot-tracking/changes/2026-03-07/backend-and-dashboard-architecture-changes.md
* Research document: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md
* Planning log: .copilot-tracking/plans/logs/2026-03-07/backend-and-dashboard-architecture-log.md
* Review scope resolution: Attached planning log plus latest dated plan, changes, and research artifacts for 2026-03-07

## Current Status

* Phase 1 artifact discovery: complete
* Phase 2 RPI validation: complete
* Phase 3 quality validation: complete
* Phase 4 review completion: complete

## Severity Summary

* Critical: 2
* Major: 6
* Minor: 3

## Per-Phase Validation

* Phase 1: Partial
	* Status: Core contract and data-model work is implemented.
	* Findings: Minor validation deviation because the exact `corepack pnpm` commands did not run; minor build-plumbing deviation because Phase 1 still depends on a temporary contracts declaration shim and TS path alias bridge.
	* Evidence: packages/contracts/src/index.ts, services/backend-functions/src/domain/normalization.ts, services/backend-functions/src/firestore/collections.ts, infra/firebase/firestore.rules.
* Phase 2: Partial
	* Status: Domain boundaries, handlers, repositories, and analytics/query seams exist, but the Firebase runtime is not actually deployed.
	* Findings: Critical gap because the backend exports SDK-agnostic factories instead of concrete Firebase HTTP, callable, and trigger entry points; critical gap because persistence and latest-frame storage are still in-memory only; major gap because analytics materialization is not Firestore-triggered; major gap because the dashboard data-access layer remains abstract rather than Firebase-bound end to end.
	* Evidence: services/backend-functions/src/index.ts, services/backend-functions/src/functions/runtime.ts, services/backend-functions/src/firestore/repositories/in-memory.ts, services/backend-functions/src/storage/latest-frame-storage.ts, services/backend-functions/src/functions/ingest-event.ts.
* Phase 3: Failed
	* Status: Shell and historical pages are scaffolded, but core live-monitoring behavior is missing.
	* Findings: Critical gap because the live monitoring route always creates a snapshot from `null` instead of subscribing to live station state; major gap because the filter surface is read-only rather than interactive controls; minor validation deviation because exact package-manager commands did not run.
	* Evidence: apps/web/src/pages/live-monitoring.tsx, apps/web/src/lib/firebase/live-monitoring.ts, apps/web/src/features/filters/filter-controls.tsx.
* Phase 4: Partial
	* Status: The Pi-to-backend `device.v1` boundary is implemented and aligned with the spec.
	* Findings: Major validation gap because the exact workspace lint/build commands required by the plan did not run.
	* Evidence: devices/pi-station/src/binbuddy_station/events.py, devices/pi-station/src/binbuddy_station/live_status.py, services/backend-functions/src/domain/normalization.ts, devices/pi-station/tests/test_smoke.py.
* Phase 5: Partial
	* Status: Blocking issues were reported, but full validation evidence is incomplete.
	* Findings: Major gap because Step 5.1 was marked complete without successful execution of the exact workspace `lint`, `build`, and `test` flow; major gap because the tooling schema-validation path was not exercised; minor traceability gap because Step 5.2 does not show a concrete issue-to-fix audit trail.
	* Evidence: package.json, packages/tooling/package.json, .copilot-tracking/changes/2026-03-07/backend-and-dashboard-architecture-changes.md, .copilot-tracking/plans/logs/2026-03-07/backend-and-dashboard-architecture-log.md.

## Implementation Quality Findings

* Architecture
	* Critical: The backend remains an SDK-agnostic scaffold rather than a deployable Firebase runtime. Query and persistence paths are not backed by Firestore and Storage.
	* Major: Analytics materialization exists only as library logic and is not exposed as a trigger-driven runtime path.
* UX and behavior
	* Critical: The live monitoring page is disconnected from live station data and cannot satisfy the spec's real-time operator view.
	* Major: Filter controls are not controls; they only summarize current filter state.
* Validation and testability
	* Major: Validation is environment-blocked across package-manager, tooling dependency, and Python test dependency paths.
	* Major: There is no matching TypeScript automated coverage for the new backend and dashboard surfaces.
	* Minor: The contracts declaration shim remains temporary and increases drift risk until normal build output exists.

Detailed quality log: .copilot-tracking/reviews/2026-03-07/backend-and-dashboard-architecture-plan-implementation-quality.md

## Validation Commands

* `get_errors` on `apps/web`, `services/backend-functions`, and `devices/pi-station`: pass, no active editor diagnostics.
* `corepack pnpm run lint`: fail. Corepack exited before pnpm execution with a signing-key verification error.
* `npx --yes -p typescript@5.8.2 tsc --noEmit -p services/backend-functions/tsconfig.json`: pass, exit code 0.
* `npx --yes -p typescript@5.8.2 tsc --noEmit -p apps/web/tsconfig.json`: pass, exit code 0.
* `node packages/tooling/scripts/schema-tooling.mjs validate`: fail. Missing dependency `json-schema-to-typescript`.
* `C:/Users/hello/Documents/Projects/hackcanada/.venv/Scripts/python.exe -m pytest -p no:cacheprovider devices/pi-station/tests`: fail. `pytest` is not installed in the configured virtual environment.

## Missing Work and Deviations

* Missing runtime work
	* Add concrete Firebase Functions, Firestore, Auth, and Storage adapters for the Phase 2 backend boundaries.
	* Replace in-memory repositories and latest-frame storage with deployable runtime implementations.
	* Export a Firestore-triggered analytics materializer path.
* Missing product behavior
	* Wire the live monitoring page to the live listener boundary.
	* Replace the filter summary with actual interactive filter controls.
* Validation deviations
	* Phase 1, Phase 3, Phase 4, and Phase 5 relied on direct TypeScript fallback validation instead of the exact `corepack pnpm` commands required by the plan.
	* Phase 5 did not demonstrate the tooling schema-validation path or Python smoke-test execution in the current environment.

## Follow-Up Recommendations

* Deferred from implementation scope
	* Add concrete Firebase runtime adapters and emulator-backed integration coverage before deployment or demo handoff.
	* Replace the temporary contracts declaration shim once workspace install/build is stable.
	* Repair the Corepack/pnpm environment and rerun the exact workspace `lint`, `build`, and `test` commands.
* Discovered during review
	* Fix the live monitoring route so it subscribes to live station data rather than rendering an unavailable placeholder snapshot.
	* Implement operator-facing interactive filter controls for station, building, floor, location, and time range.
	* Install missing validation dependencies needed for `packages/tooling` schema checks and Pi smoke tests in the configured Python environment.
	* Add focused TypeScript tests for function auth/validation, repository-backed query behavior, and live/dashboard page composition.

## Overall Status

Needs Rework

## Reviewer Notes

This review completed artifact discovery, per-phase RPI validation, implementation-quality validation, and command validation. The dominant issues are implementation completeness rather than editor diagnostics: the Phase 2 Firebase runtime is still scaffold-only, the Phase 3 live-monitoring route is not functionally wired, and the planned validation path remains blocked by missing environment dependencies.
