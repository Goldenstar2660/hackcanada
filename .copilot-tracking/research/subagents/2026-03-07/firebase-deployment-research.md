---
title: Firebase Deployment Research
description: Repository-backed research on Firebase resources, credentials, environment variables, tooling, and deployment requirements for the Binsight demo surfaces
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - firebase
  - firestore
  - cloud functions
  - hosting
  - seeding
  - binsight
estimated_reading_time: 12
---

## Research topics

* Firebase resources required by this repository
* Credentials and environment variables required across the web app, backend functions, and demo seeding
* Local tools and commands needed to run the website locally and deploy Firebase-backed services
* Firestore, Functions, Auth, and Storage configuration implied by the current codebase
* Exact repo-backed gaps, missing pieces, and ambiguous deployment choices

## Status

Complete.

## Findings

### Firebase services required by the current repo

* The dashboard is built around Firebase Auth, callable Cloud Functions, and Firestore live-status subscriptions. Evidence: `apps/web/README.md:17-19`, `apps/web/src/main.tsx:31-45`, `apps/web/src/lib/api/dashboard-api.ts:9-13`, `apps/web/src/lib/firebase/live-status.ts:7-8`.
* The backend also uses Cloud Storage and a Firestore trigger. Evidence: `services/backend-functions/src/runtime/bootstrap.ts:56-83`, `services/backend-functions/src/runtime/firebase-runtime.ts:36-79`, `services/backend-functions/src/runtime/firebase-bridges.ts:108-119`.
* Firestore collections in active use are `stations`, `rulesPresets`, `stationLiveStatus`, `disposalEvents`, `analyticsMaterializationLedger`, `analyticsStationDay`, `analyticsFloorDay`, `analyticsBuildingDay`, and `analyticsExperimentDay`. Evidence: `services/backend-functions/src/firestore/collections.ts:1-27`.

### What is required to run the website locally

* Install the TypeScript workspace dependencies from the repository root with `corepack pnpm install`. Evidence: `justfile:6-7`.
* Copy `apps/web/.env.example` to `apps/web/.env` and populate the Firebase web SDK values. Evidence: `apps/web/README.md:21-36`, `apps/web/.env.example:1-8`.
* The dashboard hard-fails at startup if required Firebase browser variables are missing. Required at runtime: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, and `VITE_FIREBASE_PROJECT_ID`. Optional but expected for the demo: `VITE_FIREBASE_FUNCTIONS_REGION`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_MEASUREMENT_ID`. Evidence: `apps/web/src/main.tsx:11-45`.
* Start the site locally with `corepack pnpm --filter @binsight/web run dev` or `just web`. Evidence: `apps/web/README.md:40-48`, `justfile:12-13`.
* The local website does not start a local backend host. It assumes the callable functions and Firestore state already exist in a Firebase project. Evidence: `README.md:86-101`, `apps/web/README.md:40-52`.

### What must exist in Firebase for the website to work

* The frontend calls three callable functions: `getAnalyticsSummary`, `getEventHistory`, and `getStationDirectory`. Evidence: `apps/web/src/lib/api/dashboard-api.ts:9-39`.
* The frontend subscribes directly to Firestore documents under `stationLiveStatus/{stationId}`. The backend advertises that collection path through the station directory response. Evidence: `apps/web/src/lib/firebase/live-status.ts:65-67`, `services/backend-functions/src/analytics/query-service.ts:240-258`.
* Firestore rules currently allow direct reads only for `stationLiveStatus` and deny all direct writes and all other direct collection reads. Evidence: `infra/firebase/firestore.rules:1-16`.
* The live monitoring page is intentionally text-first in the current phase, so camera frame rendering is explicitly outside the active website scope even though camera-frame ingestion exists on the backend. Evidence: `apps/web/src/pages/live-monitoring.tsx:101-110`.

### What is required to deploy backend functions

* The only Firebase config in-repo is `infra/firebase/firebase.json`, which points the Functions source at `../../services/backend-functions` and the Firestore config at `firestore.rules` and `firestore.indexes.json`. Evidence: `infra/firebase/firebase.json:1-24`.
* The backend package currently exposes build, dev, lint, and seed scripts, but no deploy script. Evidence: `services/backend-functions/package.json:1-18`.
* The backend README expects deployment against a real Firebase project, not only emulators, and says the dashboard and Pi runtime both depend on deployed functions plus deployed Firestore config. Evidence: `services/backend-functions/README.md:21-24`, `services/backend-functions/README.md:56-69`.
* Required backend environment variables are `FIREBASE_PROJECT_ID`, `BINSIGHT_STORAGE_BUCKET`, and `BINSIGHT_DEVICE_CREDENTIALS_JSON`. The seed and Admin SDK path also require application default credentials, with `GOOGLE_APPLICATION_CREDENTIALS` called out as the direct setup path. Evidence: `services/backend-functions/README.md:25-45`, `services/backend-functions/README.md:58-77`.
* The runtime parses `BINSIGHT_DEVICE_CREDENTIALS_JSON`, initializes Firestore and Storage, and binds the Storage bucket from `BINSIGHT_STORAGE_BUCKET`. Evidence: `services/backend-functions/src/runtime/bootstrap.ts:26-83`.
* Deployed functions expected by the repo are `ingestEvent`, `ingestLiveStatus`, `ingestCameraFrame`, `getAnalyticsSummary`, `getEventHistory`, `getStationDirectory`, and the Firestore trigger `materializeAnalyticsOnDisposalEvent`. Evidence: `services/backend-functions/src/runtime/firebase-runtime.ts:36-79`.
* The backend uses Firebase Functions v2 `onRequest`, `onCall`, and `onDocumentCreated` bridges. Evidence: `services/backend-functions/src/runtime/firebase-bridges.ts:4-5`, `services/backend-functions/src/runtime/firebase-bridges.ts:60-95`, `services/backend-functions/src/runtime/firebase-bridges.ts:108-119`.

### Firestore configuration required by the repo

* Firestore indexes are already defined for `disposalEvents` by `stationId + timestamp`, and for `stations` by building-floor-location-station and signage-layout-station combinations. Evidence: `infra/firebase/firestore.indexes.json:2-58`.
* The dashboard query service depends on seeded station metadata, rules presets, event history, and analytics rollups, not only raw live-status documents. Evidence: `services/backend-functions/src/analytics/query-service.ts:114-196`, `services/backend-functions/src/analytics/query-service.ts:199-258`.

### Demo seed workflow requirements and outputs

* Historical demo data is mandatory for the demo because live station traffic alone will not populate the analytics and comparison views. Evidence: `README.md:144-150`.
* The seed workflow is `corepack pnpm --filter @binsight/backend-functions run seed:demo`. Evidence: `services/backend-functions/README.md:39-45`.
* The seed script loads the Ottawa rules preset from `packages/rules/presets/demo-canada-ottawa.1.0.0.json`. Evidence: `services/backend-functions/scripts/seed-demo-data.mjs:440-443`.
* The seed script requires `FIREBASE_PROJECT_ID`; initializes the Admin SDK with `applicationDefault()`; optionally binds `BINSIGHT_STORAGE_BUCKET`; and then writes rules presets, stations, live statuses, analytics materialization ledger rows, disposal events, and analytics rollups. Evidence: `services/backend-functions/scripts/seed-demo-data.mjs:458-520`.
* The seed data includes three demo stations with different building, floor, location, signage, and layout values, plus deterministic live-status and event history patterns. Evidence: `services/backend-functions/scripts/seed-demo-data.mjs:25-118`, `services/backend-functions/scripts/seed-demo-data.mjs:250-339`.

### Cross-surface device credentials and publication requirements

* The Pi runtime loads its environment from `devices/pi-station/.env` and requires `FIREBASE_PROJECT_ID`, `FIREBASE_FUNCTIONS_REGION`, `FIREBASE_FUNCTIONS_BASE_URL`, `BINSIGHT_DEVICE_ID`, and `BINSIGHT_DEVICE_SHARED_SECRET` for authenticated cloud publication. Evidence: `devices/pi-station/.env.example:1-13`, `devices/pi-station/src/binsight_station/main.py:65-120`.
* The Pi uses authenticated HTTP publication to `https://{region}-{project}.cloudfunctions.net` unless `FIREBASE_FUNCTIONS_BASE_URL` overrides it, and publishes to `ingestEvent` and `ingestLiveStatus`. Evidence: `devices/pi-station/src/binsight_station/publishers.py:59-63`, `devices/pi-station/src/binsight_station/publishers.py:81-113`.
* Backend device authentication requires the headers `x-binsight-device-id`, `x-binsight-station-id`, `x-binsight-timestamp`, and `x-binsight-signature`, where the signature is `binsight-v1:{deviceId}:{stationId}:{timestamp}:{sharedSecret}`. Evidence: `services/backend-functions/src/auth/device-auth.ts:28-31`, `services/backend-functions/src/auth/device-auth.ts:58-60`, `services/backend-functions/src/auth/device-auth.ts:67-98`, `devices/pi-station/src/binsight_station/esp_client.py:167-180`.

### Emulator and local-tooling state

* The repo includes emulator port declarations for Firebase UI, Functions, and Firestore, but the backend README still says emulator support is deferred and the Phase 3 setup expects a real Firebase project. Evidence: `infra/firebase/firebase.json:12-23`, `services/backend-functions/README.md:17-24`.
* Local tooling explicitly referenced by the repo is `corepack pnpm` for the TypeScript workspace, `uv` for the Pi runtime, and `just` for convenience entrypoints. Evidence: `justfile:1-27`, `devices/pi-station/README.md:63-80`.
* There is no in-repo Firebase CLI wrapper or deploy script. A Firebase CLI install and authenticated session are therefore required operationally, but that setup is currently external to the repo. Evidence: `services/backend-functions/package.json:1-18`, `infra/firebase/firebase.json:1-24`.

## Evidence

### Exact blockers or likely blockers

* No `apps/web/.env` is provisioned in the repo, and the web app throws on missing required browser environment values. Evidence: `apps/web/README.md:58-60`, `apps/web/src/main.tsx:22-45`.
* The repository root notes that the real Firebase rehearsal failed because `FIREBASE_PROJECT_ID`, Firebase application credentials, and the web `.env` were absent. Evidence: `README.md:100-101`.
* There is no `.firebaserc` in the repo, so Firebase project selection is not codified in version control. Evidence: repository file search on 2026-03-07 found `apps/web/.env.example`, `devices/pi-station/.env.example`, and the three `infra/firebase/*` config files, but no `.firebaserc`.
* Backend packaging for `firebase deploy` is still ambiguous: `infra/firebase/firebase.json` points to the package root, while the backend build emits JavaScript to `dist`, and `services/backend-functions/package.json` does not declare a `main` entry or predeploy step. Evidence: `infra/firebase/firebase.json:2-6`, `services/backend-functions/package.json:1-18`, `services/backend-functions/tsconfig.json:2-8`.
* Cloud Storage is used by the backend runtime for latest camera frames, but the infra folder contains no Storage rules file or Storage section in Firebase config. Evidence: `services/backend-functions/src/runtime/bootstrap.ts:56-83`, `services/backend-functions/src/runtime/firebase-runtime.ts:50-56`, `infra/firebase/firebase.json:1-24`.
* Operator authorization is demo-grade rather than claims-enforced. Both the backend callable auth check and the web live-status client treat any non-empty authenticated UID as sufficient. Evidence: `services/backend-functions/src/auth/operator-auth.ts:33-59`, `apps/web/src/lib/firebase/live-status.ts:37-63`.

## Missing pieces and ambiguities

* Whether the website should be deployed to Firebase Hosting, another static host, or only run via local Vite during demo rehearsal. The repo documents local Vite hosting but does not define a `hosting` block in `infra/firebase/firebase.json`.
* The exact first-time backend deployment command and package entrypoint shape. The repo defines function source and build output, but not the Firebase CLI invocation pattern or the package entrypoint Firebase should load.
* Whether emulator-based rehearsal is intended to be supported soon or intentionally deferred. The config contains emulator ports, but the backend README says emulator support is deferred and the active demo path targets a real Firebase project.
* Whether Cloud Storage camera frames should ever be exposed to the website in this phase. The backend supports `ingestCameraFrame`, but the live monitoring page explicitly keeps camera capture and rendering out of scope.
* Whether operator access should remain “any authenticated Firebase user” for demo speed or move to explicit custom claims before deployment.

## Next research

* Validate a real `firebase deploy` from `infra/firebase` against a demo project and confirm whether the backend package needs a `main` field or predeploy build hook.
* Decide and document the production or demo hosting target for the web app, then add or confirm the matching deployment config.
* Decide whether to add Storage rules and a Storage access model for latest camera frames, or keep Storage backend-only for now.
* Decide whether to keep the current any-authenticated-user operator model or require explicit claims.