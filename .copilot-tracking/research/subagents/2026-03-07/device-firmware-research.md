---
title: Device Firmware Research
description: Research comparison of the Raspberry Pi station runtime and ESP8266 firmware against the Binsight product spec.
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
	- binsight
	- raspberry pi
	- esp8266
	- firmware
	- runtime
estimated_reading_time: 8
---

## Status

* Complete

## Research Topics

* Compare the Raspberry Pi station runtime implementation against the authoritative spec in `/spec/binsight-spec.md`.
* Compare the ESP8266 firmware implementation against the authoritative spec in `/spec/binsight-spec.md`.
* Focus on session flow, disposal detection, live status, Wi-Fi communication, LED and LCD responsibility split, and fallback classification behavior.
* Review directly relevant shared interfaces and tests for evidence.

## Executive Summary

The current device stack implements the broad station state machine shape from the spec: presence gating, item-to-method mapping through a rules preset, LED guidance, LCD updates, disposal result emission, live-status snapshots, and Wi-Fi communication between Pi and ESP. The shared contracts also encode the spec-required disposal event and live-status payloads.

The main gaps are in the hardware-critical parts of the flow. Camera capture and real classification are still placeholders, the fallback path is only a stub, and disposal detection is not implemented end to end as specified. The firmware only senses proximity with one ultrasonic sensor, and its reported `handZone` mirrors the active LED guidance zone rather than an independently detected disposal zone. On the Pi side, disposal completion is currently synthesized by calling `observe_disposal(zone)` with a caller-supplied zone instead of consuming continuous hand-zone telemetry from hardware.

There are also a few behaviors that are outside the spec or conflict with the shared contracts: the firmware accepts an undocumented numeric `step` signal payload, emits extra `transport` and `failurePolicy` fields in `/health`, hardcodes a personal Wi-Fi SSID fallback, and the Pi `cameraFeed` payload shape uses snake_case keys that do not match the camelCase schema.

## Spec-Aligned Behavior

### Session flow

* The spec requires detection start, identification, user guidance, disposal waiting, correctness evaluation, and event creation. Those stages are represented in the Pi session state machine as `IDLE`, `PRESENCE_ARMING`, `IDENTIFYING`, `GUIDING`, `WAITING_FOR_DISPOSAL`, `EMIT_RESULT`, and `RESETTING`. Evidence: `/spec/binsight-spec.md:20-58`, `devices/pi-station/src/binsight_station/session.py:7-14`, `devices/pi-station/src/binsight_station/main.py:98-137`, `devices/pi-station/src/binsight_station/main.py:192-224`.
* Presence debounce is implemented before identification starts. The runtime requires stable ESP presence plus elapsed debounce time before calling the classifier. Evidence: `/spec/binsight-spec.md:20-23`, `devices/pi-station/src/binsight_station/session.py:56-84`, `devices/pi-station/src/binsight_station/main.py:101-121`, `devices/pi-station/tests/test_runtime_session.py:183-209`.
* Session reset preserves cumulative counters after a completed attempt. Evidence: `devices/pi-station/src/binsight_station/session.py:177-208`, `devices/pi-station/src/binsight_station/main.py:214-224`, `devices/pi-station/tests/test_runtime_session.py:75-111`.

### Rules and correctness logic

* The spec requires configurable supported items, item-to-method mapping, zone mapping, and a low-confidence threshold. The Pi loads those values from the active preset and exposes lookup helpers for both item-to-method and zone-to-method resolution. Evidence: `/spec/binsight-spec.md:122-128`, `devices/pi-station/src/binsight_station/rules.py:22-24`, `devices/pi-station/src/binsight_station/rules.py:26-39`, `devices/pi-station/src/binsight_station/rules.py:45-61`, `packages/rules/presets/demo-canada-ottawa.1.0.0.json:8-37`.
* Correctness is evaluated by mapping the actual disposal zone back to a disposal method and comparing it with the classified disposal method. Evidence: `/spec/binsight-spec.md:43-58`, `devices/pi-station/src/binsight_station/events.py:56-89`, `packages/contracts/schemas/domain/disposal-event.schema.json:48-68`.

### Live status and event payloads

* The Pi constructs live-status payloads with station ID, timestamp, session state, current detected item, current disposal method, current hand zone, device health, and latest event summary. That aligns with the spec's live monitoring page requirements. Evidence: `/spec/binsight-spec.md:107-112`, `devices/pi-station/src/binsight_station/live_status.py:73-119`, `devices/pi-station/src/binsight_station/live_status.py:122-147`, `packages/contracts/schemas/domain/live-station-status.schema.json:98-182`.
* Disposal events include the spec-required fields: station ID, timestamp, predicted item, correct disposal method, actual disposal zone, attempt result, model confidence, and whether fallback was used. Evidence: `/spec/binsight-spec.md:49-58`, `devices/pi-station/src/binsight_station/events.py:14-53`, `devices/pi-station/src/binsight_station/events.py:56-89`, `packages/contracts/schemas/domain/disposal-event.schema.json:8-69`.

### Wi-Fi communication and device split

* The spec says the ESP8266 and Pi communicate over Wi-Fi. The Pi uses an HTTP transport with `GET /health`, `POST /signal`, and `POST /reset`, and the firmware hosts those endpoints over `ESP8266WebServer` while reconnecting Wi-Fi as needed. Evidence: `/spec/binsight-spec.md:142-149`, `devices/pi-station/src/binsight_station/esp_client.py:59-147`, `devices/pi-station/src/binsight_station/esp_client.py:202-231`, `firmware/esp8266-controller/src/main.cpp:240-295`, `firmware/esp8266-controller/src/main.cpp:310-332`, `devices/pi-station/tests/test_esp_http.py:45-87`.
* The hardware responsibility split is mostly aligned. The ESP owns the indicator zone and ultrasonic presence sensing, while the Pi owns LCD rendering, session orchestration, event creation, and live-status publishing. Evidence: `/spec/binsight-spec.md:142-153`, `firmware/esp8266-controller/src/main.cpp:41-127`, `devices/pi-station/src/binsight_station/main.py:49-81`, `devices/pi-station/src/binsight_station/lcd_client.py:13-68`.

## Missing or Partial Against the Spec

### Camera capture and real classification

* The spec requires the camera to capture the item in hand before classification. The reviewed runtime passes a placeholder image source by default, and the classifier ignores the image input entirely. Evidence: `/spec/binsight-spec.md:25-30`, `devices/pi-station/src/binsight_station/main.py:167-171`, `devices/pi-station/src/binsight_station/main.py:226-233`, `devices/pi-station/src/binsight_station/classification.py:29-52`.
* Local inference is not implemented beyond a stub. `_infer_local_item` always returns `unknown-item`. Evidence: `/spec/binsight-spec.md:27-30`, `devices/pi-station/src/binsight_station/classification.py:30-48`, `packages/rules/presets/demo-canada-ottawa.1.0.0.json:23-30`.

### Fallback classification behavior

* The threshold check itself exists and is wired to the rules preset, which matches the spec at a control-flow level. Evidence: `/spec/binsight-spec.md:29`, `devices/pi-station/src/binsight_station/main.py:116-127`, `devices/pi-station/src/binsight_station/classification.py:29-44`, `devices/pi-station/src/binsight_station/rules.py:59-61`, `packages/rules/presets/demo-canada-ottawa.1.0.0.json:37`.
* The actual fallback implementation is still a placeholder. The code does not send the image anywhere, `_infer_with_fallback` ignores the image source, and it always returns `fallback-item` with hardcoded confidence `0.75`. Evidence: `/spec/binsight-spec.md:29`, `devices/pi-station/src/binsight_station/classification.py:34-52`.
* Tests currently validate only the data-path effects of a fallback result, not a real LLM call. Evidence: `devices/pi-station/tests/test_runtime_session.py:145-180`.

### Disposal detection end to end

* The spec requires continuous hand-zone tracking, continuous hand-presence checks, and drop detection when a present hand disappears. The session state machine does implement that logic correctly in isolation. Evidence: `/spec/binsight-spec.md:37-47`, `devices/pi-station/src/binsight_station/session.py:138-175`, `devices/pi-station/tests/test_smoke.py:123-139`.
* The end-to-end runtime path is still partial. `observe_disposal(zone)` simulates a disposal by immediately sending a hand-present frame and then a hand-absent frame using the caller-provided zone, rather than consuming live zone telemetry from the ESP or another sensor loop. Evidence: `devices/pi-station/src/binsight_station/main.py:226-238`.
* The firmware does not implement left, middle, and right disposal-zone sensing. It only samples one ultrasonic sensor for presence. Evidence: `/spec/binsight-spec.md:37-41`, `firmware/esp8266-controller/src/main.cpp:9-16`, `firmware/esp8266-controller/src/main.cpp:41-91`.

### Firebase publishing and live camera transport

* The spec says the Pi sends event and live-status data to Firebase. The runtime has a publishing seam, but the default `PublicationAdapter` uses no-op sinks and only records payloads in memory. Evidence: `/spec/binsight-spec.md:150-153`, `devices/pi-station/src/binsight_station/main.py:73-75`, `devices/pi-station/src/binsight_station/publishers.py:13-27`, `devices/pi-station/src/binsight_station/publishers.py:33-60`.
* The spec notes a developer-only camera preview, but no reviewed runtime code integrates a real camera feed or preview publisher. Live status can carry `cameraFeed`, but the current runtime never supplies it. Evidence: `/spec/binsight-spec.md:153`, `devices/pi-station/src/binsight_station/live_status.py:52-69`, `devices/pi-station/src/binsight_station/live_status.py:125-146`.

### LCD counter behavior

* The spec says the LCD default should show the correct bin to use if a session is ongoing and total correct sorts. The Pi LCD implementation shows the item and disposal method during guidance, but it does not show the total-correct count in that state. In standby and result states it shows `OK correct/attempts`, which includes total attempts rather than only total correct sorts. Evidence: `/spec/binsight-spec.md:60-65`, `devices/pi-station/src/binsight_station/lcd_client.py:20-46`, `devices/pi-station/tests/test_runtime_session.py:103-111`.

### Low-power mode

* The spec says the station waits in low-power mode before detection starts. No low-power behavior appears in the reviewed Pi or ESP code. The ESP boots Wi-Fi and an HTTP server immediately and loops continuously, while the Pi runtime exposes an `IDLE` software phase but no hardware power-management behavior. Evidence: `/spec/binsight-spec.md:20-23`, `devices/pi-station/src/binsight_station/session.py:7-14`, `firmware/esp8266-controller/src/main.cpp:310-332`.

## Outside the Spec or In Conflict

### Disposal-zone telemetry conflicts with the intended meaning

* The firmware's `/health` payload sets `presence.handZone` to the current `activeZone` when a hand is present. That means the reported hand zone is derived from the LED guidance zone, not from independently measured disposal location. If the Pi were to trust this value for actual-disposal detection, it would bias the result toward the instructed bin rather than the user's actual drop zone. Evidence: `/spec/binsight-spec.md:37-47`, `firmware/esp8266-controller/src/main.cpp:104-127`.

### Shared-contract mismatch in `cameraFeed`

* The live-status schema requires camelCase camera-feed keys: `storageObjectPath`, `contentType`, and `lastUpdatedAt`. The Pi `CameraFeed.to_ingress_payload()` emits snake_case keys, and `LiveStatus.to_payload()` reuses that same snake_case payload for dashboard-facing output. This conflicts with the shared schema if `cameraFeed` is ever populated. Evidence: `devices/pi-station/src/binsight_station/live_status.py:52-69`, `devices/pi-station/src/binsight_station/live_status.py:97-100`, `packages/contracts/schemas/domain/live-station-status.schema.json:75-95`, `packages/contracts/schemas/domain/live-station-status.schema.json:172-181`.

### Firmware-only protocol and environment-specific behavior

* The firmware accepts an undocumented numeric `step` field in `/signal` requests in addition to the string-based `indicatorZone` and `zone` forms. The Pi never uses `step`, and the shared protocol surfaces focus on named zones. Evidence: `firmware/esp8266-controller/src/main.cpp:196-224`, `devices/pi-station/src/binsight_station/esp_client.py:87-99`.
* The firmware adds extra `/health` fields named `transport` and `failurePolicy` that are not required by the spec and are ignored by the Pi client. Evidence: `firmware/esp8266-controller/src/main.cpp:109-125`, `devices/pi-station/src/binsight_station/esp_client.py:371-391`.
* The firmware hardcodes a fallback Wi-Fi SSID of `Golden's iPhone`, which is environment-specific and outside the product spec. Evidence: `firmware/esp8266-controller/src/main.cpp:18-28`.

## Focus Area Notes

### Session flow

* Implemented at the Pi state-machine level with debounce, identification, guidance, wait, emit-result, and reset.
* Not yet wired to a real camera capture loop or real disposal-zone sensor loop.

### Disposal detection

* Correct in the pure state machine.
* Partial in the runtime.
* Not implemented in hardware beyond general presence sensing.

### Live status

* Implemented with a good contract-aligned shape for session state, device health, current item, current disposal method, current hand zone, and latest event.
* Camera feed transport is only a stub and currently has a schema mismatch if used.

### Wi-Fi communication

* Implemented via HTTP over Wi-Fi between Pi and ESP.
* Health and indicator commands are tested.
* ESP reconnect behavior exists.

### LED and LCD responsibility split

* ESP controls the poster indicator LED and reports health and presence.
* Pi controls the LCD and higher-level session UX.
* This split matches the spec in broad ownership terms.

### Fallback classification behavior

* Threshold plumbing exists and is driven by the active rules preset.
* The actual fallback classifier is still a placeholder and does not satisfy the spec's intended behavior.

## Evidence Highlights

* Session phases and transitions: `devices/pi-station/src/binsight_station/session.py:7-208`
* Runtime orchestration and publication: `devices/pi-station/src/binsight_station/main.py:49-238`
* Classification stub and fallback stub: `devices/pi-station/src/binsight_station/classification.py:26-52`
* Event creation and correctness logic: `devices/pi-station/src/binsight_station/events.py:14-89`
* Live-status construction: `devices/pi-station/src/binsight_station/live_status.py:73-185`
* LCD behavior: `devices/pi-station/src/binsight_station/lcd_client.py:13-68`
* ESP HTTP transport and protocol mapping: `devices/pi-station/src/binsight_station/esp_client.py:59-147`, `devices/pi-station/src/binsight_station/esp_client.py:183-317`
* Firmware presence sensing and HTTP server: `firmware/esp8266-controller/src/main.cpp:9-127`, `firmware/esp8266-controller/src/main.cpp:240-332`
* Firmware protocol enums and frame encoding: `firmware/esp8266-controller/include/protocol.h:9-47`, `firmware/esp8266-controller/src/protocol.cpp:11-109`
* Shared contracts: `packages/contracts/schemas/domain/disposal-event.schema.json:8-69`, `packages/contracts/schemas/domain/live-station-status.schema.json:8-182`
* Active demo preset: `packages/rules/presets/demo-canada-ottawa.1.0.0.json:8-37`
* Tests covering presence gating, fallback metadata, disposal drop detection, and HTTP transport: `devices/pi-station/tests/test_runtime_session.py:75-209`, `devices/pi-station/tests/test_smoke.py:123-139`, `devices/pi-station/tests/test_esp_http.py:45-87`

## Next Research

* Verify whether any unreviewed process outside `devices/pi-station/src/binsight_station` is intended to feed real `observe_hand()` updates from camera or vision code.
* Confirm whether Firebase publishing is planned to remain behind the current seam or whether another module already provides production sinks.
* Validate whether the LCD counter requirement should remain exactly `total correct sorts` or whether the current `correct/attempts` display is an intentional product deviation.

## Open Questions

* None that block this research summary.