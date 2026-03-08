<!-- markdownlint-disable-file -->
---
title: Pi Station MediaPipe Hand Tracking Changes
description: Change summary for the Pi-station MediaPipe hand tracking migration
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: reference
keywords:
  - changes log
  - mediapipe
  - pi station
estimated_reading_time: 4
---

## Related plan reference

* `.copilot-tracking/plans/2026-03-08/pi-station-mediapipe-hand-tracking-plan.instructions.md`

## Implementation date

* 2026-03-08

## Summary of changes

* replaced ESP-gated hand detection with a camera-owned MediaPipe hand-tracking module
* rewired the station runtime so disposal tracking no longer depends on ESP presence frames
* updated the realtime simulation and runtime tests to use camera-owned observations
* added MediaPipe dependency handling and documented Linux `aarch64` pinning constraints

## Added

* `devices/pi-station/src/binsight_station/hand_tracking.py`
* `devices/pi-station/tests/test_hand_tracking.py`

## Modified

* `devices/pi-station/src/binsight_station/main.py`
* `devices/pi-station/src/binsight_station/simulation.py`
* `devices/pi-station/tests/test_runtime_session.py`
* `devices/pi-station/pyproject.toml`
* `devices/pi-station/uv.lock`
* `devices/pi-station/.env.example`
* `devices/pi-station/README.md`
* `.copilot-tracking/details/2026-03-08/pi-station-mediapipe-hand-tracking-details.md`

## Removed

* none

## Additional or deviating changes

* Installed `mediapipe>=0.10.14,<0.11.0` and `pytest` into the configured local Python environment to validate the new runtime path.
* Left the session state machine unchanged because it already matched the product spec and only required a new observation source.
* Refreshed `devices/pi-station/uv.lock` after fixing the MediaPipe environment marker so the checked-in dependency graph matches `pyproject.toml`.

## Validation

* Installed MediaPipe successfully in the configured Windows Python environment.
* Ran: `pytest tests/test_hand_tracking.py tests/test_runtime_session.py tests/test_live_demo.py tests/test_realtime_simulation.py tests/test_smoke.py`
* Result: `19 passed`
* Ran: `uv sync --frozen`
* Result: locked sync succeeded from the checked-in `devices/pi-station/uv.lock`
* Ran: `uv run pytest tests/test_hand_tracking.py tests/test_runtime_session.py tests/test_live_demo.py tests/test_realtime_simulation.py tests/test_smoke.py`
* Result: `19 passed` with expected Windows `gpiozero` fallback warnings for unavailable Pi GPIO backends

## Release summary

* The Pi runtime now treats MediaPipe Hands as the source of truth for hand presence and hand zone during disposal tracking, while the ESP remains limited to LED guidance and health transport responsibilities.
