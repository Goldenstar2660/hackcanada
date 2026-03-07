<!-- markdownlint-disable-file -->
# Task Research: Provisioning, Configuration, Running, and Deployment

Research the best approach for provisioning, configuring, running, and deploying this project end to end, with emphasis on identifying the current delivery state of the repository and the exact blockers preventing a live Firebase rehearsal.

## Task Implementation Requests

* Identify the current delivery state of the repository
* Determine the exact blockers preventing the live Firebase rehearsal
* Determine required Firebase resources, credentials, environment variables, local tools, and configuration files
* Explain how to run the website locally
* Explain how to host the backend on Firebase
* Explain how to configure Firestore and any other Firebase services used by the project
* Explain how to seed demo data
* Explain how to operate the full demo
* Produce a step-by-step beginner-friendly setup and deployment approach
* Leave implementation choices as open questions when the repository or spec does not decide them

## Scope and Success Criteria

* Scope: Repository research only. Cover website, backend functions, Firebase infrastructure, seeded demo data, and end-to-end demo operation including device-side implications where the repo or spec defines them. Exclude implementation changes outside research artifacts.
* Assumptions:
  * The spec at `spec/binsight-spec.md` is the source of truth.
  * The rehearsal path should prefer the real Firebase project flow already described by the repository over emulator-only workflows.
  * The current branch may contain in-progress integration work.
* Success Criteria:
  * Delivery state is described with evidence.
  * Concrete blockers for live Firebase rehearsal are identified with supporting references.
  * Required tools, credentials, env vars, Firebase resources, and config files are enumerated.
  * A recommended setup and deployment path is selected and justified.
  * Open questions are clearly separated from verified findings.

## Outline

1. Current delivery state
2. Verified blockers to the live Firebase rehearsal
3. Required tools, Firebase resources, credentials, and configuration
4. Recommended beginner-friendly provisioning and deployment approach
5. Demo operating procedure
6. Evaluated alternatives and open questions

## Potential Next Research

* Verify one end-to-end deploy against a real Firebase project after the missing deployment entrypoint is clarified.
  * Reasoning: the remaining uncertainty is mostly operational rather than architectural.
  * Reference: `infra/firebase/firebase.json`, `services/backend-functions/package.json`, `services/backend-functions/tsconfig.json`

## Research Executed

### File Analysis

* `spec/binsight-spec.md`
  * Confirmed the product scope, live monitoring expectations, seeded analytics expectations, and the official Firebase-based architecture.
* `README.md`
  * Confirmed the Phase 5 local validation pass and the explicit warning that the live Firebase rehearsal was not validated because provisioning was incomplete.
* `apps/web/README.md`
  * Confirmed the dashboard expects deployed Firebase services and a real Firebase Auth operator user.
* `apps/web/.env.example`
  * Confirmed the web env template exists and contains Firebase Web SDK placeholders.
* `apps/web/src/main.tsx`
  * Confirmed the website throws during startup if required Firebase browser env vars are missing.
* `apps/web/src/lib/api/dashboard-api.ts`
  * Confirmed the website depends on three callable Functions: `getAnalyticsSummary`, `getEventHistory`, and `getStationDirectory`.
* `apps/web/src/lib/firebase/live-status.ts`
  * Confirmed the website also reads Firestore directly from `stationLiveStatus`.
* `services/backend-functions/README.md`
  * Confirmed the repository expects a real Firebase project, seeded demo data, deployed functions, and ADC credentials.
* `services/backend-functions/package.json`
  * Confirmed build and seed scripts exist, but no deploy script or Firebase predeploy hook is defined.
* `services/backend-functions/tsconfig.json`
  * Confirmed TypeScript emits backend output into `dist`.
* `services/backend-functions/src/index.ts`
  * Confirmed the backend exports real ingestion, query, and analytics trigger surfaces.
* `services/backend-functions/src/runtime/bootstrap.ts`
  * Confirmed backend runtime depends on Firestore, Cloud Storage, and `BINSIGHT_DEVICE_CREDENTIALS_JSON`.
* `services/backend-functions/src/auth/device-auth.ts`
  * Confirmed the exact device-auth header contract and signature format.
* `services/backend-functions/scripts/seed-demo-data.mjs`
  * Confirmed seeded demo data is a first-class part of the demo and the script aborts immediately when `FIREBASE_PROJECT_ID` is absent.
* `infra/firebase/firebase.json`
  * Confirmed only Functions and Firestore assets are configured, with emulator ports defined.
* `infra/firebase/firestore.rules`
  * Confirmed direct Firestore reads are limited to authenticated reads of `stationLiveStatus`.
* `infra/firebase/firestore.indexes.json`
  * Confirmed composite indexes exist for `disposalEvents` and `stations` queries.
* `devices/pi-station/README.md`
  * Confirmed the Phase 5 Pi flow, the requirement to align device credentials with the backend, and the warning that live cloud publication was not validated.
* `devices/pi-station/.env.example`
  * Confirmed the Pi env template exists and includes station, Firebase, and device-auth values.
* `devices/pi-station/src/binsight_station/main.py`
  * Confirmed the runtime currently performs one startup pass and exits.
* `devices/pi-station/src/binsight_station/publishers.py`
  * Confirmed the Pi can publish real signed HTTP requests to deployed Cloud Functions.
* `firmware/esp8266-controller/README.md`
  * Confirmed the ESP controller exposes local HTTP endpoints and uses build-time Wi-Fi overrides.
* `firmware/esp8266-controller/src/main.cpp`
  * Confirmed firmware currently falls back to hard-coded Wi-Fi defaults when build flags are absent.
* `package.json` and `justfile`
  * Confirmed the local validation workflow and the repo-managed toolchain surface.

### Code Search Results

* `.firebaserc`
  * No file found in the workspace. Firebase project selection remains manual.
* `services/backend-functions/dist/**`
  * No checked-in output found. Backend deployment depends on a local build artifact that is not committed.

### External Research

* None required. Repository evidence was sufficient to identify the current state, blockers, and the recommended approach.

### Project Conventions

* Standards referenced: source-of-truth spec and repository instructions
* Instructions followed: research-only mode and markdown tracking conventions

## Key Discoveries

### Current Delivery State

The repository is in a mixed state that matters for planning.

The local integration baseline is healthy. The root README records a completed Phase 5 local validation pass on 2026-03-07 covering TypeScript lint, build, and test, the Pi test suite and startup path, the ESP8266 PlatformIO build, and `just validate`. The same file explicitly states that `uv run binsight-station` started successfully and exited with `station=demo-station-001 phase=idle item=None disposal=None`. Evidence: `README.md:48-84`.

The live Firebase rehearsal is not ready. The root README states that the seed command failed because `FIREBASE_PROJECT_ID` was not set, Firebase application credentials were absent, and no dashboard `.env` file was provisioned. Evidence: `README.md:86-102`.

The web app is implemented enough for a real rehearsal. It is a Vite-hosted React app using Firebase Auth, callable Functions, and Firestore live-status subscriptions. It does not depend on a separate locally hosted backend server. Evidence: `apps/web/README.md:8-52`, `apps/web/src/main.tsx:11-44`, `apps/web/src/lib/api/dashboard-api.ts:9-39`, `apps/web/src/lib/firebase/live-status.ts:6-70`.

The backend is implemented enough to support the demo path. It exports HTTP ingestion endpoints, callable query endpoints, and a Firestore-triggered analytics materializer. Evidence: `services/backend-functions/src/index.ts:1-25`.

The Pi surface is only partially rehearsal-ready. The authenticated publication path exists, but the entrypoint still performs a single startup pass and exits, which is weaker than the continuous control loop described by the spec. Evidence: `devices/pi-station/src/binsight_station/main.py:65-383`, `spec/binsight-spec.md:18-58`.

The ESP8266 firmware builds successfully and exposes the local HTTP contract the Pi expects, but network configuration remains dependent on build-time Wi-Fi overrides or the current hard-coded defaults. Evidence: `firmware/esp8266-controller/README.md:15-42`, `firmware/esp8266-controller/src/main.cpp:17-31`.

### Verified Blockers To The Live Firebase Rehearsal

The blockers are concrete and mostly operational.

* No target Firebase project has been fully provisioned in the current workspace session. The repo repeatedly calls out missing `FIREBASE_PROJECT_ID`, missing Admin SDK credentials, and missing web env setup. Evidence: `README.md:98-102`, `services/backend-functions/README.md:72-76`.
* The demo seed workflow cannot run without `FIREBASE_PROJECT_ID` and ADC credentials. The seed script throws immediately if `FIREBASE_PROJECT_ID` is absent and initializes Firebase Admin with `applicationDefault()`. Evidence: `services/backend-functions/scripts/seed-demo-data.mjs:458-469`.
* The website cannot start against Firebase without required browser env vars. `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, and `VITE_FIREBASE_PROJECT_ID` are hard-required at startup. Evidence: `apps/web/src/main.tsx:11-35`.
* No checked-in Firebase project binding exists. There is no `.firebaserc`, so project selection must be supplied manually through CLI flags or `firebase use`. Evidence: workspace search result and `infra/firebase/firebase.json:1-21`.
* Backend deployment packaging is ambiguous. Firebase points at `../../services/backend-functions` as the Functions source, TypeScript emits compiled output to `dist`, but the package has no `main` field, no `firebase.json` `predeploy`, and no repo-level deploy script. Evidence: `infra/firebase/firebase.json:2-5`, `services/backend-functions/package.json:1-18`, `services/backend-functions/tsconfig.json:1-8`.
* Firebase Hosting for the website is not configured in-repo. The project has a local Vite flow, but `infra/firebase/firebase.json` has no Hosting stanza, and no hosting deploy script or build output mapping exists. Evidence: `infra/firebase/firebase.json:1-21`, `apps/web/package.json:1-9`, `apps/web/vite.config.ts:1-14`.
* The Pi can appear locally healthy while never reaching Firebase. If `BINSIGHT_DEVICE_ID` or `BINSIGHT_DEVICE_SHARED_SECRET` is missing, the runtime falls back to a local no-op publisher instead of authenticated HTTP publication. Evidence: `devices/pi-station/src/binsight_station/main.py:91-120`.
* The Pi runtime currently exits after a single startup/status publication pass. That is enough for smoke validation but not obviously enough for a sustained live rehearsal. Evidence: `devices/pi-station/README.md:68-96`, `devices/pi-station/src/binsight_station/main.py:372-383`.
* The ESP firmware may fail on the rehearsal network if the board is not flashed with the correct Wi-Fi credentials. Evidence: `firmware/esp8266-controller/README.md:53-60`, `firmware/esp8266-controller/src/main.cpp:20-31`.

### Required Tools

The repo-managed toolchain spans three stacks.

* Node.js with Corepack and `pnpm@10.6.3`. Evidence: `package.json:1-10`.
* Python 3.11+ with `uv` for the Pi runtime. Evidence: `devices/pi-station/pyproject.toml:1-12`, `devices/pi-station/README.md:55-70`.
* PlatformIO for the ESP8266 firmware, either at `.venv/bin/pio` or globally installed. Evidence: `justfile:18-25`, `firmware/esp8266-controller/platformio.ini:1-8`.
* Firebase CLI installed on the operator machine. This is implied by the deployment configuration, but it is not pinned or managed by the repo. Evidence: `infra/firebase/firebase.json:1-21` and absence of `firebase-tools` in workspace manifests.

### Required Firebase Resources

One shared Firebase project is the intended thin-slice architecture.

* Firestore database
* Cloud Functions
* Firebase Authentication with email/password enabled
* Cloud Storage bucket matching `BINSIGHT_STORAGE_BUCKET`
* Firestore rules and indexes from `infra/firebase`

Evidence: `spec/binsight-spec.md:96-120`, `spec/binsight-spec.md:150-154`, `services/backend-functions/src/runtime/bootstrap.ts:1-71`, `infra/firebase/firestore.rules:1-16`, `infra/firebase/firestore.indexes.json:1-58`.

### Required Credentials And Accounts

The minimum credential set is larger than it first appears.

* A Google service account JSON file or equivalent ADC path for local seeding, exported through `GOOGLE_APPLICATION_CREDENTIALS`
* A Firebase project id in `FIREBASE_PROJECT_ID`
* A Cloud Storage bucket name in `BINSIGHT_STORAGE_BUCKET`
* A device credential record in `BINSIGHT_DEVICE_CREDENTIALS_JSON`
* One Firebase Auth email/password user for the operator dashboard
* Matching Pi-side `BINSIGHT_DEVICE_ID` and `BINSIGHT_DEVICE_SHARED_SECRET`

Evidence: `services/backend-functions/README.md:21-45`, `services/backend-functions/src/runtime/bootstrap.ts:24-54`, `services/backend-functions/src/auth/device-auth.ts:18-94`, `apps/web/src/app/providers.tsx:177-178`, `apps/web/src/app/providers.tsx:328-344`.

### Required Environment Variables And Config Files

#### Website

The website expects `apps/web/.env`.

Required in code:

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

Documented as part of the full template:

```text
VITE_FIREBASE_FUNCTIONS_REGION=us-central1
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MEASUREMENT_ID=...
```

Evidence: `apps/web/.env.example:1-8`, `apps/web/src/main.tsx:11-39`, `apps/web/README.md:19-36`.

#### Backend

The backend deploy and seed workflow expects these values in the shell or deployment environment:

```text
FIREBASE_PROJECT_ID=your-project-id
BINSIGHT_STORAGE_BUCKET=your-project.firebasestorage.app
BINSIGHT_DEVICE_CREDENTIALS_JSON=[{"deviceId":"pi-demo-001","stationId":"demo-station-001","sharedSecret":"replace-with-demo-secret","enabled":true}]
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

Evidence: `services/backend-functions/README.md:21-45`, `services/backend-functions/src/runtime/bootstrap.ts:24-54`, `services/backend-functions/scripts/seed-demo-data.mjs:458-469`.

#### Pi Runtime

The Pi runtime expects `devices/pi-station/.env`.

```text
STATION_ID=demo-station-001
RULES_PRESET_ID=demo-canada-ottawa
RULES_PRESET_VERSION=1.0.0
ESP_ENDPOINT=http://192.168.4.1
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_FUNCTIONS_REGION=us-central1
FIREBASE_FUNCTIONS_BASE_URL=
BINSIGHT_DEVICE_ID=pi-demo-001
BINSIGHT_DEVICE_SHARED_SECRET=replace-with-demo-secret
BINSIGHT_PUBLICATION_TIMEOUT_SECONDS=5.0
PRESENCE_DEBOUNCE_SECONDS=0.35
DISPOSAL_TIMEOUT_SECONDS=12.0
RESET_COOLDOWN_SECONDS=1.5
```

Evidence: `devices/pi-station/.env.example:1-13`, `devices/pi-station/src/binsight_station/main.py:65-86`.

### Firebase Access Model

The access model is intentionally narrow.

* Devices write through signed HTTP ingestion endpoints using `x-binsight-device-id`, `x-binsight-station-id`, `x-binsight-timestamp`, and `x-binsight-signature`.
* The dashboard signs in with Firebase Auth email/password.
* Direct Firestore reads are restricted to `stationLiveStatus` for authenticated users.
* Analytics, station directory, and event history are loaded through callable Functions.

Evidence: `services/backend-functions/src/auth/device-auth.ts:18-94`, `apps/web/src/app/providers.tsx:328-344`, `infra/firebase/firestore.rules:1-16`, `apps/web/src/lib/api/dashboard-api.ts:9-39`.

### Demo Dataset Requirements

Seeded data is not optional for the full demo because the live station alone will not produce enough history for comparisons and analytics. The seed script writes:

* one Ottawa rules preset at `demo-canada-ottawa` version `1.0.0`
* three station metadata documents
* live-status stubs
* deterministic disposal-event history
* analytics materialization ledger documents
* day-level analytics rollups

Evidence: `spec/binsight-spec.md:114-120`, `README.md:144-160`, `services/backend-functions/README.md:39-55`, `services/backend-functions/scripts/seed-demo-data.mjs:1-180`, `services/backend-functions/scripts/seed-demo-data.mjs:458-520`.

## Technical Scenarios

### End-To-End Provisioning and Deployment

The repo supports a practical demo path if you keep the architecture simple.

**Requirements:**

* One shared Firebase project for web, backend, Firestore, Auth, and Storage
* Deployed Functions and Firestore assets before the website or Pi are started
* Seeded demo data before the dashboard is used for analytics and comparisons
* Matching device credentials on the backend and Pi
* Correct Wi-Fi configuration on the ESP8266 controller

**Preferred Approach:**

* Use one real Firebase project.
* Keep the website local with Vite during rehearsal.
* Deploy only backend Functions, Firestore rules, and Firestore indexes to Firebase.
* Seed the demo dataset from the operator machine using ADC.
* Run the Pi against deployed Functions.

This is the best fit because it matches the spec and the existing repo boundaries with the fewest moving parts. It avoids adding Firebase Hosting work that the repo has not configured, avoids emulator-only drift, and keeps the dashboard, backend, and Pi on the same data plane already described by the README files.

```text
Local machine
├── corepack pnpm install
├── firebase CLI login and project selection
├── backend build
├── deploy Firestore rules and indexes
├── deploy Functions
├── seed demo data with ADC
└── run Vite dashboard locally

Firebase project
├── Firestore
├── Cloud Functions
├── Firebase Auth (email/password)
└── Cloud Storage bucket

Station side
├── ESP8266 flashed with correct Wi-Fi credentials
└── Pi runtime configured with matching station/device credentials
```

**Implementation Details:**

Beginner-friendly sequence:

1. Install the local tools.

```bash
corepack enable
corepack pnpm install
cd devices/pi-station && uv sync
cd /home/handwash/Projects/hackcanada
```

2. Install Firebase CLI if it is not already available on the machine.

3. Create one Firebase project for the demo.

4. In the Firebase console, enable these services:

```text
Firestore Database
Cloud Functions
Authentication with Email/Password
Cloud Storage
```

5. Create one operator user in Firebase Authentication using email/password.

6. Create or download a service account JSON that can seed Firestore and access the project.

7. Export local backend environment values.

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
export FIREBASE_PROJECT_ID=your-firebase-project-id
export BINSIGHT_STORAGE_BUCKET=your-firebase-project-id.firebasestorage.app
export BINSIGHT_DEVICE_CREDENTIALS_JSON='[{"deviceId":"pi-demo-001","stationId":"demo-station-001","sharedSecret":"replace-with-demo-secret","enabled":true}]'
```

8. Create the dashboard env file from the template and fill in the real Firebase Web SDK values.

```bash
cp apps/web/.env.example apps/web/.env
```

9. Create the Pi env file from the template and keep the device identity aligned with the backend JSON.

```bash
cp devices/pi-station/.env.example devices/pi-station/.env
```

10. Build the backend package.

```bash
corepack pnpm --filter @binsight/backend-functions run build
```

11. Deploy Firestore rules and indexes from the infrastructure config.

```bash
firebase deploy --project "$FIREBASE_PROJECT_ID" --config infra/firebase/firebase.json --only firestore:rules,firestore:indexes
```

12. Deploy Functions.

```bash
firebase deploy --project "$FIREBASE_PROJECT_ID" --config infra/firebase/firebase.json --only functions
```

13. Seed the demo dataset.

```bash
corepack pnpm --filter @binsight/backend-functions run seed:demo
```

14. Start the dashboard locally.

```bash
corepack pnpm --filter @binsight/web run dev
```

15. Sign in with the Firebase Auth operator account.

16. Flash the ESP8266 with the correct Wi-Fi build flags if the default credentials do not match the rehearsal network.

17. Start the Pi runtime.

```bash
cd devices/pi-station && uv run binsight-station
```

18. Run the live demo against `demo-station-001` while the dashboard is open.

Important caveats:

* Step 12 is operationally ambiguous today because the repo does not define the final Firebase Functions entrypoint packaging. The most likely expectation is that the backend is built first and Firebase resolves the package root, but this is not fully documented in-repo.
* The website should be kept local with Vite for the current demo path. Firebase Hosting is not configured.
* The Pi runtime currently behaves like a startup and single-pass publisher, not a daemonized station loop.

```bash
# Useful validation before the live rehearsal
just validate
corepack pnpm --filter @binsight/backend-functions run seed:demo
corepack pnpm --filter @binsight/web run dev
cd devices/pi-station && uv run pytest
```

#### Considered Alternatives

Alternative 1: Use Firebase emulators for the rehearsal.

Rejected because the repo documentation explicitly frames the active demo path around a real Firebase project, the backend README says emulator support is deferred, and the goal is a live Firebase rehearsal rather than local-only validation. Evidence: `services/backend-functions/README.md:8-24`, `README.md:86-102`.

Alternative 2: Add Firebase Hosting as part of this setup path.

Rejected as the primary recommendation because the repo contains no Hosting config, no deploy script, and no defined build output mapping. It adds scope without reducing the main blockers. Evidence: `infra/firebase/firebase.json:1-21`, `apps/web/package.json:1-9`.

Alternative 3: Run a separate local backend host instead of deployed Functions.

Rejected because the repo repeatedly documents the backend surface as deployed Firebase Functions rather than a local long-running server for the demo path. Evidence: `README.md:86-97`, `services/backend-functions/README.md:56-69`.

## Open Questions

These choices are not fully answered by the repository or spec and should stay explicit.

* What is the exact Firebase Functions deploy packaging contract for `services/backend-functions`? The repo points Firebase at the package root and compiles to `dist`, but it does not define a `main` field, predeploy hook, or explicit generated entrypoint.
* Should the website remain Vite-local for the final presentation, or should Firebase Hosting be added later as a separate task?
* Is the current single-pass Pi runtime acceptable for the rehearsal, or does the demo require a persistent loop before it is considered ready?
* How should deploy-time backend secrets be managed in the target Firebase project: classic environment variables, Firebase Functions config, or secret manager integration?
* Should operator access remain any-authenticated-user for demo speed, or should explicit role claims be added before the public demo?

## Recommended Next Steps For Implementation Planning

* Resolve the Functions deploy packaging ambiguity first
* Provision one real Firebase project and document the project id and operator account details
* Run one real deploy of Firestore assets, Functions, and seeded data
* Decide whether the Pi one-pass runtime is acceptable or needs to be extended into a persistent loop
* Keep Firebase Hosting out of the critical path unless presentation requirements demand it

## Status

Research status: complete.

Recommended approach summary: provision one real Firebase project, deploy Firestore and Functions, seed demo data, keep the website local with Vite, and run the Pi against deployed Functions. The dominant blockers are missing Firebase provisioning, missing credentials and env files, one unresolved Functions packaging detail, and a Pi runtime that may still be too short-lived for a sustained rehearsal.
