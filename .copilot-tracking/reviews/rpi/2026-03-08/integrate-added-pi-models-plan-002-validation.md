---
title: Phase 2 Validation for Integrate Added Pi Models
description: Validation of Phase 2 hand-location runtime integration against the plan, changes log, research, and spec
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: reference
keywords:
  - binsight
  - validation
  - pi-station
  - hand-location
  - esp
estimated_reading_time: 3
---

## Validation Scope

Phase 2 of `.copilot-tracking/plans/2026-03-08/integrate-added-pi-models-plan.instructions.md`.

Validation focus:

* hand-location runtime integration
* preserved ESP presence and disappearance semantics
* deterministic tracker injection remaining available for tests and simulation

## Status

Passed

## Plan Coverage

* Complete. All three Phase 2 checklist items have matching implementation evidence in the runtime or tests.

## Findings

### Critical

* None.

### Major

* None.

### Minor

* None.

## Evidence

* The runtime now includes `CameraBackedHandTracker`, which captures an image and runs classifier-backed zone inference only when `hand_present` is true. On disappearance it emits `hand_present=False` without inventing a CV-only absence heuristic. Evidence: `devices/pi-station/src/binsight_station/main.py:66`, `devices/pi-station/src/binsight_station/main.py:77`, `devices/pi-station/src/binsight_station/main.py:81`, `devices/pi-station/src/binsight_station/main.py:95`.
* Phase 2 required ESP `hand_present` to remain the gating signal and disappearance trigger. `_consume_hand_tracking()` still passes only `self.esp_client.last_presence.hand_present` into the hand tracker, and `EspClient` still parses presence frames into `last_presence.hand_present`. Evidence: `devices/pi-station/src/binsight_station/main.py:323`, `devices/pi-station/src/binsight_station/esp_client.py:244`, `devices/pi-station/src/binsight_station/esp_client.py:300`.
* The runtime still preserves deterministic injection. `StationRuntime` accepts an injected `hand_tracking_input`, and the default builder falls back to `DeterministicHandTracker()` only when no hand-location model directory is configured. Evidence: `devices/pi-station/src/binsight_station/main.py:209`, `devices/pi-station/src/binsight_station/main.py:238`, `devices/pi-station/src/binsight_station/main.py:512`.
* Test coverage matches the Phase 2 through-line. One runtime test keeps deterministic tracking injectable, and another verifies camera-backed zone inference while ESP presence controls the transition to result emission. Evidence: `devices/pi-station/tests/test_runtime_session.py:219`, `devices/pi-station/tests/test_runtime_session.py:262`.

## Changes Log Cross-Check

* The changes log correctly claims that hand-zone tracking is now camera-backed while ESP remains the authoritative hand-presence and disappearance source.
* The files listed as modified for this through-line, especially `devices/pi-station/src/binsight_station/main.py` and `devices/pi-station/tests/test_runtime_session.py`, match the implementation evidence.
* No unlogged Phase 2 implementation file was required to validate the runtime behavior.

## Research And Spec Alignment

* The validated behavior matches the research recommendation to use `hand_location` only for zone inference while preserving ESP presence until a real `hand_presence` model exists.
* The validated behavior matches the spec disposal rule that a drop occurs when a hand was present and then disappears, with the actual zone taken from the last tracked hand zone.

## Coverage Assessment

* Coverage is complete for the requested Phase 2 focus.

## Clarifying Questions

* None.

## Recommended Next Validations

* Validate Phase 3 documentation and environment updates against the same scope boundary so the docs do not imply CV-based hand presence exists.