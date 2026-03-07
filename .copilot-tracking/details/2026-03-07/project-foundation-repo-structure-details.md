<!-- markdownlint-disable-file -->
# Implementation Details: Project Foundation, Shared Contracts, and Repo Structure

## Context Reference

Sources: .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md, spec/binsight-spec.md, /memories/repo/foundation.md

## Implementation Phase 1: Establish repository foundation

<!-- parallelizable: false -->

### Step 1.1: Create the surface-first directory tree and ownership docs

Create the top-level folders selected by research and add minimal README placeholders that explain ownership boundaries. This locks in the surface-first monorepo shape before any runtime-specific bootstrap work begins.

Files:
* README.md - Root repository overview and setup entry point
* apps/README.md - Dashboard surface boundary
* devices/README.md - Device runtime boundary
* firmware/README.md - Firmware boundary
* services/README.md - Cloud backend boundary
* packages/README.md - Shared package boundary
* infra/README.md - Infrastructure boundary
* docs/README.md - Architecture and operations documentation boundary
* scripts/README.md - Automation boundary

Discrepancy references:
* Addresses DR-01 by leaving Firestore collection design for follow-on work while still creating the required infrastructure boundary

Success criteria:
* The repository contains the selected top-level folders from the research document
* Each top-level folder has a short ownership description to prevent boundary drift during implementation

Context references:
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 172-187) - Selected top-level structure and placement
* spec/binsight-spec.md (Lines 134-145) - Hardware split and Firebase placement constraints

Dependencies:
* None

### Step 1.2: Add root orchestration and contribution scaffolding

Add the root-level automation and workspace conventions that tie multiple runtimes together without forcing them into a single toolchain. Prefer a lightweight task runner for cross-surface commands and a root ignore policy that covers Node, Python, and PlatformIO outputs.

Files:
* .gitignore - Cross-runtime ignore rules
* justfile - Root task orchestration for web, backend, Pi, firmware, and validation commands
* README.md - Setup and workflow guidance updated with runtime entry points

Discrepancy references:
* Addresses DD-01 by selecting justfile as the default root task runner from the research's allowed options

Success criteria:
* Common setup and validation commands can be invoked from the repository root
* Ignore rules cover generated outputs from all planned runtimes

Context references:
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 227-243) - Recommended tooling split and near-term foundation tasks

Dependencies:
* Step 1.1 completion

## Implementation Phase 2: Bootstrap TypeScript surfaces and shared workspace packages

<!-- parallelizable: false -->

### Step 2.1: Initialize the root TypeScript workspace

Create the root JavaScript workspace only for the surfaces that benefit from shared package management: the dashboard, Firebase backend, and schema-oriented packages. Keep device Python and firmware builds outside the workspace.

Files:
* package.json - Root workspace scripts and shared developer tooling
* pnpm-workspace.yaml - Workspace package boundaries
* tsconfig.base.json - Shared TypeScript compiler baseline
* .npmrc - Workspace package manager defaults if required

Success criteria:
* The workspace includes apps, services, and packages paths only
* Root scripts cover lint, build, and test entry points for the TypeScript surfaces

Context references:
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 87-95) - Surface-first organization and TS workspace boundary
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 227-232) - pnpm workspace recommendation

Dependencies:
* Implementation Phase 1 completion

### Step 2.2: Scaffold web, backend, and shared package shells

Create the initial package boundaries for the dashboard, Firebase Cloud Functions backend, contracts, rules, analytics, and tooling. Keep these shells minimal but structurally ready for implementation.

Files:
* apps/web/package.json - Dashboard package manifest
* apps/web/README.md - Dashboard ownership and startup notes
* services/backend-functions/package.json - Cloud Functions package manifest
* services/backend-functions/README.md - Backend ownership and deployment notes
* packages/contracts/package.json - Canonical contract package manifest
* packages/rules/package.json - Rules preset package manifest
* packages/analytics/package.json - Analytics definitions package manifest
* packages/tooling/package.json - Shared code generation and validation tooling manifest

Success criteria:
* Each TypeScript surface has an explicit package boundary and owner-facing README
* Shared packages exist for contracts, rules, analytics, and tooling exactly as selected by research

Context references:
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 184-212) - Selected package layout and ownership map

Dependencies:
* Step 2.1 completion

### Step 2.3: Validate TypeScript workspace bootstrapping

Run lint, install, and build commands for the root workspace after the package shells are created.

Validation commands:
* pnpm install - Resolve workspace dependencies
* pnpm lint - Validate shared TypeScript and package configuration
* pnpm build - Validate package graph compiles once implementations are stubbed

## Implementation Phase 3: Bootstrap the Raspberry Pi station runtime

<!-- parallelizable: true -->

### Step 3.1: Initialize the Pi Python project and runtime package

Create an independent Python project for the Pi runtime with a dedicated source package, local configuration support, and a test entry point. This project owns inference orchestration, the session state machine, local rules application, and cloud synchronization.

Files:
* devices/pi-station/pyproject.toml - Python project definition
* devices/pi-station/README.md - Runtime ownership, setup, and hardware notes
* devices/pi-station/src/binsight_station/__init__.py - Package marker
* devices/pi-station/src/binsight_station/main.py - Runtime entry point placeholder
* devices/pi-station/tests/test_smoke.py - Minimal runtime test scaffold
* devices/pi-station/.env.example - Local runtime configuration template

Discrepancy references:
* Addresses DD-02 by selecting uv-managed Python project scaffolding rather than a looser Python bootstrap option

Success criteria:
* The Pi runtime is isolated from the TypeScript workspace and can be installed independently
* The Python package layout reflects the Pi-owned runtime responsibilities from the research

Context references:
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 90-95) - Pi as independent Python project and anti-corruption layer
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 219-225) - Pi ownership of live control flow
* spec/binsight-spec.md (Lines 17-40) - Live session and disposal logic owned by station runtime

Dependencies:
* Implementation Phase 1 completion

### Step 3.2: Define Pi runtime modules around the live control loop

Add empty or minimal modules that align to the business flow before feature code lands. Expected modules include session state, classification pipeline, rules application, ESP communication, live status publishing, and event creation.

Files:
* devices/pi-station/src/binsight_station/session.py - Session state machine boundary
* devices/pi-station/src/binsight_station/classification.py - Local and fallback classification boundary
* devices/pi-station/src/binsight_station/rules.py - Active rules preset application boundary
* devices/pi-station/src/binsight_station/esp_client.py - ESP protocol translation boundary
* devices/pi-station/src/binsight_station/live_status.py - Firebase live status publishing boundary
* devices/pi-station/src/binsight_station/events.py - Disposal event creation boundary

Discrepancy references:
* Addresses DR-02 by reserving the ESP protocol boundary without prematurely fixing the message schema

Success criteria:
* The Pi runtime package exposes module seams that match the spec's business flow
* No cloud or dashboard logic leaks into the live local control loop

Context references:
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 95-95) - Pi as anti-corruption layer
* spec/binsight-spec.md (Lines 11-64) - End-to-end live guidance and event flow

Dependencies:
* Step 3.1 completion

### Step 3.3: Validate Pi runtime scaffolding

Run the Python environment checks and smoke tests for the Pi runtime.

Validation commands:
* uv sync - Install the Pi runtime dependencies
* uv run pytest - Execute the runtime smoke tests

## Implementation Phase 4: Bootstrap the ESP8266 firmware project

<!-- parallelizable: true -->

### Step 4.1: Initialize the PlatformIO firmware layout

Create a dedicated firmware project that contains only embedded concerns: ultrasonic sensing, LED control, acknowledgements, and health telemetry. Keep the firmware protocol narrow and Pi-facing.

Files:
* firmware/esp8266-controller/platformio.ini - PlatformIO project definition
* firmware/esp8266-controller/README.md - Firmware ownership and flashing notes
* firmware/esp8266-controller/src/main.cpp - Main firmware entry point placeholder
* firmware/esp8266-controller/include/README.md - Header ownership notes
* firmware/esp8266-controller/test/README.md - Firmware test boundary

Success criteria:
* Firmware has an independent embedded toolchain and build root
* The project structure makes clear that firmware is not part of the web or backend workspace

Context references:
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 91-93) - Firmware as PlatformIO-native project
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 198-203) - Firmware responsibility boundary
* spec/binsight-spec.md (Lines 134-145) - ESP8266 hardware notes

Dependencies:
* Implementation Phase 1 completion

### Step 4.2: Create a narrow local protocol boundary for Pi communication

Add firmware-side placeholders for command handling and telemetry publishing that intentionally stop short of cloud-facing DTO reuse. The Pi should remain the translator between firmware messages and shared contracts.

Files:
* firmware/esp8266-controller/include/protocol.h - Local command and telemetry types
* firmware/esp8266-controller/src/protocol.cpp - Protocol encode and decode placeholders
* firmware/esp8266-controller/src/main.cpp - Wire protocol integration points

Discrepancy references:
* Addresses DR-02 by preserving a minimal firmware protocol until the dedicated protocol design is researched

Success criteria:
* Firmware protocol files are clearly local-facing and do not import cloud contract assumptions
* The Pi-to-firmware seam is explicit in the project layout

Context references:
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 136-140) - Manual firmware DTO subset guidance
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 221-224) - Firmware should not consume full disposal-event contracts

Dependencies:
* Step 4.1 completion

### Step 4.3: Validate firmware scaffolding

Run the embedded build to verify the PlatformIO project initializes correctly.

Validation commands:
* pio run - Compile the firmware target

## Implementation Phase 5: Seed shared contracts, rules assets, analytics definitions, and Firebase infrastructure

<!-- parallelizable: false -->

### Step 5.1: Author canonical JSON Schemas and generation hooks

Create the schema-first shared contract package as the canonical source for cross-surface domain contracts. Generate TypeScript types from schemas and leave Python validation integration as a consumer concern.

Files:
* packages/contracts/schemas/domain/disposal-event.schema.json - Canonical event schema
* packages/contracts/schemas/domain/live-station-status.schema.json - Canonical live status schema
* packages/contracts/schemas/domain/rules-preset.schema.json - Canonical local rules preset schema
* packages/contracts/schemas/domain/station-metadata.schema.json - Canonical station metadata schema
* packages/contracts/schemas/analytics/analytics-query.schema.json - Analytics request contract
* packages/contracts/schemas/analytics/analytics-summary.schema.json - Analytics read-model contract
* packages/contracts/generated/typescript/README.md - Generated artifact boundary
* packages/tooling/package.json - Schema generation scripts and validation dependencies

Success criteria:
* JSON Schema 2020-12 files exist for the shared domain and analytics contracts identified in research
* TypeScript generation hooks are defined without turning schemas into a cross-language executable runtime library

Context references:
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 124-166) - Canonical models and package layout
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 136-140) - JSON Schema ownership model
* spec/binsight-spec.md (Lines 43-90) - Required event fields, metrics, and dashboard features

Dependencies:
* Implementation Phase 2 completion

### Step 5.2: Add versioned rules and analytics assets

Create the non-code shared assets that keep station behavior and dashboard semantics aligned across surfaces. Rules presets should be versioned data, and analytics definitions should document metric formulas used by the backend and dashboard.

Files:
* packages/rules/presets/README.md - Rules preset versioning guidance
* packages/rules/fixtures/README.md - Sample rule fixtures for testing and demos
* packages/analytics/README.md - Analytics ownership and metric definition notes
* packages/analytics/metrics/README.md - Metric formula source-of-truth placeholder

Success criteria:
* Rules and analytics assets exist as data-first shared packages
* Metric and rules ownership is explicit before implementation starts in web and backend code

Context references:
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 126-140) - Shared model set and ownership guidance
* spec/binsight-spec.md (Lines 65-90) - Tracked metrics and definitions

Dependencies:
* Step 5.1 completion

### Step 5.3: Add Firebase infrastructure and backend wiring placeholders

Create the Firebase infrastructure boundary and place the backend deployment, rules, and index files under it. Keep HTTP API descriptions separate from canonical domain schemas.

Files:
* infra/firebase/firebase.json - Firebase project and emulator configuration
* infra/firebase/firestore.rules - Firestore access rules placeholder
* infra/firebase/firestore.indexes.json - Firestore indexes placeholder
* services/backend-functions/openapi/README.md - HTTP API description boundary referencing canonical schemas

Discrepancy references:
* Addresses DR-01 by establishing infrastructure boundaries now while deferring collection and rollup design details

Success criteria:
* Firebase infrastructure files exist under infra/firebase as selected by research
* Backend HTTP API documentation is kept separate from canonical domain schemas

Context references:
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 162-166) - Firebase configuration placement
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 136-137) - OpenAPI reserved for HTTP APIs only
* spec/binsight-spec.md (Lines 142-145) - Firestore and Cloud Functions placement

Dependencies:
* Implementation Phase 2 completion
* Step 5.1 completion

## Implementation Phase 6: Validation

<!-- parallelizable: false -->

### Step 6.1: Run full project validation

Execute all validation commands for the project:
* pnpm lint
* pnpm build
* pnpm test
* uv run pytest
* pio run

### Step 6.2: Fix minor validation issues

Iterate on lint errors, build warnings, and test failures. Apply fixes directly when corrections are straightforward and isolated.

### Step 6.3: Report blocking issues

When validation failures require changes beyond minor fixes:
* Document the issues and affected files.
* Provide the user with next steps.
* Recommend additional research and planning rather than inline fixes.
* Avoid large-scale refactoring within this phase.

## Dependencies

* pnpm for the TypeScript workspace
* uv for the Raspberry Pi Python project
* PlatformIO for the ESP8266 firmware project
* Firebase CLI or emulator tooling for local backend validation

## Success Criteria

* The repository contains the selected monorepo layout with isolated runtime toolchains and shared package boundaries
* Canonical schemas, rules assets, analytics definitions, and Firebase boundaries are scaffolded in the locations selected by research

## Implementation Phase 7: Remediate review findings

<!-- parallelizable: false -->

### Step 7.1: Correct Pi runtime event semantics

Fix the review-identified defects in the Pi runtime so the session preserves the original classification output and the final event compares disposal methods instead of comparing a disposal method to a raw zone label.

Files:
* devices/pi-station/src/binsight_station/main.py - Preserve the original session guidance through disposal observation
* devices/pi-station/src/binsight_station/session.py - Persist classification confidence and fallback usage on the session snapshot
* devices/pi-station/src/binsight_station/rules.py - Expose zone-to-method translation for correctness checks
* devices/pi-station/src/binsight_station/events.py - Compute success from expected and actual disposal methods using the active preset

Success criteria:
* Disposal observation does not reclassify after guidance is shown
* Disposal events reuse the original predicted item, confidence, and fallback status from the session
* Success reflects the rules preset's zone-to-method mapping before comparison

### Step 7.2: Strengthen Pi smoke coverage

Expand the Pi smoke tests so they verify both the preserved-session behavior and explicit success and failure outcomes for disposal events.

Files:
* devices/pi-station/tests/test_smoke.py - Add regression tests for preserved classification and success semantics

Success criteria:
* The smoke suite fails if disposal-time reclassification returns
* The smoke suite proves both correct and incorrect disposal outcomes

### Step 7.3: Complete the root validation entrypoint

Bring the root `just validate` workflow up to the Phase 6 contract by including workspace lint, build, test, Pi tests, and firmware build execution. Support the workspace-local PlatformIO binary before falling back to a global installation.

Files:
* justfile - Expand the validation and firmware recipes to cover the full command set

Success criteria:
* The root validation recipe matches the Phase 6 command list
* Firmware validation works with either `.venv/bin/pio` or a globally installed `pio`

### Step 7.4: Refresh repository documentation after review

Update the root and firmware READMEs so they describe the current scaffold state and the supported validation workflow instead of referring to future phases or only global PlatformIO setup.

Files:
* README.md - Reflect the implemented repository state and documented root validation path
* firmware/esp8266-controller/README.md - Document the workspace-local PlatformIO path and the root validation flow

Success criteria:
* The root overview no longer claims Pi and firmware setup is pending
* Firmware validation docs describe both the workspace-local and global PlatformIO paths

## Implementation Phase 8: Close review traceability and evidence gaps

<!-- parallelizable: false -->

### Step 8.1: Reconcile firmware README implementation notes

Update the firmware README so its project-layout description matches the implemented HTTP controller behavior instead of describing `src/main.cpp` as only a minimal protocol loop.

Files:
* firmware/esp8266-controller/README.md - Update the `src/main.cpp` description to reflect the HTTP server, JSON handlers, and local control loop responsibilities

Success criteria:
* The firmware README project-layout section accurately describes the current `src/main.cpp` behavior
* The updated wording remains consistent with the spec's local Pi-to-ESP boundary

### Step 8.2: Refresh the changes log inventory

Expand the implementation tracking so it reflects all validated Phase 3, Phase 5, and remediation artifacts called out by the review.

Files:
* .copilot-tracking/changes/2026-03-07/project-foundation-repo-structure-changes.md - Add the Pi HTTP transport tests, runtime serialization coverage, the seeded Ottawa preset asset, and the durable validation evidence reference

Success criteria:
* The changes log inventory includes the added Pi HTTP and serialization tests
* The changes log inventory includes the seeded demo Ottawa rules preset
* The release summary mentions the durable validation artifact

### Step 8.3: Capture durable validation evidence under .copilot-tracking

Run the current validation commands again and store a concise durable record under `.copilot-tracking` so the foundation implementation no longer depends on transient `/tmp` logs for evidence.

Files:
* .copilot-tracking/changes/2026-03-07/project-foundation-repo-structure-validation.txt - Command outcomes captured from the final successful validation pass

Validation commands:
* corepack pnpm lint
* corepack pnpm build
* corepack pnpm test
* uv run pytest
* /home/handwash/Projects/hackcanada/.venv/bin/pio run

Success criteria:
* A durable validation artifact exists under `.copilot-tracking`
* The captured evidence reflects the current successful post-remediation state
