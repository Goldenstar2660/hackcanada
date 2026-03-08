<!-- markdownlint-disable-file -->
---
description: Implementation plan for migrating Pi-station disposal tracking from ESP-gated presence to MediaPipe Hands
author: GitHub Copilot
ms.date: 2026-03-08
---

## Overview and objectives

User requirement source:

* Replace hand-presence detection with MediaPipe Hands instead of a model like the other two models.
* Completely remove reliance on the ESP for hand detection.
* Be prepared to install MediaPipe-related dependencies.

Derived objectives:

* keep the spec-defined drop-detection business rule unchanged
* keep ESP control limited to guidance, reset, and health reporting
* add a camera-owned hand tracking path that emits presence and zone observations
* update the Python dependencies and setup docs to cover MediaPipe installation constraints
* validate with Pi runtime tests and direct dependency installation in the configured environment

## Context summary

Applicable instructions and context:

* `.github/instructions/source-of-truth.instructions.md`
* `.github/instructions/hve-core/markdown.instructions.md`
* `.github/instructions/hve-core/writing-style.instructions.md`
* repository memory in `/memories/repo/pi-station-model-integration.md`
* research: `.copilot-tracking/research/2026-03-08/pi-station-mediapipe-hand-tracking-research.md`
* subagent research: `.copilot-tracking/research/subagents/2026-03-08/mediapipe-hand-presence-esp-seam.md`

## Implementation checklist

### Phase 1: Introduce camera-owned hand tracking <!-- parallelizable: false -->

- [x] Add a dedicated Pi-station hand-tracking module with a MediaPipe-backed detector, a runtime-facing observation contract, and a deterministic test tracker.
- [x] Derive disposal zone from landmark x position and debounce hand disappearance across multiple absent frames.
- [x] Keep MediaPipe import and initialization isolated so tests can inject fake detectors without requiring native runtime execution.

### Phase 2: Rewire the station runtime <!-- parallelizable: false -->

- [x] Remove ESP presence from the runtime hand-tracking loop while preserving ESP health polling and LED guidance.
- [x] Update runtime settings and default tracker construction to use MediaPipe rather than the hand-location model directory.
- [x] Ensure runtime shutdown closes any hand-tracking resources cleanly.

### Phase 3: Update tests and simulation <!-- parallelizable: true -->

- [x] Rewrite runtime-session and realtime-simulation tests so disposal tracking is driven by camera-owned observations instead of queued ESP presence frames.
- [x] Preserve live-demo and smoke coverage for guidance, result publication, and reset behavior.
- [x] Add unit tests for the new hand-tracking module using fake detector outputs.

### Phase 4: Update dependencies and docs <!-- parallelizable: true -->

- [x] Add a MediaPipe dependency strategy that works for Windows development and pins Linux `aarch64` safely.
- [x] Update the Pi runtime README and `.env.example` to describe MediaPipe ownership of hand presence and zone detection.
- [x] Record the Pi packaging caveat so deployment expectations are explicit.

### Phase 5: Validate and review <!-- parallelizable: false -->

- [x] Run targeted Pi-station tests covering runtime session flow, live demo flow, realtime simulation, and smoke imports.
- [x] Install or sync the MediaPipe dependency in the configured environment to verify the package path works locally.
- [x] Compile changes, validation results, and any deviations into tracking artifacts.

## Planning log reference

* `.copilot-tracking/plans/logs/2026-03-08/pi-station-mediapipe-hand-tracking-log.md`

## Dependencies

* Python 3.11 environment configured for `devices/pi-station`
* `mediapipe` Python package
* existing Pi camera capture seam in `devices/pi-station/src/binsight_station/camera_capture.py`
* existing session business logic in `devices/pi-station/src/binsight_station/session.py`

## Success criteria

* The Pi runtime no longer uses ESP presence telemetry to determine `hand_present` or drop timing.
* Disposal tracking uses camera-side observations for both presence and zone.
* ESP still receives LED guidance and reset commands.
* Tests demonstrate that disposal results can be emitted without queued ESP presence frames.
* The configured local Python environment can install the required MediaPipe dependency path successfully.