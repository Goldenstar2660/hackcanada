---
title: BinBuddy Backend Functions
description: Ownership and bootstrap notes for the Firebase backend workspace package
---

## Purpose

This package owns the TypeScript backend surface that will host Firebase Cloud Functions and backend-facing workflows for BinBuddy. It remains separate from the Raspberry Pi runtime so the live control loop stays local to the station.

## Scope

* Event ingestion and validation entry points
* Live status handling for dashboard consumers
* Analytics aggregation and read-model support
* Consumption of shared contracts and rules assets

## Bootstrap Status

This package is currently a minimal TypeScript shell. Firebase runtime wiring, emulator support, and HTTP surface definitions are deferred to later phases.

## Demo Bootstrap

The Phase 3 demo setup expects this package to run against a real Firebase project, not only an emulator.

### Required Environment

Set these values before deploying functions or running the seed workflow:

```text
FIREBASE_PROJECT_ID=your-firebase-project-id
BINBUDDY_STORAGE_BUCKET=your-firebase-project-id.firebasestorage.app
BINBUDDY_DEVICE_CREDENTIALS_JSON=[{"deviceId":"pi-demo-001","stationId":"demo-station-001","sharedSecret":"replace-with-demo-secret","enabled":true}]
```

`BINBUDDY_DEVICE_CREDENTIALS_JSON` must be a JSON array. Each entry maps one Pi device identity to one station id and shared secret. The Pi runtime sends these values in the `x-binbuddy-device-id`, `x-binbuddy-station-id`, `x-binbuddy-timestamp`, and `x-binbuddy-signature` headers when it calls `ingestEvent` and `ingestLiveStatus`.

The seed workflow and deployed functions also require Firebase application default credentials in the environment. `GOOGLE_APPLICATION_CREDENTIALS` is the most direct setup path for the current repository.

### Seed Workflow

Authenticate the Firebase Admin SDK for the target project, set the environment values above, and run:

```bash
corepack pnpm --filter @binbuddy/backend-functions run seed:demo
```

The seed script writes:

* the `demo-canada-ottawa` rules preset at version `1.0.0`
* three station metadata documents with comparison dimensions across building, floor, location, signage, and layout
* one live-demo station stub plus comparison station live-status documents
* deterministic disposal-event history and precomputed analytics rollups for dashboard coverage

The script also pre-creates analytics materialization ledger documents for seeded events so deployed Firestore triggers do not double-materialize the same dataset.

### Thin-slice run order

Use this backend order for the Phase 5 rehearsal:

1. Export `FIREBASE_PROJECT_ID`, `BINBUDDY_STORAGE_BUCKET`, and `BINBUDDY_DEVICE_CREDENTIALS_JSON` for the target Firebase project.
2. Export `GOOGLE_APPLICATION_CREDENTIALS` for an account that can seed Firestore documents in that project.
3. Seed the demo dataset.
4. Ensure the functions code from `services/backend-functions` and the Firestore config from `infra/firebase/firebase.json` are deployed to the same Firebase project before starting the dashboard or Pi runtime.

```bash
corepack pnpm --filter @binbuddy/backend-functions run seed:demo
```

The backend surface is consumed as deployed Firebase Functions. There is no separate long-running local backend host in the Phase 5 demo path.

## Validation status

The backend package passed the Phase 5 local TypeScript lint and build on 2026-03-07.

> [!WARNING]
> The real Firebase rehearsal is still blocked in this workspace. On 2026-03-07, `corepack pnpm --filter @binbuddy/backend-functions run seed:demo` failed immediately with `FIREBASE_PROJECT_ID is required for the demo seed workflow.` No Firebase application credentials or backend environment variables were present in the shell at validation time.

### Operator User Path

Create one Firebase Auth email and password user for the dashboard operator in the Firebase console. The current demo bootstrap treats any authenticated user as an operator for dashboard callables and live-status reads.

## Development

Install workspace dependencies from the repository root, then run the package watch script if you need local TypeScript compilation:

```bash
pnpm --filter @binbuddy/backend-functions run dev
```