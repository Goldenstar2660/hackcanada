---
applyTo: '.copilot-tracking/changes/2026-03-07/project-foundation-repo-structure-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Project Foundation, Shared Contracts, and Repo Structure

## Overview

Create the BinBuddy repository foundation as a surface-first monorepo with isolated runtime toolchains, schema-first shared contracts, and Firebase infrastructure boundaries aligned to the spec and research.

## Objectives

### User Requirements

* Recommend a top-level folder organization that clearly separates the website, Raspberry Pi code, ESP8266 firmware, backend, and shared code — Source: .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 6-10)
* Recommend how shared contracts, rules, and analytics definitions should be represented across web, backend, and device code — Source: .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 6-10)
* Evaluate monorepo structure alternatives and select one approach aligned with the project spec and current repository state — Source: .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md (Lines 6-10)

### Derived Objectives

* Preserve the Raspberry Pi as the live control loop owner and anti-corruption layer between firmware and cloud contracts — Derived from: research findings and spec requirements for local rules, disposal guidance, and event creation
* Keep the TypeScript workspace limited to web, backend, and shared packages while leaving Pi and firmware on their own toolchains — Derived from: research guidance on mixed-runtime boundaries and toolchain isolation
* Establish Firebase, rules, and analytics boundaries without prematurely fixing Firestore data model details or local protocol details — Derived from: research follow-on gaps DR-01 and DR-02

## Context Summary

### Project Files

* spec/binbuddy-spec.md - Product scope, live station flow, metrics, and hardware split
* .copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md - Selected monorepo structure, contract strategy, and tooling guidance
* /memories/repo/foundation.md - Existing repository memory that broadly matches the selected architecture

### References

* .copilot-tracking/research/subagents/2026-03-07/repo-layout-research.md - Subagent evidence supporting a single surface-first monorepo
* .copilot-tracking/research/subagents/2026-03-07/shared-contracts-research.md - Subagent evidence supporting JSON Schema as the canonical cross-surface contract source
* .copilot-tracking/research/subagents/2026-03-07/runtime-boundaries-research.md - Subagent evidence supporting Pi ownership of the live runtime boundary

### Standards References

* #file:../../../.github/instructions/source-of-truth.instructions.md - Treat the spec as the authoritative product and architecture scope
* /home/handwash/.vscode-server/extensions/ise-hve-essentials.hve-core-3.0.2/.github/instructions/hve-core/markdown.instructions.md - Markdown authoring conventions for planning artifacts
* /home/handwash/.vscode-server/extensions/ise-hve-essentials.hve-core-3.0.2/.github/instructions/hve-core/prompt-builder.instructions.md - Authoring conventions for .instructions.md planning artifacts

## Implementation Checklist

### [x] Implementation Phase 1: Establish repository foundation

<!-- parallelizable: false -->

* [x] Step 1.1: Create the surface-first directory tree and ownership docs
  * Details: .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md (Lines 12-39)
* [x] Step 1.2: Add root orchestration and contribution scaffolding
  * Details: .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md (Lines 41-61)

### [x] Implementation Phase 2: Bootstrap TypeScript surfaces and shared workspace packages

<!-- parallelizable: false -->

* [x] Step 2.1: Initialize the root TypeScript workspace
  * Details: .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md (Lines 67-86)
* [x] Step 2.2: Scaffold web, backend, and shared package shells
  * Details: .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md (Lines 88-110)
* [x] Step 2.3: Validate TypeScript workspace bootstrapping
  * Details: .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md (Lines 112-119)

### [x] Implementation Phase 3: Bootstrap the Raspberry Pi station runtime

<!-- parallelizable: true -->

* [x] Step 3.1: Initialize the Pi Python project and runtime package
  * Details: .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md (Lines 125-150)
* [x] Step 3.2: Define Pi runtime modules around the live control loop
  * Details: .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md (Lines 152-176)
* [x] Step 3.3: Validate Pi runtime scaffolding
  * Details: .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md (Lines 178-184)

### [ ] Implementation Phase 4: Bootstrap the ESP8266 firmware project

<!-- parallelizable: true -->

* [x] Step 4.1: Initialize the PlatformIO firmware layout
  * Details: .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md (Lines 190-211)
* [x] Step 4.2: Create a narrow local protocol boundary for Pi communication
  * Details: .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md (Lines 213-234)
* [ ] Step 4.3: Validate firmware scaffolding
  * Details: .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md (Lines 236-241)

### [x] Implementation Phase 5: Seed shared contracts, rules assets, analytics definitions, and Firebase infrastructure

<!-- parallelizable: false -->

* [x] Step 5.1: Author canonical JSON Schemas and generation hooks
  * Details: .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md (Lines 247-271)
* [x] Step 5.2: Add versioned rules and analytics assets
  * Details: .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md (Lines 273-292)
* [x] Step 5.3: Add Firebase infrastructure and backend wiring placeholders
  * Details: .copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md (Lines 294-318)

### [ ] Implementation Phase 6: Validation

<!-- parallelizable: false -->

* [ ] Step 6.1: Run full project validation
  * Execute all lint commands for the TypeScript workspace and schema tooling
  * Execute build commands for the TypeScript workspace and firmware project
  * Execute the Pi runtime test suite and smoke checks
* [x] Step 6.2: Fix minor validation issues
  * Iterate on straightforward lint, build, or test failures
  * Keep fixes scoped to the foundation work described in this plan
* [x] Step 6.3: Report blocking issues
  * Document issues that require additional research or a follow-on plan
  * Avoid large-scale refactors during validation

## Planning Log

See [project-foundation-repo-structure-log.md](../../plans/logs/2026-03-07/project-foundation-repo-structure-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* pnpm for the TypeScript workspace and shared packages
* uv for the Raspberry Pi Python project bootstrap
* PlatformIO for the ESP8266 firmware project
* Firebase CLI or emulator tooling for backend validation and local rules checks
* just for root task orchestration

## Success Criteria

* The repository is scaffolded into apps, devices, firmware, services, packages, infra, docs, scripts, and spec boundaries — Traces to: selected structure in research (Lines 184-187)
* Shared contracts, rules assets, and analytics definitions are scaffolded as data-first packages with JSON Schema as the canonical source — Traces to: research contract strategy (Lines 124-140)
* The Pi runtime and firmware projects are isolated with their own toolchains while backend and dashboard remain inside the TypeScript workspace — Traces to: runtime boundary findings (Lines 87-95 and 219-232)
