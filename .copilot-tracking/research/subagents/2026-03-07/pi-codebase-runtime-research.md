---
title: Pi Codebase Runtime Research
description: Verified research on the current Binsight Raspberry Pi station runtime scaffold, shared contracts, and gaps against the product spec
ms.date: 2026-03-07
ms.topic: reference
---

## Research scope

This note answers these questions against the current codebase only:

1. What runtime responsibilities already exist in the Pi station package?
2. What modules, abstractions, or naming patterns suggest the intended station flow?
3. What contracts and types already exist for disposal events and live station status?
4. What gaps remain for a spec-complete Raspberry Pi runtime?
5. What exact file references support each finding?

Source-of-truth requirements come from `spec/binsight-spec.md`, especially the live control loop, event payload, configurable rules, and cloud-sync expectations in lines 20-58, 107-145.

## Spec baseline

The spec requires the Pi station runtime to do all of the following:

* Begin a session when the ultrasonic sensor detects a nearby person: `spec/binsight-spec.md:20-23`
* Capture an item image, classify it locally, optionally use LLM fallback below a configurable threshold, and map the final item to a disposal method through the active rules preset: `spec/binsight-spec.md:25-30`
* Turn on the corresponding LED and show the item plus disposal method on the LCD: `spec/binsight-spec.md:32-35`
* Continuously track hand zone and hand presence, then infer the drop zone from the last tracked zone before the hand disappears: `spec/binsight-spec.md:37-41`
* Emit an event for each attempt with station id, timestamp, predicted item, correct disposal method, actual disposal zone, success or failure, confidence, and fallback usage: `spec/binsight-spec.md:49-58`
* Show live station status, current camera feed, current detected item, current disposal decision, and latest event in real time: `spec/binsight-spec.md:107-112`
* Publish event and live-status data to Firebase for dashboard and live monitoring: `spec/binsight-spec.md:139-145`

## Findings

### Runtime responsibilities already present in the Pi package

The package is intended to be runnable as the Raspberry Pi station app. The package metadata declares `binsight_station.main:main` as the executable entry point, and the device README states that this project owns the live control loop and protocol translation for the demo station: `devices/pi-station/pyproject.toml:16-18`, `devices/pi-station/README.md:8-17`

The current implementation already covers a narrow demo-path version of these responsibilities:

* Runtime settings loading from `.env`: `RuntimeSettings` and `load_runtime_settings()` provide station id, confidence threshold, rules preset version, ESP endpoint, and Firebase project id: `devices/pi-station/src/binsight_station/main.py:17-36`
* Session orchestration: `StationRuntime` wires together rules, session state, classifier, ESP client, and live-status publisher: `devices/pi-station/src/binsight_station/main.py:39-46`
* Session start and guidance: `start_session()` begins detection, classifies the item, maps it to a disposal method, records guidance in session state, and sends a guidance command to the ESP seam: `devices/pi-station/src/binsight_station/main.py:48-69`
* Classification seam with fallback decision logic: `ClassificationPipeline.classify()` compares a local-confidence value against the configured threshold and optionally routes to `_infer_with_fallback()`: `devices/pi-station/src/binsight_station/classification.py:19-34`
* Local rules lookup: the Pi package can map item labels to disposal methods and zones to disposal methods through `RulesPreset`: `devices/pi-station/src/binsight_station/rules.py:6-33`
* Disposal-session state tracking: `SessionStateMachine` stores predicted item, correct disposal method, confidence, fallback usage, latest hand zone, hand presence, and actual disposal zone: `devices/pi-station/src/binsight_station/session.py:15-72`
* Drop detection by hand disappearance: `track_hand()` records `actual_disposal_zone` when the previous state had a hand present and the new state does not: `devices/pi-station/src/binsight_station/session.py:56-71`
* Event construction: `create_disposal_event()` validates snapshot completeness, derives actual disposal method from the active rules preset, and computes success from correct-versus-actual mapping: `devices/pi-station/src/binsight_station/events.py:22-48`
* Live-status shaping seam: `LiveStatusPublisher.build_status()` derives a lightweight live snapshot from the current session snapshot: `devices/pi-station/src/binsight_station/live_status.py:16-25`

The smoke tests verify only this simplified flow: runtime startup reaches `WAITING_FOR_DISPOSAL`, hand disappearance records a drop, original guidance is preserved after drop detection, and mismatched zones produce a failed event: `devices/pi-station/tests/test_smoke.py:23-83`

### Modules, abstractions, and naming patterns that imply the intended station flow

The module breakdown is intentionally aligned with the spec's station lifecycle:

* `main.py` is the composition root and runtime orchestrator: `devices/pi-station/src/binsight_station/main.py:39-96`
* `session.py` is the stateful session model for detection, guidance, waiting, and completion: `devices/pi-station/src/binsight_station/session.py:7-72`
* `classification.py` is the local-inference plus fallback seam: `devices/pi-station/src/binsight_station/classification.py:19-42`
* `rules.py` is the local item-to-disposal and zone-to-disposal rule application seam: `devices/pi-station/src/binsight_station/rules.py:6-33`
* `esp_client.py` is the Pi-to-ESP anti-corruption layer for local hardware guidance commands: `devices/pi-station/src/binsight_station/esp_client.py:6-20`
* `events.py` is the cloud-facing attempt payload builder: `devices/pi-station/src/binsight_station/events.py:10-48`
* `live_status.py` is the cloud-facing live-status builder: `devices/pi-station/src/binsight_station/live_status.py:8-25`

The naming strongly suggests the intended session flow is:

1. `begin_detection()` starts a new session: `devices/pi-station/src/binsight_station/session.py:35-37`
2. `classify()` resolves the item and fallback status: `devices/pi-station/src/binsight_station/classification.py:22-34`
3. `disposal_method_for_item()` chooses guidance from the active rules preset: `devices/pi-station/src/binsight_station/rules.py:12-13`
4. `set_guidance()` stores the classification result and moves the session into a disposal-waiting state: `devices/pi-station/src/binsight_station/session.py:39-54`
5. `send_guidance()` passes the chosen disposal method and item label to the ESP-facing seam: `devices/pi-station/src/binsight_station/esp_client.py:12-20`
6. `track_hand()` detects the final zone when the hand disappears: `devices/pi-station/src/binsight_station/session.py:56-71`
7. `create_disposal_event()` finalizes the attempt payload: `devices/pi-station/src/binsight_station/events.py:22-48`
8. `build_status()` derives a live station snapshot for publication: `devices/pi-station/src/binsight_station/live_status.py:16-25`

There are also signs that the current code is still scaffold-level rather than production-ready:

* The device README says the scaffold only wires module seams, while hardware integration, Firebase credentials, model execution, and Pi-to-ESP wire format remain follow-on work: `devices/pi-station/README.md:55-59`
* `EspClient` only stores the last command in memory and does not perform transport I/O: `devices/pi-station/src/binsight_station/esp_client.py:12-20`
* `main()` only starts a placeholder session and prints a summary line: `devices/pi-station/src/binsight_station/main.py:85-96`

### Existing contracts and types for disposal events and live station status

The canonical shared contracts already exist in `packages/contracts` as JSON Schema plus generated TypeScript types.

The disposal event contract requires these fields: `stationId`, `timestamp`, `predictedItem`, `correctDisposalMethod`, `actualDisposalZone`, `attemptResult`, `modelConfidence`, and `llmFallbackUsed`: `packages/contracts/schemas/domain/disposal-event.schema.json:8-17`, `packages/contracts/generated/typescript/domain/disposal-event.d.ts:20-52`

The live station status contract requires these fields: `stationId`, `timestamp`, `sessionState`, `cameraFeedActive`, and `deviceHealth`, with optional `currentDetectedItem`, `currentDisposalMethod`, `currentHandZone`, and `latestEvent`: `packages/contracts/schemas/domain/live-station-status.schema.json:8-145`, `packages/contracts/generated/typescript/domain/live-station-status.d.ts:25-77`

The canonical live-status session states are `idle`, `detecting-person`, `identifying-item`, `guiding-user`, `waiting-for-disposal`, `syncing`, and `error`: `packages/contracts/schemas/domain/live-station-status.schema.json:28-38`, `packages/contracts/generated/typescript/domain/live-station-status.d.ts:16-20`

The rules preset contract already defines what the Pi runtime should eventually consume from shared data rather than hardcoded Python dictionaries. It includes `presetId`, `version`, `jurisdiction`, `supportedItems`, `itemMappings`, `zoneMapping`, and `lowConfidenceThreshold`: `packages/contracts/schemas/domain/rules-preset.schema.json:8-105`

Station metadata is also already modeled for dashboard filtering and experiment analysis, including `stationId`, building and floor identifiers, `locationLabel`, `signageVariant`, `layoutVariant`, and `activeRulesPresetId`: `packages/contracts/schemas/domain/station-metadata.schema.json:8-71`

Current package-level reuse is limited. The TypeScript contracts package still declares itself as schema-first scaffolding reserved for a later phase, and the rules package only exposes a `RulesPresetReference` interface rather than concrete preset-loading logic: `packages/contracts/src/index.ts:1-4`, `packages/rules/src/index.ts:1-5`

The backend functions package does not currently reveal ingestion or live-status payload handling beyond a placeholder purpose declaration, so there is no implemented backend payload expectation to integrate against yet: `services/backend-functions/src/index.ts:1-4`

### Gaps that remain for a spec-complete station runtime

The current Pi runtime does not yet satisfy the full spec. The remaining gaps are concrete and visible.

#### Hardware and sensor loop gaps

* No ultrasonic-triggered detection loop exists. The spec requires low-power waiting and ultrasonic-triggered session start, but the runtime currently begins only when `start_session()` is called directly: `spec/binsight-spec.md:20-23`, `devices/pi-station/src/binsight_station/main.py:48-69`
* No camera capture integration exists. Classification currently takes an `image_source` string and returns placeholder labels rather than capturing or processing real frames: `spec/binsight-spec.md:25-30`, `devices/pi-station/src/binsight_station/classification.py:22-42`
* No LCD integration exists, despite the spec requiring item and disposal feedback plus a station counter on the LCD: `spec/binsight-spec.md:14-15`, `spec/binsight-spec.md:32-35`, `spec/binsight-spec.md:60-65`
* No real ESP transport exists. The spec assigns ESP8266 ownership for LEDs and ultrasonic sensing, but the Pi seam only records the last guidance command: `spec/binsight-spec.md:134-145`, `devices/pi-station/src/binsight_station/esp_client.py:12-20`

#### Session and state-model gaps

* The Python `SessionPhase` values do not match the canonical live-status contract. Current values are `idle`, `detecting`, `guiding`, `waiting_for_disposal`, and `complete`, while the contract expects `idle`, `detecting-person`, `identifying-item`, `guiding-user`, `waiting-for-disposal`, `syncing`, and `error`: `devices/pi-station/src/binsight_station/session.py:7-12`, `packages/contracts/schemas/domain/live-station-status.schema.json:28-38`
* `SessionPhase.GUIDING` is defined but never used. `set_guidance()` moves directly to `WAITING_FOR_DISPOSAL`, so there is no explicit `guiding` state transition in the current flow: `devices/pi-station/src/binsight_station/session.py:7-12`, `devices/pi-station/src/binsight_station/session.py:39-54`
* `observe_disposal()` only simulates a single zone-present then zone-absent sequence. The spec requires continuous hand-zone and hand-presence tracking, but the current method hardcodes exactly two state transitions: `spec/binsight-spec.md:37-41`, `devices/pi-station/src/binsight_station/main.py:71-82`

#### Contract alignment gaps

* The local Python disposal event shape does not match the canonical contract. The Python dataclass uses snake_case field names and a boolean `success`, while the shared schema expects camelCase names and string `attemptResult`: `devices/pi-station/src/binsight_station/events.py:10-19`, `packages/contracts/schemas/domain/disposal-event.schema.json:8-69`
* The local Python live-status shape is much smaller than the canonical live-status contract. It only contains `station_id`, `phase`, `predicted_item`, and `disposal_method`, and omits timestamp, camera feed status, current hand zone, device health, and latest event: `devices/pi-station/src/binsight_station/live_status.py:8-25`, `packages/contracts/schemas/domain/live-station-status.schema.json:72-145`
* The runtime reads `firebase_project_id` from configuration but never uses it, which confirms that cloud publication is not yet implemented: `devices/pi-station/src/binsight_station/main.py:17-36`, `spec/binsight-spec.md:142-145`

#### Rules and configuration gaps

* The active rules preset is currently hardcoded inside Python rather than loaded from the shared schema-driven contract shape. The loader ignores `presetId`, jurisdiction, supported item lists, and shared package artifacts: `devices/pi-station/src/binsight_station/rules.py:19-33`, `packages/contracts/schemas/domain/rules-preset.schema.json:37-104`
* Station metadata exists as a contract, but the Pi runtime does not load or expose it. That blocks the filtering and experiment-comparison use cases the spec expects on the dashboard side: `packages/contracts/schemas/domain/station-metadata.schema.json:20-70`, `spec/binsight-spec.md:96-105`, `spec/binsight-spec.md:114-120`

#### Cloud-sync and monitoring gaps

* No Firebase publishing implementation exists for either events or live status, even though the spec requires the Pi to send both to Firebase for dashboard and live monitoring: `spec/binsight-spec.md:107-112`, `spec/binsight-spec.md:142-145`, `devices/pi-station/src/binsight_station/live_status.py:16-25`, `services/backend-functions/src/index.ts:1-4`
* No current camera feed publication exists for the live monitoring page: `spec/binsight-spec.md:107-112`, `devices/pi-station/README.md:57-59`
* No station counter, metrics accumulation, retry handling, sync state, or error state publication exists in the Pi runtime yet: `spec/binsight-spec.md:60-85`, `packages/contracts/schemas/domain/live-station-status.schema.json:28-38`, `devices/pi-station/src/binsight_station/main.py:85-96`

## Recommended direction

The cleanest path is to keep the current module boundaries and replace the placeholder internals with contract-aligned adapters rather than redesigning the package.

Recommended implementation direction:

1. Keep `StationRuntime` as the composition root in `main.py`, but turn it into a long-running control loop that reacts to ESP sensor input, camera frames, and sync events.
2. Promote `session.py` to the canonical runtime state model and rename or map its phases to the shared live-status contract values before any cloud publication.
3. Replace the hardcoded Python `RulesPreset` loader with a loader that consumes the shared rules preset contract data, preserving one local lookup abstraction for item and zone mapping.
4. Add two explicit publisher adapters: one that converts Python snapshots into the canonical disposal-event shape, and one that converts runtime state into the canonical live-station-status shape.
5. Keep `esp_client.py` and `classification.py` as seams, but implement real transport and inference behind them so the rest of the runtime stays isolated from hardware and model details.

This direction fits the spec, matches the existing package decomposition, and minimizes churn because the current files already map closely to the intended station responsibilities.

## Recommended next research

* Inspect the ESP8266 firmware protocol to define the real Pi-to-ESP message boundary before implementing `EspClient`
* Determine where shared rules preset artifacts will live at runtime and how the Pi will fetch or bundle them offline
* Decide whether the Pi should emit canonical contract JSON directly or use Python dataclasses plus a serializer layer
* Design the Firebase write model for live-status updates, event ingestion, and camera-feed references once backend handlers exist

## Clarifying questions that research could not answer from the codebase

* Where should canonical rules preset data be stored for the Pi at runtime: bundled locally, synced from Firebase, or both?
* What concrete transport should connect the Pi and ESP8266: UDP, TCP, HTTP, or a custom framed protocol over Wi-Fi?
* Should the live monitoring camera feed be published as direct frame snapshots, a stream URL, or cloud-stored image references?