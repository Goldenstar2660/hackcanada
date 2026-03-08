<!-- markdownlint-disable-file -->

## Related Plan Reference

* `.copilot-tracking/plans/2026-03-07/vercel-frontend-deployment-plan.instructions.md`

## Implementation Date

* 2026-03-07

## Summary Of Changes

* Added a root Vercel SPA rewrite configuration.
* Added a root frontend-only build script for Vercel.
* Added a beginner-oriented Vercel deployment guide.
* Linked the guide from the web package README.

## Added

* `vercel.json`
* `docs/vercel-frontend-deployment.md`
* `.copilot-tracking/research/2026-03-07/vercel-frontend-deployment-research.md`
* `.copilot-tracking/plans/2026-03-07/vercel-frontend-deployment-plan.instructions.md`
* `.copilot-tracking/details/2026-03-07/vercel-frontend-deployment-details.md`
* `.copilot-tracking/plans/logs/2026-03-07/vercel-frontend-deployment-log.md`

## Modified

* `package.json`
* `apps/web/README.md`

## Removed

* None

## Additional Or Deviating Changes

* The local validation path used `node scripts/pnpm-cli.mjs --filter @binsight/web run build` after a machine-specific Corepack signature failure blocked `pnpm run web:build`.
* Edited-file diagnostics were run against `docs/vercel-frontend-deployment.md`, `package.json`, `vercel.json`, and `apps/web/README.md`, with no relevant errors found.

## Release Summary

* The repo now contains the minimum configuration and documentation needed to deploy the current frontend to Vercel while keeping Firebase as the backend and data plane.