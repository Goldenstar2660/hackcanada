<!-- markdownlint-disable-file -->
# Release Changes: Backend and Dashboard Architecture

**Related Plan**: backend-and-dashboard-architecture-plan.instructions.md
**Implementation Date**: 2026-03-07

## Summary

Implemented the selected Firebase-native backend-for-frontend architecture across contracts, backend runtime wiring, dashboard page composition, and Pi integration boundaries. The rework pass replaced the Phase 2 scaffold-only runtime gap with Firebase-shaped entry points, Firestore and Storage adapters, and route-backed live-monitoring and filter behavior, then revalidated the edited backend and web surfaces through direct TypeScript checks where the environment still blocks `corepack pnpm` and SDK installation.

## Changes

### Added

* packages/contracts/src/index.d.ts - Added a temporary declaration entrypoint so workspace packages can consume canonical contracts before the normal build output exists.
* services/backend-functions/src/domain/contracts.ts - Added the backend normalization boundary for current Pi ingress payloads and rules-preset joins.
* services/backend-functions/src/domain/validation.ts - Added runtime assertions for device ingress, canonical persisted documents, and dashboard analytics request and response shapes.
* services/backend-functions/src/firestore/collections.ts - Added canonical Firestore collection names, document-path helpers, and rollup key helpers.
* services/backend-functions/src/firestore/converters.ts - Added typed Firestore serialization and validation wrappers for canonical backend documents.
* services/backend-functions/src/functions/runtime.ts - Added SDK-agnostic HTTP and callable handler factories to keep deployment wiring separate from application logic.
* services/backend-functions/src/auth/device-auth.ts - Added device credential and signature verification helpers for Pi ingress.
* services/backend-functions/src/auth/operator-auth.ts - Added operator-claim enforcement for dashboard APIs and direct live-status reads.
* services/backend-functions/src/storage/latest-frame-storage.ts - Added latest-frame storage abstractions for bounded camera-feed transport.
* services/backend-functions/src/storage/index.ts - Added storage exports for backend function composition.
* services/backend-functions/src/firestore/repositories/types.ts - Added repository interfaces for events, live status, stations, rollups, and rules presets.
* services/backend-functions/src/firestore/repositories/in-memory.ts - Added in-memory repository implementations for Phase 2 handler and query wiring.
* services/backend-functions/src/firestore/repositories/index.ts - Added repository exports for backend composition.
* services/backend-functions/src/analytics/mappers/event-rollup.ts - Added canonical event-to-rollup mapping for day-bucket analytics materialization.
* services/backend-functions/src/analytics/mappers/index.ts - Added analytics mapper exports.
* services/backend-functions/src/analytics/materializers/daily-rollups.ts - Added idempotent day-rollup materializer logic for station, floor, building, and experiment views.
* services/backend-functions/src/analytics/materializers/index.ts - Added analytics materializer exports.
* services/backend-functions/src/analytics/query-service.ts - Added station-aware analytics, history, and directory query composition.
* services/backend-functions/src/functions/ingest-event.ts - Added authenticated HTTP ingress for disposal attempts.
* services/backend-functions/src/functions/ingest-live-status.ts - Added authenticated HTTP ingress for live-status upserts.
* services/backend-functions/src/functions/ingest-camera-frame.ts - Added authenticated latest-frame ingress with stale-feed metadata handling.
* services/backend-functions/src/functions/get-analytics-summary.ts - Added callable dashboard analytics handler.
* services/backend-functions/src/functions/get-event-history.ts - Added callable dashboard history handler.
* services/backend-functions/src/functions/get-station-directory.ts - Added callable station directory and filter-metadata handler.
* services/backend-functions/src/firebase-sdk-shims.d.ts - Added temporary Firebase module type shims so the backend can compile before workspace dependency installation.
* services/backend-functions/src/firestore/repositories/firestore.ts - Added Firestore-backed repositories for disposal events, live status, station metadata, rules presets, and analytics rollups.
* services/backend-functions/src/runtime/bootstrap.ts - Added cached backend runtime bootstrap wiring for Firebase app, Firestore, Storage, auth, repositories, and query services.
* services/backend-functions/src/runtime/firebase-bridges.ts - Added Firebase HTTP, callable, and Firestore-trigger bridges over the existing pure handlers.
* services/backend-functions/src/runtime/firebase-runtime.ts - Added deployable-style Firebase entry-point exports for ingress, operator APIs, and analytics materialization.
* services/backend-functions/src/storage/firebase-storage.ts - Added Firebase Storage-backed latest camera frame transport.
* apps/web/src/lib/api/dashboard-api.ts - Added the dashboard callable API client boundary.
* apps/web/src/lib/api/index.ts - Added API client exports for dashboard features.
* apps/web/src/lib/api/dashboard-gateway.ts - Added a higher-level dashboard gateway that composes callable backend access into page-facing queries.
* apps/web/src/lib/firebase/live-status.ts - Added the live-status listener boundary limited to operator live monitoring.
* apps/web/src/lib/firebase/index.ts - Added Firebase boundary exports for dashboard features.
* apps/web/src/lib/firebase/live-monitoring.ts - Added live monitoring helpers for stale camera-frame handling and live-status composition.
* apps/web/src/lib/query/index.ts - Added dashboard query utility exports.
* apps/web/src/lib/query/dashboard-query.ts - Added filter serialization and dashboard page-load query helpers.
* apps/web/src/app/dashboard.css - Added the shared dashboard visual shell and layout styling.
* apps/web/src/app/types.ts - Added dashboard route, page-model, and layout composition types.
* apps/web/src/app/layout.tsx - Added the shared dashboard page frame and navigation layout.
* apps/web/src/app/router.tsx - Added route definitions for station, live, history, analytics, and comparison views.
* apps/web/src/app/providers.tsx - Added application provider composition for gateway and live-state boundaries.
* apps/web/src/features/filters/filter-controls.tsx - Added reusable station, building, floor, location, and time-range filter UI.
* apps/web/src/features/stations/station-directory.tsx - Added station directory and grouping UI with active rules-preset context.
* apps/web/src/features/live/live-station-panel.tsx - Added live station monitoring UI with stale camera-feed handling.
* apps/web/src/features/events/event-history-panel.tsx - Added backend-driven event history presentation.
* apps/web/src/features/analytics/chart-adapters.ts - Added chart-model adapters that separate view code from raw analytics payloads.
* apps/web/src/features/analytics/analytics-summary-panel.tsx - Added KPI and trend summary presentation.
* apps/web/src/features/comparisons/comparison-overview.tsx - Added before-after, A/B, signage, layout, location, and building comparison presentation.
* apps/web/src/pages/stations.tsx - Added station directory route composition.
* apps/web/src/pages/station-detail.tsx - Added station detail route composition with active rules-preset context.
* apps/web/src/pages/live-monitoring.tsx - Added live monitoring route composition.
* apps/web/src/pages/event-history.tsx - Added event history route composition.
* apps/web/src/pages/analytics.tsx - Added analytics route composition.
* apps/web/src/pages/comparisons.tsx - Added comparisons route composition.
* apps/web/src/react/jsx-runtime.ts - Added a concrete local JSX runtime module for web package TSX compilation.
* apps/web/src/jsx-globals.d.ts - Added ambient JSX globals for the scaffolded TSX surface.
* services/backend-functions/src/domain/normalization.ts - Added an explicit backend normalization boundary for versioned device ingress payloads.

### Modified

* packages/contracts/src/index.ts - Replaced placeholder scaffolding with canonical domain, ingress, analytics, and station metadata types.
* packages/contracts/package.json - Pointed the package types entry at the temporary source declaration surface needed for workspace validation.
* packages/contracts/schemas/domain/live-station-status.schema.json - Extended live status with latest-frame camera metadata for bounded live monitoring.
* packages/contracts/schemas/domain/station-metadata.schema.json - Extended station metadata with joined active rules-preset summary fields for operator views.
* services/backend-functions/src/index.ts - Re-exported Phase 1 backend domain and Firestore modules.
* packages/contracts/src/index.d.ts - Kept the temporary declaration surface aligned with newly added backend and dashboard API types.
* packages/contracts/src/index.ts - Added explicit device payload version metadata for the Pi-to-backend boundary.
* packages/contracts/src/index.d.ts - Kept the declaration shim aligned with versioned device payload metadata.
* services/backend-functions/src/domain/validation.ts - Extended validation to cover new request, storage, and dashboard-query shapes.
* services/backend-functions/src/domain/contracts.ts - Reduced it to contract and join helpers after moving normalization into a dedicated module.
* apps/web/src/index.ts - Re-exported the Phase 2 dashboard data-access boundaries.
* apps/web/package.json - Added the React package declarations needed by the dashboard scaffolding.
* apps/web/tsconfig.json - Enabled TSX compilation and web package JSX runtime shims.
* apps/web/src/react-jsx-runtime.d.ts - Declared the local `react/jsx-runtime` module alias used by the scaffolded TSX surface.
* devices/pi-station/src/binbuddy_station/events.py - Versioned event payload emission as device.v1.
* devices/pi-station/src/binbuddy_station/live_status.py - Expanded live-status emission to the backend ingress shape while preserving Pi ownership of the control loop.
* devices/pi-station/src/binbuddy_station/esp_client.py - Added backend auth-header helpers for cloud publishing seams.
* devices/pi-station/README.md - Documented device-to-cloud payload versioning and authentication responsibilities.
* devices/pi-station/tests/test_smoke.py - Extended smoke coverage for the aligned device payload boundary.
* infra/firebase/firestore.rules - Allowed authenticated operator reads only for station live-status documents while keeping all other browser access closed.
* infra/firebase/firestore.indexes.json - Added initial composite indexes for event history and station directory filter paths.
* tsconfig.base.json - Added temporary workspace path aliases so package type checks can resolve cross-package imports without an installed pnpm workspace.
* services/backend-functions/package.json - Declared Firebase runtime dependencies required for deployable backend entry points.
* services/backend-functions/src/firestore/collections.ts - Added analytics materialization ledger paths for duplicate-safe trigger processing.
* services/backend-functions/src/firestore/repositories/index.ts - Re-exported Firestore-backed repositories beside the existing in-memory implementations.
* services/backend-functions/src/index.ts - Exported Firebase-shaped ingress, callable, and trigger entry points with runtime bootstrap helpers.
* services/backend-functions/src/storage/index.ts - Re-exported the Firebase Storage adapter.
* apps/web/src/app/dashboard.css - Added styles for interactive route-backed filter controls.
* apps/web/src/app/providers.tsx - Added route query parsing so filter submissions feed page-load state.
* apps/web/src/features/filters/filter-controls.tsx - Replaced the filter summary with operator-facing GET controls for station, building, floor, location, signage, layout, and time range.
* apps/web/src/lib/firebase/live-monitoring.ts - Added an initial live snapshot loader that resolves through the live listener boundary with a bounded timeout fallback.
* apps/web/src/lib/query/dashboard-query.ts - Added dashboard query parsing and local station-filter matching helpers.
* apps/web/src/pages/analytics.tsx - Wired interactive filters into the analytics route model.
* apps/web/src/pages/comparisons.tsx - Wired interactive filters into the comparisons route model.
* apps/web/src/pages/event-history.tsx - Wired interactive filters and station options into the history route model.
* apps/web/src/pages/live-monitoring.tsx - Resolved the initial live snapshot from live station data instead of always rendering a null snapshot.
* apps/web/src/pages/station-detail.tsx - Wired interactive filters into the station-detail route model.
* apps/web/src/pages/stations.tsx - Applied active filters to the visible station directory result set.

### Removed

* None yet.

## Additional or Deviating Changes

* Validation used `npx -p typescript@5.8.2 tsc --noEmit` fallbacks instead of the exact `corepack pnpm` commands.
	* Corepack could not verify pnpm signing keys in this environment, and no direct pnpm installation or local node_modules binaries were available.
* Added `packages/contracts/src/index.d.ts` and temporary TS path aliases to support workspace-level validation before install/build plumbing is in place.
	* This keeps Phase 1 moving without changing runtime behavior, but it should be replaced by generated declarations and normal package resolution once the workspace install flow is stable.
* Phase 2 now exports Firebase-shaped HTTP, callable, and trigger entry points, but it still relies on local Firebase module shims until the workspace installs `firebase-admin` and `firebase-functions`.
	* The repo still has no `node_modules` tree, so dependency installation, emulator execution, and lockfile refresh remain follow-on work even though the backend compile path now matches the intended runtime shape.
* Phase 3 now resolves the initial live-monitoring snapshot through the live listener boundary and exposes route-backed operator filters, but the current shell still does not mount a continuous browser-side subscription loop after first render.
	* That limitation comes from the present app shell architecture rather than a missing live-data model; the next step is client runtime work if the dashboard needs persistent in-browser streaming.
* Phase 4 preserved device-optimized snake_case Pi payloads and formalized them as versioned device.v1 ingress instead of converting the Pi runtime to canonical document shapes.
	* This keeps the live control loop simple on the Pi while making the backend normalization boundary explicit and testable.
* Final validation could not run the exact workspace `corepack pnpm run lint`, `build`, or `test` commands.
	* Corepack fails before pnpm starts because the local Node installation cannot verify the pnpm signing key. Direct `npx typescript@5.8.2 tsc` checks and editor diagnostics were used to validate the reworked backend and web surfaces instead.

## Release Summary

Completed all five planned phases plus a focused rework pass for the review gaps. Files affected in the current working tree: 22 total, with 6 added and 16 modified, and no removals. The implementation now includes canonical contract and query models, Firebase-shaped backend entry points, Firestore-backed repositories, Storage-backed latest-frame transport, route-backed dashboard filters, live-monitoring snapshot loading through the live listener boundary, Firestore rules and indexes, and a versioned device.v1 Pi-to-backend boundary. Current validation results: `get_errors` reports no backend or web diagnostics, `npx --yes -p typescript@5.8.2 tsc --noEmit -p services/backend-functions/tsconfig.json` exited 0, and `npx --yes -p typescript@5.8.2 tsc --noEmit -p apps/web/tsconfig.json` exited 0. Deployment-grade validation remains blocked by the Corepack signing-key failure and the lack of installed Firebase SDK packages or emulator wiring.
