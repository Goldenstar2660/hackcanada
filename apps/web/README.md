---
title: Binsight Web Surface
description: Ownership and bootstrap notes for the dashboard website workspace package
---

## Purpose

This package owns the dashboard and live monitoring web surface for Binsight. It stays inside the TypeScript workspace because it shares contracts and analytics definitions with the backend and shared packages.

## Scope

* Station insights views
* Live monitoring UI
* Station and location filtering workflows
* Consumption of shared contracts and analytics definitions

## Bootstrap Status

This package now runs as a Vite-hosted React dashboard backed by Firebase Auth, Firebase callable functions, and Firestore live-status subscriptions.

## Required environment

Copy `.env.example` to `.env` and provide the Firebase web SDK values for the target demo project:

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_FUNCTIONS_REGION=us-central1
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_STORAGE_BUCKET=your-firebase-project-id.firebasestorage.app
VITE_FIREBASE_MEASUREMENT_ID=...
```

If any required `VITE_FIREBASE_*` value is missing, the app fails during startup instead of rendering a partial dashboard shell.

## Thin-slice operator flow

Use this order for the web surface during the Phase 5 demo rehearsal:

1. Ensure the backend functions are deployed to the same Firebase project that the dashboard `.env` targets.
2. Ensure the demo seed workflow has already populated the comparison dataset.
3. Start the Vite host from the repository root.

```bash
corepack pnpm --filter @binsight/web run dev
```

4. Open the local Vite URL in a browser.
5. Sign in with the provisioned Firebase Auth email and password operator account.
6. Keep the dashboard open while the Pi runtime publishes live status and disposal events.

## Validation status

The web package passed the Phase 5 local TypeScript lint and Vite production build on 2026-03-07.

> [!WARNING]
> Live operator login and Firebase-backed reads were not validated in this workspace on 2026-03-07 because no `apps/web/.env` file was present and no operator credentials were provisioned.

## Development

Install workspace dependencies from the repository root, then run the package script when you need a TypeScript watch loop:

```bash
corepack pnpm --filter @binsight/web run dev
```