---
title: Binsight
description: Surface-first repository overview and setup entry point for the Binsight smart waste-sorting station project
---

## Overview

Binsight is a smart waste-sorting station for shared spaces. The repository is organized around product surfaces instead of a single language workspace so the Raspberry Pi runtime, ESP8266 firmware, dashboard, backend, and shared assets can evolve without collapsing their toolchains into one stack.

The product specification in `spec/binsight-spec.md` is the source of truth for scope, business logic, and technical boundaries.

## Repository Layout

* `apps/` contains user-facing application surfaces, starting with the dashboard website
* `devices/` contains station runtime code owned by the Raspberry Pi
* `firmware/` contains embedded code for the ESP8266 controller
* `services/` contains cloud backend services
* `packages/` contains shared contracts, rules assets, analytics definitions, and tooling
* `infra/` contains Firebase and deployment-facing infrastructure assets
* `docs/` contains architecture, operations, and decision records
* `scripts/` contains cross-surface automation helpers
* `spec/` contains the product specification and supporting source-of-truth material

## Working Agreement

* Keep the repository surface-first
* Treat the Raspberry Pi as the owner of the live control loop and the translator between firmware and cloud-facing contracts
* Keep firmware, Python, and TypeScript toolchains isolated unless a shared boundary is explicitly data-first
* Prefer shared schemas and versioned assets over shared cross-runtime business logic

## Getting Started

The repository already includes the current scaffold for every planned surface:

* `apps/web` for the dashboard shell
* `services/backend-functions` for the Firebase backend shell
* `devices/pi-station` for the Raspberry Pi runtime scaffold
* `firmware/esp8266-controller` for the ESP8266 firmware scaffold
* `packages/contracts`, `packages/rules`, `packages/analytics`, and `packages/tooling` for shared schemas and assets
* `infra/firebase` for Firebase configuration, rules, and indexes

If `just` is installed, list the available root tasks with:

```bash
just --list
```

Run the supported root validation workflow with:

```bash
just validate
```

That recipe executes the final integrated validation command set from the repository root:

```bash
corepack pnpm lint
corepack pnpm build
corepack pnpm test
cd devices/pi-station && uv run pytest
cd firmware/esp8266-controller && ../../.venv/bin/pio run
```

If the workspace-local PlatformIO binary is not present at `.venv/bin/pio`, the firmware step falls back to a globally installed `pio` executable.

## Phase 5 rehearsal status

The Phase 5 local validation pass completed on 2026-03-07 with this run order:

1. `corepack pnpm lint`
2. `corepack pnpm build`
3. `corepack pnpm test`
4. `cd devices/pi-station && uv run pytest`
5. `cd devices/pi-station && uv run binsight-station`
6. `cd firmware/esp8266-controller && ../../.venv/bin/pio run`
7. `just validate`

Observed local results:

* The TypeScript workspace linted and built successfully
* The Pi test suite passed with 21 tests
* `uv run binsight-station` started successfully and exited with `station=demo-station-001 phase=idle item=None disposal=None`
* The ESP8266 PlatformIO build completed successfully
* `just validate` passed end to end

## Thin-slice demo order

Use this order for the real station-to-cloud-to-dashboard demo once Firebase provisioning is in place:

1. Provision the demo environment for all three surfaces.
2. Seed the comparative Firebase dataset from the repository root.
3. Confirm the backend functions and Firestore configuration are deployed for the target Firebase project.
4. Start the Vite dashboard host from `apps/web`.
5. Sign in with the provisioned Firebase Auth operator account.
6. Start the Pi runtime from `devices/pi-station`.
7. Run the live station interaction against the seeded `demo-station-001` path while the dashboard is open.

The backend surface is not a long-running local process in this repository. The Pi runtime and dashboard both assume the callable and Firestore surface already exists in the target Firebase project.

> [!WARNING]
> The real Firebase rehearsal was not validated in this workspace on 2026-03-07. The demo seed command failed immediately because `FIREBASE_PROJECT_ID` was not set in the shell, no Firebase application credentials were present, and no web dashboard `.env` file was provisioned. Treat live dashboard updates, seeded history, and operator login as blocked until those environment prerequisites are supplied.

## Demo Bootstrap

The Phase 3 demo path assumes one Firebase project shared by the Pi runtime, backend functions, and Vite dashboard.

### Cross-Surface Environment Checklist

Pi runtime uses `devices/pi-station/.env` with these minimum values:

```text
STATION_ID=demo-station-001
RULES_PRESET_ID=demo-canada-ottawa
RULES_PRESET_VERSION=1.0.0
ESP_ENDPOINT=http://192.168.4.1
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_FUNCTIONS_REGION=us-central1
FIREBASE_FUNCTIONS_BASE_URL=
BINSIGHT_DEVICE_ID=pi-demo-001
BINSIGHT_DEVICE_SHARED_SECRET=replace-with-demo-secret
BINSIGHT_PUBLICATION_TIMEOUT_SECONDS=5.0
```

Backend functions use environment variables or deployment secrets for these minimum values:

```text
FIREBASE_PROJECT_ID=your-firebase-project-id
BINSIGHT_STORAGE_BUCKET=your-firebase-project-id.firebasestorage.app
BINSIGHT_DEVICE_CREDENTIALS_JSON=[{"deviceId":"pi-demo-001","stationId":"demo-station-001","sharedSecret":"replace-with-demo-secret","enabled":true}]
```

The Vite dashboard uses `apps/web/.env` with these Firebase web SDK values:

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_FUNCTIONS_REGION=us-central1
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_STORAGE_BUCKET=your-firebase-project-id.firebasestorage.app
```

### Seed Demo Data

Seeded historical data is required for the demo because the live station will not generate enough attempts to populate analytics, comparisons, history, and leaderboard views on its own.

1. Authenticate the Firebase Admin SDK against the demo project. `GOOGLE_APPLICATION_CREDENTIALS` is the most direct path for this repository.
2. Set `FIREBASE_PROJECT_ID` and `BINSIGHT_STORAGE_BUCKET` for the target project.
3. Run the seed command from the repository root.

```bash
corepack pnpm --filter @binsight/backend-functions run seed:demo
```

The seed command provisions the Ottawa preset at version `1.0.0`, three demo stations, live-status stubs, deterministic disposal-event history, and analytics rollups for station, floor, building, signage, layout, and location comparisons.

### Operator Access

The Phase 3 demo path uses Firebase Auth email and password sign-in for the dashboard. Create one operator user in the Firebase console, then use the same credentials in the Vite dashboard login form. No extra custom claims are required for the current demo bootstrap.

## Current Status

This repository now includes the TypeScript workspace scaffold, the Raspberry Pi runtime scaffold, the ESP8266 PlatformIO scaffold, schema-first shared contracts, rules and analytics placeholders, and the Firebase infrastructure boundary. The repository is still in foundation mode, so many modules remain placeholders, but the surface boundaries and validation entry points are in place.
