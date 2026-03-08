---
title: Config and Seeded Data Research
description: Research findings on configurable item definitions, class labels, demo presets, seeded data, and runtime options across the repository
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - configuration
  - seeded data
  - rules presets
  - runtime options
estimated_reading_time: 8
---

## Research Scope

* Locate configurable sources related to item definitions, class labels, demo presets, seeded data, and runtime options across the repository.
* Confirm where the item list lives today.
* Confirm whether the system currently supports many fake items versus only a few real-model classes.
* Locate where power mode and person detection are configured or referenced.
* Identify places where the spec should be updated to match the implementation state.

## Status

* Status: Complete
* Date: 2026-03-07
* Matching `.github/agents/**/researcher-subagent.agent.md` files found: none

## Findings

### Item definitions and class labels

The canonical supported item list lives in the shared rules preset, not in the Pi runtime, backend seed script, or firmware.

* `packages/rules/presets/demo-canada-ottawa.1.0.0.json:8-57` is the current source of truth for the demo item catalog. It defines `supportedItems`, `itemMappings`, `zoneMapping`, and `lowConfidenceThreshold`. Today that preset supports 8 item ids: `plastic-bottle`, `banana-peel`, `coffee-cup`, `pizza-box`, `paper-takeout-container`, `apple-core`, `unknown-item`, and `fallback-item`.
* `packages/contracts/schemas/domain/rules-preset.schema.json:12-14` and `packages/contracts/schemas/domain/rules-preset.schema.json:64-103` make `supportedItems`, `itemMappings`, `zoneMapping`, and `lowConfidenceThreshold` required and data-driven. This is a high-configurability surface because changing the item catalog is a preset-data change, not a code change.
* `packages/rules/presets/README.md:12` explicitly says the preset version should change whenever the supported item list, item-to-disposal mapping, zone mapping, or low-confidence threshold changes.
* `devices/pi-station/src/binsight_station/rules.py:45-61` loads preset data into the Pi runtime, and `devices/pi-station/src/binsight_station/rules.py:116-166` validates that `supportedItems` exactly matches `itemMappings` and that the threshold stays between 0 and 1. This keeps the catalog data-driven but rigidly validated.
* `devices/pi-station/src/binsight_station/main.py:99-101` and `devices/pi-station/.env.example:2-4` show that the active preset id, preset version, and model directory are selected from environment variables. This is medium configurability because operators can swap presets and model asset locations without code changes, but only among files already present in the repo or on disk.

Model labels for real local inference live outside the preset and are expected beside the TensorFlow Lite assets.

* `devices/pi-station/src/binsight_station/classification.py:38-39` defines manifest defaults for `labels.txt` and optional `aliases.json`.
* `devices/pi-station/src/binsight_station/classification.py:168-204` requires `model.tflite`, `manifest.json`, `labels.txt`, and optional `aliases.json` in the configured model directory.
* `devices/pi-station/src/binsight_station/classification.py:152` maps raw model labels through aliases into preset-compatible item ids, then falls back to normalized labels.
* `devices/pi-station/src/binsight_station/classification.py:243-253` loads `labels.txt` as the ordered output label list and rejects empty label files.
* `devices/pi-station/README.md:174` and `devices/pi-station/README.md:190-211` document the expected asset layout and explain that `aliases.json` is only needed when model labels do not already normalize to rules-preset item ids.

Current breadth is narrower in practice than the spec suggests.

* Repository search on 2026-03-07 found no checked-in `devices/pi-station/models/**`, no `.tflite` files under `devices/pi-station`, and no checked-in `labels.txt` or `aliases.json` there. The runtime is ready to consume real model labels, but the repo does not currently contain the live asset set.
* `devices/pi-station/tests/test_classification_tflite.py:70` and `devices/pi-station/tests/test_classification_tflite.py:89` only exercise 3 sample labels, `plastic bottle`, `banana peel`, and `apple core`, with alias mapping into preset ids. That is test evidence only, not a deployed catalog.
* `devices/pi-station/src/binsight_station/classification.py:101` and `devices/pi-station/src/binsight_station/classification.py:455-457` preserve deterministic `demo://...` classification. This means the repo still supports fake or injected detections for demos, but those detections only remain usable if the normalized item exists in the active preset.
* `devices/pi-station/src/binsight_station/main.py:348-349` and `devices/pi-station/src/binsight_station/rules.py:26-29` show the enforcement point: demo-injected items are normalized, then immediately checked against the preset mapping. Unsupported item ids fail.
* `devices/pi-station/src/binsight_station/live_demo.py:140-143` and `devices/pi-station/README.md:153` confirm the live demo path is intentionally a fake detection injector rather than proof of a broad real-model class list.

Conclusion: the item list lives today in the rules preset, the real-model label list is externalized into model assets that are not checked into this repo, and the repository currently demonstrates only a small real-label test set plus a preset-bounded fake detection path.

### Demo presets and seeded data

The demo preset is shared, versioned, and reused by the backend seed workflow.

* `services/backend-functions/scripts/seed-demo-data.mjs:440-472` loads `packages/rules/presets/demo-canada-ottawa.1.0.0.json` directly and uses that preset when seeding Firestore.
* `services/backend-functions/scripts/seed-demo-data.mjs:490` writes `activeRulesPresetId` into each seeded station document.
* `packages/contracts/schemas/domain/station-metadata.schema.json:16`, `packages/contracts/schemas/domain/station-metadata.schema.json:123-131`, and `packages/contracts/schemas/domain/station-metadata.schema.json:116-121` show that station metadata can surface preset summaries plus signage and layout variants for comparison analysis. This is a high-configurability contract surface, but actual values still come from the seed script or live station records.

The seeded dataset is broader than a single station demo, but it is still hand-authored and relatively small.

* `services/backend-functions/scripts/seed-demo-data.mjs:25-57` hardcodes 3 stations with 2 buildings, 2 floors, 3 locations, 2 signage variants, and 2 layout variants.
* `services/backend-functions/scripts/seed-demo-data.mjs:67-76` defines an `ITEM_TO_METHOD` object with the same 8 preset item ids.
* `services/backend-functions/scripts/seed-demo-data.mjs:111-118` defines only 6 actual event blueprints: `coffee-cup`, `plastic-bottle`, `banana-peel`, `paper-takeout-container`, `apple-core`, and `pizza-box`.
* `services/backend-functions/scripts/seed-demo-data.mjs:80-101` and `services/backend-functions/scripts/seed-demo-data.mjs:255-261` define 5 days of plans per station with 6 events per day. That yields 90 seeded disposal events total: 3 stations × 5 days × 6 events/day.
* `services/backend-functions/scripts/seed-demo-data.mjs:245` can mark `llmFallbackUsed` when the predicted item is `unknown-item` or `fallback-item`, but those two items never appear in `EVENT_BLUEPRINTS`, so the shipped seed dataset does not currently exercise fallback-tagged events.
* `services/backend-functions/scripts/seed-demo-data.mjs:339` and `services/backend-functions/scripts/seed-demo-data.mjs:361-419` materialize comparison rollups across `locationLabel`, `signageVariant`, and `layoutVariant`.
* `services/backend-functions/scripts/seed-demo-data.mjs:281-283` seeds one live status in a non-idle state with `currentDetectedItem: "plastic-bottle"`, while the other stations remain idle.
* `services/backend-functions/scripts/seed-demo-data.mjs:514` stamps seeded ledger entries with `source: "seed-demo-data"`.

Configurability assessment:

* High configurability: the preset document itself, because items, mappings, zones, and threshold are data files.
* Medium configurability: station metadata comparisons, because signage and layout are schema-backed fields but currently seeded from hardcoded station objects.
* Low configurability: event breadth and historical patterns, because `STATIONS`, `ITEM_TO_METHOD`, `STATION_SCENARIOS`, and `EVENT_BLUEPRINTS` are hardcoded in the seed script and require code edits to expand.

Docs point to the same workflow.

* `docs/firebase-rehearsal-runbook.md:122-123` documents the active preset id and version for the Pi runtime.
* `docs/firebase-rehearsal-runbook.md:214-229` documents the demo seed step and the `backend:seed:demo` command.

### Runtime options and device behavior

Pi runtime options are mostly environment-driven and moderately configurable.

* `devices/pi-station/.env.example:2-14` exposes `RULES_PRESET_ID`, `RULES_PRESET_VERSION`, `ITEM_CLASSIFIER_MODEL_DIR`, `PRESENCE_DEBOUNCE_SECONDS`, `DISPOSAL_TIMEOUT_SECONDS`, and `RESET_COOLDOWN_SECONDS`.
* `devices/pi-station/src/binsight_station/main.py:92-109` resolves those environment values into runtime settings.
* `devices/pi-station/src/binsight_station/main.py:162-173` wires the active rules preset, presence timing, and classifier model directory into the station runtime.
* `devices/pi-station/src/binsight_station/main.py:240-242` uses the active preset's `low_confidence_threshold` when classifying.
* `devices/pi-station/src/binsight_station/simulation.py:80-93`, `devices/pi-station/src/binsight_station/simulation.py:677`, and `devices/pi-station/src/binsight_station/simulation.py:731` expose presence debounce as both a simulation field and a CLI option. This is medium configurability because it is configurable for runtime and simulation, but only for the debounce window, not for higher-level power states.
* `devices/pi-station/README.md:280` and `devices/pi-station/README.md:285` document the model asset directory and stable-presence debounce window.

Person detection is present as a Pi-side state-machine gate, but the sensor side is still stubbed.

* `spec/binsight-spec.md:21-22` says the station waits in low-power mode and starts when an ultrasonic sensor detects a nearby person.
* `devices/pi-station/src/binsight_station/main.py:206-228` and `devices/pi-station/src/binsight_station/esp_client.py:260-261` show the real runtime gates session start on observed stable ESP presence frames.
* `devices/pi-station/src/binsight_station/session.py:19`, `devices/pi-station/src/binsight_station/session.py:56-62`, and `devices/pi-station/src/binsight_station/session.py:79-88` show that "person detection" is currently implemented as presence arming plus a configurable debounce timer.
* `firmware/esp8266-controller/src/main.cpp:14-17` hardcodes presence telemetry to `false` and sequence `0`.
* `firmware/esp8266-controller/src/main.cpp:54-64` returns that hardcoded presence payload from `GET /health`.
* `firmware/esp8266-controller/README.md:24` explicitly describes the current health endpoint as returning static no-sensor presence telemetry.

Power mode is not currently a configurable implementation surface.

* Repository searches across `devices/**` and `firmware/**` found no dedicated runtime or firmware setting for low-power mode beyond the spec wording.
* The nearest live configuration is `PRESENCE_DEBOUNCE_SECONDS`, which affects when the Pi treats presence as stable enough to begin identification.

Conclusion: person detection is referenced and partly implemented on the Pi side through ESP presence frames and debounce timing, but the firmware does not yet provide real sensor-backed presence data, and there is no repository-level configurable power-mode mechanism today.

### Spec alignment notes

The spec should be tightened in several places to reflect the current implementation state.

* `spec/binsight-spec.md:21-22` should be updated or annotated to distinguish intended behavior from current behavior. The codebase does not implement a configurable low-power mode, and the ESP firmware still returns static no-sensor presence telemetry.
* `spec/binsight-spec.md:115-119` should be updated to describe the actual seeded-data breadth today. The repo seeds multiple stations, floors, locations, signage variants, layout variants, and time periods, but it does not currently seed an explicit campaign or signage-change event log, and the event catalog is only 6 concrete blueprint items across 90 events.
* `spec/binsight-spec.md:123-128` should be updated with the concrete current owners of those configurable business rules: the rules preset file for the supported item set, mappings, zones, and threshold; station metadata for the active preset reference; and Pi `.env` for runtime timing and model-asset location.
* `spec/binsight-spec.md:104` states that the item set can expand later without changing core business flow. That is directionally true, but current practical expansion still requires either preset edits alone for fake/demo items or both preset edits and external model-label asset updates for real local inference.
* The spec could also note that the live demo path intentionally injects fake detected items through the real downstream flow, which is useful for rehearsals but should not be confused with the deployed real-model class catalog.

## Open Questions

* Should the repository check in a real `devices/pi-station/models/item_classifier/` asset set for demo reproducibility, or should those assets remain operator-supplied?
* Should the seed dataset start exercising `unknown-item` and `fallback-item` so the dashboard visibly demonstrates fallback behavior?
* Is low-power mode meant to become a real firmware feature, or should the spec be revised to describe the current presence-debounce-only behavior more accurately?