<!-- markdownlint-disable-file -->
# Release Changes: Stitch UI High-Fidelity

**Related Plan**: `.copilot-tracking/plans/2026-03-08/stitch-ui-high-fidelity-plan.instructions.md`
**Implementation Date**: 2026-03-08

## Summary

Implement the Stitch-faithful operator UI redesign inside the existing `apps/web` shell, preserving routes, contracts, and live data seams unless an explicit exception is logged.

Phase 1 completed the shared visual foundation and replaced the signed-out auth surface with a Stitch-aligned login design while keeping the provider-owned shell and route behavior intact.

Phase 2 rebuilt the station directory, station detail, and live-monitoring surfaces around Stitch-derived layouts while keeping existing routes, query-backed filters, backend APIs, and Firestore live seams intact.

Phase 3 replaced the legacy analytics, comparisons, and history route bodies with Stitch-aligned layouts while preserving analytics queries, grouped-comparison responses, history filters, and the backend cursor contract.

Phase 4 ran the available web-package validation, audited demo-data readiness against the redesigned routes, and recorded the remaining Stitch deviations and signoff blockers instead of masking them in the UI.

## Changes

### Added

### Modified

* `apps/web/src/app/dashboard.css` - replaced the base dashboard styling layer with Stitch-aligned primitives for shell, navigation, tables, cards, forms, and the signed-out auth surface
* `apps/web/src/app/providers.tsx` - rebuilt the loading, error, and signed-out auth states around a shared standalone shell and a Stitch-faithful login composition
* `apps/web/src/features/live/live-station-panel.tsx` - redesigned the live station panel around Stitch-style summary cards, event status, health chips, and camera-placeholder diagnostics while preserving realtime fields
* `apps/web/src/features/filters/filter-controls.tsx` - restyled the shared route-backed filter surface to match the Stitch-derived dashboard system without changing GET query semantics
* `apps/web/src/features/stations/station-directory.tsx` - translated the station directory into a Stitch-style card grid with station-centric metadata and preserved detail/live route links
* `apps/web/src/pages/analytics.tsx` - rebuilt analytics around Stitch-style KPI, grouped comparison, deferred-action, trend, and support-data sections using the existing analytics summary contract
* `apps/web/src/pages/comparisons.tsx` - rebuilt grouped comparison scenarios into Stitch-style experiment cards while preserving current comparison summaries
* `apps/web/src/pages/event-history.tsx` - restyled the history route into a recent-scans timeline and surfaced the backend cursor gap explicitly instead of masking it in the UI
* `apps/web/src/pages/live-monitoring.tsx` - simplified the route wrapper around the redesigned live panel and retained stale and subscription warning states
* `apps/web/src/pages/station-detail.tsx` - rebuilt the station detail route with Stitch-style summary sections and recent events loaded through the existing history API seam
* `apps/web/src/pages/stations.tsx` - added a Stitch-style directory hero while preserving the current filter controls and route behavior

### Removed

## Additional or Deviating Changes

* Added a remote Google Fonts import for `Space Grotesk` in the shared dashboard stylesheet to better match the Stitch typography
  * Reason: improves visual fidelity for the initial implementation wave, but may need a local-hosted replacement if external font loading is not acceptable for deployment
* Authenticated route smoke validation for `/stations`, `/stations/:stationId`, and `/stations/:stationId/live` remains incomplete
  * Reason: the local app is currently signed out, so protected routes resolve to the Firebase Auth gate instead of the in-dashboard station surfaces
* Rendered smoke validation for `/analytics`, `/comparisons`, and `/history` remains incomplete
  * Reason: route responses and browser open succeeded, but this environment does not provide page inspection or interactive validation for the rendered protected-route content
* Final validation used fallback execution paths because `corepack pnpm` still fails in this environment with the known signature-verification error
  * Reason: `npx --yes -p typescript@5.8.2 tsc -p apps/web/tsconfig.json --noEmit` passed, and `npm run build` succeeded from `apps/web`, so Phase 4 could still validate TypeScript and the Vite production bundle without changing the repo scripts
* Demo data is sufficient for the implemented station, history, analytics, and comparisons routes, but it does not yet seed a live camera frame or a positive LLM-fallback event
  * Reason: the seed workflow creates station metadata, live-status documents, disposal events, and analytics rollups, but it leaves those richer demo states unseeded
* The optional Stitch landing page and the invalid Stitch dashboard export remain intentionally unimplemented in `apps/web`
  * Reason: the landing asset is outside the current operator-dashboard scope, and the dashboard export is a duplicate landing composition rather than a usable operator screen

## Release Summary

Implementation is functionally complete for the scoped operator routes, but final signoff remains partial.

Files affected: 11 modified in `apps/web` and 3 modified tracking artifacts in `.copilot-tracking`.

Validation completed with the available fallback path in this environment:
* `npx --yes -p typescript@5.8.2 tsc -p apps/web/tsconfig.json --noEmit` passed
* `npm run build` passed in `apps/web`
* VS Code diagnostics for `apps/web` reported no remaining errors

The redesigned web package now covers the Stitch-aligned signed-out auth surface, stations directory, station detail, live monitoring, analytics, comparisons, and history routes while preserving the existing route map, query-backed filters, backend APIs, and Firestore live seams.

Final signoff is still blocked on environment-dependent validation gaps: protected routes were not exercised end to end in an authenticated browser session against a real seeded Firebase project, and rendered-route inspection for analytics, comparisons, and history was not possible with the available browser tooling. The audit also confirmed two intentional deferments that should remain explicit: the optional public landing page was not brought into `apps/web`, and the duplicate Stitch dashboard export was rejected as an invalid source.