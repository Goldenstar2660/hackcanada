<!-- markdownlint-disable-file -->

## Scope

* Task: Replace the Raspberry Pi station's placeholder ML classification path with real on-device TensorFlow Lite inference so deployable quantized `.tflite` assets can be dropped into a known location without further code changes.
* Source of truth: `/spec/binsight-spec.md`
* Runtime surface: `devices/pi-station`

## Success Criteria

* The Pi runtime loads model assets from a stable, documented location.
* The runtime can capture a real image for classification when no explicit test image source is provided.
* Local inference uses TensorFlow Lite semantics, not deterministic demo item selection.
* The active rules preset remains the owner of low-confidence fallback behavior.
* Tests cover model asset loading, preprocessing/inference seams, and runtime integration without requiring physical Pi hardware.

## Evidence Log

* `devices/pi-station/src/binsight_station/classification.py` currently resolves `demo://...` sources to deterministic labels and otherwise returns `unknown-item`.
* `devices/pi-station/src/binsight_station/main.py` constructs `ClassificationPipeline()` directly and defaults to `demo://plastic-bottle` when no image source is provided.
* `devices/pi-station/src/binsight_station/training_capture.py` already contains Raspberry Pi camera CLI detection and image capture patterns using `rpicam-still` / `libcamera-still`.
* `devices/pi-station/pyproject.toml` currently has no TensorFlow Lite, NumPy, or Pillow dependencies.
* `packages/rules/presets/demo-canada-ottawa.1.0.0.json` defines the supported runtime item IDs and the low-confidence threshold.
* `devices/pi-station/README.md` references `devices/pi-station/.env.example`, but that file does not exist yet.

## Evaluated Approaches

### Option 1: Hardcode a single `.tflite` file path and assume one model shape

Rejected.

This would not satisfy the requirement that future quantized models can be swapped in without code changes. It also risks silent failures when input dtype, tensor shape, or label vocabulary changes.

### Option 2: Manifest-driven model directory with TensorFlow Lite interpreter metadata inspection

Selected.

This supports model swaps without code edits, allows aliasing model labels to rules preset item IDs, and keeps preprocessing tied to model assets instead of hardcoded assumptions.

### Option 3: Keep deterministic demo behavior as the default and add TFLite as an opt-in path

Rejected as the primary runtime path.

The spec says the Pi runs offline on-device inference. Demo behavior may remain for explicit tests, but it should not remain the default runtime behavior.

## Selected Design

* Introduce a model-asset directory contract under `devices/pi-station/models/item_classifier/`.
* Require `model.tflite` plus metadata assets that describe labels and preprocessing.
* Add a lightweight interpreter loader that prefers `tflite_runtime.interpreter` and falls back to `tensorflow.lite.Interpreter` when available.
* Inspect input/output tensor metadata at runtime and support common `uint8`, `int8`, and `float32` image classifiers.
* Use Pi camera CLI capture for the runtime classification image path when no explicit image source is injected.
* Preserve the existing `ClassificationResult` contract so session state, event creation, live status, and publishing logic remain unchanged.
* Keep low-confidence fallback decisions bound to the rules preset threshold from the spec.

## Implementation Boundaries

* In scope:
  * Pi runtime classification path
  * Pi runtime config and asset validation
  * Pi camera capture integration for item identification
  * Tests and docs required for this deployment path
* Out of scope for this cycle:
  * LLM fallback network implementation
  * Reworking backend normalization mismatches unrelated to inference
  * Training/export pipeline from `.pth` to `.tflite`
  * Production-grade disposal-zone CV beyond the current station runtime seams

## Actionable Next Steps

* Build a manifest-driven TFLite classifier and image loader.
* Add camera capture support for runtime item identification.
* Extend runtime settings with model and camera config.
* Add `.env.example` and update Pi runtime documentation.
* Add focused unit tests for manifest validation, tensor preprocessing, alias mapping, and runtime startup behavior.