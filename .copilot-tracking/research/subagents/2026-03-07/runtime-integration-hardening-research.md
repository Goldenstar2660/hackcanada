---
title: Runtime Integration Hardening Research
description: Audit of the merged Binsight station runtime and firmware boundary for demo integration and reliability.
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - runtime
  - firmware
  - integration
  - reliability
estimated_reading_time: 12
---

## Research status

Complete.

## Research topics

* Verify what the Raspberry Pi runtime currently implements versus the spec
* Verify the current ESP8266 controller boundary and whether it is correctly integrated with the Pi runtime
* Identify missing wiring, placeholder adapters, missing dependencies, runtime setup gaps, and test coverage gaps
* Identify validation blockers for demonstrating a reliable station loop at a hackathon
* Recommend the exact runtime/firmware integration and hardening approach for this cycle
* Leave open questions only where the spec does not decide the answer

## Evidence log

### Source of truth

* Product lifecycle, hardware split, and demo scope come from `spec/binsight-spec.md`
* The spec still decides the important boundary: ESP8266 owns ultrasonic sensing and poster LEDs, Raspberry Pi owns camera, LCD, classification, disposal logic, and cloud publication

### Current repository evidence reviewed

* Pi runtime code:
  * `devices/pi-station/src/binsight_station/main.py`
  * `devices/pi-station/src/binsight_station/session.py`
  * `devices/pi-station/src/binsight_station/classification.py`
  * `devices/pi-station/src/binsight_station/rules.py`
  * `devices/pi-station/src/binsight_station/esp_client.py`
  * `devices/pi-station/src/binsight_station/lcd_client.py`
  * `devices/pi-station/src/binsight_station/live_status.py`
  * `devices/pi-station/src/binsight_station/events.py`
  * `devices/pi-station/src/binsight_station/publishers.py`
* Pi manifests, docs, and tests:
  * `devices/pi-station/pyproject.toml`
  * `devices/pi-station/README.md`
  * `devices/pi-station/tests/test_esp_http.py`
  * `devices/pi-station/tests/test_runtime_serialization.py`
  * `devices/pi-station/tests/test_runtime_session.py`
  * `devices/pi-station/tests/test_smoke.py`
* Firmware code and docs:
  * `firmware/esp8266-controller/README.md`
  * `firmware/esp8266-controller/platformio.ini`
  * `firmware/esp8266-controller/include/protocol.h`
  * `firmware/esp8266-controller/src/main.cpp`
  * `firmware/esp8266-controller/src/protocol.cpp`
* Shared contracts and rules artifacts:
  * `packages/contracts/schemas/domain/disposal-event.schema.json`
  * `packages/contracts/schemas/domain/live-station-status.schema.json`
  * `packages/contracts/schemas/domain/rules-preset.schema.json`
  * `packages/contracts/src/index.ts`
  * `packages/rules/presets/demo-canada-ottawa.1.0.0.json`
* Supporting boundary docs:
  * `devices/README.md`
  * `firmware/README.md`
  * `justfile`

### Validation evidence collected in this session

* `uv run pytest` in `devices/pi-station`: failed with 8 failures and 11 passes
* `uv run binsight-station` in `devices/pi-station`: failed at runtime startup
* PlatformIO firmware build in `firmware/esp8266-controller`: passed
* `get_errors` for `devices/pi-station/src/binsight_station` and `devices/pi-station/tests`: no static errors reported

### Prior dated research reused and corrected

* `station-runtime-implementation-research.md` still holds on the main architectural direction: the Pi should remain the authoritative session controller and the ESP boundary should stay narrow
* `runtime-architecture-research.md` still holds on the finite-state-machine recommendation and timer/debounce rationale
* `protocol-boundary-research.md` is partially stale: it described the older serial-text seam, but the merged firmware now exposes HTTP endpoints and the merged Pi client now implements HTTP transport
* `validation-setup-blockers-research.md` is still correct about the Pi runtime being the main validation blocker and PlatformIO working via the repository-local binary, but it is stale about a checked-in `devices/pi-station/.env.example`; no such file is present in the merged tree

## Findings

### Raspberry Pi runtime versus the spec

The merged Pi runtime now implements more of the spec than the earlier research snapshots, but it is not currently demo-ready because the merged live-status surface is internally inconsistent and blocks startup.

What the Pi runtime already implements:

* Runtime configuration loading with defaults for station id, rules preset id and version, ESP endpoint, Firebase project id, and timing windows
* Schema-backed rules preset loading from `packages/rules/presets`
* Explicit session phases for idle, presence arming, identifying, guiding, waiting for disposal, result emission, and resetting
* Presence debounce timing, disposal wait timeout, and reset cooldown timing
* Local-first classification with a fallback seam and confidence threshold input
* Correctness logic and disposal-event shaping from the session snapshot and active rules preset
* LCD screen formatting as a Pi-local adapter seam
* An HTTP/JSON ESP client with `GET /health`, `POST /signal`, and `POST /reset`

What is only partial or placeholder relative to the spec:

* Session start is wired to stable ESP presence, but there is no long-running process loop; `main()` just creates the runtime and starts one session attempt
* Classification is still placeholder logic; `_infer_local_item()` always returns `unknown-item` and `_infer_with_fallback()` always returns `fallback-item`
* Camera capture is not implemented; the runtime takes an `image_source` string only
* Disposal-time hand-zone tracking is not connected to any real Pi-side vision or sensor adapter; it only advances when `observe_hand()` is called
* LCD output is an in-memory formatter, not real LCD hardware control
* Cloud publication is a local seam only; the default publisher is a no-op sink

What is currently broken in the merged state:

* `StationRuntime._publish_runtime_status()` calls `LiveStatusPublisher.build_status(..., device_health=..., session_state_override=...)`, but the current `LiveStatusPublisher.build_status()` signature does not accept either keyword. This is the direct cause of both `uv run binsight-station` failing and 5 of the 8 failing pytest cases
* `devices/pi-station/src/binsight_station/live_status.py` contains duplicate definitions of `DeviceHealth` and `LatestEventSummary`, mixes `to_ingress_payload()` and `to_payload()` conventions incompletely, and does not match the expectations of `main.py`, `publishers.py`, or the tests
* `PublicationAdapter.publish_live_status()` calls `status.to_payload()`, but the current `LiveStatus` implementation only defines `to_ingress_payload()` in the active class body. That is a second latent runtime blocker after the current `build_status()` signature error
* `tests/test_smoke.py` references `MemoryEspTransport` and `GuidanceCommand` without importing them, which causes 3 of the 8 failing pytest cases

Spec coverage assessment:

* Detection start from ultrasonic presence: partially implemented through ESP health polling and stable presence gating
* Item identification with confidence threshold and fallback seam: partially implemented, but still placeholder inference
* LED guidance and LCD display: structurally implemented, but only the LED path reaches hardware boundary and the LCD path is still local-only
* Disposal detection from continuous hand tracking: not implemented end to end; the state machine supports it, but no real Pi-side tracker feeds it
* Event creation with required fields: implemented in the Pi domain model
* Reliable station counter on LCD: partially implemented in local state and LCD formatting only
* Live monitoring and Firebase publication: not implemented as a real integrated path

### ESP8266 controller boundary and Pi integration status

The merged Pi and firmware transport boundaries are now aligned at the HTTP level, but they are not yet aligned enough semantically to demonstrate the full station loop reliably.

What is correctly integrated today:

* The firmware runs as a Wi-Fi HTTP server on port 80
* The Pi HTTP transport speaks exactly the same endpoint set the firmware exposes: `GET /health`, `POST /signal`, and `POST /reset`
* The firmware health response includes both controller health data and presence telemetry, and the Pi client correctly maps that JSON into internal `health ...` and `presence ...` frames
* The Pi runtime uses that mapped presence telemetry to gate session start only after stable presence is observed
* The firmware build passes today under PlatformIO, and the Pi-side HTTP transport tests pass today

What is not correctly integrated for the hackathon station loop:

* The firmware only drives `LED_BUILTIN` on or off. It stores `left`, `middle`, or `right` logically as `activeZone`, but there is no three-zone indicator wiring in the shipped code
* The firmware does not provide disposal-time hand-zone sensing. In `healthPayloadJson()`, `handZone` is derived from `activeZone` when a hand is present, which means the reported zone is just the currently lit guidance zone rather than an observed disposal zone
* The spec requires continuous hand-zone tracking and drop detection from hand disappearance before event creation. That actual-bin logic is still owned by the Pi session state machine, but there is no real Pi-side tracker feeding it
* The runtime currently polls for ESP health and presence, but there is no retry or backoff logic above the transport seam beyond surfacing degraded or offline health state
* The runtime cannot currently complete even the presence-to-live-status startup path because of the live-status signature mismatch

Boundary conclusion:

* The merged transport choice should now be treated as HTTP over Wi-Fi, not the older serial prototype
* The correct boundary for this cycle is still narrow: ESP owns ultrasonic approach detection and indicator actuation only; Pi owns session logic, classification, hand-zone/drop logic, LCD, event creation, and publication
* The current merged code is only partially integrated with that target boundary because startup, live status, and disposal sensing are still incomplete

### Missing wiring, placeholder adapters, missing dependencies, runtime setup gaps, and test coverage gaps

Missing wiring and placeholder adapters:

* No real camera capture adapter
* No real on-device model integration
* No Pi-side hand tracker that produces `zone` plus `hand_present` updates continuously
* No real LCD hardware adapter
* No real cloud publisher or Firebase ingress client
* No integrated runtime loop that continuously polls the ESP and advances the station session over time

Missing or mislocated runtime seams:

* Device-auth header generation exists as `BackendIngressIdentity` inside `esp_client.py`, but publication itself lives in `publishers.py`; the cloud boundary is still split awkwardly across unrelated modules
* The Pi README documents a `.env.example`, but no `.env.example` file exists in `devices/pi-station`

Dependency gaps:

* `devices/pi-station/pyproject.toml` only depends on `python-dotenv` plus `pytest` in the dev group
* There are no declared dependencies yet for real camera I/O, hardware LCD control, Firebase or HTTP auth publication, model inference, or image processing

Runtime setup gaps:

* The runtime has defaults, but the documented environment setup is incomplete because there is no checked-in example environment file
* The Pi README describes Firebase publishing and HTTP ESP integration as follow-on work, which matches the current implementation state rather than a ready-to-run station stack
* The runtime defaults to `http://192.168.4.1` for the ESP, but there is no documented station bring-up sequence for joining the Pi and ESP to the same network and validating connectivity on real hardware

Test coverage gaps:

* There is no test that runs the packaged runtime entry point successfully
* There is no end-to-end test that exercises the HTTP ESP transport together with `StationRuntime`
* There is no test that validates three-zone indicator behavior at the firmware level
* There is no test for Wi-Fi reconnect behavior, health degradation recovery, or network timeout handling
* There is no test for real camera capture, classification latency, or hand-zone tracking
* There is no firmware-native test coverage under `firmware/esp8266-controller/test/`

### Validation blockers for demonstrating a reliable station loop at a hackathon

Immediate blockers:

* The Pi runtime does not start. `uv run binsight-station` fails at runtime startup with `TypeError: LiveStatusPublisher.build_status() got an unexpected keyword argument 'device_health'`
* The Pi runtime test suite is red. `uv run pytest` currently fails with 8 failures
* The live-status/publication path is inconsistent enough that fixing the first signature mismatch alone will likely expose the next runtime error on `status.to_payload()`

Functional demo blockers after startup is repaired:

* There is still no real hand-zone tracking path, so the spec's actual-bin detection loop is not demonstrable from merged code alone
* The firmware does not yet control three physical zone indicators separately, so visible guidance is not wired to the demo's left, middle, and right disposal zones
* Classification is still placeholder logic, so any demo beyond a scripted or stubbed path lacks real item identification
* Cloud publication is only a seam, so live dashboard synchronization is not currently verifiable from the merged station package

What is not a blocker right now:

* Firmware compilation itself is healthy
* The HTTP transport seam between the Pi and ESP is now coherent at the request and response shape level
* The rules preset artifact is present and includes `unknown-item` and `fallback-item`, so the placeholder classifier no longer fails immediately on rule lookup in the current preset

### Recommended exact runtime and firmware hardening approach for this cycle

The correct hardening plan for this cycle is to freeze the boundary narrowly and make the Pi runtime reliable before adding more scope.

Recommended boundary to freeze:

* ESP8266 owns only these responsibilities:
  * Ultrasonic approach detection
  * Indicator actuation
  * Health and presence reporting over HTTP
  * Simple reset and acknowledgement behavior
* Raspberry Pi owns only these responsibilities:
  * Station session state machine
  * Camera capture and item classification
  * Rules lookup and disposal decision
  * LCD output
  * Disposal-time hand-zone tracking and drop detection
  * Event creation and live-status publication

Recommended hardening sequence:

1. Restore one coherent live-status contract inside the Pi runtime.
   * Remove the duplicate dataclass definitions in `live_status.py`
   * Make `LiveStatusPublisher.build_status()` match how `main.py` actually calls it
   * Decide one publication shape and implement it consistently across `main.py`, `live_status.py`, `publishers.py`, and the tests
   * The safest cycle choice is to keep both serializers explicitly if needed: a device-ingress serializer and a canonical serializer, rather than mixing half of each

2. Make the Pi runtime green before touching more firmware scope.
   * `uv run pytest` and `uv run binsight-station` should both pass before more feature work lands
   * Fix the broken smoke-test imports so the existing tests become useful again

3. Keep the firmware narrow and do not move disposal logic into the ESP.
   * Keep `/health`, `/signal`, and `/reset` as the controller boundary for this cycle
   * Keep ultrasonic sensing on the ESP because the spec assigns it there
   * Do not invent ESP-side disposal-zone reporting; the current controller has no real zone sensor, and faking it from `activeZone` is misleading

4. Add a Pi-side `HandTracker` adapter and treat it as mandatory for the reliable demo loop.
   * Feed `observe_hand(zone, hand_present)` continuously from a real adapter
   * For this cycle, a single-camera region tracker or another Pi-local deterministic adapter is the correct place to implement the demo-grade left, middle, and right zone logic
   * This preserves the spec's one-camera demo scope and the Pi's ownership of disposal detection

5. Finish the visible hardware path on the firmware side, but keep it dumb.
   * Replace the single built-in LED behavior with actual left, middle, and right indicator outputs
   * Keep the HTTP payload surface unchanged so the Pi side does not churn again

6. Keep cloud sync best-effort and non-blocking.
   * Publish failures should only degrade health and observability, not abort the station session
   * Preserve local counters and session completion even when publication fails
   * Use queued or retrying publication only after the local station loop is stable

7. Expand validation only around the frozen boundary.
   * Add runtime tests for startup, live-status serialization, degraded ESP recovery, timeout and reset flow, and end-to-end HTTP transport with `StationRuntime`
   * Add at least one firmware test or hardware-in-the-loop check that verifies zone-specific indicator outputs and health JSON structure

Cycle recommendation in one sentence:

* Treat this as a runtime stabilization cycle, not a feature-expansion cycle: fix the Pi live-status breakage, keep the ESP narrow, and add the missing Pi-side hand-tracking adapter plus real three-zone LED wiring

## Recommended approach

The exact approach recommended for this cycle is:

* Freeze the Pi to ESP contract at HTTP `GET /health`, `POST /signal`, and `POST /reset`
* Keep the ESP responsible only for ultrasonic approach detection and zone indicator actuation
* Keep the Pi responsible for everything the spec treats as station intelligence: classification, rules, LCD, disposal tracking, correctness logic, and publication
* Repair the merged live-status and publication surfaces before any more integration work
* Add a Pi-local hand-tracking adapter and real three-zone LED wiring as the minimum hardware hardening needed for a reliable demo loop
* Treat cloud sync as best-effort until the local loop is reliable and testable end to end

## Remaining research

* Measure real ultrasonic jitter and Wi-Fi reconnect behavior on the physical hardware after the runtime starts cleanly
* Validate whichever Pi-side hand-tracking adapter is chosen against the physical left, middle, and right demo zones
* Validate cloud publication, auth headers, and live dashboard updates only after the local station loop is stable

## Open questions

None required for this cycle.

The spec is already decisive on the important ownership boundary. The remaining work is implementation hardening, not product-definition clarification.
