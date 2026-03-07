<!-- markdownlint-disable-file -->
---
title: Station Runtime Implementation Quality Validation
description: Full-quality validation log for the station runtime implementation
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
---

## Validation Metadata

* Scope: full-quality
* Status: Partial
* Changed files reviewed:
  * devices/pi-station/src/binsight_station/session.py
  * devices/pi-station/src/binsight_station/main.py
  * devices/pi-station/src/binsight_station/classification.py
  * devices/pi-station/src/binsight_station/esp_client.py
  * devices/pi-station/src/binsight_station/events.py
  * devices/pi-station/src/binsight_station/live_status.py
  * devices/pi-station/src/binsight_station/rules.py
  * devices/pi-station/src/binsight_station/lcd_client.py
  * devices/pi-station/src/binsight_station/publishers.py
  * devices/pi-station/tests/test_runtime_session.py
  * devices/pi-station/tests/test_runtime_serialization.py
  * devices/pi-station/tests/test_smoke.py
  * firmware/esp8266-controller/include/protocol.h
  * firmware/esp8266-controller/src/main.cpp
  * firmware/esp8266-controller/src/protocol.cpp
  * packages/rules/presets/demo-canada-ottawa.1.0.0.json
* Reference files reviewed:
  * spec/binsight-spec.md
  * .github/instructions/source-of-truth.instructions.md
  * .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md
  * .copilot-tracking/plans/2026-03-07/station-runtime-implementation-plan.instructions.md

## Exploration Notes

* The implementation keeps a clean separation between the Pi runtime composition root, the FSM, protocol parsing, payload projection, and publication seams.
* Shared contracts are used consistently for disposal-event and live-status payload shapes, and schema-backed rules loading replaces local literals cleanly.
* The main architecture gap is not in payload modeling or adapter boundaries. It is in how the runtime enters the session lifecycle. The FSM models presence debounce, and the ESP adapter models stable presence, but the composition root still advances into identification synchronously.
* The firmware protocol boundary is intentionally narrow and buildable, but the emitted presence signal is still placeholder data rather than ultrasonic-backed telemetry.
* Workspace diagnostics on the reviewed changed files reported no compile or lint errors.

## Findings

### Architecture

* [Major] IV-001 (Architecture, Design): The runtime composition root bypasses confirmed presence before identification begins. Evidence: devices/pi-station/src/binsight_station/main.py:107-114 and devices/pi-station/src/binsight_station/main.py:122-133 call `begin_presence_arming()` and then immediately call `begin_identification()` using a synthetic timestamp, while the actual confirmation gate exists in devices/pi-station/src/binsight_station/session.py:56-71 and ESP stable-presence state exists in devices/pi-station/src/binsight_station/esp_client.py:99-101. Impact: The implemented control flow does not honor the spec and research requirement that a stable person-detection signal starts the session before image capture and classification. Recommendation: Move session entry behind an observed stable presence condition, either by polling ESP presence before `start_session()` proceeds or by splitting `start_session()` into a presence-driven transition loop.

* [Major] IV-002 (Architecture, API and Library): The firmware presence pipeline is protocol-complete but functionally stubbed. Evidence: firmware/esp8266-controller/include/protocol.h:35-46 and firmware/esp8266-controller/src/protocol.cpp:37-53 define and encode presence telemetry, but firmware/esp8266-controller/src/main.cpp:35-45 hardcodes `handPresent = false` for every emitted presence frame. Impact: The Pi runtime cannot receive real sensor-backed presence, so the Phase 3 device boundary remains structurally correct but behaviorally incomplete relative to the spec and research. Recommendation: Wire presence publication to the ultrasonic input path and preserve the current frame shape so the Pi-side adapter can remain unchanged.

### Test Coverage

* No additional coverage defects were found beyond IV-001 and IV-002. The changed tests cover timeout reset, successful and failed disposal, fallback classification, payload serialization, ESP frame parsing, runtime sync, and publish-failure handling. Evidence: devices/pi-station/tests/test_runtime_session.py:24-149, devices/pi-station/tests/test_runtime_serialization.py:1-91, devices/pi-station/tests/test_smoke.py:1-286.

### Error Handling

* No findings. Publication failures are converted into controlled `PublicationError` exceptions in devices/pi-station/src/binsight_station/publishers.py:39-52, and the runtime degrades cloud sync state while surfacing an LCD error in devices/pi-station/src/binsight_station/main.py:87-105 and devices/pi-station/src/binsight_station/main.py:171-179.

### Security

* No findings in reviewed files. The changed code does not introduce new network listeners, secrets, or external command execution paths.

## Holistic Assessment

The implementation is close to the intended architecture and is materially stronger than the prior scaffold. Contract normalization, preset loading, adapter seams, and test depth are all consistent with the plan and spec. The remaining problems are concentrated at the runtime entry boundary. Because stable presence is not yet the real trigger for session start, the code does not fully realize the product flow described in the spec, and the firmware placeholder telemetry prevents the Pi-ESP integration from proving the intended hardware behavior end to end. Those issues are significant enough to keep the quality result at Partial rather than Passed.

## Summary Counts

* Critical: 0
* Major: 2
* Minor: 0

## Category Counts

* Architecture: 2
* Design: 1
* API and Library: 1
* Test Coverage: 0
* Error Handling: 0
* Security: 0
* General: 0

## Additional Investigation

* Confirm whether `StationRuntime.start_session()` is meant to be a manual demo helper only, or whether it is expected to become the production presence-driven entry point.
* Re-run quality validation after ultrasonic-backed presence telemetry is wired into the firmware and consumed by the runtime.

## Clarifying Questions

* Should the review treat manual session start as an accepted demo-only entry path, or is that now a defect against the canonical station behavior?