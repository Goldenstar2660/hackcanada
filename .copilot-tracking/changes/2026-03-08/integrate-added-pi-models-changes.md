<!-- markdownlint-disable-file -->

## Related Plan

* `.copilot-tracking/plans/2026-03-08/integrate-added-pi-models-plan.instructions.md`

## Implementation Date

* 2026-03-08

## Summary

Integrated the checked-in `item_classification` and `hand_location` TensorFlow Lite models into the Pi runtime while explicitly leaving `hand_presence` unimplemented. Item inference now defaults to the added model directory, the loader accepts the checked-in `model_unquant.tflite` layout without requiring a manifest, and hand-zone tracking now comes from camera-backed inference while ESP remains the authoritative hand-presence and disappearance source.

## Added

* `devices/pi-station/models/item_classification/aliases.json`
* `.copilot-tracking/research/2026-03-08/pi-station-model-integration-research.md`
* `.copilot-tracking/plans/2026-03-08/integrate-added-pi-models-plan.instructions.md`
* `.copilot-tracking/details/2026-03-08/integrate-added-pi-models-details.md`
* `.copilot-tracking/plans/logs/2026-03-08/integrate-added-pi-models-log.md`

## Modified

* `devices/pi-station/src/binsight_station/classification.py`
* `devices/pi-station/src/binsight_station/main.py`
* `devices/pi-station/tests/test_classification_tflite.py`
* `devices/pi-station/tests/test_runtime_session.py`
* `devices/pi-station/.env.example`
* `devices/pi-station/README.md`
* `.gitignore`

## Removed

* None.

## Validation

* Ran `uv run pytest tests/test_classification_tflite.py tests/test_runtime_session.py tests/test_smoke.py tests/test_live_demo.py`
* Result: `24 passed, 0 failed`
* Warnings: expected `gpiozero` backend fallback warnings on Windows
* Blocker disposition: no remaining blockers; deferred items were accepted as non-blocking future work

## Release Summary

The Pi runtime now uses the real checked-in item model for classification and the checked-in hand-location model for zone inference, while preserving the existing ESP-driven presence and drop-detection flow defined by the spec.
