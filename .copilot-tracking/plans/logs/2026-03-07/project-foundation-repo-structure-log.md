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

### Plan Deviations from Research

No plan deviations from research are currently identified.

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
