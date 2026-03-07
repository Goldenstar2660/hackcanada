<!-- markdownlint-disable-file -->
# Release Changes: BinBuddy to Binsight Rename

**Related Plan**: binsight-rename-plan.instructions.md
**Implementation Date**: 2026-03-07

## Summary

Rename the product and its active technical identifiers from BinBuddy to Binsight across the repository, including path names, package scopes, runtime env keys, protocol headers, Firebase-related defaults, and docs.

## Changes

### Added

* None.

### Modified

* Renamed the authoritative spec path from `spec/binbuddy-spec.md` to `spec/binsight-spec.md` and updated the source-of-truth instruction plus repository references.
* Renamed the Pi Python package from `binbuddy-station` and `binbuddy_station` to `binsight-station` and `binsight_station`, including imports, tests, commands, and the uv lock.
* Renamed the TypeScript workspace package scope from `@binbuddy/*` to `@binsight/*` across manifests, aliases, imports, generated metadata, and the pnpm lockfile.
* Renamed runtime env and backend config keys from `BINBUDDY_*` to `BINSIGHT_*`, including Firebase-facing examples and bootstrap code.
* Renamed device-auth protocol identifiers from `x-binbuddy-*` and `binbuddy-v1` to `x-binsight-*` and `binsight-v1` on both the Pi and backend sides.
* Renamed firmware namespace and macro identifiers from `binbuddy` and `BINBUDDY_*` to `binsight` and `BINSIGHT_*`.
* Updated repository docs, package docs, schema IDs, web metadata, and generated web build output to use Binsight consistently.

## Validation

* `corepack pnpm install`
* `cd devices/pi-station && uv sync`
* `just validate`
* Raw repository grep for `BinBuddy|binbuddy|BINBUDDY` returned no matches outside ignored environment directories.

## Additional or Deviating Changes

* No Firebase project, secrets, or external environments had been deployed yet, so the rename moved env keys and protocol identifiers directly without compatibility aliases.
* The web build still emits a Vite chunk-size warning for the main bundle, but the build succeeds.
* Workspace problem diagnostics still include unrelated legacy markdown link issues in `.copilot-tracking/plans/2026-03-07/spec-alignment-remediation-plan.instructions.md` and expected editor-only firmware include-path warnings for Arduino headers outside PlatformIO.

### Removed

* None.