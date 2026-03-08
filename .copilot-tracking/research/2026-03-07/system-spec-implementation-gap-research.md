---
title: System Spec Implementation Gap Research
description: Research assessing how closely the current BinSight system matches the authoritative product spec and the user-provided scope exceptions
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - spec analysis
  - implementation gap
  - detection pipeline
estimated_reading_time: 12
---
<!-- markdownlint-disable-file -->

## Task Research

Assess how closely the current BinSight system matches the authoritative spec in spec/binsight-spec.md, with these user-provided overrides applied during evaluation:

* Low power mode is no longer in scope.
* Person detection is no longer in scope.
* Detection should be fully on all the time.
* The real model is now limited to exactly three detectable items: granola bar, aluminium can, and pickled radishes.
* Seeded or fake demo data should still include a wide variety of items.

## Task Implementation Requests

* Read the spec and identify the intended system behavior, especially around perception and runtime logic.
* Determine what currently works in the repository and what does not.
* Verify whether the three detection models exist and whether their logic is implemented: item classification, hand location, and hand-present or absent detection.
* Locate configurable sources such as the list of items and other relevant runtime settings.
* Explain in plain English how the implementation diverges from the spec.
* Identify spec updates needed to reflect the user-provided exceptions.

## Scope and Success Criteria

* Scope: Repository research only. Focus on the spec, Raspberry Pi station code, firmware behavior where relevant, service-side support, tests, config, seeded data, and related docs. Excludes implementing fixes.
* Assumptions:
  * The authoritative product definition is spec/binsight-spec.md except where the user explicitly overrode it.
  * The strongest evidence comes from checked-in code, config, tests, and docs.
  * A feature counts as implemented only when code paths and supporting configuration or tests substantiate it.
* Success Criteria:
  * Map major spec requirements to concrete implementation evidence.
  * State whether the three requested models and their gating logic are present.
  * Identify where configurable item definitions and related settings live.
  * Provide one clear recommendation for how to update the spec to match current intended behavior.
  * Produce a plain-English explanation of current conformance and divergence.

## Outline

1. Extract required behavior from the spec.
2. Inspect the device runtime and model-loading pipeline.
3. Inspect configuration, seeded data, and tests.
4. Compare spec versus implementation.
5. Select the clearest explanation of current system status and required spec deltas.

## Potential Next Research

* Verify any uncommitted local model assets or private demo branches before treating missing hardware perception as final.
  * Reasoning: The repository contains the loading path for model assets, but not the assets themselves.
  * Reference: devices/pi-station/src/binsight_station/classification.py

## Research Executed

### File Analysis

* [spec/binsight-spec.md](../../../spec/binsight-spec.md#L9)
  * Defines the intended one-station demo, required runtime loop, required event payload, dashboard outcomes, seeded data requirements, and configuration surfaces.
* [devices/pi-station/src/binsight_station/main.py](../../../devices/pi-station/src/binsight_station/main.py#L37)
  * Implements the main station runtime, including startup wiring, classifier invocation, presence debounce, zone tracker injection, and event publication.
* [devices/pi-station/src/binsight_station/classification.py](../../../devices/pi-station/src/binsight_station/classification.py#L82)
  * Provides local classification, confidence threshold handling, label normalization, and a fallback seam that is currently stubbed rather than a real LLM call.
* [devices/pi-station/src/binsight_station/session.py](../../../devices/pi-station/src/binsight_station/session.py#L138)
  * Implements the core drop inference rule: a disposal attempt is detected when a present hand disappears, using the most recent tracked zone.
* [devices/pi-station/src/binsight_station/esp_client.py](../../../devices/pi-station/src/binsight_station/esp_client.py#L292)
  * Supports HTTP parsing of `handPresent` and `handZone` telemetry from the ESP path.
* [devices/pi-station/src/binsight_station/rules.py](../../../devices/pi-station/src/binsight_station/rules.py#L26)
  * Enforces that item labels resolve through the active rules preset rather than ad hoc mappings.
* [packages/rules/presets/demo-canada-ottawa.1.0.0.json](../../../packages/rules/presets/demo-canada-ottawa.1.0.0.json#L8)
  * Holds the current supported item catalog, item-to-bin mapping, zone mapping, and fallback threshold.
* [services/backend-functions/scripts/seed-demo-data.mjs](../../../services/backend-functions/scripts/seed-demo-data.mjs#L25)
  * Seeds multi-station historical events, live status, and analytics rollups, but with a narrow set of event item examples.
* [firmware/esp8266-controller/src/main.cpp](../../../firmware/esp8266-controller/src/main.cpp#L14)
  * Shows the committed firmware still emits static placeholder telemetry instead of live perception-derived presence or zone data.
* [apps/web/src](../../../apps/web/src)
  * The operator UI exists and covers station, live, history, analytics, and comparisons, but some required spec outputs are not surfaced in the current presentation layer.

### Code Search Results

* `handPresent|handZone|presence`
  * Presence and zone concepts are threaded through the Pi runtime and HTTP ESP client, but not backed by a committed real hand-location model.
* `tflite|model.tflite|labels.txt|aliases.json`
  * The runtime expects external model assets, but no committed classifier assets were found under `devices/pi-station/models`.
* `seed-demo-data|analytics|history|live`
  * Backend functions and the web app implement substantial demo and reporting support beyond simple scaffolding.
* `low power|ultrasonic|person detection`
  * The spec still references low-power idle and person detection, while current intended behavior has moved to always-on detection and the committed firmware does not implement those sensor paths.

### External Research

* None planned unless repository evidence is insufficient.

### Project Conventions

* Standards referenced: spec-first evaluation, markdown instructions, writing-style instructions
* Instructions followed: source-of-truth.instructions.md, markdown.instructions.md, writing-style.instructions.md, task-research mode instructions

## Key Discoveries

### Project Structure

The repository is not an empty prototype. It has four meaningful layers already wired together:

* The Pi station runtime in `devices/pi-station` contains the session state machine, local classification, rules lookup, transport clients, simulation hooks, and tests.
* The ESP8266 firmware in `firmware/esp8266-controller` exposes a hardware integration point, but the committed code still publishes placeholder telemetry.
* Shared contracts and rules packages define the event schema, live status shape, analytics query and summary types, and the current rules preset.
* Backend functions and the web app support ingest, live monitoring, event history, analytics summaries, comparisons, and demo seeding.

### Implementation Patterns

The implementation follows one consistent pattern: the Pi runtime is the coordinator, while rules and downstream reporting are data-driven.

* Classification happens first when a session begins.
* The predicted item is normalized against the active rules preset.
* Guidance is computed from preset mappings rather than hard-coded logic.
* A disposal attempt is inferred from hand disappearance, using the last known zone.
* The resulting event is pushed into backend ingestion and analytics paths.

This pattern is real and test-backed, but the perception inputs feeding it are only partially real today.

### Complete Examples

```text
Spec expectation:
person arrives -> item seen -> item classified -> correct bin shown -> hand tracked over zone -> hand disappears -> drop inferred -> correctness recorded -> event emitted

Current committed implementation:
session starts from presence debounce or simulation -> item classified locally -> label normalized through rules preset -> UI guidance emitted -> hand presence and zone come from injected tracker or ESP payload -> disappearance triggers drop inference -> event emitted to backend
```

### API and Schema Documentation

The shared contracts are ahead of the UI surface. The repository already defines structured payloads for:

* disposal events
* live station status
* event history responses
* analytics summary queries and grouped summaries
* station directory and comparison views

This means several spec features exist in schema and backend form even where the current UI exposes only a subset.

### Configuration Examples

```text
Rules preset:
- supported item list
- item -> disposal method mapping
- method -> station zone mapping
- fallback threshold

Pi environment:
- active rules preset reference
- model asset directory
- presence debounce timing

Model asset bundle:
- model.tflite
- manifest.json
- labels.txt
- optional aliases.json
```

## Technical Scenarios

### Spec-to-Implementation Gap Analysis

The current system partially matches the spec, but not end to end.

What is substantially implemented already:

* A real Pi-side state machine exists.
* Local item classification exists.
* Rules-based mapping from item to target bin exists.
* Drop inference from hand disappearance exists.
* Disposal events, live status, seeded history, analytics summaries, and operator pages exist.
* Tests cover core classification seams, session flow, HTTP transport parsing, and demo or simulation paths.

What does not fully match the spec yet:

* The spec assumes low-power idle and person detection, but the desired product has moved to always-on detection and the committed code does not implement a real low-power or person-sensing path.
* The spec implies richer perception, including hand zone tracking and hand presence sensing as core runtime inputs, but the committed repository does not show three real deployed models. Only the item classifier is a real committed module. Hand location is currently a tracker seam or simulated input, and hand-present detection is telemetry-driven or simulated rather than a committed vision model.
* The classifier fallback path is present, but the actual LLM fallback call is stubbed.
* The committed firmware still returns placeholder hand telemetry, so the real hardware path is behind the simulated or injected runtime path.
* The dashboard and backend support much of the required data, but the UI does not yet surface every spec-required field such as confidence and fallback provenance, and it does not present all analytics views as explicitly as the spec describes.
* Seeded data exists and spans multiple stations and days, but the seeded item variety is still small and does not yet tell the full intervention story described in the spec.

**Requirements:**

* Respect the product spec as the baseline, except for the user-authorized changes:
  * remove low-power mode
  * remove person detection
  * keep detection always on
  * limit the real model to three classes: granola bar, aluminium can, and pickled radishes
  * keep seeded demo data broad
* Distinguish clearly between what is real, simulated, stubbed, and missing.
* Explain divergence in plain English.
* Identify the actual configuration surfaces used today.

**Preferred Approach:**

* Evaluate the repository requirement-by-requirement, then split the result into four buckets: implemented, partially implemented, simulated or stubbed, and missing. This produces the clearest answer because the codebase is beyond prototype stage but still not fully aligned to the intended hardware behavior.

```text
Current best-fit implementation picture

Pi runtime: real
Item classifier: real module, external model assets missing from repo
Hand location model: not found as a committed real model
Hand present or absent model: not found as a committed real model
Drop inference logic: real and tested
Rules mapping: real and data-driven
Backend ingest and analytics: real
Dashboard UI: real but incomplete relative to spec detail
Seed data: real but narrower than spec narrative
ESP live sensing: placeholder in committed firmware
```

**Implementation Details:**

Plain-English assessment:

* The project does not yet do exactly what the spec says.
* The central workflow mostly exists in software, especially on the Pi and in the backend.
* The biggest mismatch is the sensing side. The repository clearly has one real item-classification path, but it does not show three real deployed detection models working together. The hand-zone and hand-present parts are currently simulated, injected, or stubbed through telemetry seams rather than implemented as committed production perception modules.
* Because of that, the system can demonstrate the intended logic flow, but the committed hardware path is not yet strong evidence that the full real-world sensing pipeline works exactly as described.
* The cloud and dashboard side are in better shape than the sensing side. Events, live status, history, analytics, comparisons, and seeded multi-station data all exist, but the user-facing presentation still omits some of the richer fields and stories promised by the spec.

Where the configurable item list lives today:

* The current canonical supported items live in the rules preset at [packages/rules/presets/demo-canada-ottawa.1.0.0.json](../../../packages/rules/presets/demo-canada-ottawa.1.0.0.json#L8).
* The Pi runtime loads that preset and validates items through [devices/pi-station/src/binsight_station/rules.py](../../../devices/pi-station/src/binsight_station/rules.py#L26).
* Real model labels are expected from external files loaded by [devices/pi-station/src/binsight_station/classification.py](../../../devices/pi-station/src/binsight_station/classification.py#L168).
* Seeded historical items live in [services/backend-functions/scripts/seed-demo-data.mjs](../../../services/backend-functions/scripts/seed-demo-data.mjs#L111).

Recommended spec updates based on the new intended behavior:

* Remove low-power mode and person detection from the runtime description.
* Replace wake-on-presence wording with always-on detection wording.
* Narrow the real on-device model scope to exactly three classes: granola bar, aluminium can, and pickled radishes.
* Keep the seeded demo-data requirement broad and explicitly separate it from the real model label set.
* Clarify that the item catalog is split across rules presets for demo logic and model label assets for real local inference.

```text
Conformance summary

Implemented:
- item classification path
- rules-based disposal mapping
- drop inference session logic
- event ingestion and analytics backend
- operator dashboard routes and seeded data pipeline

Partial:
- LLM fallback interface
- analytics and history presentation detail
- seeded narrative richness

Simulated or stubbed:
- live hand sensing inputs
- firmware telemetry realism

Missing relative to spec as written:
- low-power mode behavior
- real person detection path
- evidence of three deployed perception models working together in committed code
```

#### Considered Alternatives

Alternative 1: Judge the repository only against the original spec text.

Rejected because it would incorrectly treat low-power mode and person detection as current product requirements even though the user has explicitly changed scope.

Alternative 2: Judge the system only by what the simulation and tests can demonstrate.

Rejected because it would overstate readiness. The simulation paths are useful, but the user asked what actually works so far.

Selected approach: judge the codebase against the spec with the user-authorized exceptions applied, then separate real implementation from simulated or stubbed behavior.
