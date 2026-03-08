---
title: Vercel Frontend Deployment Research
description: Research on how the current Binsight frontend should be deployed to Vercel from the existing monorepo layout and Firebase-backed runtime model
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - vercel
  - vite
  - monorepo
  - firebase
  - deployment
estimated_reading_time: 8
---

## Research Topics

* Determine the correct Vercel project settings for the current repository layout
* Verify whether SPA deep-link rewrites are required
* Identify the exact install, build, and output settings that match the current workspace
* Identify Firebase runtime prerequisites and deployment risks for a Vercel-hosted dashboard
* Decide whether repository changes are recommended before or during Vercel adoption

## Workspace Evidence

### Monorepo structure and package manager

* The repository root declares `pnpm@10.6.3` in `packageManager` and uses `pnpm-workspace.yaml` for `apps/*`, `services/*`, and `packages/*`.
* The web app is `@binsight/web` in `apps/web/package.json`.
* The root build script runs all workspace builds, which is broader than needed for a Vercel frontend deployment.

Relevant files:

* [package.json](../../../package.json)
* [pnpm-workspace.yaml](../../../pnpm-workspace.yaml)
* [apps/web/package.json](../../../apps/web/package.json)

### Web build shape

* `apps/web/package.json` builds with `vite build` and outputs to `dist`.
* `apps/web/vite.config.ts` explicitly sets `build.outDir` to `dist`.
* A local validation run of `node scripts/pnpm-cli.mjs --filter @binsight/web run build` succeeded and produced `apps/web/dist`.

Relevant files:

* [apps/web/package.json](../../../apps/web/package.json)
* [apps/web/vite.config.ts](../../../apps/web/vite.config.ts)
* [scripts/pnpm-cli.mjs](../../../scripts/pnpm-cli.mjs)

### Shared package dependency constraint

`apps/web/vite.config.ts` aliases shared packages directly to source files outside the app directory:

* `../../packages/analytics/src/index.ts`
* `../../packages/contracts/src/index.ts`

This matters because Vercel documents that a project Root Directory cannot access files outside that directory. With the current code, setting the Vercel Root Directory to `apps/web` is risky because the build depends on files above that directory.

Relevant file:

* [apps/web/vite.config.ts](../../../apps/web/vite.config.ts)

### SPA routing behavior

The app uses browser history routing instead of hash routing:

* `window.location.pathname`
* `window.history.pushState`
* `window.history.replaceState`
* `popstate`

The route table includes paths such as `/stations`, `/stations/:stationId/live`, `/history`, `/analytics`, and `/comparisons`.

That means direct loads and refreshes on deep links require a rewrite to `index.html` on static hosting.

Relevant files:

* [apps/web/src/main.tsx](../../../apps/web/src/main.tsx)
* [apps/web/src/app/providers.tsx](../../../apps/web/src/app/providers.tsx)
* [apps/web/src/app/router.tsx](../../../apps/web/src/app/router.tsx)

### Firebase runtime model

The dashboard is not a self-contained static brochure app. At runtime it requires:

* Firebase Auth email and password sign-in
* Firestore reads and live subscriptions
* Firebase callable Functions
* matching Firebase web app configuration in `VITE_FIREBASE_*`

The app hard-fails at startup when required environment variables are missing.

Relevant files:

* [apps/web/.env.example](../../../apps/web/.env.example)
* [apps/web/src/main.tsx](../../../apps/web/src/main.tsx)
* [apps/web/src/lib/api/dashboard-gateway.ts](../../../apps/web/src/lib/api/dashboard-gateway.ts)
* [apps/web/src/lib/firebase/live-status.ts](../../../apps/web/src/lib/firebase/live-status.ts)

### Current repo guidance

The repository currently documents the supported web path as local Vite for the rehearsal flow and explicitly keeps Firebase Hosting out of scope. There is no checked-in Vercel deployment guidance and no existing `vercel.json`.

Relevant files:

* [apps/web/README.md](../../../apps/web/README.md)
* [README.md](../../../README.md)

## External Research

### Vercel monorepo guidance

Vercel documents monorepo support through per-project Root Directory selection. Vercel also documents that the package manager is detected from the repository lockfile and root `packageManager` field.

Important constraint from Vercel build docs:

* A project Root Directory cannot access files outside that directory.

For this repository, that constraint conflicts with the current `apps/web` Vite alias configuration that reaches into `../../packages/*`.

### Vercel Vite SPA guidance

Vercel documents that Vite apps deployed as SPAs do not support deep links out of the box and require a rewrite to `index.html`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Findings

### Recommended Vercel project shape

Use a single Vercel project rooted at the repository root, not at `apps/web`.

Reasoning:

* The frontend build currently depends on shared package source files outside `apps/web`.
* A repo-root Vercel project can safely run the workspace-aware build command and publish `apps/web/dist`.
* This avoids a brittle deployment that depends on undocumented behavior around cross-directory access from an app-level Root Directory.

### Exact commands and settings

Recommended dashboard settings for the current repo state:

* Root Directory: `.`
* Framework Preset: `Other`
* Install Command: `pnpm install --frozen-lockfile`
* Build Command: `node scripts/pnpm-cli.mjs --filter @binsight/web run build`
* Output Directory: `apps/web/dist`

Why not use the root `build` script:

* The root script builds the whole workspace, not only the dashboard.
* That increases build time and couples Vercel deploys to unrelated packages and services.

### SPA rewrite requirement

Yes. A rewrite is needed for deep links because the app uses browser history routing and Vercel documents that SPA Vite deep links do not work without a rewrite.

### Firebase-backed runtime prerequisites

These prerequisites must exist in the target Firebase project before the Vercel deployment is useful:

* Firebase web app values copied into Vercel environment variables for Production and Preview
* Firebase Authentication enabled with email and password
* An operator user account created for sign-in
* Firestore database provisioned with the expected data model
* Backend Functions deployed to the same Firebase project and region
* Seed data loaded if the dashboard is expected to show meaningful analytics and history in demo mode

### Main risks

* If `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, or `VITE_FIREBASE_PROJECT_ID` are missing, the app throws during startup.
* If `VITE_FIREBASE_FUNCTIONS_REGION` is wrong, callable function requests will target the wrong region.
* If Auth, Firestore, or Functions are deployed to different Firebase projects, login and data fetches will fail in inconsistent ways.
* If the demo dataset is not seeded, the dashboard can still load, but the analytics and history views will not reflect the expected demo narrative.
* The repo currently documents local Vite as the supported path, so Vercel becomes an additional deployment mode that is not yet written down for operators.

## Recommended Repo Changes

Recommended:

* Add a repo-root `vercel.json` with the SPA rewrite.
* Add a small root script such as `"web:build": "node scripts/pnpm-cli.mjs --filter @binsight/web run build"` so Vercel can use a short, repo-owned build command.
* Add a short deployment note to `apps/web/README.md` or `docs/` documenting the Vercel path and required `VITE_FIREBASE_*` variables.

Optional follow-on improvement:

* Refactor the web package so it no longer aliases `../../packages/*/src` directly. If shared packages are consumed through standard workspace package entry points, the Vercel Root Directory could later move to `apps/web` cleanly.

## Clarifying Questions

* Should Preview deployments point at a separate Firebase project, or should they share the production Firebase project during the demo period?
* Is Vercel intended only for the dashboard frontend, or should the team also standardize the backend deployment story beyond Firebase Functions?

## Status

Complete