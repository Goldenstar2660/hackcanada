---
title: Firebase Deployment Workflow Research
description: Research notes capturing the Firebase deployment workflow implied by the repository
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - firebase
  - deployment
  - hosting
  - functions
  - firestore
estimated_reading_time: 6
---

## Research Scope

* Determine the exact Firebase deployment workflow implied by this repository.
* Inspect Firebase configuration, scripts, package manifests, and missing deployment artifacts.
* Identify required Firebase resources, ambiguities, and whether Firebase Hosting is configured.

## Inputs Reviewed

* spec/binsight-spec.md
* infra/firebase/firebase.json
* infra/firebase/firestore.rules
* infra/firebase/firestore.indexes.json
* services/backend-functions/package.json
* services/backend-functions/tsconfig.json
* services/backend-functions/README.md
* services/backend-functions/src/runtime/bootstrap.ts
* services/backend-functions/src/runtime/firebase-runtime.ts
* services/backend-functions/src/runtime/firebase-bridges.ts
* services/backend-functions/dist/index.js
* apps/web/package.json
* apps/web/vite.config.ts
* apps/web/README.md
* apps/web/.env.example
* apps/web/src/main.tsx
* package.json
* justfile
* README.md

## Verified Findings

### Source-of-truth architecture

The product spec is explicit about the cloud shape:

* Firestore is the database.
* Firebase Cloud Functions is the website backend.
* Dashboard and backend may be cloud hosted.

Evidence:

* spec/binsight-spec.md:150-154

### Firebase config currently present in-repo

The only Firebase deployment config checked in is Firestore and Functions config under infra/firebase:

* `infra/firebase/firebase.json` declares one Functions codebase with source `../../services/backend-functions`.
* The same config deploys Firestore rules and composite indexes.
* Emulator ports are defined for UI, Functions, and Firestore.
* There is no Hosting stanza in `infra/firebase/firebase.json`.

Evidence:

* infra/firebase/firebase.json:2-21

### Firestore resources implied by the repo

Firestore must exist before the dashboard can function as intended:

* Rules only allow reads to `stationLiveStatus/{stationId}` for authenticated users and deny all writes from clients.
* Composite indexes are required for `disposalEvents` by `stationId + timestamp` and for `stations` comparison queries by building, floor, location, signage, and layout dimensions.

Evidence:

* infra/firebase/firestore.rules:4-14
* infra/firebase/firestore.indexes.json:4-52

### Functions surface implied by the repo

The backend package is a real Firebase Functions codebase, not a placeholder anymore:

* The package depends on `firebase-admin` and `firebase-functions`.
* TypeScript builds from `src` to `dist`.
* The runtime exports three HTTP functions, three callable functions, and one Firestore trigger.
* Firebase v2 wrappers are used via `onRequest`, `onCall`, and `onDocumentCreated`.

Evidence:

* services/backend-functions/package.json:5-16
* services/backend-functions/tsconfig.json:4-8
* services/backend-functions/src/runtime/firebase-runtime.ts:36-76
* services/backend-functions/src/runtime/firebase-bridges.ts:4-112

### Backend runtime prerequisites implied by code

The deployed backend expects runtime environment configuration outside the repo:

* `BINSIGHT_DEVICE_CREDENTIALS_JSON` is read from `process.env` and parsed at startup.
* `BINSIGHT_STORAGE_BUCKET` is read from `process.env` for Cloud Storage access.
* The backend initializes Firebase Admin with default app credentials.

Evidence:

* services/backend-functions/src/runtime/bootstrap.ts:1-3
* services/backend-functions/src/runtime/bootstrap.ts:26-34
* services/backend-functions/src/runtime/bootstrap.ts:57-71

### Seed workflow implied by the repo

The checked-in seed path is explicit:

* The package README says the Phase 3 demo expects a real Firebase project, not only emulators.
* Required environment for seeding is `FIREBASE_PROJECT_ID`, `BINSIGHT_STORAGE_BUCKET`, and `BINSIGHT_DEVICE_CREDENTIALS_JSON`.
* The seed workflow also requires Firebase Application Default Credentials, with `GOOGLE_APPLICATION_CREDENTIALS` called out as the direct setup path.
* The command is `corepack pnpm --filter @binsight/backend-functions run seed:demo`.

Evidence:

* services/backend-functions/README.md:23-44
* services/backend-functions/README.md:60-66

### Website hosting path currently implied by the repo

The web surface is currently set up to run through Vite, not through checked-in Firebase Hosting config:

* The web package scripts are `vite build` and `vite`.
* Vite outputs a static `dist` directory.
* The README says the dashboard is a Vite-hosted React app backed by Firebase Auth, callable functions, and Firestore subscriptions.
* The README instructs the user to start the Vite host locally.
* The web app initializes Firebase App, Auth, Firestore, and Functions from `VITE_FIREBASE_*` variables.
* `apps/web/.env.example` exists, so local environment bootstrapping is documented.

Evidence:

* apps/web/package.json:7-21
* apps/web/vite.config.ts:13-14
* apps/web/README.md:19-21
* apps/web/README.md:26-36
* apps/web/README.md:44-51
* apps/web/.env.example:1-8
* apps/web/src/main.tsx:3-44

## Exact Commands Implied by the Repo

These are the commands the repository most strongly implies today.

### 1. Install workspace dependencies

```bash
corepack pnpm install
```

Evidence:

* justfile:6-7

### 2. Build the backend Functions package before any deploy attempt

```bash
corepack pnpm --filter @binsight/backend-functions run build
```

Evidence:

* services/backend-functions/package.json:7-10
* services/backend-functions/tsconfig.json:4-8

### 3. Deploy Firestore configuration

Because there is no `.firebaserc`, the repo implies passing `--project` explicitly.

```bash
firebase deploy \
  --project "$FIREBASE_PROJECT_ID" \
  --config infra/firebase/firebase.json \
  --only firestore:rules,firestore:indexes
```

Evidence:

* infra/firebase/firebase.json:2-10
* no `.firebaserc` file exists anywhere in the workspace

### 4. Deploy Functions

The intended deploy command is:

```bash
firebase deploy \
  --project "$FIREBASE_PROJECT_ID" \
  --config infra/firebase/firebase.json \
  --only functions
```

Or combined with Firestore:

```bash
firebase deploy \
  --project "$FIREBASE_PROJECT_ID" \
  --config infra/firebase/firebase.json \
  --only firestore:rules,firestore:indexes,functions
```

Important qualification:

* This command is implied by `infra/firebase/firebase.json`, but the repo does not fully wire the Functions package for Firebase CLI deployment yet.
* The package root only contains `package.json`, `README.md`, and `tsconfig.json`.
* The compiled entrypoint exists at `services/backend-functions/dist/index.js`.
* The package has no `main` field and no checked-in root `index.js`.
* `firebase.json` has no `predeploy` hook that builds or rewrites the entrypoint.

That means Firestore deployment is concrete, but Functions deployment is still ambiguous and may fail until the package entrypoint is wired for Firebase CLI expectations.

Evidence:

* infra/firebase/firebase.json:2-5
* services/backend-functions/package.json:5-16
* services/backend-functions/dist/index.js:1-5
* top-level files present in `services/backend-functions`: package.json, README.md, tsconfig.json

### 5. Seed demo data after the target Firebase project is reachable

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export FIREBASE_PROJECT_ID=your-firebase-project-id
export BINSIGHT_STORAGE_BUCKET=your-firebase-project-id.firebasestorage.app
export BINSIGHT_DEVICE_CREDENTIALS_JSON='[{"deviceId":"pi-demo-001","stationId":"demo-station-001","sharedSecret":"replace-with-demo-secret","enabled":true}]'
corepack pnpm --filter @binsight/backend-functions run seed:demo
```

Evidence:

* services/backend-functions/README.md:25-44
* services/backend-functions/README.md:60-76
* README.md:149-158

### 6. Start the dashboard locally through Vite

```bash
cp apps/web/.env.example apps/web/.env
corepack pnpm --filter @binsight/web run dev
```

Evidence:

* apps/web/.env.example:1-8
* apps/web/README.md:44-51
* apps/web/package.json:7-8

## Firebase Resources and Services That Must Exist First

### Required

* One Firebase project shared by backend, dashboard, and Pi runtime.
* One Firestore database with rules and indexes deployed.
* Cloud Functions enabled in the same Firebase project.
* A Cloud Storage bucket matching `BINSIGHT_STORAGE_BUCKET`, because the backend runtime constructs a storage bucket client from that environment variable.
* Firebase Authentication configured for email/password sign-in, with at least one operator user.
* A local service account or other ADC source for seeding, exposed through `GOOGLE_APPLICATION_CREDENTIALS`.
* Device credentials for the Pi publication flow, supplied through `BINSIGHT_DEVICE_CREDENTIALS_JSON`.

Evidence:

* spec/binsight-spec.md:150-154
* services/backend-functions/README.md:25-37
* services/backend-functions/README.md:80-80
* services/backend-functions/src/runtime/bootstrap.ts:57-71
* apps/web/README.md:26-33
* README.md:160-160

### Not Proven In-Repo

The repository does not prove or configure these details:

* Billing plan requirements for Cloud Functions v2 or Cloud Storage.
* Region choice beyond the dashboard default of `us-central1` for callable functions.
* Whether non-default Firestore database names are supported.

## What Is Ambiguous or Missing In-Repo

### Missing deployment artifacts

* No `.firebaserc` file is present, so there is no checked-in project aliasing.
* No Firebase Hosting configuration exists in `infra/firebase/firebase.json`.
* No deployment script exists in root `package.json`, `justfile`, or backend `package.json`.
* No `firebase-tools` dependency is declared in the root or backend package manifests.

Evidence:

* package.json:7-9
* justfile:6-25
* services/backend-functions/package.json:5-16
* infra/firebase/firebase.json:2-21

### Missing Functions deployment wiring

The repo compiles the backend to `dist`, but the source package declared in Firebase config does not expose that output in a way the repo documents or automates:

* Firebase source points at `services/backend-functions`.
* TypeScript emits to `dist`.
* The compiled module exports exist in `dist/index.js`.
* The package root has no checked-in `index.js` and no `main` field pointing at `dist/index.js`.

This is the biggest ambiguity in the current deployment story.

Evidence:

* infra/firebase/firebase.json:4-5
* services/backend-functions/tsconfig.json:4-8
* services/backend-functions/dist/index.js:1-5
* services/backend-functions/package.json:5-16

### Missing runtime env injection strategy for deployed Functions

The backend reads required values from `process.env`, but the repo does not define how those values are injected into deployed Firebase Functions:

* No `.env` file for the backend is checked in.
* No secret definitions or Firebase parameter definitions are present in the deployed bridge layer.
* No `.runtimeconfig.json` or equivalent deployment artifact is present.

Evidence:

* services/backend-functions/src/runtime/bootstrap.ts:26-34
* services/backend-functions/src/runtime/bootstrap.ts:57-71
* services/backend-functions/src/runtime/firebase-bridges.ts:4-112

## Is Firebase Hosting Configured

No. Firebase Hosting is not configured in this repository today.

What is true instead:

* The web app is designed to run locally via Vite.
* The app can produce a static `dist` build.
* The spec allows the dashboard to be cloud hosted, but does not choose Firebase Hosting.

What is missing for Firebase Hosting:

* no `hosting` section in `infra/firebase/firebase.json`
* no Firebase Hosting site or target configuration in-repo
* no rewrite rules for SPA routing
* no documented `firebase deploy --only hosting` path

Conclusion:

* Hosting the website on Firebase is still an open question, not a completed configuration.

Evidence:

* infra/firebase/firebase.json:2-21
* apps/web/package.json:7-8
* apps/web/vite.config.ts:13-14
* apps/web/README.md:19-21
* apps/web/README.md:44-51
* spec/binsight-spec.md:154-154

## Open Questions

* Should `services/backend-functions/package.json` declare `main: "dist/index.js"`, or should deployment instead point Firebase directly at a dedicated compiled package directory?
* How should deployed Functions receive `FIREBASE_PROJECT_ID`, `BINSIGHT_STORAGE_BUCKET`, and `BINSIGHT_DEVICE_CREDENTIALS_JSON`: Firebase params, secrets, or another mechanism?
* Does the team want the dashboard to stay Vite-hosted for demos only, or should Firebase Hosting become an official deployment target?

## Next Research

* Validate the Functions deploy path once a package entry strategy is chosen.
* Decide whether Firebase Hosting should be added or whether the documented path remains local Vite hosting.
* Document the exact Functions environment and secret provisioning method once selected.