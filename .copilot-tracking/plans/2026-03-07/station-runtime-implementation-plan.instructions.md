---
applyTo: '.copilot-tracking/changes/2026-03-07/station-runtime-implementation-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Station Runtime Implementation

## Overview

Implement the Raspberry Pi station runtime around an explicit finite state machine, contract-aligned payload projections, and narrow device and publication adapters that stay aligned to the Binsight demo spec.

## Objectives

### User Requirements

* Plan the runtime architecture for the station lifecycle. - Source: conversation request and .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 6-23)
* Cover presence detection, session flow, item identification, guidance, disposal detection, correctness logic, and event creation. - Source: conversation request and .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 6-23)
* Evaluate implementation alternatives and recommend one approach aligned to the project spec. - Source: conversation request and .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 278-300)

### Derived Objectives

* Keep StationRuntime as the composition root and extend SessionStateMachine into the authoritative finite state machine. - Derived from: .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 48-69, 193-214)
* Normalize Pi runtime outputs to the existing disposal-event and live-station-status contracts before publication work expands. - Derived from: .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 155-166, 244-248)
* Preserve a narrow ESP boundary and defer final transport selection until hardware validation provides enough evidence. - Derived from: .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 37-39, 208-214, 284-300)
* Keep the station counter as a first-class runtime output so the LCD can show cumulative attempts and correct sorts required by the spec. - Derived from: spec/binsight-spec.md (Lines 60-65) and .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 147-151)

## Context Summary

### Project Files

* devices/pi-station/src/binsight_station/main.py - Current runtime composition root and orchestration seam.
* devices/pi-station/src/binsight_station/session.py - Existing explicit session model and disposal-tracking heuristic.
* devices/pi-station/src/binsight_station/classification.py - Local-first classifier seam with fallback support.
* devices/pi-station/src/binsight_station/events.py - Current correctness logic and disposal-event projection scaffold.
* devices/pi-station/src/binsight_station/live_status.py - Current live-status projection scaffold.
* devices/pi-station/src/binsight_station/esp_client.py - Placeholder ESP boundary that will become a real adapter.
* firmware/esp8266-controller/include/protocol.h - Current narrow protocol surface.
* firmware/esp8266-controller/src/main.cpp - Current firmware implementation surface.

### References

* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md - Primary architecture recommendation, alternatives, gaps, and next steps.
* spec/binsight-spec.md - Product source of truth for user-visible station behavior and system boundaries.
* package.json - Workspace lint, build, and test entrypoints.
* devices/pi-station/pyproject.toml - Pi station test and Python environment configuration.
* firmware/esp8266-controller/platformio.ini - Firmware build target configuration.

### Standards References

* #file:../../../spec/binsight-spec.md - Product source of truth for runtime behavior and demo scope.
* #file:../../../.github/instructions/source-of-truth.instructions.md - Requirement to treat the spec as authoritative.

## Implementation Checklist

### [x] Implementation Phase 1: Canonical Session FSM

<!-- parallelizable: false -->

* [x] Step 1.1: Expand the session state machine.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 12-34)
* [x] Step 1.2: Integrate classification and guidance orchestration.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 36-54)
* [x] Step 1.3: Validate phase changes.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 56-61)

### [x] Implementation Phase 2: Contract Projections and Rules Loading

<!-- parallelizable: true -->

* [x] Step 2.1: Align event and live-status projections to shared contracts.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 67-89)
* [x] Step 2.2: Replace hardcoded rules with schema-backed preset loading.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 91-112)
* [x] Step 2.3: Validate phase changes.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 114-120)

### [x] Implementation Phase 3: Device and Publication Adapters

<!-- parallelizable: false -->

* [x] Step 3.1: Implement the ESP transport and protocol boundary.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 126-149)
* [x] Step 3.2: Add Pi-local LCD and publication adapters.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 151-171)
* [x] Step 3.3: Validate phase changes.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 173-179)

### [x] Implementation Phase 4: End-to-End Tests and Final Validation

<!-- parallelizable: false -->

* [x] Step 4.1: Add session lifecycle and serialization tests.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 185-207)
* [x] Step 4.2: Run full project validation.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 209-215)
* [x] Step 4.3: Fix minor validation issues.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 217-219)
* [x] Step 4.4: Report blocking issues.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 221-223)

### [x] Implementation Phase 5: Presence Integration Rework

<!-- parallelizable: false -->

* [x] Step 5.1: Enforce stable ESP presence before identification begins.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 229-248)
* [x] Step 5.2: Replace placeholder firmware presence frames with ultrasonic-backed telemetry.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 250-268)
* [x] Step 5.3: Expand tests and release traceability for the presence path.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 270-286)
* [x] Step 5.4: Re-run impacted validation.
  * Details: .copilot-tracking/details/2026-03-07/station-runtime-implementation-details.md (Lines 288-294)

## Planning Log

See [station-runtime-implementation-log.md](../../plans/logs/2026-03-07/station-runtime-implementation-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js with Corepack-enabled pnpm for monorepo lint and build validation.
* uv-managed Python 3.11 environment for the Pi runtime and tests.
* PlatformIO build tooling for the ESP8266 firmware.

## Success Criteria

* The Pi station runtime has an implementation path for the full session lifecycle from presence detection through reset. - Traces to: .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 193-240)
* Event and live-status outputs are normalized to the shared contracts before publication. - Traces to: .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 155-166, 244-248)
* ESP, LCD, and publication integration remain isolated behind narrow adapters. - Traces to: .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 208-214)
* The runtime plan covers the spec-required station counter so cumulative attempts and correct sorts can be rendered on the LCD. - Traces to: spec/binsight-spec.md (Lines 60-65)
* The plan preserves the selected finite state machine approach and documents deferred transport and calibration decisions explicitly. - Traces to: .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 278-309)
* Stable ESP-originated presence gates session start and firmware presence telemetry is sensor-backed instead of placeholder data. - Traces to: spec/binsight-spec.md (Lines 20-23) and .copilot-tracking/reviews/2026-03-07/station-runtime-implementation-plan-review.md (Lines 21-28)