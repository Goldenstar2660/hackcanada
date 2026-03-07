---
title: Repository State Research
description: Research notes on local development and deployment readiness for a live Firebase rehearsal
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - repository-state
  - firebase
  - rehearsal-readiness
estimated_reading_time: 8
---

## Research Scope

This research covers the current delivery state of the repository for:

* local development readiness
* cross-surface build and run commands
* Firebase deployment and rehearsal prerequisites
* exact blockers preventing a live Firebase rehearsal

Primary sources inspected:

* root workspace manifests and task runners
* package-level `package.json` files and Python project metadata
* root and surface `README.md` files
* Firebase infrastructure config
* web bootstrap code
* backend seed/bootstrap code
* Raspberry Pi runtime entrypoint

## Executive Assessment

The repository is locally buildable across the current scaffolded surfaces, but it is not yet live-Firebase-rehearsal ready.

What is ready now:

* The root TypeScript workspace exposes `build`, `lint`, and `test` scripts through [package.json](../../../../package.json#L6-L10).
* Root orchestration exists for `bootstrap`, `check`, `web`, `backend`, `pi`, `firmware`, and `validate` in [justfile](../../../../justfile#L3-L27).
* The root README states that local validation passed on 2026-03-07 for TypeScript build/lint/test, Pi tests, Pi startup, and firmware build in [README.md](../../../../README.md#L66-L84).
* The web package has a runnable Vite dev command in [apps/web/package.json](../../../../apps/web/package.json#L5-L9).
* The backend package has build, lint, watch, and demo seed scripts in [services/backend-functions/package.json](../../../../services/backend-functions/package.json#L5-L10).
* The Pi package has a runnable console script and pytest setup in [devices/pi-station/pyproject.toml](../../../../devices/pi-station/pyproject.toml#L16-L28).
* Firebase config exists for Functions, Firestore rules, indexes, and emulator ports in [infra/firebase/firebase.json](../../../../infra/firebase/firebase.json#L1-L24).

What is not ready yet:

* The root README still describes the repository as being in foundation mode with placeholders remaining in [README.md](../../../../README.md#L162-L164).
* The backend README explicitly calls the backend surface a minimal shell and says important runtime pieces were deferred in [services/backend-functions/README.md](../../../../services/backend-functions/README.md#L17-L23).
* The dashboard, backend seed flow, and Pi cloud path all depend on Firebase project provisioning and environment values that are not currently present.
* The Pi entrypoint is still a one-shot startup path rather than a continuously running station loop.

## Command Inventory

Root commands:

* `corepack pnpm lint`, `corepack pnpm build`, `corepack pnpm test` via [package.json](../../../../package.json#L6-L10)
* `just bootstrap`, `just check`, `just web`, `just backend`, `just pi`, `just firmware`, `just validate` via [justfile](../../../../justfile#L6-L27)

Surface commands:

* Web dev and build via [apps/web/package.json](../../../../apps/web/package.json#L5-L9)
* Backend build, lint, watch, and seed via [services/backend-functions/package.json](../../../../services/backend-functions/package.json#L5-L10)
* Pi runtime via [devices/pi-station/pyproject.toml](../../../../devices/pi-station/pyproject.toml#L16-L28)

Notably absent:

* No checked-in `.firebaserc` was found in the repository.
* No root or package script was found for `firebase deploy`, `firebase emulators:start`, or a complete rehearsal bootstrap.

That means deployment is partly configured but still operationally manual.

## Exact Blockers For A Live Firebase Rehearsal

### 1. Firebase environment and credentials are missing across all three surfaces

This is the strongest blocker.

Evidence:

* The root README says the real rehearsal was not validated because `FIREBASE_PROJECT_ID` was not set, no Firebase application credentials were present, and no web `.env` file was provisioned in [README.md](../../../../README.md#L98-L101).
* The backend README repeats that the real Firebase rehearsal is blocked because the seed command failed immediately and no Firebase credentials or backend env vars were present in [services/backend-functions/README.md](../../../../services/backend-functions/README.md#L75-L76).
* The Pi README says live cloud publication remains blocked because `devices/pi-station/.env`, Firebase credentials, and a seeded backend project were not present in [devices/pi-station/README.md](../../../../devices/pi-station/README.md#L154-L157).
* A shell check on 2026-03-07 returned no values for `GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_PROJECT_ID`, `BINSIGHT_STORAGE_BUCKET`, `BINSIGHT_DEVICE_CREDENTIALS_JSON`, `VITE_FIREBASE_*`, `STATION_ID`, or `BINSIGHT_DEVICE_ID`.

Impact:

* Demo data cannot be seeded.
* The dashboard cannot authenticate against or read from the target Firebase project.
* The Pi cannot publish authenticated live status or events to the deployed backend.

### 2. The dashboard hard-fails at startup without Firebase web config

Evidence:

* The dashboard bootstrap throws on any missing required `VITE_FIREBASE_*` variable in [apps/web/src/main.tsx](../../../../apps/web/src/main.tsx#L22-L35).
* The web README says the app fails during startup if required env is missing in [apps/web/README.md](../../../../apps/web/README.md#L21-L37).
* The web README also states that live operator login and Firebase-backed reads were not validated because no `apps/web/.env` file or operator credentials were provisioned in [apps/web/README.md](../../../../apps/web/README.md#L54-L59).
* The checked-in example file exists, but important values are blank placeholders in [apps/web/.env.example](../../../../apps/web/.env.example#L1-L8).

Impact:

* The local Vite host may start, but the application will throw before rendering a usable dashboard unless the env file is provisioned.

### 3. The backend seed path aborts immediately without project configuration and depends on deployed Firebase services

Evidence:

* The seed script throws immediately when `FIREBASE_PROJECT_ID` is missing in [services/backend-functions/scripts/seed-demo-data.mjs](../../../../services/backend-functions/scripts/seed-demo-data.mjs#L458-L468).
* The backend README requires `FIREBASE_PROJECT_ID`, `BINSIGHT_STORAGE_BUCKET`, `BINSIGHT_DEVICE_CREDENTIALS_JSON`, and `GOOGLE_APPLICATION_CREDENTIALS` before seeding or deployment in [services/backend-functions/README.md](../../../../services/backend-functions/README.md#L25-L45).
* The backend README says the Phase 5 path requires the functions code and Firestore config to be deployed before starting the dashboard or Pi runtime in [services/backend-functions/README.md](../../../../services/backend-functions/README.md#L56-L69).
* The root README says the backend surface is not a long-running local process and both dashboard and Pi assume the callable and Firestore surface already exists in the target project in [README.md](../../../../README.md#L86-L101).

Impact:

* Even though the backend compiles, the rehearsal cannot proceed until a real Firebase project is provisioned, seeded, and deployed.

### 4. The Raspberry Pi runtime entrypoint is still a one-shot probe, not a continuous live demo loop

Evidence:

* The Pi README says the current entrypoint loads config, polls the ESP health endpoint once, attempts to publish live status, prints one line, and exits in [devices/pi-station/README.md](../../../../devices/pi-station/README.md#L94-L108).
* The actual `main()` implementation creates `StationRuntime`, calls `start_session()` once, prints a status line, and returns in [devices/pi-station/src/binsight_station/main.py](../../../../devices/pi-station/src/binsight_station/main.py#L372-L383).
* The root README’s recorded startup result also shows a one-line idle result rather than an ongoing session loop in [README.md](../../../../README.md#L78-L84).

Impact:

* Even with Firebase configured, the current runtime is not yet the persistent station process described in the spec.
* A live rehearsal would at best test a single startup publication rather than continuous detection, guidance, disposal, and event streaming.

### 5. Deployment configuration exists, but deploy operations remain manual and underspecified

Evidence:

* Firebase config defines the backend Functions source and Firestore configuration in [infra/firebase/firebase.json](../../../../infra/firebase/firebase.json#L1-L24).
* The web README depends on backend functions already being deployed to the same project in [apps/web/README.md](../../../../apps/web/README.md#L38-L52).
* The backend README depends on deployed functions and Firestore config in [services/backend-functions/README.md](../../../../services/backend-functions/README.md#L56-L69).
* No checked-in `.firebaserc` was found, and no script was found for `firebase deploy` or emulator startup.

Impact:

* The repository encodes deployment targets, but not a reproducible checked-in deployment workflow.
* Rehearsal setup still depends on operator knowledge and local Firebase CLI state.

## Strongest Evidence For Blockers

If only four lines are used to judge readiness, these are the clearest:

* Root cross-surface blocker statement in [README.md](../../../../README.md#L98-L101)
* Backend blocked-rehearsal statement in [services/backend-functions/README.md](../../../../services/backend-functions/README.md#L75-L76)
* Dashboard hard-fail env gate in [apps/web/src/main.tsx](../../../../apps/web/src/main.tsx#L22-L35)
* Pi one-shot entrypoint in [devices/pi-station/src/binsight_station/main.py](../../../../devices/pi-station/src/binsight_station/main.py#L372-L383)

Together, those show that the repository can be validated locally, but not rehearsed live against Firebase without missing environment provisioning and runtime completion work.

## Delivery State By Surface

### Root workspace

Status: locally runnable and validated.

Evidence:

* Validation workflow documented in [README.md](../../../../README.md#L42-L64)
* Task runner orchestration in [justfile](../../../../justfile#L3-L27)

### Web dashboard

Status: locally buildable, Firebase-dependent at runtime.

Evidence:

* Vite scripts in [apps/web/package.json](../../../../apps/web/package.json#L5-L9)
* Environment dependency and startup failure behavior in [apps/web/README.md](../../../../apps/web/README.md#L21-L37) and [apps/web/src/main.tsx](../../../../apps/web/src/main.tsx#L22-L35)

### Backend functions

Status: code surface exists and builds, but real rehearsal depends on project provisioning, seeding, and deployment.

Evidence:

* Package scripts in [services/backend-functions/package.json](../../../../services/backend-functions/package.json#L5-L10)
* Minimal-shell warning in [services/backend-functions/README.md](../../../../services/backend-functions/README.md#L17-L23)
* Seed env gate in [services/backend-functions/scripts/seed-demo-data.mjs](../../../../services/backend-functions/scripts/seed-demo-data.mjs#L458-L468)

### Raspberry Pi runtime

Status: local tests pass and the runtime starts, but the current entrypoint is not yet a persistent rehearsal process.

Evidence:

* Python package and script entry in [devices/pi-station/pyproject.toml](../../../../devices/pi-station/pyproject.toml#L16-L28)
* One-shot runtime behavior in [devices/pi-station/README.md](../../../../devices/pi-station/README.md#L94-L108) and [devices/pi-station/src/binsight_station/main.py](../../../../devices/pi-station/src/binsight_station/main.py#L372-L383)

### Firebase infra

Status: configuration files exist, but no fully checked-in deploy workflow was identified.

Evidence:

* Configured Functions and Firestore wiring in [infra/firebase/firebase.json](../../../../infra/firebase/firebase.json#L1-L24)
* Firestore read access limited to authenticated operators for `stationLiveStatus` in [infra/firebase/firestore.rules](../../../../infra/firebase/firestore.rules#L1-L15)

## Recommended Next Research

* Verify whether a Firebase CLI workflow exists outside checked-in scripts, including expected working directory and `--project` usage.
* Inspect whether the backend callable and HTTP handlers are functionally complete enough for production-like seed, ingest, and query flows once deployed.
* Trace the web dashboard route loaders against backend callable names to confirm that every required read path is implemented and exported.
* Trace the Pi `PublicationAdapter` against deployed function URLs and auth headers to confirm end-to-end compatibility with the backend runtime.
* Assess whether Firestore rules and indexes are sufficient for all dashboard pages, not only `stationLiveStatus`.
* Verify whether operator login depends only on authentication or on additional custom claims in practice.

## Clarifying Questions That Research Alone Cannot Resolve

* Which Firebase project should be treated as the rehearsal target?
* Is a manual Firebase CLI deployment workflow already established outside the repository?
* Is the intended Phase 5 rehearsal acceptable with the current one-shot Pi entrypoint, or is a persistent session loop required before rehearsal can count as complete?