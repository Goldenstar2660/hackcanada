<!-- markdownlint-disable-file -->
# Release Changes: Provisioning, Configuration, Running, and Deployment

**Related Plan**: provisioning-configuration-running-deployment-plan.instructions.md
**Implementation Date**: 2026-03-07

## Summary

Repository-owned provisioning and rehearsal setup work in progress.

Phase 1 completed the Firebase Functions deploy contract and added a repository-owned command surface for build, deploy, seed, and local web startup.

Phase 2 added a shared Firebase rehearsal runbook and normalized the web, backend, and Pi configuration templates around the selected demo path.

Phase 3 locked the supported rehearsal path to Vite-local web plus Firebase-hosted backend and aligned the exact execution order across the runbook, README, and `just` aliases.

Phase 5 revalidated the repository-owned workflow and confirmed that the remaining rehearsal blockers are manual operator prerequisites, not missing in-repo setup work.

## Changes

### Added

* services/backend-functions/.env.example - Added the deployed Functions runtime template for per-project env files.
* docs/firebase-rehearsal-runbook.md - Added the shared beginner-first runbook for setup, deploy, seed, dashboard startup, and Pi startup.

### Modified

* infra/firebase/firebase.json - Narrowed the uploaded Functions payload to the built runtime artifact and deployment metadata.
* services/backend-functions/package.json - Declared the built entrypoint, pinned the Firebase runtime Node version, and added a package-local Functions deploy command.
* services/backend-functions/README.md - Documented the explicit build-then-deploy contract and the split between deployed env files and local seed exports.
* package.json - Added root scripts for backend build, Firestore deploy, Functions deploy, demo seed, and local web startup.
* justfile - Added matching operator-facing tasks with environment guardrails for deploy and seed flows.
* README.md - Added a root command map and clarified the supported rehearsal path.
* apps/web/.env.example - Replaced demo project defaults with explicit placeholder values for the real Firebase web app configuration.
* devices/pi-station/.env.example - Replaced demo project defaults with explicit placeholders while preserving the supported station and device identifiers.
* services/backend-functions/.env.example - Kept the deployed Functions env template aligned with the selected project-local contract.
* apps/web/README.md - Reduced duplicated setup prose and pointed dashboard operators to the shared rehearsal runbook.
* devices/pi-station/README.md - Reduced duplicated setup prose and pointed Pi operators to the shared rehearsal runbook.
* docs/firebase-rehearsal-runbook.md - Made the supported execution order explicit and added matching `just` alternatives for each local step.
* justfile - Added rehearsal-specific aliases so the operator can follow the runbook sequence with stable task names.
* .copilot-tracking/plans/logs/2026-03-07/provisioning-configuration-running-deployment-log.md - Recorded the explicit Vite-local path and the rejected Hosting alternative.

### Removed

* None yet.

## Additional or Deviating Changes

* services/backend-functions/tsconfig.json was reviewed and left unchanged.
	* The existing dist output already matches the selected Firebase deploy contract.

* Validation surfaced two non-blocking observations during Phase 1.
	* The workspace currently runs Node 22 while the Functions package now declares Node 20 for Firebase runtime compatibility.
	* The web build still emits an existing Vite chunk-size warning outside this phase scope.

* Phase 2 validation repeated the same two non-blocking observations.
	* The backend package still warns about the local Node 22 runtime versus the declared Node 20 Firebase target.
	* The web production build still emits the existing Vite chunk-size warning.

* Phase 3 validation passed without new blockers.
	* The web build, Pi test suite, and firmware PlatformIO build all passed on the current repository state.

* Phase 5 required no additional code or documentation fixes.
	* `just validate`, `corepack pnpm lint`, and `corepack pnpm build` all passed after the repository-owned setup work landed.
	* The remaining blockers are external Firebase provisioning, credentials, and hardware actions documented in the runbook.

## Release Summary

Repository-owned setup work is complete for the supported Firebase rehearsal path.

Files added:
* docs/firebase-rehearsal-runbook.md - Canonical operator runbook for provisioning, deploy, seed, dashboard startup, and Pi startup.
* services/backend-functions/.env.example - Template for per-project deployed Functions runtime values.

Files modified:
* README.md - Root command map, supported rehearsal order, and pointer to the shared runbook.
* apps/web/README.md - Package-specific dashboard notes and explicit Vite-local rehearsal guidance.
* apps/web/.env.example - Real-project Firebase web placeholders.
* devices/pi-station/README.md - Pi runtime guidance aligned to the shared rehearsal runbook.
* devices/pi-station/.env.example - Real-project Pi placeholders aligned to the demo station path.
* infra/firebase/firebase.json - Explicit built-artifact deploy contract for the Firebase Functions codebase.
* justfile - Stable rehearsal aliases for build, deploy, seed, local web startup, Pi validation, and Pi startup.
* package.json - Root scripts for backend build, Firestore deploy, Functions deploy, demo seed, and local web startup.
* services/backend-functions/README.md - Explicit Functions deploy contract and environment split between deployed runtime and local seeding.
* services/backend-functions/package.json - Built entrypoint, Node engine target, and package-local Functions deploy command.
* .copilot-tracking/plans/logs/2026-03-07/provisioning-configuration-running-deployment-log.md - Recorded the Vite-local path and rejected Hosting alternative.

Validation status:
* Passed: `just validate`
* Passed: `corepack pnpm lint`
* Passed: `corepack pnpm build`

Remaining manual operator work:
* Provision the Firebase project, web app, Auth user, and service-account credentials.
* Fill `services/backend-functions/.env.$FIREBASE_PROJECT_ID`, `apps/web/.env`, and `devices/pi-station/.env` with real values.
* Flash the ESP8266 with rehearsal Wi-Fi settings.
* Run the deploy, seed, dashboard, and Pi sequence against the real project.
