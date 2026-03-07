---
title: Demo Operations Research
description: Research notes on how the BinSight demo is intended to operate across website, backend, rules, and device components, including rehearsal prerequisites and blockers
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - demo
  - operations
  - firebase
  - rehearsal
estimated_reading_time: 10
---

## Research Topics

* Full intended demo flow across website, backend, rules/data, and device-side components
* Prerequisites for running a live Firebase rehearsal
* Operator workflow for a realistic end-to-end demo
* Exact blockers and unresolved operational gaps

## Sources Reviewed

* `spec/binsight-spec.md:9-12,20-49,96-124,150-153`
* `README.md:86-160`
* `apps/web/README.md:38-61`
* `apps/web/src/main.tsx:21-44`
* `apps/web/src/app/providers.tsx:177-236`
* `apps/web/src/lib/firebase/live-status.ts:35-82`
* `apps/web/src/pages/live-monitoring.tsx:100-111`
* `apps/web/src/features/live/live-station-panel.tsx:39-84`
* `devices/pi-station/README.md:33-42,85-155`
* `devices/pi-station/src/binsight_station/main.py:88-120,372-379`
* `devices/pi-station/src/binsight_station/classification.py:9-60`
* `devices/pi-station/src/binsight_station/rules.py:17-61`
* `devices/pi-station/src/binsight_station/esp_client.py:12-15`
* `firmware/esp8266-controller/README.md:18-26,44-62`
* `firmware/esp8266-controller/src/main.cpp:20-27`
* `packages/rules/presets/demo-canada-ottawa.1.0.0.json:1-57`
* `services/backend-functions/README.md:25-78`
* `services/backend-functions/scripts/seed-demo-data.mjs:13-23,27-57,250-313,458-520`
* `services/backend-functions/src/runtime/bootstrap.ts:25-63`
* `services/backend-functions/src/auth/device-auth.ts:28-93`
* `services/backend-functions/src/functions/ingest-event.ts:17-51`
* `services/backend-functions/src/functions/ingest-live-status.ts:11-42`
* `services/backend-functions/src/runtime/firebase-runtime.ts:29-62`
* `infra/firebase/firebase.json:1-14`
* `infra/firebase/firestore.rules:1-10`

## Findings

### System Scope

The intended demo is one station that drives a cloud-backed dashboard, not a standalone device toy. The source-of-truth flow is: presence detection by ultrasonic sensor, item identification, rules-based disposal decision, LED and LCD guidance, hand-zone disposal detection, event creation, and dashboard surfacing of live status plus historical analytics. Evidence: `spec/binsight-spec.md:20-49,96-124,150-153`.

The current surface split matches that architecture:

* The ESP8266 owns ultrasonic sensing, LED guidance, and local HTTP telemetry on `GET /health`, `POST /signal`, and `POST /reset`. Evidence: `firmware/esp8266-controller/README.md:18-26`.
* The Pi owns session logic, rules loading, device-auth header construction, live-status publishing, and disposal-event publishing. Evidence: `devices/pi-station/README.md:5-18,33-42`; `devices/pi-station/src/binsight_station/main.py:107-120`; `devices/pi-station/src/binsight_station/rules.py:45-61`; `devices/pi-station/src/binsight_station/esp_client.py:12-15`.
* The backend owns authenticated ingress, persistence, analytics materialization, and operator-facing callable APIs. Evidence: `services/backend-functions/src/functions/ingest-event.ts:17-51`; `services/backend-functions/src/functions/ingest-live-status.ts:11-42`; `services/backend-functions/src/runtime/firebase-runtime.ts:29-62`.
* The web app owns operator sign-in, callable reads, and direct Firestore subscription to `stationLiveStatus`. Evidence: `apps/web/src/main.tsx:21-44`; `apps/web/src/app/providers.tsx:177-236`; `apps/web/src/lib/firebase/live-status.ts:35-82`.

The active demo rules preset is `demo-canada-ottawa@1.0.0`, with the exact supported-item list, item mappings, zone mapping, and low-confidence threshold stored in a versioned JSON preset and loaded directly by the Pi runtime. Evidence: `packages/rules/presets/demo-canada-ottawa.1.0.0.json:1-57`; `devices/pi-station/src/binsight_station/rules.py:45-61`.

The seeded Firebase dataset is intentionally broader than one live station. The seed script provisions three stations with signage and layout variants, live-status documents, disposal-event history, analytics rollups, and the analytics materialization ledger. Evidence: `services/backend-functions/scripts/seed-demo-data.mjs:13-23,27-57,250-313,458-520`; `README.md:146-154`; `services/backend-functions/README.md:40-54`.

The website live view is explicitly text-first. It shows live session state, detected item, disposal decision, latest event, and health, while camera media is intentionally omitted. That is consistent with the spec note that camera preview is developer-only on the operator laptop, not a product-facing dashboard feature. Evidence: `spec/binsight-spec.md:107-111,153`; `apps/web/src/pages/live-monitoring.tsx:104-111`; `apps/web/src/features/live/live-station-panel.tsx:39-84`.

There is a meaningful implementation gap between the spec and the current Pi entrypoint. The spec expects an ongoing live control loop, but the current `binsight-station` entrypoint performs one `start_session()` call, prints a summary, and exits. The Pi README states the same behavior explicitly. Evidence: `spec/binsight-spec.md:20-49`; `devices/pi-station/src/binsight_station/main.py:372-379`; `devices/pi-station/README.md:94-102`.

There is also a realism gap in classification. The classifier currently resolves a deterministic demo item from `demo://...`, otherwise returns `unknown-item`, with fallback resolving to `fallback-item`. It is not yet sourcing a real camera frame in this path. Evidence: `devices/pi-station/src/binsight_station/classification.py:9-60`.

### Prerequisites

The live Firebase rehearsal assumes one shared Firebase project across web, backend, and Pi. Evidence: `README.md:105-144`.

Required operator and environment prerequisites are:

* A Firebase project id and storage bucket. Evidence: `README.md:124-130`; `services/backend-functions/README.md:25-37`; `services/backend-functions/src/runtime/bootstrap.ts:55-63`.
* Firebase application default credentials for the seed workflow and deployed admin-backed functions. Evidence: `README.md:148-151`; `services/backend-functions/README.md:37-39`; `services/backend-functions/scripts/seed-demo-data.mjs:458-468`.
* Backend device credentials in `BINSIGHT_DEVICE_CREDENTIALS_JSON`, with the Pi using the same `deviceId`, `stationId`, and shared secret via `x-binsight-*` headers. Evidence: `README.md:124-130`; `devices/pi-station/README.md:33-42,102-103`; `services/backend-functions/README.md:25-37`; `services/backend-functions/src/auth/device-auth.ts:28-93`.
* A dashboard `.env` containing required `VITE_FIREBASE_*` values. The app throws on startup if required values are missing. Evidence: `README.md:132-144`; `apps/web/README.md:9-22,38-59`; `apps/web/src/main.tsx:21-44`.
* A Pi `.env` containing station id, rules preset id and version, ESP endpoint, Firebase project id, optional functions base URL, device id, shared secret, and timing values. Evidence: `README.md:109-121`; `devices/pi-station/README.md:85-141`; `devices/pi-station/src/binsight_station/main.py:88-120`.
* Deployed backend functions and Firestore config in the same Firebase project used by the dashboard and Pi. Evidence: `README.md:89-98`; `apps/web/README.md:40-49`; `services/backend-functions/README.md:56-67`; `infra/firebase/firebase.json:1-14`.
* An authenticated dashboard operator account. No custom claims are required in the current bootstrap because any authenticated Firebase user is treated as an operator by the backend and the web live-status client. Evidence: `README.md:156-158`; `services/backend-functions/README.md:78-80`; `services/backend-functions/src/auth/operator-auth.ts:29-52`; `apps/web/src/app/providers.tsx:177-236`; `apps/web/src/lib/firebase/live-status.ts:35-63`; `infra/firebase/firestore.rules:4-10`.
* ESP8266 firmware flashed and reachable over local Wi-Fi, with the SSID and password overridden if the hard-coded defaults do not match the rehearsal network. Evidence: `firmware/esp8266-controller/README.md:44-62`; `firmware/esp8266-controller/src/main.cpp:20-27`.

Operationally useful local tools are already defined in the repo: `corepack pnpm` for the TypeScript workspace, `uv` for the Pi runtime, and `pio` or `.venv/bin/pio` for firmware build and upload paths. Evidence: `README.md:39-58`; `justfile:1-25`.

### Operator Steps

The intended rehearsal order is consistent across the root README, the web README, and the backend README:

1. Provision one Firebase project for all three surfaces. Evidence: `README.md:86-98,105-144`.
2. Deploy or verify the backend functions code and Firestore config for that project. Evidence: `README.md:89-98`; `services/backend-functions/README.md:56-67`; `infra/firebase/firebase.json:1-14`.
3. Authenticate the Firebase Admin SDK, export `FIREBASE_PROJECT_ID` and `BINSIGHT_STORAGE_BUCKET`, then run `corepack pnpm --filter @binsight/backend-functions run seed:demo` from the repo root. Evidence: `README.md:146-154`; `services/backend-functions/README.md:40-67`; `services/backend-functions/scripts/seed-demo-data.mjs:458-520`.
4. Create one Firebase Auth email/password operator user. Evidence: `README.md:156-158`; `services/backend-functions/README.md:78-80`; `apps/web/src/app/providers.tsx:177-205`.
5. Create `apps/web/.env` with the required web SDK values, start the dashboard with `corepack pnpm --filter @binsight/web run dev`, open the local Vite URL, and sign in. Evidence: `apps/web/README.md:9-22,38-49`; `apps/web/src/main.tsx:21-44`; `apps/web/src/app/providers.tsx:177-236`.
6. Create `devices/pi-station/.env` with the station id, rules preset, ESP endpoint, Firebase project id, device id, shared secret, and timing values. Evidence: `README.md:109-121`; `devices/pi-station/README.md:85-141`; `devices/pi-station/src/binsight_station/main.py:88-120`.
7. Build and flash the ESP8266 firmware if needed, ensuring the board joins the rehearsal Wi-Fi network and serves the health and guidance endpoints the Pi expects. Evidence: `firmware/esp8266-controller/README.md:18-26,44-62`; `firmware/esp8266-controller/src/main.cpp:20-27`.
8. Start the Pi runtime, then run the live interaction against `demo-station-001` while the dashboard is open. Evidence: `README.md:86-98`; `devices/pi-station/README.md:85-103`; `apps/web/src/features/live/live-station-panel.tsx:39-84`.

Important operator expectation: the current live-monitoring experience is textual. The operator should expect status, item, disposal decision, latest event, and device health, not a website camera feed. Evidence: `spec/binsight-spec.md:107-111,153`; `apps/web/src/pages/live-monitoring.tsx:104-111`; `apps/web/src/features/live/live-station-panel.tsx:39-84`.

### Firebase Rehearsal Blockers

These are the exact blockers for a live Firebase rehearsal in the current workspace state:

* No provisioned backend Firebase environment was present when validation ran. The root README and backend README both record that the seed command failed because `FIREBASE_PROJECT_ID` was missing, and that no Firebase application credentials were present. Evidence: `README.md:101-103`; `services/backend-functions/README.md:72-76`; `services/backend-functions/scripts/seed-demo-data.mjs:458-463`.
* No dashboard `.env` was provisioned, and the web app hard-fails if required `VITE_FIREBASE_*` variables are missing. Evidence: `README.md:101-103,132-144`; `apps/web/README.md:9-22,59`; `apps/web/src/main.tsx:21-44`.
* No Pi `.env` was provisioned, and the Pi README explicitly says real cloud publication remains blocked without it, without reachable Firebase credentials, and without a seeded backend project. Evidence: `devices/pi-station/README.md:85-155`; `devices/pi-station/src/binsight_station/main.py:88-120`.
* The Pi runtime entrypoint is not a persistent demo loop yet. It performs one pass and exits, which is not sufficient for a sustained live operator rehearsal without an external wrapper or additional runtime work. Evidence: `devices/pi-station/README.md:94-102`; `devices/pi-station/src/binsight_station/main.py:372-379`; `spec/binsight-spec.md:20-49`.
* If `BINSIGHT_DEVICE_ID` and `BINSIGHT_DEVICE_SHARED_SECRET` are absent, the Pi falls back to a local no-op `PublicationAdapter` instead of authenticated HTTP publication. That means a misconfigured Pi can appear to run locally while never reaching Firebase. Evidence: `devices/pi-station/src/binsight_station/main.py:107-120`.
* The docs instruct copying `.env.example` to `.env` for both the Pi and web surfaces, but a workspace file search on 2026-03-07 found no `.env.example` files. This is not a code blocker, but it is an operational blocker for a clean rehearsal handoff because the expected bootstrap artifacts are missing.
* The firmware defaults to a hard-coded SSID and empty password unless build flags override them. If the rehearsal network does not match those defaults, ESP reachability fails before the Pi can get authoritative health or send guidance. Evidence: `firmware/esp8266-controller/src/main.cpp:20-27`; `firmware/esp8266-controller/README.md:62`.

These are important operational gaps that are not necessarily blockers if they are accepted demo compromises:

* The classifier is deterministic-demo or fallback driven, not yet camera-frame driven. Evidence: `devices/pi-station/src/binsight_station/classification.py:9-60`.
* The website live view intentionally omits camera media. Evidence: `apps/web/src/pages/live-monitoring.tsx:104-111`; `apps/web/src/features/live/live-station-panel.tsx:73-84`.

## Open Questions

* What is the intended production or rehearsal command to deploy Firebase Functions and Firestore config for this repo? The repository contains Firebase config files, but no checked-in end-to-end deployment runbook was found.
* Is there an unpublished or out-of-repo wrapper that keeps the Pi runtime alive beyond the current single-pass `binsight-station` entrypoint?
* Is deterministic classification acceptable for the rehearsal, or is a real camera capture path still required before the demo is considered complete?
* What actual rehearsal Wi-Fi SSID and password should the ESP8266 use, and will those be injected through PlatformIO build flags or by changing source defaults?
* What Firebase project id, storage bucket, and service-account credential source will be used for the rehearsal environment?

## Next Research

* Inspect Firebase deployment tooling and any ignored config to derive the exact `firebase deploy` or alternative deploy path for functions, Firestore rules, and indexes.
* Verify whether any untracked local `.env` files or secret-management conventions already exist outside the repository and document the expected variable values per surface.
* Trace the dashboard callable request path through the query service and Firestore repositories to confirm seeded collections and indexes fully cover the analytics, history, and comparisons pages.
* Inspect any Pi-side scripts or service definitions outside `binsight_station.main` that may provide the persistent runtime loop missing from the current entrypoint.
* Validate whether the firmware has a documented upload target and board-specific network behavior for the rehearsal hardware actually in use.