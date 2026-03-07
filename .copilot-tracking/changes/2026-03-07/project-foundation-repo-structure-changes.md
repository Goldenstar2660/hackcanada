<!-- markdownlint-disable-file -->
# Release Changes: Project Foundation, Shared Contracts, and Repo Structure

**Related Plan**: project-foundation-repo-structure-plan.instructions.md
**Implementation Date**: 2026-03-07

## Summary

Scaffold the repository foundation for BinBuddy as a surface-first monorepo with isolated runtime toolchains, shared contract boundaries, and Firebase infrastructure placeholders.

## Changes

### Added

* README.md - Add the root repository overview and setup entry points for the four runtime surfaces and shared boundaries
* apps/README.md - Define the dashboard ownership boundary under the surface-first layout
* devices/README.md - Define the Raspberry Pi device runtime boundary
* firmware/README.md - Define the embedded firmware boundary for the ESP8266 controller
* services/README.md - Define the backend service boundary for Firebase functions and related cloud logic
* packages/README.md - Define the shared package boundary for contracts, rules, analytics, and tooling
* infra/README.md - Define the infrastructure boundary for Firebase configuration and deployment assets
* docs/README.md - Define the documentation boundary for architecture and operations content
* scripts/README.md - Define the automation boundary for repository scripts
* .gitignore - Add cross-runtime ignore rules covering Node, Python, and PlatformIO outputs
* justfile - Add root task orchestration placeholders for web, backend, Pi, firmware, and validation workflows
* package.json - Add the root pnpm workspace scripts and shared developer tooling entry points
* pnpm-workspace.yaml - Limit the TypeScript workspace to apps, services, and packages
* tsconfig.base.json - Add the shared TypeScript compiler baseline for workspace packages
* .npmrc - Add workspace package manager defaults for the root toolchain
* pnpm-lock.yaml - Lock the root workspace dependencies after installation
* apps/web/package.json - Add the dashboard package manifest
* apps/web/tsconfig.json - Add the dashboard TypeScript configuration
* apps/web/src/index.ts - Add the dashboard entrypoint stub
* apps/web/README.md - Add the dashboard ownership and startup notes
* services/backend-functions/package.json - Add the Cloud Functions package manifest
* services/backend-functions/tsconfig.json - Add the backend TypeScript configuration
* services/backend-functions/src/index.ts - Add the backend entrypoint stub
* services/backend-functions/README.md - Add the backend ownership and deployment notes
* packages/contracts/package.json - Add the shared contracts package manifest
* packages/contracts/tsconfig.json - Add the shared contracts TypeScript configuration
* packages/contracts/src/index.ts - Add the shared contracts export stub
* packages/rules/package.json - Add the rules package manifest
* packages/rules/tsconfig.json - Add the rules TypeScript configuration
* packages/rules/src/index.ts - Add the rules export stub
* packages/analytics/package.json - Add the analytics package manifest
* packages/analytics/tsconfig.json - Add the analytics TypeScript configuration
* packages/analytics/src/index.ts - Add the analytics export stub
* packages/tooling/package.json - Add the tooling package manifest for schema generation and validation work
* packages/tooling/tsconfig.json - Add the tooling TypeScript configuration
* packages/tooling/src/index.ts - Add the tooling export stub
* devices/pi-station/pyproject.toml - Add the standalone Pi runtime project definition
* devices/pi-station/README.md - Add Pi runtime ownership, setup, and hardware notes
* devices/pi-station/.env.example - Add the Pi runtime configuration template
* devices/pi-station/src/binbuddy_station/__init__.py - Add the Pi runtime package marker
* devices/pi-station/src/binbuddy_station/main.py - Add the Pi runtime entrypoint placeholder
* devices/pi-station/src/binbuddy_station/session.py - Add the Pi session state seam
* devices/pi-station/src/binbuddy_station/classification.py - Add the Pi classification boundary
* devices/pi-station/src/binbuddy_station/rules.py - Add the Pi rules application boundary
* devices/pi-station/src/binbuddy_station/esp_client.py - Add the Pi ESP translation boundary
* devices/pi-station/src/binbuddy_station/live_status.py - Add the Pi live status publishing boundary
* devices/pi-station/src/binbuddy_station/events.py - Add the Pi disposal event creation boundary
* devices/pi-station/tests/test_smoke.py - Add smoke tests for the Pi scaffold
* devices/pi-station/uv.lock - Lock the Pi project dependencies after successful sync
* firmware/esp8266-controller/platformio.ini - Add the PlatformIO project definition for the ESP8266 controller
* firmware/esp8266-controller/README.md - Add firmware ownership and flashing notes
* firmware/esp8266-controller/include/README.md - Add firmware header ownership notes
* firmware/esp8266-controller/include/protocol.h - Add local Pi-facing protocol types for firmware placeholders
* firmware/esp8266-controller/src/protocol.cpp - Add protocol encode and decode placeholders
* firmware/esp8266-controller/src/main.cpp - Add the firmware entrypoint and protocol wiring seam
* firmware/esp8266-controller/test/README.md - Add the firmware test boundary notes
* packages/contracts/schemas/domain/disposal-event.schema.json - Add the canonical disposal event schema from the station runtime to the cloud boundary
* packages/contracts/schemas/domain/live-station-status.schema.json - Add the canonical live station status schema for real-time monitoring
* packages/contracts/schemas/domain/rules-preset.schema.json - Add the canonical rules preset schema for local disposal mapping
* packages/contracts/schemas/domain/station-metadata.schema.json - Add the canonical station metadata schema for dashboard and backend use
* packages/contracts/schemas/analytics/analytics-query.schema.json - Add the canonical analytics query schema for dashboard requests
* packages/contracts/schemas/analytics/analytics-summary.schema.json - Add the canonical analytics summary schema for backend read models
* packages/contracts/generated/typescript/README.md - Define the generated TypeScript artifact boundary for schema-derived declarations
* packages/contracts/generated/typescript/domain/disposal-event.d.ts - Add the generated disposal event declaration
* packages/contracts/generated/typescript/domain/live-station-status.d.ts - Add the generated live station status declaration
* packages/contracts/generated/typescript/domain/rules-preset.d.ts - Add the generated rules preset declaration
* packages/contracts/generated/typescript/domain/station-metadata.d.ts - Add the generated station metadata declaration
* packages/contracts/generated/typescript/analytics/analytics-query.d.ts - Add the generated analytics query declaration
* packages/contracts/generated/typescript/analytics/analytics-summary.d.ts - Add the generated analytics summary declaration
* packages/rules/presets/README.md - Add versioning guidance for shared rules presets
* packages/rules/fixtures/README.md - Add sample rules fixture guidance for demos and testing
* packages/analytics/README.md - Add analytics package ownership notes
* packages/analytics/metrics/README.md - Add the metric-definition source-of-truth placeholder
* packages/tooling/scripts/schema-tooling.mjs - Add schema validation and TypeScript generation tooling
* infra/firebase/firebase.json - Add Firebase project and emulator placeholder configuration
* infra/firebase/firestore.rules - Add Firestore rules placeholders aligned to the selected infrastructure boundary
* infra/firebase/firestore.indexes.json - Add Firestore indexes placeholders for future query design
* services/backend-functions/openapi/README.md - Reserve OpenAPI for backend HTTP descriptions only

### Modified

* README.md - Update the root overview to reflect the repository scaffold as later phases completed
* justfile - Update root orchestration commands to match the bootstrapped workspace layout and Corepack fallback
* packages/tooling/package.json - Add schema validation and generation scripts, then adjust the build command to avoid nested pnpm assumptions
* pnpm-lock.yaml - Update the workspace lockfile after installing schema tooling dependencies

### Removed

## Additional or Deviating Changes

* Root task validation was limited to static scaffolding checks because `just` is not installed in the environment.
	* Reason: The phase required adding orchestration scaffolding, but the runtime binary is unavailable for command execution.
* TypeScript workspace validation used `corepack pnpm` rather than a globally installed `pnpm` binary.
	* Reason: `pnpm` was not available on PATH, but Corepack was available and produced the required package manager behavior.
* Firmware scaffold validation remains incomplete.
	* Reason: `pio` is not installed in the environment, so the PlatformIO build command could not be executed.
* Tooling package build execution was adjusted during schema validation.
	* Reason: Recursive workspace builds in this environment did not expose `pnpm` inside child package scripts, so the build script now invokes the schema tooling directly.
* Final repository validation remains partially blocked.
	* Reason: `corepack pnpm lint`, `corepack pnpm build`, `corepack pnpm test`, and `uv run pytest` passed, but `pio run` could not execute because PlatformIO is not installed.

## Release Summary

The repository now has a surface-first monorepo foundation aligned to the BinBuddy spec, including root ownership boundaries, a TypeScript workspace for web, backend, and shared packages, an independent `uv`-managed Raspberry Pi runtime scaffold, an isolated PlatformIO firmware scaffold, canonical JSON Schema contracts with generated TypeScript declarations, shared rules and analytics placeholders, and Firebase infrastructure placeholders. Validation passed for the TypeScript workspace, schema tooling, and Pi runtime. Firmware validation remains blocked by the missing `pio` executable in the current environment.
