<!-- markdownlint-disable-file -->

## Context References

* Plan: `.copilot-tracking/plans/2026-03-07/pi-station-tflite-integration-plan.instructions.md`
* Research: `.copilot-tracking/research/2026-03-07/pi-station-tflite-integration-research.md`
* Supporting research:
  * `.copilot-tracking/research/subagents/2026-03-07/pi-station-ml-cv-pipeline.md`
  * `.copilot-tracking/research/subagents/2026-03-07/pi-tflite-inference-patterns.md`

## Phase 1 Details

* Add a runtime camera module under `devices/pi-station/src/binsight_station/` that can capture one still image via `rpicam-still` or `libcamera-still`.
* Extend `RuntimeSettings` with model directory, camera width/height, image format, and rotation controls.
* Add `.env.example` defaults that point to the model directory under `devices/pi-station/models/item_classifier/`.

## Phase 2 Details

* Replace the local deterministic classifier internals with:
  * model asset configuration
  * manifest loading
  * label loading
  * alias translation to rules item IDs
  * TensorFlow Lite interpreter lifecycle
  * image decode, resize, and tensor conversion
* Keep `demo://...` handling available for deterministic tests so existing behavioral tests remain lightweight.
* Fail clearly when runtime inference is requested and required assets are missing or incompatible.

## Phase 3 Details

* Add a frame source abstraction so runtime classification can use either:
  * explicit image source passed by tests
  * a newly captured Pi camera image when running live
* Update `StationRuntime` to build the classifier from settings and capture a live frame instead of defaulting to `demo://plastic-bottle`.
* Keep the session-state machine and rules mapping untouched except for the new classifier inputs.

## Phase 4 Details

* Add tests for:
  * manifest parsing
  * alias resolution
  * missing-model errors
  * explicit demo source preservation
  * runtime camera-frame invocation when no image source is injected
* Update docs with the model directory contract:
  * `model.tflite`
  * `manifest.json`
  * `labels.txt`
  * optional `aliases.json`

## Per-Step Success Criteria

* Code changes remain isolated to Pi runtime seams and documentation.
* No downstream TypeScript contracts or backend code are required for the integration to function.
* Validation can run on the current development machine using unit tests and smoke tests.