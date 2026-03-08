---
title: Pi Station ML CV Pipeline Research
description: Research findings for the Raspberry Pi station classification pipeline, existing artifacts, runtime configuration, and TFLite integration seams
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - raspberry-pi
  - tflite
  - inference
  - computer-vision
estimated_reading_time: 8
---

## Research Scope

Research topics:

* How classification currently works in `devices/pi-station`
* Whether training and model artifacts already exist, and what formats they use
* Where runtime configuration should live
* What code paths, tests, and docs would need changes to support real on-device TensorFlow Lite inference with pluggable `.tflite` assets

Status: Complete

## Executive Summary

The current Raspberry Pi station runtime does not perform real model inference. Classification is a deterministic demo seam implemented in `devices/pi-station/src/binsight_station/classification.py` and orchestrated from `devices/pi-station/src/binsight_station/main.py`.

There are local data and model artifacts under `devices/pi-station/training_data/` and `devices/pi-station/work_output/`, but the existing model artifact is a PyTorch `.pth` checkpoint archive, not a deployable TensorFlow Lite model. No current code in the workspace loads `.pth`, `.tflite`, TensorFlow, Torch, or ONNX artifacts for runtime inference.

Runtime configuration for the Pi currently lives in environment variables loaded from `devices/pi-station/.env`, plus a separate JSON file at `devices/pi-station/config/training_capture.json` for dataset capture only. The README and Firebase runbook both reference `devices/pi-station/.env.example`, but that file does not appear to exist in the workspace.

The cleanest integration path for real on-device inference is to keep the session state machine, rules mapping, event creation, ESP transport, LCD rendering, and backend publication unchanged, and replace the current `ClassificationPipeline` implementation with a pluggable local inference adapter that loads a `.tflite` asset plus label metadata from Pi-local configuration.

## Current Classification Flow

Authoritative behavior from the product spec:

* The Pi should run offline on-device inference
* LLM classification is fallback only when local confidence is below a configurable threshold
* The Pi remains the live control-loop owner

Current implementation findings:

* `devices/pi-station/src/binsight_station/classification.py`
  * `ClassificationRequest` contains only `image_source` and `confidence_threshold`
  * `ClassificationPipeline.classify()` calls `_infer_local_item()` and then applies fallback logic based on confidence threshold
  * `_infer_local_item()` does not load or execute a model
  * `_infer_local_item()` only resolves a label when `image_source` starts with `demo://`
  * Non-demo image sources return `unknown-item`
  * `_infer_with_fallback()` is also a stub and returns `fallback-item`
* `devices/pi-station/src/binsight_station/main.py`
  * `StationRuntime` instantiates `ClassificationPipeline()` directly
  * `_advance_session_entry()` uses `image_source` or `DEFAULT_DEMO_CLASSIFICATION_SOURCE = "demo://plastic-bottle"`
  * After classification, the runtime maps `predicted_item` to a disposal method using `RulesPreset.disposal_method_for_item()`
  * Guidance, disposal detection, event emission, and publication all consume only the classification output, not raw model details

Implication:

* The runtime already has a usable seam for model integration, but the seam is too narrow for real image preprocessing, model path selection, label mapping, and optional inference metadata.

## Existing Training and Model Artifacts

Observed artifact directories:

* `devices/pi-station/training_data/`
  * Label folders present: `aluminium can`, `engaged`, `granola bar`, `pickled radishes`
  * Sample files are timestamped `.jpg` images such as `engaged_20260307_172607_901570.jpg`
* `devices/pi-station/work_output/`
  * `best_model.pth`
  * `crops/raw/` with the same label folders
  * `dataset/train/` with the same label folders
  * `dataset/val/` with the same label folders

Artifact format findings:

* `devices/pi-station/config/training_capture.json` defaults image output to JPEG in `training_data`
* `devices/pi-station/src/binsight_station/training_capture.py` writes captured images to `training_data/<label>/<label>_timestamp.<format>`
* `devices/pi-station/work_output/best_model.pth` is a zip-style serialized checkpoint archive
* Listing the checkpoint contents shows `best_model/data.pkl` plus tensor storage blobs under `best_model/data/*`
* This matches a PyTorch serialization shape, not a TensorFlow Lite flatbuffer

What is missing today:

* No `.tflite` files are present under `devices/pi-station`
* No label-map file is present for runtime model classes
* No runtime code loads model artifacts from disk
* No training/export script is present in this package to convert the existing checkpoint into `.tflite`

Important vocabulary mismatch:

* The active rules preset at `packages/rules/presets/demo-canada-ottawa.1.0.0.json` supports labels such as `plastic-bottle`, `banana-peel`, `coffee-cup`, `pizza-box`, `paper-takeout-container`, `apple-core`, `unknown-item`, and `fallback-item`
* The collected dataset folders currently use different labels such as `aluminium can`, `granola bar`, and `pickled radishes`
* A real model cannot be plugged into the current runtime unless model output labels are aligned with the active rules preset or a translation layer is introduced

## Runtime Configuration Surfaces

Current Pi runtime configuration lives in two different places for two different concerns:

* Environment variables loaded by `devices/pi-station/src/binsight_station/main.py`
  * `STATION_ID`
  * `RULES_PRESET_ID`
  * `RULES_PRESET_VERSION`
  * `ESP_ENDPOINT`
  * `FIREBASE_PROJECT_ID` or `BINSIGHT_FIREBASE_PROJECT_ID`
  * `FIREBASE_FUNCTIONS_REGION`
  * `FIREBASE_FUNCTIONS_BASE_URL`
  * `BINSIGHT_DEVICE_ID`
  * `BINSIGHT_DEVICE_SHARED_SECRET`
  * `BINSIGHT_PUBLICATION_TIMEOUT_SECONDS`
  * `PRESENCE_DEBOUNCE_SECONDS`
  * `DISPOSAL_TIMEOUT_SECONDS`
  * `RESET_COOLDOWN_SECONDS`
* Dataset capture config in `devices/pi-station/config/training_capture.json`
  * Only used by the training photo capture CLI
  * Not used by the station runtime entrypoint

Recommended runtime config location for TFLite support:

* Keep deployment and station wiring in `devices/pi-station/.env`
* Add model-runtime settings there or load them from a dedicated Pi-local runtime config file under `devices/pi-station/config/`
* Keep training and dataset capture config separate from runtime inference config

Recommended new runtime config fields:

* `MODEL_BACKEND=tflite`
* `MODEL_ASSET_PATH=devices/pi-station/models/current/model.tflite` or a Pi-local relative path resolved from project root
* `MODEL_LABELS_PATH=devices/pi-station/models/current/labels.json` or `.txt`
* `MODEL_INPUT_WIDTH`
* `MODEL_INPUT_HEIGHT`
* `MODEL_INPUT_COLOR_ORDER`
* `MODEL_NORMALIZATION_MEAN`
* `MODEL_NORMALIZATION_STD`
* `MODEL_TOP_K`
* Optional `MODEL_MIN_CONFIDENCE_OVERRIDE` only if the rules preset threshold should not remain authoritative

Recommendation on ownership:

* The low-confidence threshold should continue to come from the active rules preset unless there is a strong operational reason to split it
* The model asset path, label map, preprocessing parameters, and backend choice belong to Pi runtime configuration, not the shared rules preset

## Code Paths That Need Changes for Real TFLite Inference

Primary integration points:

* `devices/pi-station/src/binsight_station/classification.py`
  * Replace demo-only `_infer_local_item()` with a real local inference backend
  * Expand `ClassificationRequest` to carry image data or a capture reference that can be resolved to image bytes
  * Keep `ClassificationResult` as the primary contract if possible because the rest of the runtime already depends on it cleanly
  * Add asset loading, label resolution, preprocessing, and top-score selection here or behind a new adapter imported here
* `devices/pi-station/src/binsight_station/main.py`
  * `StationRuntime.__init__()` currently hardcodes `ClassificationPipeline()`
  * This should become injectable or factory-based so runtime settings can select a concrete inference backend and asset path
  * `load_runtime_settings()` should own new model-related runtime settings
  * `DEFAULT_DEMO_CLASSIFICATION_SOURCE` should either remain as a test-only default or be removed from the real runtime path
* `devices/pi-station/src/binsight_station/session.py`
  * No direct TFLite logic belongs here
  * The state machine can remain unchanged if classification still returns `predicted_item`, `confidence`, and `llm_fallback_used`
* `devices/pi-station/src/binsight_station/rules.py`
  * No structural changes required for TFLite itself
  * May need validation or helper support if a label-alias mapping layer is added between model classes and rules item names
* `devices/pi-station/src/binsight_station/events.py`
  * No required schema changes for basic TFLite support
  * Existing event payload already carries `predicted_item`, `model_confidence`, and `llm_fallback_used`
* `devices/pi-station/src/binsight_station/live_status.py`
  * No required schema changes for basic TFLite support
  * Optional future enhancement: include model asset version in `camera_feed`-like metadata or another optional field if operators need visibility into which model is active
* `devices/pi-station/src/binsight_station/publishers.py`
  * No required changes for basic local inference

Likely new code that would be needed:

* A TFLite runner module such as `devices/pi-station/src/binsight_station/inference_tflite.py`
* A Pi-camera capture or frame acquisition seam for runtime inference, separate from `training_capture.py`
* A label metadata file, likely under a new `devices/pi-station/models/` directory that is intentionally ignored by git unless a small demo asset is checked in
* Optional model manifest metadata describing input shape, labels, training date, and asset version

## Tests That Need Changes

Current tests prove the runtime by stubbing the classifier, not by running a model:

* `devices/pi-station/tests/test_smoke.py`
* `devices/pi-station/tests/test_runtime_session.py`
* `devices/pi-station/tests/test_runtime_serialization.py`
* `devices/pi-station/tests/test_esp_http.py`

Why this matters:

* Most runtime tests assign `runtime.classifier = StubClassifier(...)` or `RecordingClassifier(...)`
* That is good and should remain, because it keeps state-machine tests fast and deterministic

Recommended test changes:

* Keep the existing session and serialization tests mostly unchanged, because they test downstream behavior after classification
* Add new unit tests for the TFLite inference adapter only
* Add configuration tests for model-path loading and failure cases
* Add label-map tests to verify model class names resolve to rules-supported item names
* Add fallback tests proving low-confidence local inference triggers the fallback path exactly when threshold rules require it
* Add artifact-path tests proving missing `.tflite` assets fail clearly at startup rather than mid-session
* Add one narrow integration test that injects a fake local model backend into `ClassificationPipeline` and verifies `StationRuntime` still emits correct guidance and event payloads

Potentially affected test files:

* `devices/pi-station/tests/test_smoke.py` because it currently exercises the default classifier path and demo defaults
* `devices/pi-station/tests/test_runtime_session.py` only if runtime initialization changes from direct construction to a configurable classifier factory
* A new dedicated test file such as `devices/pi-station/tests/test_tflite_inference.py`

## Docs and Workspace Files That Need Changes

Direct Pi docs:

* `devices/pi-station/README.md`
  * Update the README to stop describing the runtime as a placeholder classifier once TFLite is integrated
  * Document model asset location, runtime env variables, label-map expectations, and failure modes
  * Clarify the distinction between training capture assets and runtime inference assets
* `docs/firebase-rehearsal-runbook.md`
  * Update the Pi `.env` creation example with any new model-related runtime variables
  * Add a step to deploy or copy the active `.tflite` asset and labels onto the Pi before startup

Config and packaging surfaces:

* `devices/pi-station/pyproject.toml`
  * Add the actual inference runtime dependency needed for on-device TFLite execution
  * There are currently no ML runtime dependencies, only `python-dotenv`
* `devices/pi-station/.env.example`
  * This file is referenced by the README and runbook but does not appear to exist in the workspace
  * It should be created and kept aligned with the supported runtime variables
* `.gitignore`
  * Already ignores `devices/pi-station/training_data/` and `devices/pi-station/work_output/`
  * A decision is still needed on whether deployable `.tflite` assets should be checked in, downloaded, or copied manually

Shared or backend files that probably do not need changes for basic TFLite adoption:

* `packages/contracts/src/index.ts`
* `services/backend-functions/src/domain/validation.ts`
* `services/backend-functions/src/domain/normalization.ts`
* `services/backend-functions/src/functions/ingest-event.ts`
* `services/backend-functions/src/functions/ingest-live-status.ts`

Reason:

* The existing device ingress and canonical contracts already carry the outputs a real local classifier would produce
* Switching from demo classification to TFLite can remain Pi-local if payload shape stays the same

## Missing Pieces and Risks

Missing pieces blocking real on-device TFLite inference today:

* No `.tflite` asset in the workspace
* No runtime inference dependency in `devices/pi-station/pyproject.toml`
* No runtime image acquisition path for actual classification frames in the station loop
* No label-map artifact or label-alias mapping layer
* No runtime config surface for model asset selection
* No `.env.example` file even though docs assume it exists
* No training or export path in the Pi package that converts the current `.pth` checkpoint into a `.tflite` runtime asset

Important adjacent inconsistency discovered during research:

* The Pi runtime currently publishes live-status phases like `detecting-person`, `identifying-item`, and `waiting-for-disposal` from `devices/pi-station/src/binsight_station/live_status.py`
* The backend device-ingress type and normalization layer still define device phases as `idle`, `detecting`, `guiding`, `waiting_for_disposal`, and `complete` in `packages/contracts/src/index.ts` and `services/backend-functions/src/domain/normalization.ts`
* This is not a TFLite-specific blocker for the classification seam itself, but it is a pre-existing payload compatibility risk worth correcting before a real end-to-end Pi rehearsal

## Recommended Integration Plan

Recommended implementation direction:

1. Keep `SessionStateMachine`, rules evaluation, event creation, and publication contracts unchanged.
2. Introduce a pluggable local inference backend behind `ClassificationPipeline`.
3. Load model asset path and preprocessing config from Pi-local runtime configuration.
4. Add a label-map or label-alias layer so model classes resolve to rules-supported item names.
5. Preserve existing fallback semantics using the rules preset low-confidence threshold.
6. Add dedicated inference tests while keeping most existing runtime state tests stub-based.
7. Update the Pi README, Firebase rehearsal runbook, and create the missing `devices/pi-station/.env.example`.

Most likely minimal-impact seam:

* `StationRuntime` should depend on an abstract classifier interface
* `ClassificationPipeline` should become a coordinator around a concrete local inference backend plus optional fallback backend
* Everything downstream of `ClassificationResult` can stay intact

## Evidence

Key files examined:

* `spec/binsight-spec.md`
* `devices/pi-station/pyproject.toml`
* `devices/pi-station/README.md`
* `devices/pi-station/config/training_capture.json`
* `devices/pi-station/src/binsight_station/classification.py`
* `devices/pi-station/src/binsight_station/main.py`
* `devices/pi-station/src/binsight_station/session.py`
* `devices/pi-station/src/binsight_station/rules.py`
* `devices/pi-station/src/binsight_station/events.py`
* `devices/pi-station/src/binsight_station/live_status.py`
* `devices/pi-station/src/binsight_station/publishers.py`
* `devices/pi-station/tests/test_smoke.py`
* `devices/pi-station/tests/test_runtime_session.py`
* `devices/pi-station/tests/test_runtime_serialization.py`
* `devices/pi-station/tests/test_esp_http.py`
* `packages/rules/presets/demo-canada-ottawa.1.0.0.json`
* `packages/contracts/src/index.ts`
* `services/backend-functions/src/domain/validation.ts`
* `services/backend-functions/src/domain/normalization.ts`
* `services/backend-functions/src/functions/ingest-event.ts`
* `services/backend-functions/src/functions/ingest-live-status.ts`
* `docs/firebase-rehearsal-runbook.md`
* `.gitignore`

Outstanding clarifying questions that research alone cannot resolve:

* Should deployable `.tflite` assets be committed to the repository, downloaded at provisioning time, or copied manually onto the Pi?
* Should model output classes match rules preset item ids directly, or should the runtime support a separate alias map?
* Is the intended local runtime dependency `tflite-runtime`, full TensorFlow, or another interpreter package for Raspberry Pi 5 deployment?
* Should the runtime capture a live frame locally for inference, or will another camera module provide an image path or image bytes to `ClassificationPipeline`?
