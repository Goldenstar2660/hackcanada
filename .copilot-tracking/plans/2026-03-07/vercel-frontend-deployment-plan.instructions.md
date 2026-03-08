<!-- markdownlint-disable-file -->

# Vercel Frontend Deployment Plan

## Overview And Objectives

User requirement source: figure out how to deploy the frontend website to Vercel, provide detailed beginner-safe instructions including exact commands and dashboard clicks, and perform any repo setup that can be completed locally.

Derived objectives:

* Keep the deployment path aligned with the existing monorepo and Firebase-backed dashboard architecture.
* Reduce manual Vercel setup risk by checking in the minimum required repo configuration.
* Give the user a step-by-step guide that covers local prerequisites, Vercel UI actions, and post-deploy verification.
* Explicitly document Firebase runtime prerequisites, required environment variables, and the operator/demo-data checks needed after deployment.

## Context Summary

Relevant instructions and sources:

* `.github/instructions/source-of-truth.instructions.md`
* `spec/binsight-spec.md`
* Markdown and writing-style instructions for documentation files
* Repository memory in `/memories/repo/binbuddy-architecture-facts.md`
* `.copilot-tracking/research/2026-03-07/vercel-frontend-deployment-research.md`
* `.copilot-tracking/research/subagents/2026-03-07/vercel-frontend-deployment.md`

## Implementation Checklist

### Phase 1: Add repo deployment config <!-- parallelizable: false -->

- [x] Add a root `vercel.json` with an SPA rewrite to `index.html`.
- [x] Add a dedicated root `web:build` script that builds only `@binsight/web`.

### Phase 2: Add deployment documentation <!-- parallelizable: false -->

- [x] Add a beginner-focused Vercel deployment guide under `docs/`.
- [x] Update `apps/web/README.md` to point readers to the Vercel deployment guide.
- [x] Document the required Firebase runtime prerequisites, including Auth, Firestore, Functions, operator sign-in, and demo data.
- [x] Document the exact `VITE_FIREBASE_*` variables and where the user must add them in Vercel.

### Phase 3: Validate the setup <!-- parallelizable: false -->

- [x] Run the frontend production build through the new root script.
- [x] Check edited files for relevant errors.
- [x] Define post-deploy verification steps for sign-in, deep links, and populated dashboard screens.
- [x] Record any residual manual steps that cannot be automated from the workspace.

## Planning Log Reference

* `.copilot-tracking/plans/logs/2026-03-07/vercel-frontend-deployment-log.md`

## Dependencies

* Research artifacts under `.copilot-tracking/research/2026-03-07/`
* Subagent findings under `.copilot-tracking/research/subagents/2026-03-07/`
* Existing dashboard environment contract in `apps/web/.env.example`

## Success Criteria

* The repo includes the minimum Vercel configuration needed for the current SPA.
* The user has exact dashboard settings, commands, and click-by-click steps.
* The new build path succeeds locally.