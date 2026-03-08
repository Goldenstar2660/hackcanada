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

## Firebase rehearsal runbook

Use `../../docs/firebase-rehearsal-runbook.md` for the exact setup, deploy, seed, and startup sequence. This README keeps only the package-specific dashboard notes.

If you want to host the frontend on Vercel instead of running it locally through Vite, use `../../docs/vercel-frontend-deployment.md`.

## Supported rehearsal path

The supported rehearsal path keeps the dashboard local on Vite. It does not deploy this package through Firebase Hosting in the current scope.

Start the dashboard only after you have:

1. Deployed Firestore rules and indexes to the target Firebase project
2. Deployed backend Functions to the same Firebase project
3. Seeded the demo dataset for that project

Use this command from the repository root when the backend and data plane are ready:

```bash
corepack pnpm run web:dev
```

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

During the rehearsal, the dashboard expects deployed backend functions, seeded demo data, and a local `apps/web/.env` file that points at the same Firebase project as the Pi runtime.

If you need a hosted dashboard URL later, treat Firebase Hosting as follow-on work. The current repo contract keeps the web surface local and keeps Firebase focused on backend Functions, Firestore, Auth, and Storage.

## Validation status

The web package passed the Phase 5 local TypeScript lint and Vite production build on 2026-03-07.

> [!WARNING]
> Live operator login and Firebase-backed reads were not validated in this workspace on 2026-03-07 because no `apps/web/.env` file was present and no operator credentials were provisioned.

## Development

Install workspace dependencies from the repository root, then run the package script when you need a TypeScript watch loop:

```bash
corepack pnpm --filter @binsight/web run dev
```