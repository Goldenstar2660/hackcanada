<!-- markdownlint-disable-file -->
# Release Changes: Spec Alignment Remediation

**Related Plan**: spec-alignment-remediation-plan.instructions.md
**Implementation Date**: 2026-03-07

## Summary

Remediation work in progress to align the implementation with the Binsight spec by removing product-facing camera behavior, preserving developer-only Pi preview, and closing cross-surface spec gaps.

## Changes

### Added

* None yet.

### Modified

* apps/web/src/app/layout.tsx - filtered unresolved parameterized routes out of sidebar navigation.
* apps/web/src/app/router.tsx - removed product-facing live-route navigation exposure and updated live-monitoring copy to spec-required fields.
* apps/web/src/features/live/live-station-panel.tsx - removed the camera card and narrowed the panel to operator status, session, disposal decision, and latest-event fields.
* apps/web/src/lib/firebase/live-monitoring.ts - removed camera-frame resolution from the live snapshot model and kept the subscription gateway focused on live-status updates.
* apps/web/src/pages/live-monitoring.tsx - exposed the station-scoped subscription binding while preserving the initial snapshot bootstrap path.

### Removed

* None yet.

## Additional or Deviating Changes

* Phase 1 Step 1.2 remains partially complete because the web package is still a render-library shell without an in-repo browser host that can consume the new long-lived subscription binding.
	* The current remediation now exposes the correct station-scoped subscription seam, but persistent browser re-rendering is tracked by the separate Vite-host work in `full-station-demo-integration-hardening-plan.instructions.md`.

## Release Summary

Pending implementation.
