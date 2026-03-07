---
title: Station Runtime Implementation Phase 3 Validation
description: Validation of Phase 3 device and publication adapter work against the implementation plan, changes log, and research document
ms.date: 2026-03-07
ms.topic: reference
---

## Scope

Validated only Phase 3 of the station runtime implementation plan against the plan, changes log, research document, planning log, spec, and the cited workspace implementation files.

Artifacts reviewed:

* Plan: [station-runtime-implementation-plan.instructions.md](../../../plans/2026-03-07/station-runtime-implementation-plan.instructions.md#L76-L85)
* Phase details: [station-runtime-implementation-details.md](../../../details/2026-03-07/station-runtime-implementation-details.md#L126-L179)
* Changes log: [station-runtime-implementation-changes.md](../../../changes/2026-03-07/station-runtime-implementation-changes.md#L13-L80)
* Research: [station-runtime-implementation-research.md](../../../research/2026-03-07/station-runtime-implementation-research.md#L124-L130), [station-runtime-implementation-research.md](../../../research/2026-03-07/station-runtime-implementation-research.md#L208-L240), and [station-runtime-implementation-research.md](../../../research/2026-03-07/station-runtime-implementation-research.md#L304-L309)
* Planning log deviation reference: [station-runtime-implementation-log.md](../../../plans/logs/2026-03-07/station-runtime-implementation-log.md#L23-L28)
* Spec counter requirement: [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L60-L70)

## Status

Validation status: Partial

Phase 3 is partially implemented. Step 3.2 and Step 3.3 are supported by direct file evidence, but Step 3.1 does not fully satisfy the plan and research because the firmware still emits placeholder absence telemetry and the runtime composition root does not use ESP presence to gate session start.

## Findings

### Critical

No critical findings.

### Major

* Firmware presence telemetry is still a placeholder absence frame rather than sensor-driven presence input. Phase 3 Step 3.1 requires the firmware to emit presence updates and let the Pi observe stable presence and health updates from the ESP boundary. The protocol surface for presence exists in [protocol.h](../../../../firmware/esp8266-controller/include/protocol.h#L35-L46) and the encoder exists in [protocol.cpp](../../../../firmware/esp8266-controller/src/protocol.cpp#L37-L53), but the firmware publisher hardcodes `handPresent` to `false` in [main.cpp](../../../../firmware/esp8266-controller/src/main.cpp#L35-L45). This matches the documented deviation in [station-runtime-implementation-log.md](../../../plans/logs/2026-03-07/station-runtime-implementation-log.md#L23-L28) and the changes log note in [station-runtime-implementation-changes.md](../../../changes/2026-03-07/station-runtime-implementation-changes.md#L43-L46), but it still leaves the researched ultrasonic presence behavior from [station-runtime-implementation-research.md](../../../research/2026-03-07/station-runtime-implementation-research.md#L233-L238) unimplemented.

* The runtime composition root wires health polling and status publication, but it does not consume ESP presence telemetry to control the station lifecycle. The ESP adapter exposes parsed presence and stable-presence state in [esp_client.py](../../../../devices/pi-station/src/binsight_station/esp_client.py#L66-L135), and `sync_from_esp()` polls and republishes device status in [main.py](../../../../devices/pi-station/src/binsight_station/main.py#L93-L120) and [main.py](../../../../devices/pi-station/src/binsight_station/main.py#L165-L166). However, `start_session()` immediately enters presence arming, identification, guidance, and waiting-for-disposal after only requesting health, without checking `has_stable_presence` or any polled presence frame in [main.py](../../../../devices/pi-station/src/binsight_station/main.py#L122-L151). That falls short of the researched flow where `IDLE` waits for stable ESP-originated presence before progressing in [station-runtime-implementation-research.md](../../../research/2026-03-07/station-runtime-implementation-research.md#L233-L238).

### Minor

No minor findings.

### Plan Item Comparison

* Step 3.1: Partial. The placeholder ESP client was replaced with a transport-agnostic parser and protocol surface, and the firmware can encode health, presence, and acknowledgement frames in [esp_client.py](../../../../devices/pi-station/src/binsight_station/esp_client.py#L66-L175), [protocol.h](../../../../firmware/esp8266-controller/include/protocol.h#L16-L46), and [protocol.cpp](../../../../firmware/esp8266-controller/src/protocol.cpp#L25-L92). The remaining gap is that the firmware does not publish real sensor-derived presence and the runtime does not use ESP presence telemetry to drive session entry.
* Step 3.2: Implemented. The Pi-local LCD adapter renders standby, guidance, result, and error screens in [lcd_client.py](../../../../devices/pi-station/src/binsight_station/lcd_client.py#L13-L68). The publication seam serializes canonical payloads, tracks cloud sync status, and raises controlled publication errors in [publishers.py](../../../../devices/pi-station/src/binsight_station/publishers.py#L13-L60). The runtime composes those adapters, surfaces live-status publish failures as an error screen, publishes disposal events, and restores the standby counter view after reset in [main.py](../../../../devices/pi-station/src/binsight_station/main.py#L71-L120) and [main.py](../../../../devices/pi-station/src/binsight_station/main.py#L171-L202). This aligns with the Phase 3 Step 3.2 success criteria in [station-runtime-implementation-details.md](../../../details/2026-03-07/station-runtime-implementation-details.md#L151-L167).
* Step 3.3: Implemented. The changes log records successful `uv run pytest` and `pio run` validation in [station-runtime-implementation-changes.md](../../../changes/2026-03-07/station-runtime-implementation-changes.md#L56-L80), and the current terminal context for this validation session independently shows exit code `0` for the same station and firmware commands. Phase 3 behavior is also covered by direct tests for ESP frame parsing, runtime sync, and publish-failure handling in [test_smoke.py](../../../../devices/pi-station/tests/test_smoke.py#L218-L286).

## Coverage Assessment

Coverage is substantial but incomplete.

Implemented and verified:

* ESP adapter parsing for health, presence, and acknowledgement frames
* Transport-agnostic guidance command emission
* Firmware protocol definitions and encoders for health, presence, and acknowledgements
* Pi-local LCD adapter for standby, guidance, result, and error rendering
* Publication seam with controlled failure handling and cloud sync state tracking
* Runtime composition wiring for LCD and publication adapters
* Phase 3 test and build validation coverage

Missing or partial against the phase requirements:

* Real sensor-backed ESP presence emission remains deferred
* Runtime session entry is not gated by ESP stable-presence telemetry

Observed coverage result:

* Step 3.1: Partial
* Step 3.2: Implemented
* Step 3.3: Implemented

No additional Phase 3 implementation files were identified beyond the files already called out in the changes log after direct inspection of the runtime composition root, the adapter modules, the firmware protocol files, and the Phase 3 smoke tests.

## Clarifying Questions

* Should DD-01 be accepted as an allowed Phase 3 carry-forward, or should Phase 3 be considered incomplete until the firmware emits real ultrasonic-driven presence frames?
* Is manual invocation of `start_session()` still the intended demo workflow, or should the runtime now transition out of `IDLE` only after observed stable ESP presence as described in the research flow?