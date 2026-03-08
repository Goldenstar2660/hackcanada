<!-- markdownlint-disable-file -->

## Scope

Integrate the checked-in TensorFlow Lite models under `devices/pi-station/models` into the Raspberry Pi station runtime without expanding scope beyond the two model folders that actually contain assets.

## User Task

Integrate the added models into the existing workflow. Only implement the two models that are already present. Do not implement the missing model.

## Source Of Truth Alignment

The spec requires:

* on-device item classification
* hand-zone tracking across left, middle, and right
* hand-presence-based drop detection where the drop occurs on disappearance

This means the practical integration target is:

* `item_classification` for predicted item selection
* `hand_location` for zone selection while a hand is present
* existing ESP presence telemetry remains the authoritative hand-present signal until a hand-presence model exists

## Evidence

* `devices/pi-station/src/binsight_station/classification.py` already contains a real TensorFlow Lite image-classification loader and interpreter path.
* `devices/pi-station/src/binsight_station/main.py` wires only one model today and still defaults to `models/item_classifier`.
* `devices/pi-station/src/binsight_station/main.py` uses `DeterministicHandTracker` as the default hand-zone source.
* `devices/pi-station/src/binsight_station/esp_client.py` already provides `hand_present` from ESP presence frames.
* `devices/pi-station/models/item_classification` contains `labels.txt` and `model_unquant.tflite`.
* `devices/pi-station/models/hand_location` contains `labels.txt` and `model.tflite`.
* `devices/pi-station/models/hand_presence` is empty.
* `packages/rules/presets/demo-canada-ottawa.1.0.0.json` does not include the raw item-classifier labels, so aliases are required.

## Constraints

* Do not add hand-presence CV logic without a model.
* Preserve the current session and event semantics.
* Keep the backend and contract payloads unchanged.
* Keep deterministic/demo paths available for tests and live demo tooling.

## Selected Approach

1. Generalize the existing image classifier runtime so model directories can omit `manifest.json` and can use common TFLite filenames such as `model_unquant.tflite`.
2. Point runtime defaults at `models/item_classification` instead of the old placeholder folder.
3. Add an alias file for `item_classification` so its labels map onto supported rules-preset item ids.
4. Add a camera-backed hand-zone tracker that runs the `hand_location` model only when ESP reports `hand_present=True`.
5. Keep ESP presence as the authoritative disappearance signal for drop detection.
6. Update tests and documentation to match the new default model layout and hand-zone behavior.

## Rejected Alternatives

* Use `hand_location` as both presence and zone detector: rejected because there is no reliable no-hand class and the user explicitly said not to implement the missing model.
* Rename or duplicate binary model files in-place: unnecessary when the loader can support common model filenames.
* Keep the deterministic hand tracker as the default forever: rejected because it ignores an available real model and does not satisfy the user's request.

## Impacted Files

* `devices/pi-station/src/binsight_station/classification.py`
* `devices/pi-station/src/binsight_station/main.py`
* `devices/pi-station/tests/test_classification_tflite.py`
* `devices/pi-station/tests/test_runtime_session.py`
* `devices/pi-station/tests/test_smoke.py`
* `devices/pi-station/tests/test_live_demo.py`
* `devices/pi-station/README.md`
* `devices/pi-station/.env.example`
* `devices/pi-station/models/item_classification/aliases.json`

## Success Criteria

* The runtime can load the checked-in item-classification model directory without requiring file renames.
* The runtime defaults to the checked-in item-classification directory.
* Hand-zone selection comes from the checked-in hand-location model while ESP still controls hand presence.
* Existing deterministic and demo flows remain testable.
* Relevant tests pass.
