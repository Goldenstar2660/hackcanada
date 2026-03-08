---
title: System Spec Alignment Remediation Workstreams
description: Supplemental research identifying the concrete implementation workstreams required to align the BinSight project with the current product spec
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - spec alignment
  - remediation
  - workstreams
estimated_reading_time: 7
---

## Research status

Complete

## Research topics

* Identify which conclusions in the existing spec-gap research are stale because the authoritative spec has already changed
* Translate the current spec into concrete implementation workstreams, with likely file targets, dependency ordering, parallelization opportunities, and validation scope

## Findings

### Current spec baseline that matters for remediation

The current authoritative spec already bakes in the biggest scope corrections that the older gap research treated as pending:

* Detection starts immediately and does not wait for low-power wake-up or person-trigger sensing
* The runtime requirement is behavior-based: classify the item, guide the user, continuously track hand presence and zone, infer the drop on hand disappearance, and emit a complete event
* The event contract explicitly requires model confidence and LLM fallback provenance
* Demo seeding must stay broad across stations, floors, time periods, interventions, and contamination trends

### Stale conclusions in the supplied gap research

The following parts of `.copilot-tracking/research/2026-03-07/system-spec-implementation-gap-research.md` are stale because the spec has already been edited:

* The claim that the spec still references low-power idle and person detection is stale. The current spec no longer requires either behavior.
* The recommendation to update the spec to remove low-power mode and person detection is stale. That spec edit has already happened.
* The recommendation to replace wake-on-presence wording with always-on detection wording is stale. The current spec already says detection begins immediately and does not wait for wake-up or person-trigger sensing.
* The gap bucket that lists a missing "real person detection path" is stale as a spec-alignment issue. It may still describe old code seams, but it is no longer a product requirement.
* The framing around proving "three deployed perception models" is stale relative to the current spec. The current spec requires functioning item identification plus hand presence and zone tracking behavior. It does not require that those behaviors be implemented as three separate committed model artifacts.

The following older findings are still materially relevant:

* The low-confidence LLM fallback is still stubbed in `devices/pi-station/src/binsight_station/classification.py`
* The committed ESP firmware still publishes placeholder `handPresent` and `handZone` values in `firmware/esp8266-controller/src/main.cpp`
* The dashboard still hides some spec-required event and analytics fields even though backend contracts already carry them
* The seeded demo dataset still under-expresses intervention history and explicit demo-data marking

### Highest-priority remediation workstreams

#### Workstream 1: Complete the real disposal-sensing runtime

Priority: highest

Why this comes first:

* It is the biggest remaining gap in the spec's core live loop
* UI and demo-data improvements do not fix the station's missing real sensing behavior
* Event correctness depends on reliable hand presence and zone inputs

Primary code and config targets:

* `devices/pi-station/src/binsight_station/main.py`
* `devices/pi-station/src/binsight_station/session.py`
* `devices/pi-station/src/binsight_station/esp_client.py`
* `devices/pi-station/src/binsight_station/classification.py`
* `devices/pi-station/src/binsight_station/camera_capture.py`
* `firmware/esp8266-controller/src/main.cpp`
* `firmware/esp8266-controller/src/protocol.cpp`
* `devices/pi-station/tests/test_runtime_session.py`
* `devices/pi-station/tests/test_esp_http.py`
* `devices/pi-station/tests/test_smoke.py`

Concrete work inside this stream:

* Replace the hard-coded fallback return value `fallback-item` with a real fallback integration path, or explicitly gate fallback off when the network path is unavailable
* Replace placeholder ESP health payload values with real hand-presence and hand-zone telemetry, or move that sensing responsibility fully onto the Pi and make the ESP status contract reflect that narrower role
* Preserve the spec's current always-on runtime behavior while removing any remaining legacy reasoning that treats presence as a session-entry gate
* Verify the emitted disposal event remains spec-complete when real sensing is active, including confidence and fallback provenance

Dependency notes:

* This stream should start first
* The fallback subtask can proceed in parallel with the hand-telemetry subtask after the runtime ownership decision is made

#### Workstream 2: Separate the real runtime item set from the broad demo-data item catalog

Priority: high

Why this is next:

* The spec and current planning context want a narrow real detectable item set, but broad seeded demo analytics
* The current rules preset mixes runtime-supported items, fallback items, and demo-facing categories in one place
* This affects runtime behavior, tests, seed generation, and documentation together

Primary code and config targets:

* `packages/rules/presets/demo-canada-ottawa.1.0.0.json`
* `packages/rules/presets/README.md`
* `devices/pi-station/src/binsight_station/rules.py`
* `devices/pi-station/src/binsight_station/classification.py`
* `devices/pi-station/tests/test_classification_tflite.py`
* `devices/pi-station/README.md`
* `services/backend-functions/scripts/seed-demo-data.mjs`

Concrete work inside this stream:

* Decide whether the live runtime should use a narrower preset version or whether runtime model labels should be constrained independently from the broader rules preset
* Update the preset versioning strategy if supported runtime items change
* Align tests so the real classifier path covers the intended live labels while seeded analytics remains intentionally broader
* Document the difference between real on-device detectable classes and synthetic or seeded demo item variety

Dependency notes:

* This stream should be designed before the final runtime-sensing implementation is locked
* Seed-data expansion can happen in parallel once the runtime versus demo taxonomy boundary is decided

#### Workstream 3: Bring the dashboard surface up to the contract and spec

Priority: high

Why this is high leverage:

* Backend contracts and query services already expose most required data
* The remaining gap is largely presentation, not new backend invention

Primary code and config targets:

* `apps/web/src/features/events/event-history-panel.tsx`
* `apps/web/src/features/live/live-station-panel.tsx`
* `apps/web/src/pages/live-monitoring.tsx`
* `apps/web/src/features/analytics/analytics-summary-panel.tsx`
* `apps/web/src/pages/analytics.tsx`
* `apps/web/src/features/comparisons/comparison-overview.tsx`
* `apps/web/src/lib/query/dashboard-query.ts`

Concrete work inside this stream:

* Expose `modelConfidence` and `llmFallbackUsed` in the event-history table because those are spec-required event fields and already exist in contracts
* Add a first-class bin-purity section to the analytics page because the backend already computes it
* Expand the comparison cards so they show more than compliance score and total attempts, especially contamination shifts and time-series evidence
* Reconcile the live-monitoring route copy with the actual surface: either explicitly keep it text-first in the product language or add a real camera-frame presentation path later

Dependency notes:

* This stream can run mostly in parallel with Workstream 1 after event and live-status shapes are confirmed stable
* The event-history and analytics subtasks are parallelizable with each other

#### Workstream 4: Upgrade demo seeding to match the spec's intervention story

Priority: medium-high

Why this matters:

* The spec's dashboard value depends on visible before-or-after and A/B narratives, not only generic historical volume
* The current seed script is structurally useful, but still light on explicit intervention markers and demo-data labeling

Primary code and config targets:

* `services/backend-functions/scripts/seed-demo-data.mjs`
* `services/backend-functions/src/firestore/collections.ts`
* `services/backend-functions/src/analytics/query-service.ts`
* `packages/contracts/src/index.ts`
* `packages/contracts/src/index.d.ts`
* `packages/contracts/schemas/domain/*.json`

Concrete work inside this stream:

* Mark seeded records directly on disposal events, live statuses, and derived rollups so presentation-time filtering is possible
* Add explicit intervention markers such as signage changes, campaign dates, or layout-change boundaries if the dashboard needs to call those out directly
* Ensure seeded contamination trends visibly improve after interventions so comparisons read clearly in the demo

Dependency notes:

* This stream can start in parallel with Workstream 3
* If new intervention entities or flags change contracts, contract updates should land before frontend presentation changes that depend on them

#### Workstream 5: Documentation and runbook cleanup after runtime decisions land

Priority: medium

Primary docs targets:

* `devices/pi-station/README.md`
* `docs/firebase-rehearsal-runbook.md`
* `README.md`
* Existing `.copilot-tracking` research and plan artifacts that still describe old scope assumptions

Concrete work inside this stream:

* Remove outdated wording that implies placeholder sensing is an acceptable steady-state outcome
* Document the chosen ownership boundary for hand sensing, fallback networking, and runtime item taxonomy
* Keep demo-operator instructions aligned with what the live page actually shows

Dependency notes:

* This stream should follow the runtime and dashboard decisions
* It is safe to parallelize doc updates across owners once the implementation choices are fixed

### Suggested execution order

1. Decide the sensing ownership boundary and fallback behavior
2. Lock the runtime-versus-demo item taxonomy boundary
3. Implement Workstream 1 core runtime fixes
4. Implement Workstream 3 dashboard parity work and Workstream 4 seed-data improvements in parallel
5. Finish Workstream 5 documentation cleanup last

### Likely validation commands and test scopes

Device runtime validation:

```bash
cd devices/pi-station
uv run pytest tests/test_classification_tflite.py tests/test_runtime_session.py tests/test_esp_http.py tests/test_smoke.py
uv run binsight-station
uv run binsight-realtime-sim
```

Firmware validation:

```bash
cd firmware/esp8266-controller
pio run
```

Workspace TypeScript validation:

```bash
npx --yes -p typescript@5.8.2 tsc --noEmit -p apps/web/tsconfig.json
npx --yes -p typescript@5.8.2 tsc --noEmit -p services/backend-functions/tsconfig.json
```

Integrated workspace validation once dependencies cooperate:

```bash
just validate
```

Suggested manual test scopes:

* Real or simulated disposal attempt from guidance through hand disappearance to emitted event
* Low-confidence classification that exercises the fallback path and verifies the dashboard surfaces fallback provenance
* Live monitoring page check for session state, current item, disposal method, latest event, and any camera-state messaging
* Analytics and comparison checks that seeded interventions visibly change compliance, contamination, and purity outputs

## Recommended next research

* Confirm whether hand sensing is intended to remain ESP-backed or move fully to Pi-side CV. That single architecture decision changes Workstream 1 file ownership materially.
* Confirm whether the narrow live detectable item set should be represented as a new rules preset version or as model-label constraints layered on top of the broader Ottawa preset.
* Inspect current uncommitted local model assets, if any, before treating the runtime label set as only the checked-in test fixture set.

## Clarifying questions

* Should hand presence and zone tracking remain an ESP responsibility, or should the Pi own that perception path end to end?
* Should the live demo intentionally stay text-first on the monitoring page, or do you want camera-frame presentation treated as required for spec alignment?
* For the three real detectable classes, do you want the public rules preset narrowed too, or only the on-device model and Pi runtime narrowed while seeded analytics stays broad?