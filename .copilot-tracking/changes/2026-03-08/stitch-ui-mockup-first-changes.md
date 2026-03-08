<!-- markdownlint-disable-file -->
# Release Changes: Stitch UI Mockup-First

**Related Plan**: stitch-ui-mockup-first-plan.instructions.md
**Implementation Date**: 2026-03-08

## Summary

Implements the mockup-first Stitch UI rollout across the web app while preserving supported auth, routing, and live-data seams.

Phase 1 completed the visible route remap, compatibility handling, and shared protected-shell foundation.

Phase 2 added the public landing route and reworked the signed-out login presentation to more closely match the Stitch mockups while keeping only email-password auth active.

Phase 3 reshaped the Devices and device-details experiences around the supported station-directory, event-history, and live-status seams.

Phase 4 made Analytics the canonical home for both KPI summaries and grouped comparison scenarios while preserving history and live-monitoring as secondary routes.

## Changes

### Added

* `apps/web/src/pages/landing.tsx` - introduced a dedicated public landing page component aligned to the Stitch landing mockup, with explicitly static public metrics and deferred dashboard or system links

### Modified

* `apps/web/src/app/types.ts` - expanded route typing for public versus protected mockup-first paths and preserved requested-path tracking for compatibility routing
* `apps/web/src/app/router.tsx` - remapped the visible IA to landing, login, analytics, devices, and device details, with compatibility handling for legacy stations and comparisons paths
* `apps/web/src/app/layout.tsx` - replaced the sidebar framing with a Stitch-aligned top header and footer for the protected application shell
* `apps/web/src/app/providers.tsx` - added public-route handling, canonical route resolution, landing-route foundation, and signed-in redirects away from public routes
* `apps/web/src/app/dashboard.css` - added shared shell primitives for the top navigation, landing foundation, and app-shell layout updates
* `apps/web/src/pages/stations.tsx` - relabeled the visible directory copy around devices while keeping the station-directory seam underneath
* `apps/web/src/pages/station-detail.tsx` - relabeled station drill-down copy and links for the device-details route model
* `apps/web/src/features/stations/station-directory.tsx` - updated directory labels and links to canonical `/devices` routes
* `apps/web/src/features/live/live-station-panel.tsx` - updated the detail deep link to canonical `/devices/:deviceId`
* `apps/web/src/app/router.tsx` - connected the public landing component to `/` while preserving public-route handling and compatibility routing
* `apps/web/src/app/providers.tsx` - updated the signed-out shell and login treatment to more closely match the Stitch login mockup while keeping Firebase email-password auth as the only active sign-in path
* `apps/web/src/app/dashboard.css` - added public landing and login-specific styling primitives for the mockup-aligned signed-out experience
* `apps/web/src/features/filters/filter-controls.tsx` - updated filter language and summary framing to better fit the Devices and Analytics mockup composition
* `apps/web/src/pages/stations.tsx` - upgraded the Devices directory hero and summary composition to better match the Stitch devices page
* `apps/web/src/features/stations/station-directory.tsx` - strengthened the device-card composition and explicitly deferred unsupported registration and settings behaviors
* `apps/web/src/pages/station-detail.tsx` - reshaped the primary device-details route around live status, recent scans, metadata, and deferred unsupported controls
* `apps/web/src/pages/live-monitoring.tsx` - aligned the retained live route with the new device-focused shell as a secondary deep link
* `apps/web/src/pages/analytics.tsx` - made Analytics the visible home for KPI summary plus grouped comparison scenarios
* `apps/web/src/pages/comparisons.tsx` - reduced the comparison route to a compatibility-only entry aligned to the Analytics information architecture
* `apps/web/src/pages/event-history.tsx` - restyled the retained history route as a secondary surface that stays consistent with the mockup-driven UI
* `apps/web/src/app/layout.tsx` - clarified primary versus secondary route framing in the protected shell without promoting compatibility routes into top navigation

### Removed

## Additional or Deviating Changes

* The landing route currently uses a lightweight foundation state rather than the final Stitch-faithful landing page.
	* This is intentional. Full public landing and signed-out login fidelity is scheduled for Phase 2.
* The visible protected navigation currently exposes Analytics and Devices only.
	* This preserves the mockup-first IA without inventing unsupported Dashboard or System destinations.
* Interactive browser smoke validation for the new public landing and signed-out login surfaces is still pending.
	* TypeScript validation passed, but manual rendered-route verification remains tracked in the planning log as follow-on work.
* Interactive browser smoke validation for the new Devices and device-details flows is still pending.
	* TypeScript validation passed, but manual rendered-route verification remains tracked in the planning log as follow-on work.

## Validation

* `npx --yes -p typescript@5.8.2 tsc -p apps/web/tsconfig.json --noEmit` - passed

* `npx --yes -p typescript@5.8.2 tsc -p apps/web/tsconfig.json --noEmit` - passed after Phase 3 device-surface updates

* `npx --yes -p typescript@5.8.2 tsc -p apps/web/tsconfig.json --noEmit` - passed after Phase 4 analytics and compatibility-route updates

* `Push-Location apps/web; npm run build; Pop-Location` - passed during final validation
	* Vite reported a non-blocking chunk-size warning for the main bundle, but the production build succeeded.

## Release Summary

The web app now presents a mockup-first route model centered on landing, login, analytics, devices, and device details while preserving the existing auth, callable API, and Firestore live-status seams underneath. Compatibility routes for legacy stations and comparisons paths still resolve into the new model, and retained secondary routes such as history and live monitoring remain available without competing with the visible top-level IA.

Files affected:
* Added: `apps/web/src/pages/landing.tsx`
* Modified: `apps/web/src/app/types.ts`, `apps/web/src/app/router.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/providers.tsx`, `apps/web/src/app/dashboard.css`, `apps/web/src/features/filters/filter-controls.tsx`, `apps/web/src/features/stations/station-directory.tsx`, `apps/web/src/features/live/live-station-panel.tsx`, `apps/web/src/pages/stations.tsx`, `apps/web/src/pages/station-detail.tsx`, `apps/web/src/pages/live-monitoring.tsx`, `apps/web/src/pages/analytics.tsx`, `apps/web/src/pages/comparisons.tsx`, `apps/web/src/pages/event-history.tsx`
* Removed: none

Deferred features remain explicit by design, including dashboard and system routes, social sign-in, request access, operator-authorization hardening, device registration, settings mutations, manual new-scan actions, export generation, AI insights, richer scan-analysis modals, and embedded camera playback. Final automated validation passed for both TypeScript and the production build. Manual browser smoke validation for the redesigned public and device routes remains tracked in the planning log as follow-on work outside the current tool coverage.
