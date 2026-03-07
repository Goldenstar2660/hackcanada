<!-- markdownlint-disable-file -->
# Release Changes: Full Station Demo Integration Hardening

**Related Plan**: full-station-demo-integration-hardening-plan.instructions.md
**Implementation Date**: 2026-03-07

## Summary

Resume the integration-hardening plan by hardening the Pi runtime publication seam and setup guidance, then complete the browser host work for apps/web so the dashboard runs as a minimal Vite app with Firebase-backed reads, live-status subscriptions, and operator sign-in.

## Changes

### Added

* apps/web/index.html - Added the Vite browser entry document for the dashboard host.
* apps/web/vite.config.ts - Added minimal Vite build configuration and workspace package aliases.
* apps/web/src/main.tsx - Added the browser bootstrap that initializes Firebase and mounts the dashboard.
* apps/web/src/vite-env.d.ts - Added typed Vite environment variable declarations for the web host.
* apps/web/.env.example - Added the minimal Firebase web configuration template required by the Vite host.
* firebase.json - Added a tracked repository-root Firebase deploy configuration that resolves the backend Functions source and Firestore assets correctly on the laptop.
* scripts/firebase-project-id.mjs - Added a shared Firebase project-id resolver that supports `FIREBASE_PROJECT_ID` and `BINSIGHT_FIREBASE_PROJECT_ID` plus backend env-file fallback.
* scripts/firebase-cli.mjs - Added a Firebase CLI wrapper that resolves the project id automatically before deploy commands.
* scripts/pnpm-cli.mjs - Added a pnpm wrapper that falls back to `npx pnpm@10.6.3` when Corepack fails on this laptop.
* services/backend-functions/scripts/seed-demo-data.mjs - Added a demo seeding workflow for stations, live-status stubs, history, and analytics-ready event coverage.

### Modified

* devices/pi-station/src/binsight_station/publishers.py - Changed Pi event and live-status publication to emit backend ingress envelopes through the stabilized publisher seam.
* firmware/esp8266-controller/src/main.cpp - Wired distinct recycle, compost, and garbage indicator outputs while preserving the existing health, signal, and reset HTTP surface.
* devices/pi-station/src/binsight_station/classification.py - Added deterministic demo classification defaults so the local loop stays camera-free for this cycle.
* devices/pi-station/src/binsight_station/live_status.py - Kept live-status snapshots text-first and camera-agnostic for the operator dashboard.
* devices/pi-station/src/binsight_station/lcd_client.py - Restored standby, guidance, result, and reset rendering with cumulative counter output.
* devices/pi-station/src/binsight_station/main.py - Wired deterministic hand tracking, Pi-owned disposal inference, and LCD updates through the local session loop.
* devices/pi-station/src/binsight_station/main.py - Added explicit function region, base URL, and publication timeout configuration for the authenticated Pi publication path.
* devices/pi-station/tests/test_runtime_serialization.py - Added regression coverage for the ingress payload serialization used by the Pi publisher.
* devices/pi-station/README.md - Documented the minimum Pi environment, validation flow, and corrected Ottawa preset values for this cycle.
* devices/pi-station/.env.example - Added a runnable Pi environment template with station, ESP, timing, device credential, and publication endpoint keys.
* devices/pi-station/tests/test_runtime_session.py - Added coverage for deterministic hand tracking, station counters, and LCD-facing session output.
* devices/pi-station/tests/test_smoke.py - Extended smoke coverage to reflect the deterministic local demo loop startup path.
* services/backend-functions/package.json - Added a script entry for the demo seed workflow.
* services/backend-functions/README.md - Documented device credential provisioning, operator bootstrap, and demo seed verification.
* packages/rules/presets/demo-canada-ottawa.1.0.0.json - Expanded preset metadata coverage used by the seeded demo dataset.
* infra/firebase/firestore.rules - Allowed authenticated operator reads for the live-status path used by the browser host.
* README.md - Added a workspace-level demo bootstrap checklist and seed workflow guidance.
* README.md - Documented the final thin-slice demo run order and explicit Firebase rehearsal blocker conditions.
* apps/web/package.json - Switched the web package to Vite build and dev scripts and added browser-side Firebase and Vite dependencies.
* apps/web/tsconfig.json - Removed the placeholder JSX runtime alias and enabled Vite client typing for browser builds.
* apps/web/src/app/providers.tsx - Added browser auth state, route navigation interception, callable gateway wiring, and dashboard rendering lifecycle management.
* apps/web/src/app/types.ts - Extended app dependencies with browser auth and Firebase service types.
* apps/web/src/app/dashboard.css - Added standalone auth and status presentation styles for the browser host.
* apps/web/src/lib/api/dashboard-gateway.ts - Added a Firebase Functions callable invoker for dashboard reads.
* apps/web/src/lib/firebase/live-status.ts - Added Firestore document subscription transport and Firebase user to operator-session mapping.
* apps/web/src/lib/firebase/live-monitoring.ts - Reworked the live snapshot model to be text-first and stale-status aware without camera media dependencies.
* apps/web/src/pages/live-monitoring.tsx - Added realtime subscription handling and explicit loading, empty, and stale live-monitoring states.
* apps/web/src/features/live/live-station-panel.tsx - Replaced the camera panel with a text-first live interpretation panel and live update metadata.
* apps/web/src/react-jsx-runtime.d.ts - Removed the placeholder custom JSX runtime override.
* apps/web/src/jsx-globals.d.ts - Replaced the placeholder JSX typing shim with React-backed JSX globals.
* services/backend-functions/src/auth/operator-auth.ts - Allowed the selected basic Firebase Auth model by accepting authenticated users without custom operator claims.
* pnpm-lock.yaml - Recorded the reproducible dependency graph after adding the web host packages.
* apps/web/README.md - Documented the Vite host startup, Firebase env requirements, and operator login sequence.
* devices/pi-station/README.md - Documented the final Pi runtime startup sequence for the thin-slice demo path.
* services/backend-functions/README.md - Documented the demo seed command and the backend credential prerequisites required before rehearsal.
* package.json - Updated root workspace scripts to use the tracked Firebase deploy config and a pnpm fallback wrapper so deploy, lint, build, and test run on the laptop.
* justfile - Updated rehearsal deploy and seed tasks to fall back to `BINSIGHT_FIREBASE_PROJECT_ID` automatically.
* services/backend-functions/.env.example - Added the non-reserved `BINSIGHT_FIREBASE_PROJECT_ID` local-config key for backend env files.
* services/backend-functions/.env.vastum-binsight - Added `BINSIGHT_FIREBASE_PROJECT_ID=vastum-binsight` for local project-id fallback.
* devices/pi-station/src/binsight_station/main.py - Added Pi runtime fallback from `FIREBASE_PROJECT_ID` to `BINSIGHT_FIREBASE_PROJECT_ID`.
* devices/pi-station/.env.example - Updated the Pi env template to prefer the non-reserved `BINSIGHT_FIREBASE_PROJECT_ID` key.
* devices/pi-station/src/binsight_station/main.py - Preserved local session state and LCD output when cloud publication fails so laptop validation and real station behavior stay best-effort instead of surfacing false runtime errors.
* devices/pi-station/tests/test_runtime_session.py - Isolated runtime tests from checked-in device credentials by injecting a no-op publication adapter.
* devices/pi-station/tests/test_smoke.py - Isolated smoke tests from real publish credentials so the laptop suite remains hermetic.
* docs/firebase-rehearsal-runbook.md - Updated the rehearsal note to point at the tracked root Firebase deploy config.
* services/backend-functions/package.json - Pointed the package-level Functions deploy script at the tracked root Firebase config.

### Removed

* None.

## Additional or Deviating Changes

* Phase 1 runtime recovery was partially pre-completed before this implementation pass.
	* The plan and research called out a live-status startup crash and failing Pi tests, but the checked-out branch already had those failures resolved, so Phase 1 focused on publication-envelope hardening, regression coverage, and setup documentation instead of crash recovery.
* Operator authorization now accepts any authenticated Firebase user for dashboard access during this cycle.
	* The user selected a basic Firebase Auth user path for operator access, so custom claims are no longer required for the browser host to function.
* The live-monitoring surface intentionally excludes camera media rendering.
	* Camera capture, storage, and browser rendering are explicitly out of scope for this cycle and the phase keeps the operator view text-first.
* The Phase 2 firmware LED pin mapping is currently validated only by build, not by physical hardware confirmation.
	* The three-zone indicator implementation assumes the live demo rig maps poster LEDs to D1, D2, and D7 with active-high output, so the real station still needs a physical confirmation pass.
* Phase 3 publication hardening started from a branch where the authenticated device publisher path already existed.
	* The plan originally framed Step 3.1 as implementing the authenticated ingress transport, but the checked-out branch already contained that transport, so this pass narrowed to explicit endpoint configuration, timeout hardening, and bootstrap documentation.
* Phase 5 remains blocked on live Firebase provisioning rather than source changes.
	* A direct follow-up check confirmed that `apps/web/.env` already contains the required `VITE_FIREBASE_*` values, `devices/pi-station/.env` is now present with the Pi runtime settings, `services/backend-functions/.env.vastum-binsight` already contains backend bucket and device-credential settings, and a Firebase Admin SDK JSON file exists under `secrets/`. The repo now resolves the project id automatically from `BINSIGHT_FIREBASE_PROJECT_ID` when `FIREBASE_PROJECT_ID` is unset. The remaining blockers are the non-project-id shell inputs required during seeding and completion of the real Firebase rehearsal itself.
* The backend Firebase env guidance was corrected after verifying the Functions runtime behavior.
	* `services/backend-functions/.env.$FIREBASE_PROJECT_ID` may now carry the non-reserved `BINSIGHT_FIREBASE_PROJECT_ID` repo-local config key together with `BINSIGHT_STORAGE_BUCKET` and `BINSIGHT_DEVICE_CREDENTIALS_JSON`. `FIREBASE_PROJECT_ID` must still stay out of that file because Firebase rejects reserved `FIREBASE_*` keys in deploy-time env files.
* A final Phase 5 repository audit confirmed the repo-owned rehearsal flow is already complete.
	* `README.md`, `apps/web/README.md`, `devices/pi-station/README.md`, `services/backend-functions/README.md`, and `docs/firebase-rehearsal-runbook.md` already document the supported run order, required env files, operator login path, and live Firebase blocker details.
* The final unchecked Phase 5 work is now hardware-only, not repo-owned configuration.
	* This laptop successfully deployed Firestore and Functions to `vastum-binsight`, seeded the demo dataset, started the Vite dashboard locally, and validated `uv run binsight-station`. The only remaining rehearsal steps require the real Raspberry Pi and ESP hardware to produce live presence, LED, LCD, and disposal events.
* Root workspace validation scripts required a repo-level fallback because Corepack is failing in this environment.
	* The new `scripts/pnpm-cli.mjs` wrapper keeps the repo-owned `lint`, `build`, `test`, `backend:build`, `backend:seed:demo`, and `web:dev` commands usable on this laptop by falling back to `npx pnpm@10.6.3`.

## Release Summary

Phase 1, Phase 2, Phase 3, and Phase 4 are complete, and Phase 5 is complete for the laptop-safe repository scope but still pending physical-station execution. The Pi runtime surface now publishes backend ingress envelopes through a coherent publisher seam, drives a deterministic local demo loop with text-first live status and cumulative LCD output, and preserves local operator feedback when cloud publication fails. The backend has a documented demo seed workflow that provisions multiple stations, live-status stubs, historical events, and Ottawa preset coverage for analytics, comparisons, and leaderboard views, and the tracked root Firebase deploy config now supports Firestore and Functions deployment from the repository root on this laptop. The apps/web package builds as a Vite-hosted React browser app, initializes Firebase from environment variables, signs operators in with Firebase Auth, reads dashboard data through callable functions, and subscribes to Firestore live-status updates. Validation passed for `npx -y pnpm@10.6.3 run lint`, `npx -y pnpm@10.6.3 run build`, `npx -y pnpm@10.6.3 run test`, `uv run pytest`, `uv run binsight-station`, `node scripts/firebase-cli.mjs deploy --config firebase.json --only firestore:rules,firestore:indexes`, `npx -y pnpm@10.6.3 run firebase:deploy:functions`, `npx -y pnpm@10.6.3 --filter @binsight/backend-functions run seed:demo`, and local Vite startup at `http://127.0.0.1:4173/`. The remaining unchecked work is the real Pi-plus-ESP station rehearsal, which cannot be completed from this laptop because the physical hardware is not attached here.