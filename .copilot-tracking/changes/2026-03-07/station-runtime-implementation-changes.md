<!-- markdownlint-disable-file -->
# Release Changes: Station Runtime Implementation

**Related Plan**: station-runtime-implementation-plan.instructions.md
**Implementation Date**: 2026-03-07

## Summary

Phases 1 through 5 implemented the canonical station session FSM, normalized runtime projections to the shared contract vocabulary, replaced hardcoded rules with schema-backed preset loading, added narrow ESP, LCD, and publication adapters around the Pi runtime, closed the Phase 4 testing and validation gap, and reworked the presence path so session entry now depends on stable ESP telemetry backed by firmware sensor sampling.

## Changes

### Added

* packages/rules/presets/demo-canada-ottawa.1.0.0.json - Added a checked-in schema-backed rules preset for the station runtime.
* devices/pi-station/src/binsight_station/lcd_client.py - Added a Pi-local LCD adapter for standby, guidance, result, and sync-error rendering.
* devices/pi-station/src/binsight_station/publishers.py - Added a thin publication seam for canonical live-status and disposal-event payloads.
* devices/pi-station/tests/test_runtime_session.py - Added focused session and runtime lifecycle coverage for debounce, timeout, fallback classification, and station-counter persistence.
* devices/pi-station/tests/test_runtime_serialization.py - Added canonical disposal-event and live-status payload serialization coverage.

### Modified

* devices/pi-station/src/binsight_station/session.py - Expanded the session lifecycle to explicit presence arming, identifying, guiding, waiting, result emission, and resetting states with centralized timing and cumulative counters.
* devices/pi-station/src/binsight_station/main.py - Reworked the runtime composition root so session entry is gated by observed stable ESP presence frames instead of a synthetic debounce advance.
* devices/pi-station/src/binsight_station/classification.py - Added explicit classification source metadata alongside confidence and fallback usage.
* devices/pi-station/src/binsight_station/esp_client.py - Replaced the placeholder ESP seam with a transport-agnostic protocol adapter for guidance commands, presence telemetry, health telemetry, acknowledgements, and fresh presence-frame tracking for the runtime gate.
* devices/pi-station/src/binsight_station/events.py - Project disposal attempts to the canonical contract payload with attempt-result serialization.
* devices/pi-station/src/binsight_station/live_status.py - Map internal runtime phases to live-status contract vocabulary and include device-health and latest-event summaries.
* devices/pi-station/src/binsight_station/rules.py - Load and validate checked-in preset documents against the shared rules schema.
* devices/pi-station/tests/test_smoke.py - Added Phase 3 adapter coverage plus Phase 5 session-entry coverage for stable ESP presence, presence-drop cancellation, and publication-failure handling.
* firmware/esp8266-controller/include/protocol.h - Added presence telemetry and acknowledgement protocol definitions alongside the existing indicator and health surface.
* firmware/esp8266-controller/src/main.cpp - Replaced placeholder presence frames with ultrasonic-backed telemetry while preserving the existing protocol vocabulary and acknowledgement flow.
* firmware/esp8266-controller/src/protocol.cpp - Added presence and acknowledgement frame encoding helpers.

### Removed

None.

## Additional or Deviating Changes

* Updated the Pi tests to assert shared live-status contract vocabulary instead of the internal runtime enum string.
	* Reason: Phase 2 intentionally normalized live-status output to the contract session-state names.
* Kept the ESP transport adapter line-oriented and transport-agnostic instead of binding to a concrete Wi-Fi stack.
  * Reason: DR-02 is still open, and Phase 3 only required a narrow protocol boundary that can survive the later transport decision.
* Firmware presence telemetry now uses conservative ultrasonic sampling and a short stability window on the ESP8266.
	* Reason: Phase 5 closed the placeholder-telemetry gap without widening the protocol surface, while leaving full hardware timing calibration as follow-on work.

## Release Summary

This implementation affected 16 tracked product files across Phases 1 through 5: 5 added, 11 modified, and 0 removed.

The Raspberry Pi station runtime now follows an explicit finite state machine across presence arming, identification, guidance, disposal waiting, result emission, and reset. Session entry no longer skips directly into identification. It now depends on observed stable ESP presence frames that satisfy the debounce window in the runtime. Shared payload projections now serialize to the canonical disposal-event and live-station-status vocabularies, and rules come from a checked-in schema-backed preset rather than Python literals. Adapter boundaries were added for ESP protocol handling, Pi-local LCD rendering, and publication so device and infrastructure concerns stay outside the FSM. Firmware protocol support now emits sensor-backed presence telemetry and indicator acknowledgements while preserving a narrow, line-oriented frame vocabulary.

No dependency manifest changes or deployment steps were required. Remaining work is operational rather than structural: hardware timing calibration, final Pi-to-ESP transport selection, and durable offline publish buffering remain follow-on items already recorded in the planning log.

Validation run:

```text
cd /home/handwash/Projects/hackcanada && corepack pnpm lint
Result: passed
Scope: 6 of 7 workspace projects
packages/tooling: validated 6 canonical JSON Schema documents

cd /home/handwash/Projects/hackcanada && corepack pnpm build
Result: passed
Scope: 6 of 7 workspace projects
packages/tooling: validated 6 canonical JSON Schema documents

cd /home/handwash/Projects/hackcanada/devices/pi-station && uv run pytest
Result: passed
platform linux -- Python 3.13.5, pytest-8.4.2, pluggy-1.6.0
collected 21 items
tests/test_runtime_serialization.py ...
tests/test_runtime_session.py .....
tests/test_smoke.py .............
21 passed in 0.09s

cd /home/handwash/Projects/hackcanada/firmware/esp8266-controller && /home/handwash/Projects/hackcanada/.venv/bin/pio run
Result: passed
Environment: nodemcuv2 / espressif8266
RAM: 34.7% (28392 / 81920 bytes)
Flash: 25.8% (269543 / 1044464 bytes)
Build time: 2.88 seconds
```
