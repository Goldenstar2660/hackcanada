---
title: Pi Station Model Integration Points Research
description: Research findings for current item-classification loading, hand-tracking supply, model-folder integration feasibility, and impacted files for devices/pi-station
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: reference
keywords:
  - binsight
  - pi-station
  - item-classification
  - hand-tracking
  - tflite
estimated_reading_time: 9
---

## Research Scope

Research topics:

* How item-classification models are loaded today in `devices/pi-station`
* How hand tracking is supplied today in the Pi runtime
* Whether `devices/pi-station/models/item_classification/` and `devices/pi-station/models/hand_location/` can be integrated without a `hand_presence` model
* Which code files, tests, and docs would need changes for that integration

Status: Complete

## Executive Summary

The current Pi runtime already supports real TensorFlow Lite loading for item classification, but only through a strict asset contract that expects `model.tflite`, `manifest.json`, `labels.txt`, and optionally `aliases.json`. The runtime default still points at `devices/pi-station/models/item_classifier/`, not the newly added `devices/pi-station/models/item_classification/` folder.

Hand tracking is not camera-model-driven today. The runtime gets `hand_present` from ESP presence frames, ignores the ESP-provided `hand_zone`, and supplies zones through `DeterministicHandTracker`, which is a demo seam that cycles fixed zones. This is inconsistent with the product spec, which requires continuous hand-zone tracking and separate hand-presence detection.

The new `item_classification` and `hand_location` folders cannot be integrated as-is. The classification folder does not satisfy the current loader contract, and the hand-location model alone is not enough to preserve the current disappearance-based drop detection because the runtime still needs an independent source of `hand_present`. With no `hand_presence` model, the only viable near-term option is a hybrid design: keep presence from ESP and replace only the deterministic zone provider with a camera-backed hand-location adapter.

## Findings

### 1. Item classification loading today

Current loading path:

* `devices/pi-station/src/binsight_station/main.py`
  * `load_runtime_settings()` reads `ITEM_CLASSIFIER_MODEL_DIR`
  * Default path is `project_root / "models" / "item_classifier"`
  * `StationRuntime` constructs `ClassificationPipeline(model_dir=settings.item_classifier_model_dir)`
* `devices/pi-station/src/binsight_station/classification.py`
  * `ClassificationPipeline` lazily loads model assets on the first non-demo classification request
  * `_load_model_assets()` requires:
    * `manifest.json`
    * `model.tflite`
    * labels file from manifest, default `labels.txt`
    * aliases file from manifest, default `aliases.json`, unless explicitly disabled
  * `_default_interpreter_factory()` prefers `tflite_runtime.interpreter.Interpreter` and falls back to `tensorflow.lite.Interpreter`
  * The pipeline supports deterministic demo classification for `demo://...` sources without model assets
  * Low-confidence fallback is applied after local inference using the active rules preset threshold

Important constraints:

* The loader does not look for `model_unquant.tflite`
* The loader does not infer preprocessing from the model alone; it needs `manifest.json`
* Label outputs should align with rules preset item ids directly or through `aliases.json`

Current asset mismatch:

* `devices/pi-station/models/item_classification/` contains only:
  * `labels.txt`
  * `model_unquant.tflite`
* This folder is missing `manifest.json`
* This folder is missing a loader-visible `model.tflite`
* This folder may also need `aliases.json` if the labels do not already normalize to rules-supported item ids

### 2. Hand tracking supply today

Current hand-tracking flow is hybrid and mostly demo-driven:

* `devices/pi-station/src/binsight_station/esp_client.py`
  * Parses ESP `presence` frames into `PresenceTelemetry`
  * Captures both `hand_present` and `hand_zone`
* `devices/pi-station/src/binsight_station/main.py`
  * `_poll_esp()` only checks whether a new presence frame arrived
  * `_consume_hand_tracking()` passes only `self.esp_client.last_presence.hand_present` into `hand_tracking_input.observe(...)`
  * The runtime does not pass `self.esp_client.last_presence.hand_zone` into the session state machine
  * Default `hand_tracking_input` is `DeterministicHandTracker()`
* `devices/pi-station/src/binsight_station/session.py`
  * `track_hand()` records the latest zone while `hand_present=True`
  * A drop event is inferred when the previous state had `hand_present=True` and the new observation has `hand_present=False`
  * The actual disposal zone becomes the last tracked zone before disappearance

What this means in practice:

* Presence comes from the ESP today
* Zone does not come from the ESP or the camera today by default
* Zone comes from a deterministic software seam unless a custom `hand_tracking_input` is injected
* The existing runtime already has an injection point for replacing the zone supplier

### 3. Can the new model folders be integrated without a hand_presence model

For item classification:

* Yes, but not with the current folder contents alone
* `devices/pi-station/models/item_classification/` can be integrated after one of these changes:
  * Rename or copy `model_unquant.tflite` to `model.tflite` if that file is actually the deployable runtime artifact
  * Add `manifest.json`
  * Add `aliases.json` if the labels need translation to rules item ids
  * Update the runtime default path or `.env.example` to reference `models/item_classification`

For hand location without hand presence:

* Not as a full spec-compliant replacement
* `devices/pi-station/models/hand_location/` contains only:
  * `labels.txt` with `left`, `middle`, `right`
  * `model.tflite`
* `devices/pi-station/models/hand_presence/` is empty
* The current disposal logic depends on an explicit `hand_present` transition from true to false

Feasible near-term hybrid:

* Keep `hand_present` from the ESP presence signal
* Replace `DeterministicHandTracker` with a camera-backed adapter that produces only zone predictions from the hand-location model
* Continue using ESP disappearance to trigger the drop event

Not feasible without additional logic:

* Removing ESP presence and using only the hand-location model is not enough because there is no reliable way in the current code to know when the hand disappears
* Inferring absence from low-confidence or missing detections in the hand-location model would require a new confidence model, debounce logic, timeout policy, and tests. That is materially new behavior and outside the current implementation contract.

### 4. Files, tests, and docs that must change

Code files that would need changes for the recommended hybrid integration:

* `devices/pi-station/src/binsight_station/main.py`
  * Add runtime settings for hand-location model assets if the camera-backed tracker is introduced
  * Change the default item-classifier path from `models/item_classifier` to `models/item_classification`, or keep the current variable but point it at the new folder
  * Replace the default `DeterministicHandTracker()` with a real hand-location adapter when configured
  * Decide whether to continue ignoring the ESP `hand_zone` field or consume it as a fallback
* `devices/pi-station/src/binsight_station/classification.py`
  * Possibly widen the asset loader to support the checked-in asset naming if the project wants to keep `model_unquant.tflite`
  * More likely: keep the loader strict and normalize the assets instead
* New module likely required, for example `devices/pi-station/src/binsight_station/hand_tracking.py`
  * Load the hand-location TFLite model
  * Capture frames or reuse image sources
  * Produce `HandTrackingObservation(zone=..., hand_present=...)` or zone-only output joined with ESP presence
* `devices/pi-station/src/binsight_station/camera_capture.py`
  * May need extension if the hand-location loop needs repeated low-latency frames instead of one-shot stills
* `devices/pi-station/src/binsight_station/live_status.py`
  * `cameraFeedActive` is hard-coded to `False` today
  * This should change if a real camera-backed hand tracker is active

Tests that would need changes:

* `devices/pi-station/tests/test_classification_tflite.py`
  * Update helper asset paths if the canonical directory naming changes to `item_classification`
  * Add tests for real checked-in asset contract expectations if this repo intends to ship sample manifests
* `devices/pi-station/tests/test_runtime_session.py`
  * Replace deterministic-hand-tracker assumptions with injected camera-backed tracker behavior where appropriate
  * Keep the session-state assertions because the drop logic itself remains valid
* `devices/pi-station/tests/test_live_demo.py`
  * Demo helpers may stay synthetic, but expectations should be explicit about whether they bypass camera-backed tracking
* `devices/pi-station/tests/test_smoke.py`
  * Update any assumptions about the default model directory or classification source wiring
* `devices/pi-station/tests/test_runtime_serialization.py`
  * Update `cameraFeedActive` expectations if live status starts reporting an active camera-backed tracker
* New tests are needed for hand-location integration
  * Model asset loading and manifest validation
  * Zone prediction mapping
  * Hybrid behavior where ESP presence gates drop detection and the camera model supplies the latest zone
  * Failure modes for missing assets, missing camera frames, and low-confidence outputs

Docs and config that would need changes:

* `devices/pi-station/README.md`
  * Update the default model directory from `models/item_classifier` to the actual supported folder
  * Document the hand-location integration design and its dependency on ESP presence unless a hand-presence model is added later
  * Update the model asset layout examples to match the real checked-in folders
* `devices/pi-station/.env.example`
  * Update `ITEM_CLASSIFIER_MODEL_DIR=models/item_classifier`
  * Add any new env vars for hand-location assets if introduced
* Potentially `devices/pi-station/pyproject.toml`
  * Only if extra runtime dependencies are needed beyond the current `numpy`, `Pillow`, and `tflite-runtime`

## Recommended Approach

Recommended implementation path:

1. Normalize the item-classification assets to the current loader contract instead of weakening the loader.
2. Point the runtime default and docs at `devices/pi-station/models/item_classification/` once that folder contains `model.tflite`, `manifest.json`, `labels.txt`, and any required `aliases.json`.
3. Keep ESP as the authoritative hand-presence source for now.
4. Add a camera-backed hand-location adapter that replaces `DeterministicHandTracker` and produces the latest zone while ESP still drives disappearance.
5. Leave the session state machine and event schema unchanged.

Why this is the best fit for the spec and current code:

* It moves item identification onto real on-device inference as required by the spec
* It removes the obviously demo-only zone source without rewriting event logic
* It avoids inventing a new absence heuristic in place of a real hand-presence model
* It minimizes contract churn across backend payloads, rules mapping, LCD guidance, and event creation

## Scope Boundaries

In scope for the next implementation cycle:

* Wiring real item classification from the checked-in item-classification model assets once the asset contract is completed
* Replacing deterministic zone assignment with camera-backed hand-location inference while keeping ESP-based presence gating
* Updating tests and docs that encode the old `item_classifier` path and deterministic tracker assumptions

Out of scope for the next implementation cycle:

* Replacing ESP hand presence with CV-only disappearance detection
* Designing a new hand-absence heuristic from the hand-location model alone
* Changing disposal-event schema, rules schema, backend contracts, or dashboard metrics
* Multi-camera or production-grade physical verification, which the spec explicitly excludes from v1

## Evidence References

Primary evidence reviewed:

* `spec/binsight-spec.md`
* `devices/pi-station/src/binsight_station/classification.py`
* `devices/pi-station/src/binsight_station/main.py`
* `devices/pi-station/src/binsight_station/session.py`
* `devices/pi-station/src/binsight_station/esp_client.py`
* `devices/pi-station/src/binsight_station/live_status.py`
* `devices/pi-station/src/binsight_station/camera_capture.py`
* `devices/pi-station/tests/test_classification_tflite.py`
* `devices/pi-station/tests/test_runtime_session.py`
* `devices/pi-station/tests/test_live_demo.py`
* `devices/pi-station/tests/test_smoke.py`
* `devices/pi-station/tests/test_runtime_serialization.py`
* `devices/pi-station/README.md`
* `devices/pi-station/.env.example`
* `devices/pi-station/models/item_classification/labels.txt`
* `devices/pi-station/models/hand_location/labels.txt`

## Next Research

Recommended next research not completed in this session:

* Validate whether `model_unquant.tflite` in `item_classification` is actually deployable on the Pi or is only an export intermediate
* Inspect the expected input tensor shapes and normalization for the checked-in `hand_location/model.tflite`
* Decide whether the ESP `hand_zone` field should become a fallback source or remain ignored once camera-based tracking exists
* Confirm whether a persistent camera stream is required for acceptable hand-location latency on Raspberry Pi 5

## Clarifying Questions

Questions that require user or team input:

* Should the runtime treat the ESP `hand_zone` field as a supported source of truth, or should the camera model fully own zone selection once integrated?
* Is `devices/pi-station/models/item_classification/model_unquant.tflite` intended to be the production runtime artifact, or should the repo store a separate quantized `model.tflite` for deployment?