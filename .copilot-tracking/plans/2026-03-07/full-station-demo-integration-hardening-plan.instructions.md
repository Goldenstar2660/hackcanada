---
applyTo: '.copilot-tracking/changes/2026-03-07/full-station-demo-integration-hardening-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Full Station Demo Integration Hardening

## Overview

Harden the Binsight demo around one reliable station-to-cloud-to-dashboard slice by recovering the Pi runtime first, keeping the ESP boundary stable, wiring minimum Firebase publication, hosting the dashboard with Vite, and requiring seeded historical data for demo readiness.

## Objectives

### User Requirements

* Audit the current merged state across the station runtime, firmware boundary, backend, dashboard, contracts, and Firebase setup. - Source: .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 5-11)
* Determine what is integrated already, what remains scaffolded, and what still blocks a reliable hackathon demo. - Source: .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 13-24)
* Plan the exact integration and hardening approach for this cycle rather than expanding scope. - Source: .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 279-294)
* Keep camera feed completely out of scope for this cycle. - Source: user decision in conversation.
* Use Vite as the browser host if a host is needed for apps/web. - Source: user decision in conversation.
* Use basic Firebase Auth users for operator access. - Source: user decision in conversation.
* Treat seeded historical data as required demo infrastructure because live station runs will be limited. - Source: user decision in conversation.

### Derived Objectives

* Recover the Pi runtime before any broader integration work so validation gates become meaningful again. - Derived from: .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 199-207, 211-223)
* Update Pi package dependencies and environment templates as part of runtime recovery so the selected implementation path works in a clean environment. - Derived from: .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 251-278)
* Preserve the ESP HTTP surface at `GET /health`, `POST /signal`, and `POST /reset` while finishing visible LED behavior. - Derived from: .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 118-139, 215-223)
* Restore LCD guidance and cumulative station-counter behavior on the Pi so the local station loop still meets demo-scope feedback requirements. - Derived from: spec/binsight-spec.md (Lines 25-33, 59-65) and .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 92-116, 180-193)
* Complete only event and live-status publication for this cycle and keep camera-frame ingestion outside the critical path. - Derived from: spec/binsight-spec.md (Lines 99-104) and .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 150-164, 224-242)
* Turn the existing dashboard abstractions into a browser app without rewriting the UI surface. - Derived from: .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 140-164, 224-242)
* Promote seeded historical data from fallback to baseline demo support so history, analytics, comparisons, station detail, and leaderboard views remain credible even with sparse live attempts. - Derived from: spec/binsight-spec.md (Lines 66-79, 85-93), .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 243-278), and user decision in conversation.
* Verify device credentials, Firebase Auth operator access, and cross-surface environment bootstrap before the final rehearsal phase. - Derived from: .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 165-188, 251-278) and user decisions in conversation.
* Treat a real Firebase demo environment as the intended rehearsal target for this cycle; full emulator orchestration remains follow-on work. - Derived from: .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 31-36, 251-278) and the absence of any user requirement for emulator-only rehearsal.

## Context Summary

### Project Files

* devices/pi-station/src/binsight_station/main.py - Pi runtime composition root and current startup blocker surface.
* devices/pi-station/src/binsight_station/live_status.py - Live-status projection seam currently drifted from its callers.
* devices/pi-station/src/binsight_station/publishers.py - Publication seam that must move from no-op to real HTTP publication.
* devices/pi-station/tests/test_smoke.py - Current Pi smoke coverage called out as broken in research.
* firmware/esp8266-controller/src/main.cpp - Firmware LED and health behavior surface.
* devices/pi-station/src/binsight_station/esp_client.py - Pi to ESP HTTP transport boundary.
* services/backend-functions/src/functions/ingest-event.ts - Existing disposal-event ingress handler.
* services/backend-functions/src/functions/ingest-live-status.ts - Existing live-status ingress handler.
* services/backend-functions/src/auth/device-auth.ts - Device-auth contract for Pi publication.
* apps/web/src/app/providers.tsx - Dashboard dependency injection seam for a real browser host.
* apps/web/src/lib/api/dashboard-gateway.ts - Dashboard callable gateway seam.
* apps/web/src/lib/firebase/live-status.ts - Firestore live-status subscription seam.
* apps/web/src/lib/firebase/live-monitoring.ts - Live monitoring model that currently assumes camera-feed handling.

### References

* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md - Primary audit, blocker set, selected approach, and open questions.
* spec/binsight-spec.md - Product source of truth for station behavior, dashboard scope, and cloud data flow.
* package.json - Root lint, build, and test entrypoints.
* apps/web/package.json - Current web package scripts and host constraints.
* services/backend-functions/package.json - Backend package scripts and Firebase dependency surface.
* devices/pi-station/pyproject.toml - Pi runtime dependency and test configuration.
* justfile - Current workspace bootstrap, run, and validation shortcuts.

### Standards References

* #file:../../../spec/binsight-spec.md - Product source of truth for demo scope, business logic, and station-to-cloud boundaries.
* #file:../../../.github/instructions/source-of-truth.instructions.md - Requirement to treat the spec as authoritative unless the user overrides scope.

## Implementation Checklist

### [x] Implementation Phase 1: Pi Runtime Recovery and Validation Gates

<!-- parallelizable: false -->

* [x] Step 1.1: Reconcile live-status and publisher APIs.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 12-35)
* [x] Step 1.2: Restore Pi dependency declarations, validation, and configuration guidance.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 37-64)
* [x] Step 1.3: Validate phase changes.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 66-73)

### [x] Implementation Phase 2: Local Demo Loop Hardening Without Camera Feed

<!-- parallelizable: false -->

* [x] Step 2.1: Freeze the ESP HTTP boundary and complete three-zone indicator behavior.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 79-101)
* [x] Step 2.2: Add deterministic hand-tracking input and remove camera-feed work from the critical path.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 103-126)
* [x] Step 2.3: Restore LCD guidance and cumulative station-counter behavior.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 128-152)
* [x] Step 2.4: Validate phase changes.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 153-159)

### [x] Implementation Phase 3: Cloud Publication and Seeded Demo Data

<!-- parallelizable: true -->

* [x] Step 3.1: Implement authenticated event and live-status publication.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 165-190)
* [x] Step 3.2: Create the required seeded dataset and station bootstrap path.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 192-217)
* [x] Step 3.3: Provision demo credentials and verify bootstrap prerequisites.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 219-244)
* [x] Step 3.4: Validate phase changes.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 246-252)

### [x] Implementation Phase 4: Vite Dashboard Host and Operator Access

<!-- parallelizable: true -->

* [x] Step 4.1: Turn the dashboard package into a minimal Vite browser app.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 258-283)
* [x] Step 4.2: Add Firebase callables, Firestore subscriptions, and basic operator login.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 285-311)
* [x] Step 4.3: Validate phase changes.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 313-319)

### [ ] Implementation Phase 5: End-to-End Demo Rehearsal and Final Validation

<!-- parallelizable: false -->

* [ ] Step 5.1: Rehearse the full thin-slice demo path.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 325-347)
  * Status: The laptop-safe rehearsal path is complete: Firestore and Functions deployed to `vastum-binsight`, demo data seeded successfully, the Vite dashboard started locally, and the Pi runtime startup command was validated from this machine. The remaining unchecked work is the physical station rehearsal that requires the real Pi and ESP hardware for presence sensing, LED guidance, disposal observation, LCD verification, and live dashboard updates during an actual sort.
* [x] Step 5.2: Run full project validation.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 349-358)
* [x] Step 5.3: Fix minor validation issues.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 360-362)
* [x] Step 5.4: Report blocking issues.
  * Details: .copilot-tracking/details/2026-03-07/full-station-demo-integration-hardening-details.md (Lines 364-366)

## Planning Log

See [full-station-demo-integration-hardening-log.md](../../plans/logs/2026-03-07/full-station-demo-integration-hardening-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js with Corepack-enabled pnpm for workspace, backend, and web validation.
* uv-managed Python 3.11 environment for the Pi runtime and tests.
* PlatformIO available at /home/handwash/Projects/hackcanada/.venv/bin/pio for firmware builds.
* Firebase project configuration, device credentials, and basic operator-auth provisioning for the demo environment.

## Success Criteria

* The Pi runtime starts, the Pi test suite becomes meaningful again, and `just validate` can exercise the Python package. - Traces to: .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 199-207, 251-278)
* The ESP boundary remains limited to the existing HTTP surface while real three-zone LED guidance is wired for the station. - Traces to: spec/binsight-spec.md (Lines 25-33) and .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 211-223)
* The Pi LCD renders live guidance and cumulative station-counter output required by the local demo loop. - Traces to: spec/binsight-spec.md (Lines 25-33, 59-65)
* The Pi publishes live status and disposal events to Firebase without making local session completion depend on network success. - Traces to: spec/binsight-spec.md (Lines 99-104) and .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 150-164, 224-242)
* The dashboard runs through a Vite host with Firebase-backed read paths and basic operator login. - Traces to: .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 140-164, 231-242) and user decisions in conversation.
* Seeded historical data is provisioned as required demo infrastructure for station detail, history, analytics, comparisons, and leaderboard views. - Traces to: spec/binsight-spec.md (Lines 66-79, 85-93), .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 243-278), and user decision in conversation.
* Camera feed work remains explicitly excluded from this cycle by user direction. - Traces to: user decision in conversation.