<!-- markdownlint-disable-file -->

## Overview

Integrate the checked-in `item_classification` and `hand_location` TensorFlow Lite models into the Raspberry Pi station runtime while explicitly leaving `hand_presence` unimplemented.

## Objectives

* Load the added item-classification model from its current folder structure.
* Map item-classification labels to supported rules-preset item ids.
* Replace deterministic default hand-zone selection with camera-backed hand-location inference.
* Preserve ESP-based hand presence and drop detection semantics.
* Update tests and docs to reflect the new defaults.

## Context Summary

Applicable instructions and references:

* `.github/instructions/source-of-truth.instructions.md`
* `spec/binsight-spec.md`
* markdown tracking conventions from `markdown.instructions.md`
* markdown voice conventions from `writing-style.instructions.md`

## Dependencies

* Research artifact: `.copilot-tracking/research/2026-03-08/pi-station-model-integration-research.md`
* Subagent research artifact: `.copilot-tracking/research/subagents/2026-03-08/pi-station-model-integration-points.md`
* Python runtime under `devices/pi-station/pyproject.toml`

## Implementation Checklist

### Phase 1: Make item model assets loadable <!-- parallelizable: false -->

* [x] Update the classification asset loader to support optional manifests and common model filenames.
* [x] Change runtime defaults from `models/item_classifier` to `models/item_classification`.
* [x] Add item label aliases for the checked-in item-classification model.

### Phase 2: Wire hand-location inference into runtime <!-- parallelizable: false -->

* [x] Add a camera-backed hand-zone tracker that uses the `hand_location` model.
* [x] Keep ESP `hand_present` as the gating signal and disappearance trigger.
* [x] Preserve deterministic tracker injection for tests and simulation.

### Phase 3: Update tests and documentation <!-- parallelizable: true -->

* [x] Extend classification tests for optional-manifest and alternate-model-name support.
* [x] Add runtime tests for camera-backed hand-zone tracking.
* [x] Update `.env.example` and `devices/pi-station/README.md` to describe the new default model layout and current hand-presence boundary.

### Phase 4: Validate and sign off <!-- parallelizable: false -->

* [x] Run the relevant `devices/pi-station` pytest coverage for classification, runtime session, smoke, and live-demo flows.
* [x] Fix any regressions introduced by the integration work.
* [x] Record any remaining blockers before the task is considered complete.

## Validation Summary

* `uv run pytest tests/test_classification_tflite.py tests/test_runtime_session.py tests/test_smoke.py tests/test_live_demo.py`
* Result: `24 passed, 0 failed`
* Environment note: `gpiozero` emitted expected Windows fallback warnings because Raspberry Pi GPIO backends are unavailable in this environment.


## Success Criteria

* The runtime defaults to the checked-in item model folder and can use its existing `model_unquant.tflite` asset.
* The runtime uses the checked-in hand-location model for zone inference when a hand is present.
* The runtime still does not attempt to implement missing hand-presence inference.
* Relevant `devices/pi-station` tests pass.
