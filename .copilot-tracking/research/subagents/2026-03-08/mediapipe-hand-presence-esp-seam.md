---
title: MediaPipe Hand Presence and ESP Seam Research
description: Research findings on replacing Pi-station hand presence and zone tracking with MediaPipe Hands while keeping the ESP limited to LED guidance
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: reference
keywords:
  - mediapipe
  - raspberry pi
  - esp8266
  - hand tracking
  - binsight
estimated_reading_time: 6
---

## Research scope

This note covers the following questions for the Pi station runtime:

* Which current code paths own hand presence, hand zone, ESP polling, and drop detection
* What the cleanest architectural seam is for replacing model-based or ESP-based hand presence with MediaPipe Hands
* Whether MediaPipe Python installation is straightforward for the current workspace and for a likely Raspberry Pi 5 target
* What implementation risks and test impacts follow from that change

## Current state

The runtime already separates disposal session logic from hand-tracking implementation, but it does not yet separate hand presence acquisition from ESP polling.

Key observations:

* The business rule in the project spec says a drop event occurs when a hand was present and then disappears, and the actual disposal zone is the most recent tracked hand zone before disappearance.
* [devices/pi-station/src/binsight_station/session.py](devices/pi-station/src/binsight_station/session.py) is the authoritative place where that rule is implemented. `SessionStateMachine.track_hand()` moves to `EMIT_RESULT` only when `snapshot.hand_present` was true and the new observation sets `hand_present` to false.
* [devices/pi-station/src/binsight_station/main.py](devices/pi-station/src/binsight_station/main.py) defines the current hand-tracking seam as `HandTrackingInput.observe(hand_present, snapshot) -> HandTrackingObservation | None`.
* The default runtime path in [devices/pi-station/src/binsight_station/main.py](devices/pi-station/src/binsight_station/main.py) still sources `hand_present` from `self.esp_client.last_presence.hand_present` inside `_consume_hand_tracking()`.
* `DeterministicHandTracker` only supplies zones for tests and demos. It depends on an external `hand_present` boolean to know when to emit a disappearance.
* `CameraBackedHandTracker` is misnamed for the target architecture. It still depends on ESP presence, and only uses camera inference to choose the zone while the ESP says a hand is present.
* [devices/pi-station/src/binsight_station/esp_client.py](devices/pi-station/src/binsight_station/esp_client.py) parses both `hand_present` and `hand_zone`, but the runtime only trusts ESP for presence. The current repo memory note also records that ESP `hand_zone` is parsed but ignored by the runtime.
* [devices/pi-station/src/binsight_station/simulation.py](devices/pi-station/src/binsight_station/simulation.py) and the tests model the same contract: ESP health and presence frames drive timing, while the runtime or tracker determines the final zone.
* [devices/pi-station/src/binsight_station/live_demo.py](devices/pi-station/src/binsight_station/live_demo.py) bypasses ESP presence entirely for demo flow by calling `track_hand_and_publish(zone, hand_present)` directly. That is already a useful precedent for a camera-owned hand observation path.

## Architectural seam recommendation

The cleanest seam is to move from an ESP-gated hand tracker to a camera-owned hand observation provider that produces both presence and zone observations for the session state machine.

Recommended direction:

* Keep [devices/pi-station/src/binsight_station/session.py](devices/pi-station/src/binsight_station/session.py) unchanged as the business-logic owner. It already matches the spec.
* Keep [devices/pi-station/src/binsight_station/esp_client.py](devices/pi-station/src/binsight_station/esp_client.py) for guidance, health, and indicator acknowledgements only.
* Replace the current `HandTrackingInput.observe(hand_present, snapshot)` contract in [devices/pi-station/src/binsight_station/main.py](devices/pi-station/src/binsight_station/main.py) with a source that can determine presence and zone from camera frames alone.
* Change `_consume_hand_tracking()` in [devices/pi-station/src/binsight_station/main.py](devices/pi-station/src/binsight_station/main.py) so disposal tracking is triggered by a camera polling loop or hand-observation loop while the session is in `WAITING_FOR_DISPOSAL`, rather than only when a new ESP presence frame arrives.
* Treat the MediaPipe provider as the single source of truth for `hand_present` and `zone` during disposal tracking.
* Leave `_send_guidance()` and reset behavior unchanged so the ESP remains a narrow LED actuator.

Why this seam is cleaner than partial replacement:

* Keeping ESP for presence while using MediaPipe for zone would preserve the current coupling and would not satisfy the requested replacement.
* Trying to inject MediaPipe only inside `CameraBackedHandTracker` without changing `_consume_hand_tracking()` would still leave the runtime blind unless ESP frames continue to arrive.
* The session state machine does not care whether the observation comes from ESP, a TFLite model, or MediaPipe. It only needs consistent `zone` plus a reliable `True -> False` transition.

Practical shape of the seam:

* Introduce a camera-side observation abstraction that returns `HandTrackingObservation` without taking `hand_present` from ESP.
* Poll that provider only while the session is in `WAITING_FOR_DISPOSAL`.
* Preserve `track_hand_and_publish()` as the low-level adapter into the state machine and live-status publisher.
* Keep ESP health in live status if desired, but stop treating ESP presence as part of disposal logic.

## MediaPipe feasibility

### Workspace environment

The configured Python environment for this workspace is a virtual environment using Python 3.11.9. That fits the MediaPipe Python setup guide, which documents Python 3.9 through 3.12.

The existing Pi package constraints in [devices/pi-station/pyproject.toml](devices/pi-station/pyproject.toml) are also aligned with Python 3.11 and already include Pi-specific native dependencies such as `lgpio` and Linux-only `tflite-runtime`.

### Upstream Python support

Google's current Python setup guide for MediaPipe Tasks documents:

* Desktop support for Windows, Mac, and Linux
* IoT support for Raspberry Pi OS 64-bit
* Python 3.9 through 3.12
* Installation via `python -m pip install mediapipe`

The Hand Landmarker Python guide specifically documents the `mediapipe` package for Python and points Raspberry Pi implementers to a Raspberry Pi example app.

### Published wheel reality

The packaging story is more constrained than the docs imply.

Observed PyPI metadata:

* `mediapipe 0.10.32` publishes wheels for `macosx_11_0_arm64`, `manylinux_2_28_x86_64`, and `win_amd64`.
* That latest release does not publish a Linux `aarch64` wheel.
* `mediapipe 0.10.20` and `0.10.21` also publish only Linux `x86_64` wheels.
* Older `mediapipe 0.10.14` did publish `manylinux_2_17_aarch64` wheels for CPython 3.9 through 3.12.
* The current Google build guide still documents building a Raspberry Pi ARM wheel yourself with a dedicated aarch64 Docker image.

Interpretation:

* Standard `pip install mediapipe` is feasible in this Windows development environment.
* Standard `pip install mediapipe` is not currently a safe assumption for Raspberry Pi 5 on Linux aarch64 if you intend to use the latest upstream release.
* For Pi 5, you should assume one of two realistic paths:
  * Pin to an older upstream release that still shipped `aarch64` wheels, subject to runtime validation
  * Build a wheel from source using Google's documented ARM wheel build flow

### Raspberry Pi specific package options

The `mediapipe-rpi4` package on PyPI is not a strong fit for this project:

* It is unofficial
* It is very old, last released in 2021
* Its project description targets Raspberry Pi 3 and 4 on Raspberry Pi OS 32-bit
* PyPI currently exposes only a source tarball for it, not a modern Pi 5 aarch64 wheel

That makes it a poor dependency choice for this repository.

## Dependency recommendation

Recommended package strategy:

* For local development on Windows, use upstream `mediapipe` with Python 3.11.
* For Raspberry Pi 5 deployment, do not rely on unpinned `mediapipe` latest.
* Prefer one of these two deployment strategies:

1. Validate `mediapipe==0.10.14` on Raspberry Pi OS 64-bit and Python 3.11 first, because it is the newest release I verified that still ships Linux `aarch64` wheels.
2. If 0.10.14 is not acceptable, plan to build a custom ARM wheel from the official MediaPipe source build path and store that installation process as explicit device provisioning documentation.

Non-recommendations:

* Do not adopt `mediapipe-rpi4` for Pi 5 production use.
* Do not keep the existing hand-location TFLite model and add MediaPipe only as a secondary presence signal. That adds complexity without eliminating the architectural coupling.

## Recommended implementation approach

High-confidence approach:

* Use MediaPipe Hand Landmarker as the disposal-tracking implementation during `WAITING_FOR_DISPOSAL`.
* Derive `hand_present` from whether any hand is confidently detected in the frame.
* Derive disposal zone from the hand landmark bounding box center or a stable landmark such as wrist or palm center mapped into left, middle, and right image bands.
* Apply a small temporal smoother or debounce so a single dropped frame does not immediately create a false disappearance event.
* Emit `hand_present=False` only after a short absence threshold, not on one missing frame.
* Keep the existing session transition rule unchanged so the runtime still records the last zone before disappearance.

Why Hand Landmarker is a better fit than a palm detector only:

* It gives both presence and richer geometry in one API.
* It supports live-stream mode with tracking between frames, which reduces per-frame detection cost.
* The output is enough to compute a stable zone without a separate hand-location model.

## Risks and constraints

Primary risks:

* Packaging risk on Raspberry Pi 5 is the main deployment risk. The docs and current PyPI wheel set are not aligned.
* CPU budget and camera throughput on Pi 5 still need measurement. MediaPipe Hands is likely viable, but the repo does not yet contain profiling data for the current camera path and display/publish loop.
* A naive implementation will produce false drop events when the hand is briefly occluded or motion blur causes one missed detection.
* MediaPipe zone mapping depends on camera framing. If the camera moves, left, middle, and right thresholds may need calibration.
* The current runtime polls ESP and handles hand tracking in the same sync path. Untangling that without introducing timing regressions requires care.

Secondary constraints:

* [devices/pi-station/src/binsight_station/camera_capture.py](devices/pi-station/src/binsight_station/camera_capture.py) captures still images via `rpicam-still` or `libcamera-still`. That is suitable for sparse captures, but not ideal for a continuous hand-tracking loop. A practical MediaPipe integration likely needs a streaming frame source instead of repeated still-photo subprocess calls.
* The current `camera_feed_active` flag in [devices/pi-station/src/binsight_station/live_status.py](devices/pi-station/src/binsight_station/live_status.py) is always false, so live-status semantics may need review if a continuous camera stream becomes part of runtime behavior.

## Suggested tests

Recommended test additions or adaptations once implementation begins:

* Replace the current ESP-gated disposal-tracking integration tests with camera-owned hand-observation tests.
* Keep the existing session-state tests around `track_hand()` because they encode the correct business rule.
* Add provider-level tests for these cases:
  * hand enters left zone and remains present
  * hand moves between zones before disappearing, with the last stable zone winning
  * one dropped frame does not trigger disposal
  * sustained absence does trigger disposal
  * no hand detected never produces a zone
* Add runtime tests proving that classification can begin immediately from idle, but disposal tracking after guidance no longer depends on ESP presence frames.
* Keep an integration test that verifies ESP is still used for LED guidance and reset commands only.
* On Pi hardware, add a smoke test that verifies MediaPipe imports, model creation, and frame processing under the actual deployed Python and OS image.

## Bottom line

The architecture already has the right business-logic seam in the session state machine. The missing step is to move the runtime seam one layer earlier so camera inference owns both presence and zone, while the ESP becomes a pure LED transport.

MediaPipe Hands is a good functional fit for that change. The main blocker is not API shape. It is Raspberry Pi packaging certainty. The safest delivery plan is to prototype against upstream `mediapipe` on Windows, then validate either `mediapipe==0.10.14` on Pi 5 or an official source-built ARM wheel before committing to the deployment path.

## Open questions

The following points cannot be fully closed by repository research alone:

* Which Raspberry Pi OS image will be used on the final Pi 5, including exact distro and Python version
* Whether the deployment pipeline allows shipping a custom-built wheel if upstream latest remains x86-only on Linux
* Whether the current camera integration is allowed to switch from still capture to a streaming API for disposal tracking