---
title: Environment And Credentials Research
description: Research notes covering environment variables, credentials, local tools, and config files across all repository surfaces
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - environment variables
  - credentials
  - firebase
  - platformio
  - pnpm
  - uv
estimated_reading_time: 12
---

## Research Scope

* Determine the exact environment variables, credentials, local tools, and configuration files required across all repository surfaces.
* Verify whether `apps/web/.env.example` and `devices/pi-station/.env.example` exist and, if they do, what values they contain.
* Identify which values are enforced directly in code versus only documented.
* Cover Node, pnpm, Corepack, Python, uv, PlatformIO, Firebase CLI, Google application credentials, operator authentication, and device shared-secret requirements.

## Status

* Complete

## Inputs Reviewed

* `/spec/binsight-spec.md`
* `/README.md`
* `/justfile`
* `/package.json`
* `/pnpm-workspace.yaml`
* `/apps/web/.env.example`
* `/apps/web/README.md`
* `/apps/web/src/main.tsx`
* `/apps/web/src/app/providers.tsx`
* `/apps/web/src/lib/firebase/live-status.ts`
* `/devices/pi-station/.env.example`
* `/devices/pi-station/README.md`
* `/devices/pi-station/pyproject.toml`
* `/devices/pi-station/src/binsight_station/main.py`
* `/devices/pi-station/src/binsight_station/publishers.py`
* `/firmware/esp8266-controller/platformio.ini`
* `/infra/firebase/firebase.json`
* `/infra/firebase/firestore.rules`
* `/infra/firebase/firestore.indexes.json`
* `/services/backend-functions/README.md`
* `/services/backend-functions/scripts/seed-demo-data.mjs`
* `/services/backend-functions/src/runtime/bootstrap.ts`
* `/services/backend-functions/src/auth/device-auth.ts`
* `/services/backend-functions/src/auth/operator-auth.ts`
* `/services/backend-functions/src/functions/get-station-directory.ts`
* `/services/backend-functions/src/functions/ingest-event.ts`
* `/services/backend-functions/src/functions/ingest-live-status.ts`

## Scope Alignment

* The spec confirms four practical surfaces for environment and credential analysis: dashboard website, Raspberry Pi station runtime, ESP8266 firmware, and Firebase-backed backend/infrastructure.
* The demo path is intentionally cross-surface. One Firebase project is expected to be shared by the Pi runtime, backend functions, and dashboard.

## Verified Findings

### Environment Example Files

* `apps/web/.env.example` exists and contains eight keys: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_FUNCTIONS_REGION`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, and `VITE_FIREBASE_MEASUREMENT_ID`.
* `devices/pi-station/.env.example` exists and contains station, Firebase, device-auth, publication timeout, and session-timing defaults.
* Earlier workspace file search tools returned a false negative for `.env.example`. Direct workspace search with `rg --files -g '.env.example'` verified both files exist.

### Web Surface Requirements

* Documentation instructs operators to copy `apps/web/.env.example` to `apps/web/.env` and fill in Firebase web SDK values.
* Runtime code strictly requires only four web variables at startup: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, and `VITE_FIREBASE_PROJECT_ID`.
* Runtime code treats `VITE_FIREBASE_FUNCTIONS_REGION`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, and `VITE_FIREBASE_MEASUREMENT_ID` as optional.
* The dashboard sign-in flow uses Firebase Auth email and password directly.
* Live status subscription gating on the client accepts any signed-in user because a non-empty `uid` already satisfies `hasOperatorClaims`.

### Raspberry Pi Surface Requirements

* The Pi runtime loads `devices/pi-station/.env` automatically through `python-dotenv`.
* None of the Pi variables are hard-required for process startup because all fields have defaults or optional handling.
* Live authenticated publication is only enabled when both `BINSIGHT_DEVICE_ID` and `BINSIGHT_DEVICE_SHARED_SECRET` are present. Without them, the runtime falls back to an in-memory/no-op publication adapter and still starts.
* `FIREBASE_FUNCTIONS_BASE_URL` is an optional override. Without it, the runtime targets `https://{region}-{project_id}.cloudfunctions.net`.
* Session-timing values are configurable through `PRESENCE_DEBOUNCE_SECONDS`, `DISPOSAL_TIMEOUT_SECONDS`, and `RESET_COOLDOWN_SECONDS`.
* Pi-to-ESP communication is local HTTP over `ESP_ENDPOINT`, with `GET /health`, `POST /signal`, and `POST /reset` documented as the device contract.

### Backend Surface Requirements

* Documentation requires `FIREBASE_PROJECT_ID`, `BINSIGHT_STORAGE_BUCKET`, and `BINSIGHT_DEVICE_CREDENTIALS_JSON` before deployment or seeding.
* The seed script hard-fails if `FIREBASE_PROJECT_ID` is missing and authenticates through Firebase Admin `applicationDefault()`, which makes Google application default credentials mandatory for local seeding.
* `BINSIGHT_DEVICE_CREDENTIALS_JSON` is parsed at runtime as a JSON array. Each entry must contain string `deviceId`, `stationId`, and `sharedSecret` fields. `enabled` defaults to `true` when omitted.
* If `BINSIGHT_DEVICE_CREDENTIALS_JSON` is unset, backend bootstrap still succeeds, but authenticated ingest requests will fail because there are no known device credentials.
* `BINSIGHT_STORAGE_BUCKET` is passed into the Firebase Storage bucket wrapper during backend service bootstrap. The README treats it as required for the demo path.

### Device Authentication Contract

* Backend device auth requires these HTTP headers on ingest requests: `x-binsight-device-id`, `x-binsight-station-id`, `x-binsight-timestamp`, and `x-binsight-signature`.
* The signature format is `binsight-v1:{deviceId}:{stationId}:{timestamp}:{sharedSecret}`.
* The backend rejects missing headers, unknown or disabled credentials, invalid timestamps, timestamps outside the default 60-second skew window, invalid signatures, and station mismatches between header identity and request body.
* The Pi publisher constructs exactly the same signature and sends it when authenticated HTTP publication is enabled.

### Operator Authentication Contract

* The dashboard login form uses Firebase Auth email/password sign-in.
* Backend callable auth currently authorizes any authenticated Firebase user because `auth.uid.trim().length > 0` is enough to pass `isOperatorAuthorized`.
* The README correctly says no custom claims are required for the current demo bootstrap.
* The same relaxed rule effectively applies to live-status reads on the client because `uid` alone passes `assertOperatorSession`.

### Tooling And Local Commands

* The TypeScript workspace pins `pnpm@10.6.3` in the root `packageManager` field and uses `corepack pnpm` in root scripts and the `justfile`.
* The repository does not pin a Node.js version through `engines`, `.nvmrc`, `.node-version`, or Volta metadata in the reviewed manifests. Node is required, but the exact version is not declared in-repo.
* The Pi runtime requires Python `>=3.11` and uses `uv` with default dev group installation.
* The firmware surface uses PlatformIO with the `nodemcuv2` environment and Arduino framework.
* The validation flow expects `pio` either at `.venv/bin/pio` in the repo root or on the system `PATH`.
* Firebase CLI is operationally implied by the presence of `infra/firebase/firebase.json` and deployment instructions, but the repository does not vendor or pin `firebase-tools` in any reviewed `package.json`.

### Firebase Configuration Files

* The repository includes `infra/firebase/firebase.json`, `infra/firebase/firestore.rules`, and `infra/firebase/firestore.indexes.json`.
* `infra/firebase/firebase.json` points the Firebase Functions codebase at `services/backend-functions` and wires Firestore rules, indexes, and emulator ports.
* No `.firebaserc` file was found in the workspace search, so Firebase project selection is not committed in-repo.

### Current Cross-Surface Blockers

* The real Firebase rehearsal is blocked until all three surfaces point at the same Firebase project and the dashboard `.env`, local Google application credentials, and backend environment values are provisioned.
* The backend README records a verified failure on 2026-03-07: the seed script exited immediately because `FIREBASE_PROJECT_ID` was missing.

## Code-Enforced Versus Documented-Only Requirements

### Strictly enforced in code

* Web startup requires `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, and `VITE_FIREBASE_PROJECT_ID`.
* Local seed execution requires `FIREBASE_PROJECT_ID` and working Google application default credentials.
* Device ingress requires matching device headers, a valid signature, and a credential entry that matches `deviceId` plus `stationId`.
* Callable dashboard reads require Firebase authentication, but not special claims.

### Documented for the demo path but not hard-required at process startup

* `devices/pi-station/.env` is documented as required, but the Pi runtime has defaults for every loaded value and can start without a populated `.env` file.
* `BINSIGHT_DEVICE_ID` and `BINSIGHT_DEVICE_SHARED_SECRET` are required for live authenticated publication, not for bare Pi startup.
* `BINSIGHT_STORAGE_BUCKET` is documented as required. Backend bootstrap passes it into storage setup, but there is no direct early throw when it is absent in the reviewed code.
* Web docs imply every `VITE_FIREBASE_*` value is required, but only four values are hard-required in `apps/web/src/main.tsx`.

## Evidence

### Web `.env.example`

* `/apps/web/.env.example:1-8`

### Pi `.env.example`

* `/devices/pi-station/.env.example:1-13`

### Web runtime enforcement

* `/apps/web/src/main.tsx:11-45`
* `/apps/web/src/app/providers.tsx:178-185`
* `/apps/web/src/app/providers.tsx:232-245`
* `/apps/web/src/app/providers.tsx:328-343`
* `/apps/web/src/lib/firebase/live-status.ts:37-63`
* `/apps/web/src/lib/firebase/live-status.ts:69-105`

### Pi runtime enforcement

* `/devices/pi-station/src/binsight_station/main.py:65-123`
* `/devices/pi-station/src/binsight_station/publishers.py:18-140`
* `/devices/pi-station/README.md:33-42`
* `/devices/pi-station/README.md:83-127`

### Backend enforcement

* `/services/backend-functions/src/runtime/bootstrap.ts:26-84`
* `/services/backend-functions/src/auth/device-auth.ts:5-107`
* `/services/backend-functions/src/auth/operator-auth.ts:5-59`
* `/services/backend-functions/src/functions/get-station-directory.ts:11-17`
* `/services/backend-functions/src/functions/ingest-live-status.ts:15-35`
* `/services/backend-functions/src/functions/ingest-event.ts:22-50`
* `/services/backend-functions/scripts/seed-demo-data.mjs:458-469`

### Tooling and infrastructure

* `/package.json:5-9`
* `/justfile:6-27`
* `/devices/pi-station/pyproject.toml:1-28`
* `/firmware/esp8266-controller/platformio.ini:1-8`
* `/infra/firebase/firebase.json:1-24`
* `/README.md:88-160`
* `/apps/web/README.md:21-59`
* `/services/backend-functions/README.md:21-80`

## Discrepancies And Open Questions

* Web documentation says the app fails if any required `VITE_FIREBASE_*` value is missing. In code, only four values are required at startup. The rest are optional.
* Pi documentation says to copy `.env.example` before startup, but runtime defaults permit startup without a provisioned `.env` file.
* The repository implies Firebase CLI usage for deployment, but it does not pin `firebase-tools` or commit a `.firebaserc`, so operator setup still depends on external machine state.
* The exact service-account role set required for `GOOGLE_APPLICATION_CREDENTIALS` is not spelled out in-repo. The practical minimum appears to be enough access for Firestore writes and any related Firebase Admin initialization used by the seed script.

## Recommended Next Research

* Verify the exact Firebase CLI deploy command and project-selection workflow used by the team.
* Confirm whether `BINSIGHT_STORAGE_BUCKET` is required only for camera-frame ingestion or for all deployed backend startup paths.
* Confirm the intended Node.js version outside the repo, since only pnpm is pinned in-repo.
* Validate whether production Firestore rules require more than authenticated user access for direct live-status reads.

## Clarifying Questions

* Which Firebase project ID should be treated as the canonical demo environment for all three surfaces?
* Is the dashboard expected to use direct Firestore reads in production, or should live-status access move fully behind backend mediation later?
* Should we treat the current any-authenticated-user operator policy as intentional for the demo only, or as a temporary gap that needs tightening before public deployment?