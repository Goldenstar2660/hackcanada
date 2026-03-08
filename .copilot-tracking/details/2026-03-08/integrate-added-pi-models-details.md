<!-- markdownlint-disable-file -->

## Context References

* Plan: `.copilot-tracking/plans/2026-03-08/integrate-added-pi-models-plan.instructions.md`
* Research: `.copilot-tracking/research/2026-03-08/pi-station-model-integration-research.md`
* Subagent research: `.copilot-tracking/research/subagents/2026-03-08/pi-station-model-integration-points.md`

## Phase 1 Details

Target files:

* `devices/pi-station/src/binsight_station/classification.py`
* `devices/pi-station/src/binsight_station/main.py`
* `devices/pi-station/models/item_classification/aliases.json`

Operations:

* Allow model directories to resolve a default manifest when none exists.
* Accept alternate model filenames with `model_unquant.tflite` support.
* Preserve existing manifest behavior when present.
* Switch runtime default item model directory to `models/item_classification`.
* Add aliases for raw model labels to rules-preset item ids.

## Phase 2 Details

Target files:

* `devices/pi-station/src/binsight_station/main.py`

Operations:

* Add runtime settings for the hand-location model directory.
* Implement a camera-backed hand tracker that captures an image and runs zone inference only when ESP indicates a hand is present.
* Reuse the existing image source provider and TensorFlow Lite helpers rather than creating a separate inference stack.
* Preserve deterministic tracker injection for tests and simulation.

## Phase 3 Details

Target files:

* `devices/pi-station/tests/test_classification_tflite.py`
* `devices/pi-station/tests/test_runtime_session.py`
* `devices/pi-station/tests/test_smoke.py`
* `devices/pi-station/tests/test_live_demo.py`
* `devices/pi-station/README.md`
* `devices/pi-station/.env.example`

Operations:

* Add tests that cover optional manifests, alternate model filenames, and alias-based label mapping.
* Add a runtime test showing camera-backed hand-zone tracking while ESP still drives presence.
* Update docs and env defaults to match the integrated model directories and scope boundaries.

## Phase 4 Details

Target files and commands:

* `devices/pi-station/tests/test_classification_tflite.py`
* `devices/pi-station/tests/test_runtime_session.py`
* `devices/pi-station/tests/test_smoke.py`
* `devices/pi-station/tests/test_live_demo.py`
* `uv run pytest tests/test_classification_tflite.py tests/test_runtime_session.py tests/test_smoke.py tests/test_live_demo.py`

Operations:

* Run the targeted validation suite for the integration surface.
* Resolve any failures caused by the change set.
* Record any unresolved environment-specific blockers in the review artifacts.
