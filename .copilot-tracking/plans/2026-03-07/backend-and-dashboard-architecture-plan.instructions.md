---
applyTo: '.copilot-tracking/changes/2026-03-07/backend-and-dashboard-architecture-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Backend and Dashboard Architecture

## Overview

Implement the BinBuddy backend and dashboard as a Firebase-native backend-for-frontend with HTTP Cloud Functions for device ingress, callable Cloud Functions for operator-facing dashboard APIs, Firestore live and read-model storage, Firebase Storage latest-frame camera transport for live monitoring, and a React dashboard that uses Firestore listeners only for live station state.

## Objectives

### User Requirements

* Define the recommended backend architecture for the smart station demo. Source: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 6-10)
* Define the recommended dashboard architecture for station insights and live monitoring. Source: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 6-10)
* Evaluate alternatives and select one approach that fits the repo and spec. Source: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 6-10)
* Provide an implementation-oriented blueprint for the current monorepo. Source: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 23-31)

### Derived Objectives

* Preserve the Raspberry Pi as the owner of the live control loop while moving only ingestion, persistence, and analytics composition into Firebase. Derived from: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 141-146, 196-208)
* Treat packages/contracts as the canonical cross-surface vocabulary and isolate device payload drift behind backend normalization. Derived from: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 133-137, 285-291)
* Keep historical analytics and filtered history behind backend APIs while allowing direct Firestore listeners for bounded live station status. Derived from: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 204-208, 293-300)
* Use callable functions as the initial dashboard API surface so operator authentication and authorization remain aligned with Firebase-authenticated web sessions. Derived from: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 204-208, 318-318)
* Expose each station's active rules preset through backend directory models and dashboard views so operator context remains visible in the monitoring experience. Derived from: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 179-190)

## Context Summary

### Project Files

* spec/binbuddy-spec.md - Product source of truth for the demo behavior and backend constraints
* services/backend-functions/README.md - Declares the Firebase backend ownership for ingestion, validation, analytics, and dashboard read models
* apps/web/README.md - Declares the dashboard ownership for station insights and live monitoring
* infra/firebase/firebase.json - Already points Firebase Functions to services/backend-functions
* infra/firebase/firestore.rules - Currently deny-all, so the plan must explicitly define read and write access paths
* packages/contracts/schemas/domain/ - Canonical domain schemas shared across surfaces
* packages/contracts/schemas/domain/rules-preset.schema.json - Canonical rules-preset schema that must remain visible through station data and dashboard surfaces

### References

* .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md - Primary research source for architecture selection, trade-offs, and follow-on gaps
* package.json - Root build, lint, and test commands for final validation
* apps/web/package.json - Package-scoped dashboard validation commands
* services/backend-functions/package.json - Package-scoped backend validation commands
* devices/pi-station/pyproject.toml - Device-side smoke-test command context

### Standards References

* #file:../../.github/instructions/source-of-truth.instructions.md - Project instruction to treat spec/binbuddy-spec.md as authoritative
* Active Task Planner mode instructions - Planning artifact structure, discrepancy tracking, and validation workflow
* Attached markdown and writing-style instruction set - Markdown authoring and concise implementation-writing conventions used for these artifacts

## Implementation Checklist

### [x] Implementation Phase 1: Canonical contracts and Firebase data model

<!-- parallelizable: false -->

* [x] Step 1.1: Finalize ingestion contracts and normalization boundaries
  * Details: .copilot-tracking/details/2026-03-07/backend-and-dashboard-architecture-details.md (Lines 11-33)
* [x] Step 1.2: Define Firestore collections, rules-preset joins, converters, and access rules
  * Details: .copilot-tracking/details/2026-03-07/backend-and-dashboard-architecture-details.md (Lines 35-59)
* [x] Step 1.3: Validate phase changes
  * Details: .copilot-tracking/details/2026-03-07/backend-and-dashboard-architecture-details.md (Lines 61-68)

### [x] Implementation Phase 2: Backend ingress, operator access, aggregation, and dashboard APIs

<!-- parallelizable: false -->

* [x] Step 2.1: Implement authenticated device ingestion functions
  * Details: .copilot-tracking/details/2026-03-07/backend-and-dashboard-architecture-details.md (Lines 74-99)
  * Coverage note: Include the demo camera-feed path as authenticated latest-frame uploads to Firebase Storage with live-status metadata for active, timestamp, and stale-state handling.
* [x] Step 2.2: Establish callable dashboard APIs and operator authorization
  * Details: .copilot-tracking/details/2026-03-07/backend-and-dashboard-architecture-details.md (Lines 101-126)
* [x] Step 2.3: Materialize analytics read models and station-aware dashboard query services
  * Details: .copilot-tracking/details/2026-03-07/backend-and-dashboard-architecture-details.md (Lines 128-152)
* [x] Step 2.4: Validate phase changes
  * Details: .copilot-tracking/details/2026-03-07/backend-and-dashboard-architecture-details.md (Lines 154-161)

### [x] Implementation Phase 3: Dashboard shell, live monitoring, and analytics views

<!-- parallelizable: false -->

* [x] Step 3.1: Scaffold the React dashboard application structure
  * Details: .copilot-tracking/details/2026-03-07/backend-and-dashboard-architecture-details.md (Lines 167-190)
* [x] Step 3.2: Implement live station views, event history, and analytics pages
  * Details: .copilot-tracking/details/2026-03-07/backend-and-dashboard-architecture-details.md (Lines 192-219)
  * Coverage note: Include station, floor, building, location, and time-range filters plus signage/layout variant comparisons and before-after or A/B analysis views.
  * Live monitoring note: Render the current camera frame from latest-frame storage metadata and surface a stale or unavailable state when updates stop.
* [x] Step 3.3: Validate phase changes
  * Details: .copilot-tracking/details/2026-03-07/backend-and-dashboard-architecture-details.md (Lines 221-228)

### [x] Implementation Phase 4: Cross-surface integration hardening

<!-- parallelizable: false -->

* [x] Step 4.1: Align Raspberry Pi emitters and operational configuration
  * Details: .copilot-tracking/details/2026-03-07/backend-and-dashboard-architecture-details.md (Lines 234-256)
* [x] Step 4.2: Validate phase changes
  * Details: .copilot-tracking/details/2026-03-07/backend-and-dashboard-architecture-details.md (Lines 258-265)

### [x] Implementation Phase 5: Validation

<!-- parallelizable: false -->

* [x] Step 5.1: Run full project validation
  * Execute all lint commands, build scripts, workspace tests, and Pi smoke tests
* [x] Step 5.2: Fix minor validation issues
  * Iterate on straightforward type, schema, and smoke-test regressions without expanding scope
* [x] Step 5.3: Report blocking issues
  * Stop for additional planning when failures require contract redesign, auth rework, or unresolved camera-feed architecture

## Planning Log

See [backend-and-dashboard-architecture-log.md](.copilot-tracking/plans/logs/2026-03-07/backend-and-dashboard-architecture-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Firebase Functions and Firestore project configuration or emulator access
* pnpm workspace dependencies installed at the repo root
* A Python environment with uv and pytest for device validation

## Success Criteria

* Backend ingress, Firestore storage, analytics materialization, and dashboard data access implement the selected hybrid Firebase architecture. Traces to: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 194-300)
* The dashboard uses Firestore listeners only for live station state and callable backend APIs for analytics, comparisons, station directory, and filtered history. Traces to: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 204-208, 293-300, 318-318)
* Station-oriented backend and dashboard surfaces expose the active rules preset required for operator monitoring context. Traces to: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 179-190)
* Live monitoring includes a bounded camera-feed transport path using authenticated latest-frame storage updates and explicit stale-feed handling. Traces to: spec/binbuddy-spec.md (Lines 107-110)