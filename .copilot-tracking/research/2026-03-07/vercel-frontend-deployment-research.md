<!-- markdownlint-disable-file -->

## Scope

Determine how to deploy the current Binsight dashboard frontend to Vercel from the existing pnpm monorepo without breaking the spec-aligned Firebase-backed runtime model.

## Source Of Truth

* `spec/binsight-spec.md`
* `.github/instructions/source-of-truth.instructions.md`
* `.copilot-tracking/research/subagents/2026-03-07/vercel-frontend-deployment.md`

## Key Findings

* The deployable frontend is the Vite React app in `apps/web`.
* The repository uses `pnpm@10.6.3` at the root and shared workspace packages, so the safest Vercel project root is the repository root.
* `apps/web/vite.config.ts` aliases shared workspace packages from `../../packages/*/src`, which makes an `apps/web` Vercel root risky.
* The dashboard uses browser-history routing, so Vercel needs an SPA rewrite to `index.html` for deep links and refreshes.
* The dashboard hard-fails at startup when required `VITE_FIREBASE_*` variables are missing.
* The app remains useful on Vercel only if Firebase Auth, Firestore, Functions, and demo data already exist in the target Firebase project.

## Selected Approach

1. Configure Vercel from the repository root.
2. Use a narrow frontend-only build command instead of the workspace-wide root build.
3. Add a repo-owned `vercel.json` rewrite for SPA deep links.
4. Add a beginner-oriented deployment guide that covers both the Vercel dashboard clicks and the local commands needed before deployment.

## Exact Vercel Settings

* Root Directory: `.`
* Framework Preset: `Other`
* Install Command: `pnpm install --frozen-lockfile`
* Build Command: `pnpm run web:build`
* Output Directory: `apps/web/dist`
* Node.js Version: `20.x`

## Risks

* Missing Firebase environment variables crash the app during startup.
* A wrong Firebase Functions region breaks callable requests.
* Unseeded or partially deployed Firebase resources lead to a working shell with missing dashboard data.

## Success Criteria

* The repository contains the minimum Vercel configuration needed for SPA hosting.
* The repository documents exact beginner-friendly deployment steps.
* The frontend still builds successfully with the new deployment-oriented script and configuration.