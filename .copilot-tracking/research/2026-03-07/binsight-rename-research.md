<!-- markdownlint-disable-file -->
# Task Research: BinBuddy to Binsight Rename

## Task Implementation Requests

* Rename the product from BinBuddy to Binsight across the repository.
* Update docs, code identifiers, package names, Python module names, protocol headers, and environment or Firebase-facing config names.
* Preserve behavior while eliminating old-name references from active repository surfaces.

## Scope and Success Criteria

* Scope: Source files, package metadata, docs, spec references, env examples, Firebase-related defaults, protocol identifiers, and active tracking artifacts.
* Assumptions:
  * The rename should apply to both product-facing text and active technical identifiers.
  * Internal compatibility shims are not required because the Pi, backend, and firmware can move together in one repository change.
  * Historical tracking filenames may remain unchanged if their contents and active references are updated.
* Success Criteria:
  * Active repository files no longer reference BinBuddy identifiers.
  * The authoritative spec and Python module path are renamed on disk.
  * Build, test, and lint flows still pass or any residual blockers are explicitly reported.

## Key Discoveries

* The authoritative spec path and source-of-truth instruction hard-code the old product name.
* The TypeScript workspace uses the `@binbuddy/*` package scope across apps, packages, services, and lockfile metadata.
* The Pi runtime uses the `binbuddy-station` package name, the `binbuddy_station` module path, and multiple `BINBUDDY_*` environment variables.
* The firmware uses a `binbuddy` namespace, `BINBUDDY_*` macros, and product-name log strings.
* Device authentication headers and signature prefixes also carry the old product name, so both the Pi and backend must move together.

## Selected Approach

Perform the rename in dependency order:

1. Rename filesystem paths that are active import or instruction targets.
2. Update repository-wide content for product text, package scopes, module names, environment variables, Firebase defaults, and protocol identifiers.
3. Refresh generated metadata surfaces that encode package names.
4. Validate the workspace with lint, build, tests, and the Pi and firmware checks.

## Risks

* Any missed old-name protocol header or env key would break Pi-to-backend publication.
* Any missed import or workspace package name would break TypeScript or Python resolution.
* Hidden historical artifacts may preserve search noise even after runtime surfaces are clean.