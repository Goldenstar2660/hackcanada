<!-- markdownlint-disable-file -->
# Task Research: Station Runtime Implementation

Research the best approach for implementing the station runtime for the Binsight smart waste-sorting station.

## Task Implementation Requests

* Research the runtime architecture for the station lifecycle
* Cover presence detection, session flow, item identification, guidance, disposal detection, correctness logic, and event creation
* Evaluate implementation alternatives and recommend one approach aligned to the project spec

## Scope and Success Criteria

* Scope: Raspberry Pi station runtime behavior for the demo station, with interfaces to ESP8266, local rules, classification, live status, and event generation; excludes dashboard and firmware implementation details except where they constrain the runtime
* Assumptions:
  * The Binsight spec is the source of truth for externally visible behavior
  * Existing repository code may already define partial runtime models and contracts
  * The recommended design should fit the current monorepo structure and demo scope
* Success Criteria:
  * Recommend one concrete runtime architecture for the station process
  * Map each required behavior from the spec to a runtime responsibility or state transition
  * Identify integration points with existing code and contracts
  * Document alternatives, trade-offs, and implementation risks

## Outline

* Gather evidence from the spec, Pi station code, shared contracts, and firmware protocol
* Research best-fit runtime patterns for a demo-grade device station
* Evaluate alternatives and select a recommended approach
* Document implementation guidance with examples and references

## Potential Next Research

* Measure real sensor jitter and camera latency on hardware
  * Reasoning: Presence debounce windows, drop stability windows, and timeout values should be tuned from measured behavior rather than guessed
  * Reference: .copilot-tracking/research/subagents/2026-03-07/runtime-architecture-research.md
* Decide the production Pi-to-ESP Wi-Fi transport
  * Reasoning: The spec says Wi-Fi, but the current firmware seam is newline-delimited serial text and the Pi runtime scaffold is transport-agnostic
  * Reference: .copilot-tracking/research/subagents/2026-03-07/protocol-boundary-research.md
* Decide how canonical rules presets are stored on-device
  * Reasoning: The runtime should load schema-aligned rules data instead of hardcoded Python dictionaries
  * Reference: .copilot-tracking/research/subagents/2026-03-07/pi-codebase-runtime-research.md

## Research Executed

### File Analysis

* spec/binsight-spec.md
  * Verified the required station lifecycle, event payload, live monitoring requirements, and hardware split across the Pi and ESP8266, especially the session flow in `spec/binsight-spec.md:20-58` and technical notes in `spec/binsight-spec.md:134-145`
* devices/pi-station/src/binsight_station/main.py
  * Verified that `StationRuntime` is already the composition root for rules, classification, session state, ESP communication, and live-status shaping in `devices/pi-station/src/binsight_station/main.py:39-82`
* devices/pi-station/src/binsight_station/session.py
  * Verified that the Pi runtime already uses explicit session phases and already implements the core drop heuristic of "hand present, then disappears, so assign most recent zone" in `devices/pi-station/src/binsight_station/session.py:7-72`
* devices/pi-station/src/binsight_station/classification.py
  * Verified a local-first classification seam with configurable confidence threshold and fallback path in `devices/pi-station/src/binsight_station/classification.py:19-42`
* devices/pi-station/src/binsight_station/events.py
  * Verified existing correctness logic and event construction from a completed session snapshot in `devices/pi-station/src/binsight_station/events.py:22-48`
* devices/pi-station/src/binsight_station/live_status.py
  * Verified a live-status projection seam already exists, but it is smaller than the shared contract in `devices/pi-station/src/binsight_station/live_status.py:16-25`
* firmware/esp8266-controller/include/protocol.h
  * Verified the implemented command surface is currently limited to `health?` and `indicator:<zone>` plus plain-text telemetry in `firmware/esp8266-controller/include/protocol.h:16-37`
* firmware/esp8266-controller/src/main.cpp
  * Verified the current firmware boundary is a minimal serial-text scaffold with acknowledgements, heartbeat telemetry, and a single built-in LED path in `firmware/esp8266-controller/src/main.cpp:21-96`
* packages/contracts/schemas/domain/disposal-event.schema.json
  * Verified the canonical disposal-event shape required for cloud publication in `packages/contracts/schemas/domain/disposal-event.schema.json:8-69`
* packages/contracts/schemas/domain/live-station-status.schema.json
  * Verified the canonical live-station-status shape and session-state vocabulary in `packages/contracts/schemas/domain/live-station-status.schema.json:8-145`
* packages/contracts/schemas/domain/rules-preset.schema.json
  * Verified the canonical rules-preset shape the Pi runtime should eventually consume in `packages/contracts/schemas/domain/rules-preset.schema.json:8-105`

### Code Search Results

* `SessionStateMachine`
  * Confirms the repo already leans toward an explicit stateful runtime model centered in `devices/pi-station/src/binsight_station/session.py:15-72`
* `track_hand`
  * Confirms the current disposal detection heuristic is already encoded in `devices/pi-station/src/binsight_station/session.py:56-71`
* `create_disposal_event`
  * Confirms correctness is derived by comparing the expected disposal method with the disposal method mapped from the detected zone in `devices/pi-station/src/binsight_station/events.py:22-48`
* `send_guidance`
  * Confirms the Pi runtime currently computes guidance locally and hands off only a narrow LED-oriented command to the ESP client seam in `devices/pi-station/src/binsight_station/main.py:63-69` and `devices/pi-station/src/binsight_station/esp_client.py:12-20`

### External Research

* `Barr Group`: `state machines event driven systems`
  * Reinforced that reactive systems with context-sensitive behavior should make state explicit and pair event handling with timing services
    * Source: [Barr Group, State Machines for Event-Driven Systems](https://barrgroup.com/blog/state-machines-event-driven-systems)
* `Python docs`: `asyncio` and `coroutines and tasks`
  * Reinforced that async is most useful for I/O coordination at the edges, not as the primary domain model when the core problem is stateful behavior
    * Source: [Python docs, asyncio](https://docs.python.org/3/library/asyncio.html)
    * Source: [Python docs, Coroutines and Tasks](https://docs.python.org/3/library/asyncio-task.html)
* `Jack Ganssle`: `debouncing`
  * Reinforced that physical sensor signals should not be interpreted from a single instantaneous transition
    * Source: [Jack Ganssle, A Guide to Debouncing](https://www.ganssle.com/debouncing.htm)
* `Adafruit`: `python debouncer library`
  * Reinforced the same debounce principle for Python-based device runtimes and sensor events
    * Source: [Adafruit, Python Debouncer Library for Buttons and Sensors](https://learn.adafruit.com/debouncer-library-python-circuitpython-buttons-sensors)

### Project Conventions

* Standards referenced: Binsight product spec, current package boundaries under `devices/pi-station`, schema-first contracts under `packages/contracts`, narrow firmware responsibility under `firmware/esp8266-controller`
* Instructions followed: source-of-truth spec requirement, Task Researcher mode constraints, repository guidance to keep externally visible behavior aligned to `spec/binsight-spec.md`

## Key Discoveries

### Project Structure

The current repository already separates the station runtime into the right long-term seams. The Pi package owns orchestration, session state, classification, local rules, ESP communication, live-status shaping, and event creation, while the firmware package owns the local hardware controller boundary and the contracts package owns canonical payload schemas.

This matters because the best implementation path is not a redesign. It is to keep the current boundaries and replace scaffold internals with real adapters.

Supporting evidence:

* `devices/pi-station/README.md:8-17` assigns the Pi the live control loop, disposal guidance, disposal detection, and protocol translation responsibilities
* `devices/pi-station/src/binsight_station/main.py:39-82` already wires the runtime around those seams
* `firmware/esp8266-controller/README.md:8-16` keeps the firmware boundary intentionally narrow
* `packages/contracts/schemas/domain/*.schema.json` already define the cloud-facing contract shapes

### Implementation Patterns

The strongest existing pattern is an explicit session model on the Pi. `SessionStateMachine` already holds predicted item, correct disposal method, hand presence, latest hand zone, final disposal zone, confidence, and fallback usage. `track_hand()` already encodes the spec's core drop heuristic by recording the last seen zone when the hand disappears.

The other important pattern is local-first resolution. Classification occurs before guidance, rules map the item to a disposal method locally, and correctness is determined only after an actual zone is inferred. That is already the right ordering for the spec.

The main gaps are not architectural. They are adapter and contract gaps:

* the ESP client is still a placeholder
* the firmware protocol does not yet emit presence events
* the Pi live-status and event dataclasses do not yet match the shared contract shapes
* the rules preset is still hardcoded inside Python instead of loaded from schema-aligned data
* Firebase publication is not yet implemented

### Complete Examples

```text
Recommended runtime lifecycle

IDLE
  -> PRESENCE_ARMING
     Trigger: stable ultrasonic presence from ESP
  -> IDENTIFYING
     Trigger: presence confirmed
     Work: capture image, run local classifier, optionally run fallback, resolve disposal method
  -> GUIDING
     Work: send LED command to ESP, update LCD, publish live status
  -> WAITING_FOR_DISPOSAL
     Work: track debounced hand presence and latest stable zone on the Pi
  -> EMIT_RESULT
     Trigger: stable hand disappearance after prior stable presence
     Work: create canonical event, publish event and latest live status, update local counters
  -> RESETTING
     Work: clear session state, turn off guidance, short cooldown
  -> IDLE
```

### API and Schema Documentation

Relevant contract and protocol sources:

* Disposal event schema: `packages/contracts/schemas/domain/disposal-event.schema.json:8-69`
  * Canonical fields: `stationId`, `timestamp`, `predictedItem`, `correctDisposalMethod`, `actualDisposalZone`, `attemptResult`, `modelConfidence`, `llmFallbackUsed`
* Live station status schema: `packages/contracts/schemas/domain/live-station-status.schema.json:8-145`
  * Canonical session states: `idle`, `detecting-person`, `identifying-item`, `guiding-user`, `waiting-for-disposal`, `syncing`, `error`
* Rules preset schema: `packages/contracts/schemas/domain/rules-preset.schema.json:8-105`
  * Canonical configuration for supported items, item mappings, zone mapping, and low-confidence threshold
* Current ESP protocol surface: `firmware/esp8266-controller/include/protocol.h:16-37`
  * Implemented commands: `health?` and `indicator:<left|middle|right|off>`

### Configuration Examples

```text
Suggested runtime configuration categories

station_id=...
rules_preset_id=...
rules_preset_version=...
low_confidence_threshold=0.6

esp_transport=wifi-udp|wifi-tcp|serial-prototype
esp_endpoint=...
presence_confirm_ms=250
hand_present_stable_ms=150
hand_absent_stable_ms=200
disposal_wait_timeout_ms=8000
reset_cooldown_ms=500

firebase_project_id=...
event_publish_retry_limit=...
live_status_publish_interval_ms=...
```

## Technical Scenarios

### Recommended Station Runtime Architecture

Use an explicit finite state machine as the core of the Raspberry Pi station runtime. Keep hardware and cloud integrations behind adapters, and let typed events drive state transitions. This approach best fits the spec because the meaning of a sensor update depends on runtime context: the same signal should be interpreted differently when the station is idle, identifying an item, or waiting for disposal.

**Requirements:**

* Presence detection starts a session from low-power mode
* Item identification produces predicted item plus correct disposal method
* Guidance drives LED and LCD output while awaiting disposal
* Disposal detection resolves the actual zone from hand disappearance
* Correctness logic compares expected vs actual bin and emits an event
* Live status updates are available throughout the session

**Preferred Approach:**

* Keep `StationRuntime` as the composition root, but promote `SessionStateMachine` into the authoritative station FSM with explicit states for `IDLE`, `PRESENCE_ARMING`, `IDENTIFYING`, `GUIDING`, `WAITING_FOR_DISPOSAL`, `EMIT_RESULT`, and `RESETTING`
* Let the Pi remain the authoritative session controller and business-logic owner
* Keep the ESP boundary narrow: ultrasonic presence events, LED commands, acknowledgements, and health telemetry only
* Keep LCD control on the Pi because the LCD belongs to the Pi hardware unit in the spec
* Treat local inference plus optional LLM fallback as part of a single `IDENTIFYING` stage
* Use debounced hand presence and zone tracking during `WAITING_FOR_DISPOSAL`, then infer the actual zone from the most recent stable zone before disappearance
* Serialize and publish canonical cloud payloads using the shared contracts as the source of truth

```text
devices/pi-station/src/binsight_station/
  main.py                -> composition root and long-running loop
  session.py             -> finite state machine, transition rules, timers
  classification.py      -> local-first classifier plus fallback adapter
  rules.py               -> schema-backed rules preset loader and lookup helpers
  esp_client.py          -> transport adapter for presence, health, and LED commands
  lcd_client.py          -> Pi-local LCD adapter
  live_status.py         -> canonical live-station-status projection
  events.py              -> canonical disposal-event projection
  publishers.py          -> Firebase publication adapter
```

**Implementation Details:**

The best concrete flow is:

1. In `IDLE`, the Pi publishes idle live status, keeps the LCD in standby, and waits for a stable ESP-originated presence signal from the ultrasonic sensor.
2. In `PRESENCE_ARMING`, the runtime confirms presence over a short debounce window so noise does not start a false session.
3. In `IDENTIFYING`, the Pi captures an image, runs on-device classification first, checks the configured confidence threshold, and only then uses fallback classification if necessary.
4. The runtime immediately maps the resolved item to a disposal method using the active rules preset.
5. In `GUIDING`, the Pi updates the LCD directly and sends a narrow LED command to the ESP for the correct zone.
6. In `WAITING_FOR_DISPOSAL`, the Pi continuously tracks debounced hand presence and the latest stable hand zone. The drop event is inferred when stable hand absence follows stable hand presence.
7. In `EMIT_RESULT`, the runtime maps the detected zone to the actual disposal method, compares it with the expected disposal method, creates a canonical disposal event, publishes it, and includes the latest event in the next live-status update.
8. In `RESETTING`, the runtime clears session fields, turns off the indicator, enforces a short cooldown, and returns to `IDLE`.

Recommended implementation principles:

* Model business behavior in the FSM, not in transport callbacks or ad hoc loop flags
* Use timers as state data, not scattered sleeps
* Keep async optional and local to adapters; the business layer does not need to become async-first to be correct
* Normalize Python state names and payloads to the shared contract vocabulary before publication
* Load rules from schema-aligned data so the demo stays consistent with the rest of the monorepo

Key repo evidence supporting this direction:

* `devices/pi-station/src/binsight_station/session.py:56-71` already encodes the correct drop heuristic
* `devices/pi-station/src/binsight_station/classification.py:19-34` already encodes local-first classification with configurable fallback threshold
* `devices/pi-station/src/binsight_station/events.py:22-48` already encodes correctness from expected vs actual disposal mapping
* `packages/contracts/schemas/domain/live-station-status.schema.json:28-38` and `packages/contracts/schemas/domain/disposal-event.schema.json:8-17` already define the canonical payload vocabulary the runtime should target
* `firmware/esp8266-controller/include/protocol.h:16-37` shows the current narrow firmware command surface, which supports keeping the ESP boundary small

```text
Recommended event vocabulary

presence_started
presence_confirmed
presence_canceled
image_captured
classification_resolved
classification_failed
guidance_sent
guidance_failed
hand_zone_updated
hand_present_changed
drop_confirmed
disposal_timeout
event_published
event_publish_failed
reset_complete
```

#### Considered Alternatives
Procedural loop with flags and conditionals:

* Rejected because the spec is strongly phase-based and context-sensitive, so sensor and classification behavior would quickly become encoded as scattered flags and nested conditionals
* Evidence: the current repo already trends toward an explicit state object in `devices/pi-station/src/binsight_station/session.py:15-72`

Full asynchronous event pipeline as the primary runtime model:

* Rejected as the primary architecture because the core problem is not "many unrelated concurrent I/O tasks". It is the deterministic interpretation of a single session lifecycle.
* Async may still be useful at the edges for Wi-Fi transport, camera I/O, or cloud publication, but it should remain an adapter concern unless real integration pressure proves otherwise.
* Evidence: the current Python package is still small and synchronous, and the Pi README already frames hardware and cloud pieces as seams rather than as the domain model

## Selected Approach

Use an explicit finite state machine as the station runtime core, with the Pi as the authoritative session controller and the ESP as a narrow hardware coprocessor.

Why this is the best choice:

* It maps directly to the Binsight spec's stepwise lifecycle
* It preserves the current repository boundaries instead of forcing a rewrite
* It gives the runtime one clear place to implement fallback classification, guidance, disposal detection, correctness logic, and event publication
* It aligns with the existing `SessionStateMachine` direction and current test expectations
* It limits concurrency complexity by keeping async at the edges unless the real hardware integration proves otherwise

## Actionable Next Steps

* Extend `session.py` to the canonical FSM and align phase names with the live-status contract vocabulary
* Add Pi adapters for LCD output and Firebase publication
* Replace the placeholder ESP client with a real transport adapter while keeping the message boundary narrow
* Expand the firmware protocol to include ultrasonic presence events while keeping classification and LCD behavior on the Pi
* Replace hardcoded Python rules with schema-backed rules preset loading
* Add tests for presence debounce, timeout handling, fallback classification, and canonical payload serialization
