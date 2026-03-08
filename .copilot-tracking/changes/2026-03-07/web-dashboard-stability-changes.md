<!-- markdownlint-disable-file -->

## Related Plan

* `.copilot-tracking/plans/2026-03-07/web-dashboard-stability-plan.instructions.md`

## Implementation Date

* 2026-03-07

## Summary Of Changes

* Stabilized dashboard navigation so route changes keep the last successful page visible instead of blanking the UI behind a full-screen loader.
* Updated live monitoring to render immediately with an unavailable snapshot and hydrate through the existing realtime subscription.
* Reused station-directory reads within each signed-in browser session and normalized stale scalar filter inputs before building dashboard requests.
* Mapped Firebase callable validation failures to `invalid-argument` and added temporary scalar-to-array compatibility for stale dashboard callers.

## Added

* Tracking artifacts for research, planning, details, and review

## Modified

* `apps/web/src/app/providers.tsx`
* `apps/web/src/lib/api/dashboard-gateway.ts`
* `apps/web/src/pages/live-monitoring.tsx`
* `services/backend-functions/src/runtime/firebase-bridges.ts`
* `services/backend-functions/src/domain/validation.ts`

## Removed

* None.

## Additional Or Deviating Changes

* Workspace diagnostics reported no errors in the edited frontend and backend files.
* Targeted TypeScript checks completed successfully for `apps/web/tsconfig.json` and `services/backend-functions/tsconfig.json`.
* A direct production-style Vite build command could not be completed from the current workspace because the expected `vite` binary path was not present in `node_modules`; this appears to be an environment or install-layout issue rather than a code regression.
