---
title: Binsight Backend Functions
description: Ownership and bootstrap notes for the Firebase backend workspace package
---

## Purpose

This package owns the TypeScript backend surface that will host Firebase Cloud Functions and backend-facing workflows for Binsight. It remains separate from the Raspberry Pi runtime so the live control loop stays local to the station.

## Scope

* Event ingestion and validation entry points
* Live status handling for dashboard consumers
* Analytics aggregation and read-model support
* Consumption of shared contracts and rules assets

## Firebase rehearsal runbook

Use `../../docs/firebase-rehearsal-runbook.md` for the exact setup, deploy, seed, and startup sequence. This README keeps the backend-specific deploy and runtime contract notes.

## Deploy contract

Firebase deploys this package from `services/backend-functions`, but the runtime entrypoint is the built artifact at `dist/index.js`. The repository now treats the deploy flow as an explicit two-step contract:

1. Build the package.
2. Deploy the `backend-functions` Firebase codebase.

The Firebase configuration under `firebase.json` ignores the TypeScript source tree and upload-time documentation files. If `dist/index.js` is missing, the Functions deploy fails instead of silently compiling a different artifact.

Build the backend package from the repository root with:

```bash
corepack pnpm run backend:build
```

## Demo Bootstrap

The Phase 3 demo setup expects this package to run against a real Firebase project, not only an emulator.

### Deployed Functions runtime environment

Deployed Functions runtime values live in a per-project env file inside this package. Copy `.env.example` to `.env.$FIREBASE_PROJECT_ID`, then replace the placeholder values before `firebase deploy`.

```bash
cp services/backend-functions/.env.example services/backend-functions/.env.$FIREBASE_PROJECT_ID
```

The deployed env file must define these values:

```text
BINSIGHT_FIREBASE_PROJECT_ID=your-firebase-project-id
BINSIGHT_STORAGE_BUCKET=your-firebase-project-id.firebasestorage.app
BINSIGHT_DEVICE_CREDENTIALS_JSON=[{"deviceId":"pi-demo-001","stationId":"demo-station-001","sharedSecret":"replace-with-demo-secret","enabled":true}]
```

`BINSIGHT_FIREBASE_PROJECT_ID` is safe to keep in `services/backend-functions/.env.$FIREBASE_PROJECT_ID` as repo-local config. Do not add `FIREBASE_PROJECT_ID` to that file because Firebase Functions deploy treats `FIREBASE_` as a reserved prefix and rejects those keys in project env files.

`BINSIGHT_DEVICE_CREDENTIALS_JSON` must be a JSON array. Each entry maps one Pi device identity to one station id and shared secret. The Pi runtime sends these values in the `x-binsight-device-id`, `x-binsight-station-id`, `x-binsight-timestamp`, and `x-binsight-signature` headers when it calls `ingestEvent` and `ingestLiveStatus`.

Deploy Functions from the repository root with:

```bash
corepack pnpm run firebase:deploy:functions
```

The deployed HTTP and callable functions in this package are expected to remain publicly invokable at the Cloud Run transport layer. They do not rely on Cloud Run authentication for authorization. Instead:

* dashboard callables enforce Firebase Auth inside the handler with `assertOperatorIdentity(...)`
* device ingestion endpoints enforce signed device identity inside the handler with `deviceAuthenticator.authenticate(...)`

If the dashboard shows a CORS failure and Cloud Run logs report `The request was not authenticated` on an `OPTIONS` request, the underlying service is blocking browser preflight before the function code runs. Rebuild and redeploy this package so the transport settings match the repository contract.

### Local seed environment

The local seed workflow stays on shell exports plus application default credentials. Export these values in your shell before seeding demo data:

```text
BINSIGHT_FIREBASE_PROJECT_ID=your-firebase-project-id
BINSIGHT_STORAGE_BUCKET=your-firebase-project-id.firebasestorage.app
BINSIGHT_DEVICE_CREDENTIALS_JSON=[{"deviceId":"pi-demo-001","stationId":"demo-station-001","sharedSecret":"replace-with-demo-secret","enabled":true}]
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

The seed script now accepts either `FIREBASE_PROJECT_ID` or `BINSIGHT_FIREBASE_PROJECT_ID`. Do not rely on the per-project Functions env file for the other seed inputs. The script still reads `BINSIGHT_STORAGE_BUCKET`, `BINSIGHT_DEVICE_CREDENTIALS_JSON`, and `GOOGLE_APPLICATION_CREDENTIALS` from the shell environment and authenticates through application default credentials on the operator machine.

### Seed Workflow

Authenticate the Firebase Admin SDK for the target project, set the environment values above, and run:

```bash
corepack pnpm run backend:seed:demo
```

The seed script writes:

* the `demo-canada-ottawa` rules preset at version `1.0.0`
* three station metadata documents with comparison dimensions across building, floor, location, signage, and layout
* one live-demo station stub plus comparison station live-status documents
* deterministic disposal-event history and precomputed analytics rollups for dashboard coverage

The script also pre-creates analytics materialization ledger documents for seeded events so deployed Firestore triggers do not double-materialize the same dataset.

### Thin-slice run order

Use `../../docs/firebase-rehearsal-runbook.md` for the complete Phase 5 rehearsal order. The backend-specific rules stay the same: build before deploy, keep only non-reserved runtime values in `services/backend-functions/.env.$FIREBASE_PROJECT_ID`, and keep local seeding on shell exports plus `GOOGLE_APPLICATION_CREDENTIALS`.

The backend surface is consumed as deployed Firebase Functions. There is no separate long-running local backend host in the Phase 5 demo path.

## Validation status

The backend package passed the Phase 5 local TypeScript lint and build on 2026-03-07.

> [!WARNING]
> The real Firebase rehearsal is still blocked in this workspace. On 2026-03-07, `corepack pnpm --filter @binsight/backend-functions run seed:demo` failed immediately because no project id was available in the shell. The repo now accepts `BINSIGHT_FIREBASE_PROJECT_ID` as a fallback for deploy and seed commands, but the seed step still requires `BINSIGHT_STORAGE_BUCKET`, `BINSIGHT_DEVICE_CREDENTIALS_JSON`, and `GOOGLE_APPLICATION_CREDENTIALS` in the active shell.

### Operator User Path

Create one Firebase Auth email and password user for the dashboard operator in the Firebase console. The current demo bootstrap treats any authenticated user as an operator for dashboard callables and live-status reads.

## Development

Install workspace dependencies from the repository root, then run the package watch script if you need local TypeScript compilation:

```bash
corepack pnpm --filter @binsight/backend-functions run dev
```