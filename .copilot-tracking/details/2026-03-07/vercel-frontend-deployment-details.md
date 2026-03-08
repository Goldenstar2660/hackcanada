<!-- markdownlint-disable-file -->

## Context References

* Plan: `.copilot-tracking/plans/2026-03-07/vercel-frontend-deployment-plan.instructions.md`
* Research: `.copilot-tracking/research/2026-03-07/vercel-frontend-deployment-research.md`
* Subagent research: `.copilot-tracking/research/subagents/2026-03-07/vercel-frontend-deployment.md`

## Phase Details

### Phase 1

Files:

* `vercel.json`
* `package.json`

Work:

* Add the SPA rewrite required by browser-history routing.
* Add a short root build script that Vercel can run without building unrelated workspaces.

Success criteria:

* Deep-link refreshes can resolve through `index.html`.
* Vercel has a single repo-owned build command for the dashboard.

### Phase 2

Files:

* `docs/vercel-frontend-deployment.md`
* `apps/web/README.md`

Work:

* Add a step-by-step deployment guide for a beginner.
* Link the guide from the web package README.
* Call out Firebase runtime prerequisites and the exact Vercel environment variables.

Success criteria:

* A new developer can follow the guide without reverse-engineering the monorepo.
* The guide clearly states what must already exist in Firebase before the Vercel site will work.

### Phase 3

Validation:

* Run `pnpm run web:build` from the repository root.
* Run error checks on edited files.
* Define post-deploy checks for sign-in, deep-link refreshes, and dashboard data visibility.