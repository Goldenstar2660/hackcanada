---
title: Firebase Rehearsal Runbook
description: Step-by-step commands for configuring, deploying, seeding, and running the Binsight Firebase demo rehearsal
---

## Scope

Use this runbook for the supported rehearsal path in this repository:

* One real Firebase project shared by the dashboard, backend functions, Firestore, Auth, and Storage
* Firestore rules and indexes plus backend functions deployed to Firebase
* Demo data seeded from your machine with application default credentials
* Dashboard served locally with Vite
* Raspberry Pi runtime pointed at the same Firebase project and the same device credential pair

This runbook does not add Firebase Hosting, emulator orchestration, or a redesigned long-running Pi runtime.

> [!NOTE]
> The supported website path for this rehearsal is `corepack pnpm run web:dev`. `infra/firebase/firebase.json` intentionally keeps Firebase Hosting out of scope for this cycle.

> [!IMPORTANT]
> The dashboard, backend, and Pi runtime must all target the same `FIREBASE_PROJECT_ID`. The backend `BINSIGHT_DEVICE_CREDENTIALS_JSON` entry and the Pi `BINSIGHT_DEVICE_ID` plus `BINSIGHT_DEVICE_SHARED_SECRET` must also match.

## Prerequisites

Run these commands once on the machine you will use for the rehearsal:

```bash
export REPO_ROOT=/home/handwash/Projects/hackcanada
cd "$REPO_ROOT"
corepack enable
corepack pnpm install
cd "$REPO_ROOT/devices/pi-station"
uv sync
cd "$REPO_ROOT"
```

Sign in to Firebase CLI on the same machine:

```bash
cd /home/handwash/Projects/hackcanada
corepack pnpm dlx firebase-tools@latest login
```

Complete these manual Firebase prerequisites before you continue:

1. Create one Firebase project for the demo
2. Enable Firestore Database, Cloud Functions, Firebase Authentication with email and password, and Cloud Storage
3. Create the Firebase web app that supplies the `VITE_FIREBASE_*` values
4. Create the Firebase Auth operator user that will sign in to the dashboard
5. Create or download the Google service account JSON file you will use for `GOOGLE_APPLICATION_CREDENTIALS`

## Supported execution order

Run the live rehearsal in this order after the manual prerequisites are complete:

1. Set `BINSIGHT_FIREBASE_PROJECT_ID` in local config or export `FIREBASE_PROJECT_ID`
2. Create the local configuration files for Functions, web, and Pi
3. Build the backend
4. Deploy Firestore rules and indexes
5. Deploy backend Functions
6. Export the seed-only shell variables and seed the demo dataset
7. Start the dashboard locally with Vite
8. Sign in to the dashboard with the Firebase Auth operator account
9. Validate the Pi runtime with `uv run pytest`
10. Start the Pi runtime with `uv run binsight-station`

## Choose the Firebase Project

Use one of these project-id inputs for the rest of the commands in this runbook:

```bash
export FIREBASE_PROJECT_ID=your-firebase-project-id
```

or keep this non-reserved value in local config such as `services/backend-functions/.env.$FIREBASE_PROJECT_ID`:

```text
BINSIGHT_FIREBASE_PROJECT_ID=your-firebase-project-id
```

## Create the Local Configuration Files

Create the deployed Functions env file for the selected Firebase project:

```bash
cd /home/handwash/Projects/hackcanada
cp services/backend-functions/.env.example "services/backend-functions/.env.$FIREBASE_PROJECT_ID"
cat > "services/backend-functions/.env.$FIREBASE_PROJECT_ID" <<EOF
BINSIGHT_FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
BINSIGHT_STORAGE_BUCKET=${FIREBASE_PROJECT_ID}.firebasestorage.app
BINSIGHT_DEVICE_CREDENTIALS_JSON=[{"deviceId":"pi-demo-001","stationId":"demo-station-001","sharedSecret":"replace-with-demo-secret","enabled":true}]
EOF
```

Keep `BINSIGHT_FIREBASE_PROJECT_ID` in `services/backend-functions/.env.$FIREBASE_PROJECT_ID` if you want repo-local project-id fallback. Do not add `FIREBASE_PROJECT_ID` there because Firebase rejects reserved prefixes such as `FIREBASE_`, `X_GOOGLE_`, and `EXT_` in deploy-time env files.

Create the web dashboard env file:

```bash
cd /home/handwash/Projects/hackcanada
cp apps/web/.env.example apps/web/.env
cat > apps/web/.env <<EOF
VITE_FIREBASE_API_KEY=replace-with-firebase-web-api-key
VITE_FIREBASE_APP_ID=replace-with-firebase-web-app-id
VITE_FIREBASE_AUTH_DOMAIN=${FIREBASE_PROJECT_ID}.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
VITE_FIREBASE_FUNCTIONS_REGION=us-central1
VITE_FIREBASE_MESSAGING_SENDER_ID=replace-with-firebase-messaging-sender-id
VITE_FIREBASE_STORAGE_BUCKET=${FIREBASE_PROJECT_ID}.firebasestorage.app
VITE_FIREBASE_MEASUREMENT_ID=replace-with-firebase-measurement-id
EOF
```

Create the Pi runtime env file:

```bash
cd /home/handwash/Projects/hackcanada
cp devices/pi-station/.env.example devices/pi-station/.env
cat > devices/pi-station/.env <<EOF
STATION_ID=demo-station-001
RULES_PRESET_ID=demo-canada-ottawa
RULES_PRESET_VERSION=1.0.0
ESP_ENDPOINT=http://192.168.4.1
BINSIGHT_FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
FIREBASE_FUNCTIONS_REGION=us-central1
FIREBASE_FUNCTIONS_BASE_URL=
BINSIGHT_DEVICE_ID=pi-demo-001
BINSIGHT_DEVICE_SHARED_SECRET=replace-with-demo-secret
BINSIGHT_PUBLICATION_TIMEOUT_SECONDS=5.0
PRESENCE_DEBOUNCE_SECONDS=0.35
DISPOSAL_TIMEOUT_SECONDS=12.0
RESET_COOLDOWN_SECONDS=1.5
EOF
```

Update the placeholder values before you continue:

* Replace the Firebase web app placeholders in `apps/web/.env` with the values from the Firebase console
* Replace `replace-with-demo-secret` in both `devices/pi-station/.env` and `services/backend-functions/.env.$FIREBASE_PROJECT_ID` with the same shared secret
* Keep `FIREBASE_PROJECT_ID` out of `services/backend-functions/.env.$FIREBASE_PROJECT_ID`; use `BINSIGHT_FIREBASE_PROJECT_ID` for repo-local config and pass the actual Firebase project id through `--project`, shell exports for seed commands, `apps/web/.env`, and the Pi runtime env
* Keep `demo-station-001` and `pi-demo-001` unchanged unless you also update both files to a new station and device pair

## Build the Backend

Build the backend from the repository root:

```bash
cd /home/handwash/Projects/hackcanada
corepack pnpm run backend:build
```

If you prefer `just`, use:

```bash
cd /home/handwash/Projects/hackcanada
just rehearsal-build-backend
```

## Deploy Firestore Rules and Indexes

Deploy the Firestore-managed surfaces from the repository root:

```bash
cd /home/handwash/Projects/hackcanada
corepack pnpm run firebase:deploy:firestore
```

If you prefer `just`, use:

```bash
cd /home/handwash/Projects/hackcanada
just rehearsal-deploy-firestore
```

## Deploy Functions

Deploy the backend Functions from the repository root:

```bash
cd /home/handwash/Projects/hackcanada
corepack pnpm run firebase:deploy:functions
```

If you prefer `just`, use:

```bash
cd /home/handwash/Projects/hackcanada
just rehearsal-deploy-functions
```

## Seed the Demo Dataset

Export the local seed environment in the shell you will use for seeding:

```bash
export BINSIGHT_FIREBASE_PROJECT_ID=your-firebase-project-id
export BINSIGHT_STORAGE_BUCKET="${FIREBASE_PROJECT_ID}.firebasestorage.app"
export BINSIGHT_DEVICE_CREDENTIALS_JSON='[{"deviceId":"pi-demo-001","stationId":"demo-station-001","sharedSecret":"replace-with-demo-secret","enabled":true}]'
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

Run the repository-owned seed command:

```bash
cd /home/handwash/Projects/hackcanada
corepack pnpm run backend:seed:demo
```

If you prefer `just`, use:

```bash
cd /home/handwash/Projects/hackcanada
just rehearsal-seed-demo
```

> [!NOTE]
> The seed script accepts either `FIREBASE_PROJECT_ID` or `BINSIGHT_FIREBASE_PROJECT_ID`, then reads the remaining shell exports plus application default credentials from `GOOGLE_APPLICATION_CREDENTIALS`. It does not read `BINSIGHT_STORAGE_BUCKET` or `BINSIGHT_DEVICE_CREDENTIALS_JSON` from `services/backend-functions/.env.$FIREBASE_PROJECT_ID`.

## Start the Dashboard

Start the local Vite dashboard:

```bash
cd /home/handwash/Projects/hackcanada
corepack pnpm run web:dev
```

If you prefer `just`, use:

```bash
cd /home/handwash/Projects/hackcanada
just rehearsal-web-local
```

Open the local URL printed by Vite and sign in with the Firebase Auth email/password operator account for the same project.

## Start the Pi Runtime

Validate the Pi runtime before the live rehearsal:

```bash
cd /home/handwash/Projects/hackcanada/devices/pi-station
uv run pytest
```

If you prefer `just`, use:

```bash
cd /home/handwash/Projects/hackcanada
just rehearsal-pi-validate
```

Start the Pi runtime:

```bash
cd /home/handwash/Projects/hackcanada/devices/pi-station
uv run binsight-station
```

If you prefer `just`, use:

```bash
cd /home/handwash/Projects/hackcanada
just rehearsal-pi-start
```

The current runtime path polls the ESP health endpoint once, attempts to publish live status, prints a one-line station summary, and exits.

## Repo-Owned Work vs Manual Operator Work

### Repo-owned work

Everything up to this section is repo-owned work. The repository defines the configuration templates, the root `pnpm` command surface, the Pi `uv` commands, and the expected order for build, deploy, seed, dashboard startup, and Pi startup.

### Manual operator work

These actions still require you to work outside normal repo automation:

* Create the Firebase project and enable Firestore Database, Cloud Functions, Firebase Authentication with email/password, and Cloud Storage
* Create the Firebase web app and copy its API key, app id, messaging sender id, and measurement id into `apps/web/.env`
* Create the Firebase Auth operator user that will sign in to the dashboard
* Create or download the Google service account JSON file and point `GOOGLE_APPLICATION_CREDENTIALS` at it
* Replace the placeholder shared secret in both `services/backend-functions/.env.$FIREBASE_PROJECT_ID` and `devices/pi-station/.env`
* Update `firmware/esp8266-controller/platformio.ini` with Wi-Fi build flags for the rehearsal network
* Keep the dashboard local on Vite for this rehearsal. Do not add a Firebase Hosting deploy to the sequence unless a later task explicitly changes scope
* Flash the ESP8266 controller after those Wi-Fi build flags are set:

```bash
cd /home/handwash/Projects/hackcanada/firmware/esp8266-controller
../../.venv/bin/pio run -e nodemcuv2 -t upload
```

* Connect the flashed ESP8266 and the Raspberry Pi to the correct network, then run the live disposal walkthrough with the dashboard already open