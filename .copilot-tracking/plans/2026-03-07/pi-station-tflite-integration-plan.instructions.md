<!-- markdownlint-disable-file -->

## Overview and Objectives

* User requirement: Add real on-device model support to the Raspberry Pi station so placeholder ML/CV logic is replaced with TensorFlow Lite inference and future quantized model assets can be dropped into a known location without more code changes.
* Derived objective: Replace the default `demo://...` classification path with a real image-capture plus TFLite inference path while preserving existing event, session, and publication contracts.
* Derived objective: Make model swaps configuration-driven through stable asset conventions, label aliases, and startup validation.

## Context Summary

* Source of truth: `spec/binsight-spec.md`
* Relevant instructions: `.github/instructions/source-of-truth.instructions.md`, `.github/instructions/hve-core/markdown.instructions.md`, `.github/instructions/hve-core/writing-style.instructions.md`
* Related code: `devices/pi-station/src/binsight_station/classification.py`, `devices/pi-station/src/binsight_station/main.py`, `devices/pi-station/src/binsight_station/training_capture.py`, `devices/pi-station/tests/`, `devices/pi-station/README.md`

## Implementation Checklist

### Phase 1: Add model asset and camera runtime seams <!-- parallelizable: false -->

* [x] Define runtime settings for model asset locations and camera capture parameters.
* [x] Add a reusable Pi camera capture module for single-frame runtime classification.
* [x] Update `devices/pi-station/pyproject.toml` with the required image-processing and TensorFlow Lite runtime dependencies.
* [x] Add a documented default model asset layout for the station runtime.

### Phase 2: Replace placeholder classifier with TensorFlow Lite inference <!-- parallelizable: false -->

* [x] Rework `ClassificationPipeline` to load model assets, labels, aliases, and preprocessing metadata.
* [x] Prefer `tflite_runtime` and fall back to TensorFlow Lite when available.
* [x] Support quantized and float input/output tensor handling with runtime metadata inspection.
* [x] Preserve explicit demo/test image sources as non-default test seams.

### Phase 3: Integrate runtime startup path <!-- parallelizable: false -->

* [x] Replace the default demo image source with real camera capture in `StationRuntime`.
* [x] Ensure classifier construction is driven from runtime settings.
* [x] Keep rules-threshold fallback behavior and downstream event/live-status contracts unchanged.

### Phase 4: Add tests and documentation <!-- parallelizable: true -->

* [x] Add unit tests for model manifest loading, label alias mapping, preprocessing, and missing-asset failures.
* [x] Update runtime tests to assert the runtime no longer depends on a default demo source.
* [x] Add a low-confidence fallback test that proves the active rules preset threshold controls fallback selection.
* [x] Add `.env.example` and update `devices/pi-station/README.md` with model asset layout and setup.
* [x] Update `docs/firebase-rehearsal-runbook.md` with the model asset copy step and new runtime environment variables.

## Planning Log Reference

* `.copilot-tracking/plans/logs/2026-03-07/pi-station-tflite-integration-log.md`

## Dependencies

* Research artifacts:
  * `.copilot-tracking/research/2026-03-07/pi-station-tflite-integration-research.md`
  * `.copilot-tracking/research/subagents/2026-03-07/pi-station-ml-cv-pipeline.md`
  * `.copilot-tracking/research/subagents/2026-03-07/pi-tflite-inference-patterns.md`
* Runtime dependencies likely required in `devices/pi-station/pyproject.toml`:
  * `numpy`
  * `Pillow`
  * `tflite-runtime` as the primary Pi runtime
  * TensorFlow Lite import fallback support for environments that already provide TensorFlow

## Success Criteria

* The station can classify a real camera frame using `.tflite` assets from the documented model directory.
* Swapping compatible model assets does not require source edits.
* Tests validate the TFLite integration path without real hardware.
* Documentation explains the required asset layout and environment variables.