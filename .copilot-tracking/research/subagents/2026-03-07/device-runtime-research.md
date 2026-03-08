---
title: Device Runtime Research
description: Research notes on the Raspberry Pi station perception and runtime pipeline implementation as of 2026-03-07
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - raspberry pi
  - runtime
  - classification
  - firmware
  - tests
estimated_reading_time: 8
---

## Research scope

* Inspect the current Raspberry Pi station runtime and adjacent firmware and tests
* Determine what actually works in the perception and runtime pipeline
* Verify whether separate implementations exist for item classification, hand location, and hand-present or hand-absent detection
* Compare implementation behavior with the product spec in `spec/binsight-spec.md`

## Status

Complete.

## Executive summary

* There is one real item-classification module and model-loading pipeline in `devices/pi-station/src/binsight_station/classification.py:82-176`.
* There is no real hand-location model in the Pi runtime. The default runtime uses a deterministic zone generator in `devices/pi-station/src/binsight_station/main.py:37-63`.
* There is no real hand-present or hand-absent vision model either. Hand presence is treated as ESP telemetry parsed in `devices/pi-station/src/binsight_station/esp_client.py:292-301`.
* The runtime logic does implement the spec-shaped state machine for session start, guidance, drop-on-disappearance inference, result emission, and reset across `devices/pi-station/src/binsight_station/main.py:210-289`, `devices/pi-station/src/binsight_station/session.py:138-160`, and `devices/pi-station/src/binsight_station/events.py:56-87`.
* The live hardware path currently diverges from the spec because the committed ESP8266 firmware returns static placeholder presence data with `sensorOnline=false`, `handPresent=false`, `stable=false`, and `handZone=off` in `firmware/esp8266-controller/src/main.cpp:14-16` and `firmware/esp8266-controller/src/main.cpp:50-61`.
* The repo contains strong simulation and seam tests, but those tests mostly prove injected or simulated behavior, not a live three-model perception stack.

## Spec baseline

* The spec expects classification of the held item, continuous hand-zone tracking, continuous hand-present checks, and drop inference when a present hand disappears in `spec/binsight-spec.md` under business logic sections 2 through 5.
* The codebase only fully implements the first of those as a real model-backed pipeline.

## What is implemented

### Item classification

* Implemented: `StationRuntime` loads `ClassificationPipeline` from the configured item-classifier model directory in `devices/pi-station/src/binsight_station/main.py:88-101` and `devices/pi-station/src/binsight_station/main.py:173-178`.
* Implemented: session entry captures an image source, calls `classifier.classify(...)`, maps the predicted item through the rules preset, and sends guidance in `devices/pi-station/src/binsight_station/main.py:210-264`.
* Implemented: the classifier supports deterministic demo sources, TensorFlow Lite inference, and threshold-based fallback selection in `devices/pi-station/src/binsight_station/classification.py:82-114`.
* Implemented: TensorFlow Lite assets are expected as `manifest.json`, `model.tflite`, labels, and optional aliases in `devices/pi-station/src/binsight_station/classification.py:163-176`.
* Stubbed: the fallback path is not a real LLM call. `_infer_with_fallback()` discards the image source and returns the literal string `fallback-item` in `devices/pi-station/src/binsight_station/classification.py:112-114`.
* Missing in repo: the default runtime points at `devices/pi-station/models/item_classifier` via `devices/pi-station/src/binsight_station/main.py:92-101`, but a workspace search found no committed model assets there. Real non-demo classification depends on external model files or test-generated temporary assets.

### Hand location

* Missing as a real model: there is no committed hand-location model, no hand-location inference pipeline, and no separate hand-location module analogous to `classification.py`.
* Implemented only as a deterministic seam: the default `DeterministicHandTracker` cycles through configured zones and ignores the session snapshot entirely in `devices/pi-station/src/binsight_station/main.py:37-63`.
* Divergent from spec intent: while the ESP client can parse `handZone` from presence telemetry in `devices/pi-station/src/binsight_station/esp_client.py:292-301`, the runtime hand-tracking path only passes `self.esp_client.last_presence.hand_present` into `hand_tracking_input.observe(...)` in `devices/pi-station/src/binsight_station/main.py:266-289`. The runtime does not pass through `last_presence.hand_zone` to determine the disposal zone.
* Simulated: the realtime simulation server can synthesize `handZone` values in `devices/pi-station/src/binsight_station/simulation.py:146-151`, but the simulated runtime still injects `DeterministicHandTracker((resolved_scenario.disposal_zone,))` rather than a true vision or ESP-zone tracker in `devices/pi-station/src/binsight_station/simulation.py:509-513`.
* Simulated and test-only: `observe_disposal()` bypasses sensing entirely by forcing `hand_present=True` and then `hand_present=False` for a provided zone in `devices/pi-station/src/binsight_station/main.py:435-443`.

### Hand-present or hand-absent detection

* Implemented as a transport and state seam: the ESP client parses presence frames into `PresenceTelemetry` in `devices/pi-station/src/binsight_station/esp_client.py:292-301`.
* Implemented in runtime logic: session start requires observed stable presence before arming and confirmation before classification in `devices/pi-station/src/binsight_station/main.py:210-223`.
* Implemented in state machine: disposal is inferred when the session previously had `hand_present=True` and the next observation has `hand_present=False` in `devices/pi-station/src/binsight_station/session.py:138-160`.
* Not implemented as a vision model: there is no hand-presence ML module in the Pi runtime.
* Not implemented on committed live firmware: the ESP firmware hardcodes `kPresenceSensorOnline = false`, `kHandPresent = false`, and `kStablePresenceDetected = false` in `firmware/esp8266-controller/src/main.cpp:14-16`, then serializes those constants into `/health` responses in `firmware/esp8266-controller/src/main.cpp:50-61`.

## Runtime logic against the spec

* Implemented: the runtime follows the spec shape for `idle -> presence arming -> identifying -> guiding -> waiting for disposal -> emit result -> resetting` across `devices/pi-station/src/binsight_station/main.py:210-289`, `devices/pi-station/src/binsight_station/main.py:324-449`, and `devices/pi-station/src/binsight_station/session.py:48-160`.
* Implemented: `create_disposal_event()` compares the rules-derived correct disposal method with the rules-mapped method for the actual zone in `devices/pi-station/src/binsight_station/events.py:56-87`.
* Divergent: the spec implies continuous hand-zone tracking from real sensing, but the default runtime uses deterministic zones instead of a real hand-location signal in `devices/pi-station/src/binsight_station/main.py:37-63` and `devices/pi-station/src/binsight_station/main.py:173-178`.
* Divergent: the spec calls for low-confidence LLM fallback classification, but the current fallback is a stub returning `fallback-item` in `devices/pi-station/src/binsight_station/classification.py:112-114`.
* Divergent: the spec starts sessions from the ultrasonic sensor. The current committed firmware publishes only static placeholder presence fields from `/health` in `firmware/esp8266-controller/src/main.cpp:50-61`, so live hardware session start is not actually implemented by the committed firmware.
* Divergent for demo tooling: `run_live_demo()` does not perform real perception. It injects a predicted item via `start_demo_session()` and then forces disposal with `observe_disposal()` in `devices/pi-station/src/binsight_station/live_demo.py:69-106` and `devices/pi-station/src/binsight_station/main.py:337-370`.
* Partially implemented: the state machine exposes disposal timeout state in `devices/pi-station/src/binsight_station/session.py:119-136`, but the inspected `StationRuntime` polling methods do not enforce timeout expiry in the main runtime path shown in `devices/pi-station/src/binsight_station/main.py:324-394`.

## Firmware impact on the runtime path

* Implemented: the ESP firmware does own LED guidance endpoints and can accept `indicatorZone` commands in `firmware/esp8266-controller/src/main.cpp:187-204`.
* Implemented: `/health` exists and returns JSON in `firmware/esp8266-controller/src/main.cpp:183-184`.
* Stubbed: the same `/health` endpoint currently reports static placeholder presence telemetry rather than live sensor data in `firmware/esp8266-controller/src/main.cpp:14-16` and `firmware/esp8266-controller/src/main.cpp:50-61`.
* Repository documentation matches that limitation: the firmware README explicitly says `GET /health` returns static no-sensor presence telemetry in `firmware/esp8266-controller/README.md:22-29`.

## Test evidence

### Tests that prove implemented behavior

* `devices/pi-station/tests/test_classification_tflite.py:100-108` proves demo URI classification works without model assets.
* `devices/pi-station/tests/test_classification_tflite.py:112-148` proves the TensorFlow Lite pipeline loads manifest, labels, aliases, and tensor shapes correctly.
* `devices/pi-station/tests/test_classification_tflite.py:242-276` proves low-confidence predictions trigger the fallback branch and return `fallback-item`.
* `devices/pi-station/tests/test_classification_tflite.py:279-284` proves the classifier fails when required model assets are missing.
* `devices/pi-station/tests/test_classification_tflite.py:287-305` proves the runtime captures an image source from the provider when none is passed explicitly.
* `devices/pi-station/tests/test_smoke.py:49-78` proves stable presence frames can move the runtime from idle into waiting-for-disposal when presence frames are injected.
* `devices/pi-station/tests/test_smoke.py:136-152` proves the state machine records a drop when a previously present hand disappears.
* `devices/pi-station/tests/test_smoke.py:155-192` proves the runtime can emit a successful result after a direct injected disposal zone.
* `devices/pi-station/tests/test_esp_http.py:45-61` proves the HTTP transport maps JSON health and presence payloads into runtime protocol frames.

### Tests that prove simulation or injected behavior rather than live perception

* `devices/pi-station/tests/test_live_demo.py:8-57` proves the live-demo flow drives real runtime seams, but it uses fake detection and a synthetic disposal zone.
* `devices/pi-station/tests/test_realtime_simulation.py:6-31` proves the wall-clock simulation path works end to end, but that path uses a simulated ESP server and a static classifier result.
* `devices/pi-station/tests/test_runtime_serialization.py:10-23` and `devices/pi-station/tests/test_runtime_serialization.py:25-53` prove payload serialization for already-resolved snapshots, not live sensing.

## Conclusion on the three requested models or modules

* Item classification: yes, there is one real module and intended model-backed pipeline. It is implemented, tested, and structurally usable, but committed model assets are absent and the fallback branch is stubbed.
* Hand location: no, there is not a real separate hand-location model or inference module in the live runtime. The runtime currently relies on deterministic or manually injected zones.
* Hand-present or hand-absent detection: there is a module boundary for presence telemetry and state handling, but not a real separate ML detector. In the committed hardware path the firmware still reports placeholder false values, so live presence detection is effectively missing.

## Remaining uncertainty

* The repo does not show whether uncommitted local model assets exist on the developer machine for `ITEM_CLASSIFIER_MODEL_DIR`.
* The repo does not show whether a separate branch or uncommitted firmware work adds real ultrasonic or hand-zone sensing.
* The runtime exposes timeout configuration, but the inspected code path does not enforce it. I did not run the code to confirm whether another caller layer handles timeout-based reset externally.
