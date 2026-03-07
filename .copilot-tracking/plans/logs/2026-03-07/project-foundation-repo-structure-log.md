<!-- markdownlint-disable-file -->
# Planning Log: Project Foundation, Shared Contracts, and Repo Structure

## Planning Outcome Summary

Created planning artifacts:

* .copilot-tracking/plans/2026-03-07/project-foundation-repo-structure-plan.instructions.md
* .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md
* .copilot-tracking/plans/logs/2026-03-07/project-foundation-repo-structure-log.md

Deferred scope captured for follow-on planning:

* Firestore collection, live-status materialization, and analytics rollup design
* Pi-to-ESP local protocol message design
* Expanded preset coverage beyond the seeded Ottawa demo asset

## Discrepancy Log

Gaps and differences identified between research findings and the implementation plan.

### Unaddressed Research Items

* DR-01: Firestore collection and rollup design remains out of scope for this foundation task
  * Source: .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 31-38)
  * Reason: The current task is limited to repository foundation, package boundaries, and shared contract placement rather than data model implementation
  * Impact: Medium
* DR-02: Pi-to-ESP local protocol message design is deferred beyond placeholder boundary files
  * Source: .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 36-38)
  * Reason: The research recommends a narrow protocol, but message shapes still need dedicated runtime-level design work
  * Impact: Medium

### Implementation Deviations

* DD-01: TypeScript workspace validation used Corepack-managed pnpm instead of direct pnpm commands
  * Plan specifies: Run `pnpm install`, `pnpm lint`, and `pnpm build`
  * Implementation differs: Used `corepack pnpm` because `pnpm` was not installed on PATH
  * Rationale: This preserved the planned workspace validation without changing repository scope or toolchain boundaries

* DD-02: Firmware validation used a workspace-local PlatformIO installation rather than a preinstalled `pio` binary on PATH
  * Plan specifies: Run `pio run`
  * Implementation differs: The first `pio run` attempt failed because `pio` was not on PATH, so PlatformIO was installed into the workspace Python environment and the firmware build was rerun with the local executable
  * Rationale: This completed the required firmware validation without changing repository code or broadening the project toolchain scope

* DD-03: Tooling package build script invokes schema tooling directly rather than shelling out to pnpm recursively
  * Plan specifies: Validate the TypeScript workspace and schema tooling through normal root workspace commands
  * Implementation differs: The tooling package build script was changed to call the local schema script directly
  * Rationale: Recursive workspace builds in this environment did not expose `pnpm` inside child package scripts, so direct script execution preserved the intended validation outcome
* DD-04: Review remediation validation ran the Phase 6 commands directly instead of invoking `just validate`
  * Plan specifies: Provide a repeatable root validation entrypoint that covers the full command set
  * Implementation differs: The `justfile` now provides that entrypoint, but direct command execution was still required during remediation because `just` is not installed in the current environment
  * Rationale: Running the underlying commands verified the repository behavior without blocking on a missing local task-runner binary
* DD-05: Final validation uncovered a live-status contract regression and a root-local PlatformIO path bug
  * Plan specifies: The Pi live-status publishing seam and root validation entrypoint should work as scaffolded after review remediation
  * Implementation differs: `LiveStatusPublisher.build_status` and `LiveStatus.to_payload()` had drifted from the runtime and test contract, and the `justfile` resolved `.venv/bin/pio` after changing into the firmware directory
  * Rationale: Both defects were corrected in place because they were narrow regressions inside the implemented foundation scope and blocked successful end-to-end validation

## Implementation Paths Considered

### Selected: Surface-first monorepo with schema-first shared contracts

* Approach: Keep one repository with top-level runtime boundaries for web, backend, Pi, firmware, shared packages, infrastructure, docs, scripts, and spec, while treating JSON Schema as the canonical source for shared domain contracts
* Rationale: This matches the spec's hardware split, keeps the Pi in the live control loop, and avoids over-coupling firmware to cloud-facing data models
* Evidence: .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 170-187)

### IP-01: Split the project into multiple repositories

* Approach: Maintain separate repositories for the dashboard, backend, Pi runtime, and firmware
* Trade-offs: Improves per-surface isolation but increases coordination cost for contracts, rules presets, analytics semantics, and release management
* Rejection rationale: The project is greenfield and already requires tight semantic alignment across the four surfaces, so multiple repositories add process overhead without reducing real coupling

### IP-02: Use broad frontend, backend, and hardware folders

* Approach: Organize the repository around generic frontend, backend, and hardware directories
* Trade-offs: Slightly simpler naming at the top level, but it obscures the crucial boundary between the Pi station runtime and ESP8266 firmware
* Rejection rationale: The spec and research both treat Pi logic and firmware as materially different runtime surfaces with different toolchains and responsibilities

### IP-03: Make OpenAPI the canonical source for all contracts

* Approach: Define all shared models through HTTP-oriented OpenAPI documents and derive other runtime contracts from them
* Trade-offs: Helps for API discovery, but it models only one integration style and poorly fits Firestore documents, Pi-authored events, and local device protocol concerns
* Rejection rationale: Research explicitly recommends JSON Schema as the domain contract source of truth and reserves OpenAPI for HTTP-facing APIs only

## Suggested Follow-On Work

* WI-01: Define Firestore collections, live-status materializations, and rollup jobs — Specify immutable event storage, mutable status documents, and aggregate analytics read models for Firebase (High)
  * Source: DR-01 and research follow-on guidance
  * Dependency: Completion of the repository foundation and shared contract scaffolding
* WI-02: Design the Pi-to-ESP local protocol — Specify command, acknowledgement, sensor, and health telemetry payloads that the Pi will translate into shared contracts (Medium)
  * Source: DR-02 and research follow-on guidance
  * Dependency: Completion of the Pi runtime and firmware project scaffolding
* WI-03: Choose the dashboard runtime stack — Decide whether `apps/web` will use React, Next.js, Vite, or another TypeScript web stack before feature implementation begins (Medium)
  * Source: Phase 2 completion
  * Dependency: Completion of the repository foundation and TypeScript workspace bootstrap
* WI-04: Add real Firebase backend wiring — Replace backend compile-time stubs with deployment, emulator, and integration wiring after shared contracts and infrastructure placeholders are in place (Medium)
  * Source: Phase 2 completion
  * Dependency: Completion of Phase 5 shared contracts and Firebase infrastructure scaffolding
* WI-05: Connect Pi runtime seams to real adapters — Replace placeholder inference, shared-rules loading, and Firebase publishing seams after shared contracts and rules assets are seeded (Medium)
  * Source: Phase 3 completion
  * Dependency: Completion of Phase 5 shared contracts, rules assets, and infrastructure scaffolding
* WI-06: Expand preset coverage beyond Ottawa — Add additional jurisdiction-specific disposal presets and matching fixtures after the seeded Ottawa demo asset (Medium)
  * Source: Phase 8 closeout
  * Dependency: Selection of the next jurisdictions or demo scenarios to support
* WI-07: Expand backend schema usage — Wire backend handlers and HTTP descriptions to the canonical schemas without redefining domain contracts (Medium)
  * Source: Phase 5 completion
  * Dependency: Follow-on backend feature planning
* WI-08: Document PlatformIO setup for validation — Ensure firmware validation environments provide `pio`, or document the requirement in setup guidance and validation workflows (Low)
  * Source: Phase 6 completion
  * Dependency: Decision on whether firmware validation is mandatory in all developer environments
* WI-09: Standardize `just` availability in developer environments — Ensure contributors who rely on the documented root task workflows have `just` installed, or provide an alternative bootstrap path for those commands (Low)
  * Source: Phase 7 remediation
  * Dependency: Decision on whether root task orchestration is a required part of local development setup
