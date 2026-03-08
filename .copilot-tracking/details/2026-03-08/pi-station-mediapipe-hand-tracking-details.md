<!-- markdownlint-disable-file -->
---
title: Pi Station MediaPipe Hand Tracking Details
description: Implementation details for the Pi-station MediaPipe hand tracking migration
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: how-to
keywords:
  - mediapipe
  - pi station
  - hand tracking
estimated_reading_time: 5
---

## Context references

* Plan: `.copilot-tracking/plans/2026-03-08/pi-station-mediapipe-hand-tracking-plan.instructions.md`
* Research: `.copilot-tracking/research/2026-03-08/pi-station-mediapipe-hand-tracking-research.md`
* Subagent research: `.copilot-tracking/research/subagents/2026-03-08/mediapipe-hand-presence-esp-seam.md`
* Source of truth: `spec/binsight-spec.md`

## Phase 1 details

Target files:

* `devices/pi-station/src/binsight_station/hand_tracking.py`
* `devices/pi-station/src/binsight_station/main.py`

Implementation notes:

* Move hand-tracking types out of `main.py` into a dedicated module.
* Add a MediaPipe detector abstraction with lazy import boundaries and a fake-detector seam for tests.
* Use normalized landmark x position to map into left, middle, and right zones.
* Debounce disappearance by requiring multiple consecutive absent detections before emitting `hand_present=False`.

Success criteria:

* Runtime-facing hand tracking does not require ESP presence input.
* Unit tests can run with fake detector results without importing native MediaPipe internals.

## Phase 2 details

Target files:

* `devices/pi-station/src/binsight_station/main.py`
* `devices/pi-station/src/binsight_station/live_status.py`

Implementation notes:

* Replace `_consume_hand_tracking()` with a runtime path that polls the hand tracker whenever the session is waiting for disposal.
* Preserve ESP health polling so device status remains visible.
* Keep live-status payload compatibility unless a change is required for correctness.

Success criteria:

* `sync_from_esp()` continues to update health and publish live status.
* Disposal tracking can advance to `EMIT_RESULT` without ESP presence frames.

## Phase 3 details

Target files:

* `devices/pi-station/tests/test_runtime_session.py`
* `devices/pi-station/tests/test_realtime_simulation.py`
* `devices/pi-station/tests/test_live_demo.py`
* `devices/pi-station/src/binsight_station/simulation.py`
* optional new unit tests for hand tracking

Implementation notes:

* Convert ESP-gated tests to camera-owned tracking behavior.
* Use deterministic or fake hand detectors to keep tests fast and hermetic.
* Retain assertions that ESP guidance commands are still sent correctly.

Success criteria:

* Updated tests cover the same business outcomes without relying on ESP presence telemetry.

## Phase 4 details

Target files:

* `devices/pi-station/pyproject.toml`
* `devices/pi-station/README.md`
* `devices/pi-station/.env.example`

Implementation notes:

* Add MediaPipe with a Linux `aarch64` pin that reflects research findings.
* Remove documentation that claims ESP is the authoritative hand-present source.
* Document that the current integration uses MediaPipe Hands through the existing image capture seam.

Success criteria:

* Dependency intent and installation caveats are explicit.
* Docs no longer describe ESP ownership of disposal detection.

## Phase 5 details

Validation targets:

* `pytest` for focused Pi-station tests
* local dependency sync or install for MediaPipe

Success criteria:

* Local validation passes or any remaining blockers are explicitly documented.
* Tracking artifacts record the actual implementation and any deviations.