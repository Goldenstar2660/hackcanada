<!-- markdownlint-disable-file -->

## Discrepancy Log

### Unaddressed Research Items

* None after validation.

### Plan Deviations from Research

* None after validation.

## Implementation Paths Considered

Selected path:

* Configure Vercel at the repository root and document the exact dashboard workflow for the current monorepo shape.

Rejected alternatives:

* Root the Vercel project at `apps/web`. Rejected because the current Vite alias configuration reaches outside that directory.
* Use the root workspace `build` script. Rejected because it builds unrelated packages and services.

## Suggested Follow-On Work

* Refactor `apps/web` so shared packages are consumed through standard workspace entry points, which would make an `apps/web` Vercel root viable later.
* Decide whether Vercel Preview and Production should point at separate Firebase projects.