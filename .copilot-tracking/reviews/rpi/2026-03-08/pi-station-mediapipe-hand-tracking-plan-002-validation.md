---
title: Phase 2 Validation for Pi Station MediaPipe Hand Tracking
description: Validation of Phase 2 runtime rewiring against the plan, changes log, research, and spec
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: reference
keywords:
  - binsight
  - validation
  - pi-station
  - mediapipe
  - hand tracking
estimated_reading_time: 3
---

## Validation Scope

Phase 2 of `.copilot-tracking/plans/2026-03-08/pi-station-mediapipe-hand-tracking-plan.instructions.md`.

Validation focus:

* runtime removal of ESP-driven hand-presence gating
* MediaPipe-backed default runtime hand-tracking configuration
* clean shutdown of hand-tracking resources

## Status

Passed

## Plan Coverage

* Complete. All three Phase 2 checklist items have matching implementation evidence in the runtime, test coverage, and supporting runtime configuration.

## Findings

### Critical

* None.

### Major

* None.

### Minor

* The changes log does not list the phase-relevant tracking artifact `.copilot-tracking/details/2026-03-08/pi-station-mediapipe-hand-tracking-details.md`, even though it contains Phase 2 implementation notes and success criteria used to describe the runtime rewiring. Evidence: `.copilot-tracking/details/2026-03-08/pi-station-mediapipe-hand-tracking-details.md:41`, `.copilot-tracking/details/2026-03-08/pi-station-mediapipe-hand-tracking-details.md:57`, `.copilot-tracking/changes/2026-03-08/pi-station-mediapipe-hand-tracking-changes.md:35`.

## Evidence

* Phase 2 requires removal of ESP presence from runtime hand tracking, MediaPipe-based default tracker construction, and clean shutdown handling. Evidence: `.copilot-tracking/plans/2026-03-08/pi-station-mediapipe-hand-tracking-plan.instructions.md:43`, `.copilot-tracking/plans/2026-03-08/pi-station-mediapipe-hand-tracking-plan.instructions.md:45`, `.copilot-tracking/plans/2026-03-08/pi-station-mediapipe-hand-tracking-plan.instructions.md:46`, `.copilot-tracking/plans/2026-03-08/pi-station-mediapipe-hand-tracking-plan.instructions.md:47`.
* The runtime now polls ESP only for health transport and independently polls the hand tracker while the session is waiting for disposal. `_consume_hand_tracking()` no longer consumes `self.esp_client.last_presence.hand_present`, while health polling and LED guidance remain in place. Evidence: `devices/pi-station/src/binsight_station/main.py:178`, `devices/pi-station/src/binsight_station/main.py:222`, `devices/pi-station/src/binsight_station/main.py:270`, `devices/pi-station/src/binsight_station/main.py:313`, `devices/pi-station/src/binsight_station/main.py:319`, `devices/pi-station/src/binsight_station/main.py:326`.
* The runtime settings now expose MediaPipe hand-tracking configuration instead of a `hand_location` model directory, and the default builder constructs `MediaPipeHandsTracker`. Evidence: `devices/pi-station/src/binsight_station/main.py:44`, `devices/pi-station/src/binsight_station/main.py:45`, `devices/pi-station/src/binsight_station/main.py:46`, `devices/pi-station/src/binsight_station/main.py:47`, `devices/pi-station/src/binsight_station/main.py:77`, `devices/pi-station/src/binsight_station/main.py:78`, `devices/pi-station/src/binsight_station/main.py:79`, `devices/pi-station/src/binsight_station/main.py:80`, `devices/pi-station/src/binsight_station/main.py:408`, `devices/pi-station/src/binsight_station/main.py:410`.
* Runtime shutdown now closes the injected hand-tracking input, and the runtime-session test verifies the detector is closed. Evidence: `devices/pi-station/src/binsight_station/main.py:398`, `devices/pi-station/src/binsight_station/main.py:399`, `devices/pi-station/tests/test_runtime_session.py:257`, `devices/pi-station/tests/test_runtime_session.py:304`, `devices/pi-station/tests/test_runtime_session.py:305`.
* The environment example also reflects MediaPipe-owned presence and zone detection, which is consistent with the runtime rewiring. Evidence: `devices/pi-station/.env.example:6`, `devices/pi-station/.env.example:7`, `devices/pi-station/.env.example:8`, `devices/pi-station/.env.example:9`, `devices/pi-station/.env.example:10`.

## Changes Log Cross-Check

* The changes log claim that runtime disposal tracking no longer depends on ESP presence frames is consistent with the implementation in `main.py`. Evidence: `.copilot-tracking/changes/2026-03-08/pi-station-mediapipe-hand-tracking-changes.md:26`, `devices/pi-station/src/binsight_station/main.py:222`.
* The files listed for this through-line, especially `main.py`, `simulation.py`, and `test_runtime_session.py`, match the validated runtime and test behavior. Evidence: `.copilot-tracking/changes/2026-03-08/pi-station-mediapipe-hand-tracking-changes.md:37`, `.copilot-tracking/changes/2026-03-08/pi-station-mediapipe-hand-tracking-changes.md:38`, `.copilot-tracking/changes/2026-03-08/pi-station-mediapipe-hand-tracking-changes.md:39`.
* One phase-relevant tracking artifact exists outside the logged file list: `.copilot-tracking/details/2026-03-08/pi-station-mediapipe-hand-tracking-details.md`.

## Research And Spec Alignment

* The validated runtime behavior matches the research recommendation to keep ESP limited to guidance, reset, acknowledgements, and health while moving both `hand_present` and `zone` into a camera-owned observation provider polled during `WAITING_FOR_DISPOSAL`. Evidence: `.copilot-tracking/research/2026-03-08/pi-station-mediapipe-hand-tracking-research.md:52`, `.copilot-tracking/research/2026-03-08/pi-station-mediapipe-hand-tracking-research.md:53`, `.copilot-tracking/research/2026-03-08/pi-station-mediapipe-hand-tracking-research.md:54`, `.copilot-tracking/research/2026-03-08/pi-station-mediapipe-hand-tracking-research.md:108`.
* The validated behavior remains aligned to the spec disposal rule that a drop occurs when a hand was present and then disappears, and the actual zone is the most recent tracked hand zone before disappearance. Evidence: `spec/binsight-spec.md:40`, `spec/binsight-spec.md:41`.

## Coverage Assessment

* Coverage is complete for the Phase 2 runtime rewiring through-line.
* No missing implementation was found in the runtime path for the three Phase 2 checklist items.

## Clarifying Questions

* None.

## Recommended Next Validations

* Validate Phase 3 to confirm the simulation and runtime-session rewrites fully removed ESP-presence assumptions beyond the runtime entry points.
* Validate Phase 4 to confirm the README and environment guidance do not overstate Pi deployment certainty beyond the documented `aarch64` pinning caveat.