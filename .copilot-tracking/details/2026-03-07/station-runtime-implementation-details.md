<!-- markdownlint-disable-file -->
# Implementation Details: Station Runtime Implementation

## Context Reference

Sources: .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md, spec/binsight-spec.md, package.json, devices/pi-station/pyproject.toml, and firmware/esp8266-controller/platformio.ini.

## Implementation Phase 1: Canonical Session FSM

<!-- parallelizable: false -->

### Step 1.1: Expand the session state machine

Convert the current session model into the authoritative finite state machine for the station lifecycle. Add explicit states for presence arming, identifying, guiding, waiting for disposal, emitting results, and resetting. Keep debounce windows, disposal timeout, and cooldown values in stateful runtime configuration rather than scattered sleeps. Add cumulative attempt and correct-sort counters to the station snapshot so result emission can update user-visible station totals.

Files:
* devices/pi-station/src/binsight_station/session.py - Define the canonical states, transition guards, timing data, and session snapshot fields.
* devices/pi-station/src/binsight_station/main.py - Drive the long-running runtime loop through typed state transitions instead of ad hoc phase updates.

Discrepancy references:
* Addresses DR-01 by centralizing debounce and timeout values in runtime configuration until hardware measurements are available.

Success criteria:
* Session state exposes explicit transitions for idle, presence confirmation, identification, guidance, disposal waiting, result emission, and reset.
* Runtime can represent the researched lifecycle without relying on hidden loop flags.
* Result emission can update cumulative attempt and correct-sort counters without leaking display logic into the state model.

Context references:
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 193-248) - Recommended FSM shape, per-state behavior, and implementation principles.
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 302-309) - Actionable next steps for extending the runtime core.

Dependencies:
* Existing StationRuntime composition root in devices/pi-station/src/binsight_station/main.py.
* Existing SessionStateMachine scaffold in devices/pi-station/src/binsight_station/session.py.

### Step 1.2: Integrate classification and guidance orchestration

Update the runtime orchestration so identification resolves a predicted item, confidence, fallback usage, and correct disposal method before the station enters the guidance state. The runtime should treat LED and LCD guidance as outputs of the state machine rather than independent side effects.

Files:
* devices/pi-station/src/binsight_station/main.py - Sequence classification, rules lookup, status updates, and guidance calls through the canonical states.
* devices/pi-station/src/binsight_station/classification.py - Preserve local-first classification while making fallback and confidence output explicit for downstream event creation.

Success criteria:
* Identification resolves predicted item plus correct disposal method before disposal tracking begins.
* Guidance state invokes LED and LCD outputs from a single runtime decision point.

Context references:
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 199-214) - Required runtime responsibilities and adapter boundaries.
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 231-240) - Recommended flow across the session states.

Dependencies:
* Step 1.1 completion.
* Active rules preset lookup surface in devices/pi-station/src/binsight_station/rules.py.

### Step 1.3: Validate phase changes

Run targeted station tests after the runtime-core changes settle. Keep this validation scoped to the Pi package because the firmware and cloud seams are not wired yet.

Validation commands:
* cd devices/pi-station && uv run pytest - Station runtime tests.

## Implementation Phase 2: Contract Projections and Rules Loading

<!-- parallelizable: true -->

### Step 2.1: Align event and live-status projections to shared contracts

Update the runtime projection helpers so Python runtime state and completed-session data serialize to the existing shared contract vocabulary. Keep the schema files as references and avoid widening the contract surface in this task.

Files:
* devices/pi-station/src/binsight_station/events.py - Emit canonical disposal-event fields and derive attempt result from expected versus actual disposal method.
* devices/pi-station/src/binsight_station/live_status.py - Map internal runtime states to the shared live-station-status vocabulary and include session context consistently.
* packages/contracts/schemas/domain/disposal-event.schema.json - Reference only; no schema changes expected.
* packages/contracts/schemas/domain/live-station-status.schema.json - Reference only; no schema changes expected.

Discrepancy references:
* Addresses DR-03 by normalizing runtime payloads to the current contract vocabulary before adding cloud publication work.

Success criteria:
* Disposal events serialize the required contract fields from the runtime session snapshot.
* Live status uses contract session-state names and can attach the latest event metadata when available.

Context references:
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 155-166) - Contract fields and live-status vocabulary.
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 244-248) - Normalization principle for runtime payloads.

Dependencies:
* Step 1.1 completion.

### Step 2.2: Replace hardcoded rules with schema-backed preset loading

Implement a runtime loader that reads rules preset data from the shared rules package or checked-in preset documents, validates the data against the existing preset shape, and exposes lookup helpers for item-to-method and zone-to-method resolution.

Files:
* devices/pi-station/src/binsight_station/rules.py - Load and validate preset data and expose typed lookup helpers.
* packages/rules/presets/ - Source preset documents for the station runtime to consume.
* packages/contracts/schemas/domain/rules-preset.schema.json - Reference validation contract for preset structure.

Discrepancy references:
* Addresses DR-03 by moving rules toward canonical preset data instead of Python literals.

Success criteria:
* Runtime can resolve correct disposal method from a selected preset id and version.
* Low-confidence threshold and zone mapping come from preset data rather than duplicated Python constants.

Context references:
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 163-164) - Rules-preset schema requirements.
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 304-308) - Next steps for schema-backed rules loading.

Dependencies:
* Step 1.2 completion.

### Step 2.3: Validate phase changes

Run contract-adjacent validation once the projection and rules changes land. This validation can happen independently of firmware work because it stays within the monorepo contracts and the Pi package.

Validation commands:
* cd /home/handwash/Projects/hackcanada && corepack pnpm lint - Monorepo lint coverage for contracts and packages.
* cd devices/pi-station && uv run pytest - Station serialization and rules tests.

## Implementation Phase 3: Device and Publication Adapters

<!-- parallelizable: false -->

### Step 3.1: Implement the ESP transport and protocol boundary

Replace the placeholder ESP client with a transport adapter that can consume presence and health telemetry and issue indicator commands while keeping the protocol narrow and transport-agnostic. Update the firmware protocol surface only enough to support the researched runtime lifecycle.

Files:
* devices/pi-station/src/binsight_station/esp_client.py - Parse transport messages and expose station-facing presence, health, and acknowledgement events.
* firmware/esp8266-controller/include/protocol.h - Add runtime message definitions for presence telemetry and acknowledgements.
* firmware/esp8266-controller/src/main.cpp - Emit presence updates and honor indicator commands through the defined protocol.

Discrepancy references:
* Addresses DR-02 by keeping the transport surface narrow and transport-agnostic until follow-on transport selection is complete.

Success criteria:
* Pi runtime can observe stable presence and health updates from the ESP boundary.
* Firmware responsibility remains limited to sensing, LEDs, and protocol acknowledgements.

Context references:
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 124-130) - Adapter gaps identified in the current scaffold.
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 208-214) - Narrow ESP responsibility in the recommended architecture.
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 304-307) - Next step for replacing the placeholder ESP client.

Dependencies:
* Step 1.1 completion.
* Step 2.1 completion.

### Step 3.2: Add Pi-local LCD and publication adapters

Add thin adapters for LCD rendering and Firebase publication so the runtime can present guidance locally, render cumulative station counters, and publish canonical events and live status without embedding infrastructure concerns inside the finite state machine.

Files:
* devices/pi-station/src/binsight_station/lcd_client.py - Local LCD interface for standby, guidance, result states, and cumulative station-counter output.
* devices/pi-station/src/binsight_station/publishers.py - Firebase or offline publisher seam for disposal events and live status.
* devices/pi-station/src/binsight_station/main.py - Wire adapters into the runtime composition root.

Success criteria:
* Guidance and standby text can be updated from runtime states without hardware-specific calls leaking into the FSM.
* Event and live-status publication failures can surface as sync or error states instead of crashing the loop.
* LCD output can render the current guidance target during a session and cumulative attempt and correct-sort counters outside the active disposal flow.

Context references:
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 208-214) - Keep LCD on the Pi and publish canonical payloads.
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 233-240) - Per-state LCD and publication responsibilities.

Dependencies:
* Step 2.1 completion.
* Step 3.1 completion.

### Step 3.3: Validate phase changes

Run firmware and station validation after protocol and adapter wiring stabilize so the runtime and firmware seams are exercised together.

Validation commands:
* cd devices/pi-station && uv run pytest - Station adapter and runtime integration tests.
* cd /home/handwash/Projects/hackcanada/firmware/esp8266-controller && /home/handwash/Projects/hackcanada/.venv/bin/pio run - Firmware build validation.

## Implementation Phase 4: End-to-End Tests and Final Validation

<!-- parallelizable: false -->

### Step 4.1: Add session lifecycle and serialization tests

Add focused tests for presence debounce, disposal timeout, fallback classification, zone-to-method correctness, canonical payload serialization, and station-counter updates across runtime states.

Files:
* devices/pi-station/tests/test_smoke.py - Expand or replace with scenario-based runtime coverage.
* devices/pi-station/tests/test_runtime_session.py - New lifecycle-focused runtime tests.
* devices/pi-station/tests/test_runtime_serialization.py - New contract projection tests.

Discrepancy references:
* Addresses DR-01 and DR-03 by locking in behavior before hardware tuning and cloud integration.

Success criteria:
* Tests cover successful disposal, incorrect disposal, timeout, and fallback-classification flows.
* Tests assert contract-aligned event and live-status payload shapes.
* Tests verify cumulative attempt and correct-sort counters update after result emission and remain available for LCD rendering.

Context references:
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 199-214) - Required runtime behaviors.
* .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 304-309) - Explicit testing gaps called out in the next steps.

Dependencies:
* Implementation Phases 1 through 3 completion.

### Step 4.2: Run full project validation

Execute all validation commands for the impacted areas:
* cd /home/handwash/Projects/hackcanada && corepack pnpm lint
* cd /home/handwash/Projects/hackcanada && corepack pnpm build
* cd /home/handwash/Projects/hackcanada/devices/pi-station && uv run pytest
* cd /home/handwash/Projects/hackcanada/firmware/esp8266-controller && /home/handwash/Projects/hackcanada/.venv/bin/pio run

### Step 4.3: Fix minor validation issues

Iterate on lint errors, build warnings, and isolated test failures caused by the runtime work. Apply direct fixes only when they do not change the chosen architecture.

### Step 4.4: Report blocking issues

When validation failures require hardware measurements, transport decisions, or broader schema and process changes, document them and spin follow-on planning rather than widening this implementation scope.

## Implementation Phase 5: Presence Integration Rework

<!-- parallelizable: false -->

### Step 5.1: Enforce stable ESP presence before identification begins

Rework the runtime entry flow so the Pi runtime stays idle until ESP telemetry reports stable nearby presence. Presence arming should reflect observed sensor input rather than synthetic time advancement, and classification should only begin after the debounce gate has actually elapsed against stable presence frames.

Files:
* devices/pi-station/src/binsight_station/main.py - Poll ESP telemetry, arm presence from observed frames, and keep identification behind the confirmed presence gate.
* devices/pi-station/src/binsight_station/session.py - Preserve the authoritative presence-arm and confirmation guard behavior needed by the runtime.
* devices/pi-station/src/binsight_station/esp_client.py - Continue exposing stable presence telemetry needed by the composition root.

Success criteria:
* `StationRuntime.start_session()` no longer jumps directly from presence arming to identification with a synthetic timestamp.
* The runtime can consume stable ESP presence before classification and guidance begin.
* Idle and presence-arming live-status updates remain aligned to the shared contract vocabulary.

Context references:
* .copilot-tracking/reviews/2026-03-07/station-runtime-implementation-plan-review.md (Lines 21-28) - Review finding for the missing debounce gate.
* .copilot-tracking/reviews/rpi/2026-03-07/station-runtime-implementation-plan-001-validation.md (Lines 33-61) - Phase 1 validation evidence and runtime gap.
* spec/binsight-spec.md (Lines 20-23) - Detection start must begin from nearby-person detection.

Dependencies:
* Implementation Phase 1 completion.
* Implementation Phase 3 completion.

### Step 5.2: Replace placeholder firmware presence frames with ultrasonic-backed telemetry

Wire the existing firmware protocol surface to a real ultrasonic-derived presence signal so the ESP publishes meaningful presence frames while preserving the narrow frame vocabulary. Keep the implementation demo-grade and conservative: report sensor-backed stable presence and an approximate zone token without widening the protocol.

Files:
* firmware/esp8266-controller/src/main.cpp - Sample the ultrasonic sensor, derive stable presence, and publish protocol-backed presence frames.
* firmware/esp8266-controller/include/protocol.h - Reference only unless small constant additions are required.

Success criteria:
* Firmware no longer hardcodes `handPresent` to `false` for every published presence frame.
* Periodic presence frames reflect sensor-backed presence and stability state.
* The existing presence frame parser on the Pi can consume the emitted telemetry without protocol changes.

Context references:
* .copilot-tracking/reviews/2026-03-07/station-runtime-implementation-plan-review.md (Lines 30-34) - Review finding for placeholder firmware telemetry.
* .copilot-tracking/reviews/rpi/2026-03-07/station-runtime-implementation-plan-003-validation.md (Lines 18-31) - Phase 3 validation evidence and firmware gap.
* spec/binsight-spec.md (Lines 20-23, 133-140) - Ultrasonic sensor owns nearby-person detection on the ESP unit.

Dependencies:
* Implementation Phase 3 completion.

### Step 5.3: Expand tests and release traceability for the presence path

Add focused tests that lock in the runtime presence gate and the ESP telemetry handling, then update the release notes so the Phase 4 smoke-test coverage accurately reflects the new scenarios.

Files:
* devices/pi-station/tests/test_runtime_session.py - Add runtime coverage for waiting on stable ESP presence before classification starts.
* devices/pi-station/tests/test_smoke.py - Add ESP-driven session-entry coverage and keep adapter expectations aligned.
* .copilot-tracking/changes/2026-03-07/station-runtime-implementation-changes.md - Update the summary for `test_smoke.py` once the new coverage lands.

Success criteria:
* Tests fail if classification starts before stable ESP presence is confirmed.
* Tests cover the sensor-backed or protocol-backed presence flow expected by the runtime.
* The changes log accurately describes the presence-path scenarios now covered by `test_smoke.py`.

Dependencies:
* Step 5.1 completion.
* Step 5.2 completion.

### Step 5.4: Re-run impacted validation

Execute the impacted validation commands after the rework lands:
* cd /home/handwash/Projects/hackcanada/devices/pi-station && uv run pytest
* cd /home/handwash/Projects/hackcanada/firmware/esp8266-controller && /home/handwash/Projects/hackcanada/.venv/bin/pio run
* cd /home/handwash/Projects/hackcanada && corepack pnpm lint
* cd /home/handwash/Projects/hackcanada && corepack pnpm build

## Dependencies

* Node.js with Corepack-enabled pnpm for workspace lint and build commands.
* uv-managed Python 3.11 environment for the Pi station package.
* PlatformIO environment for the ESP8266 controller firmware.

## Success Criteria

* The Pi runtime follows an explicit finite state machine aligned to the researched station lifecycle.
* Shared event and live-status payloads match the current contracts.
* Adapter seams isolate ESP, LCD, and publication concerns from business logic.