<!-- markdownlint-disable-file -->

## Related Plan Reference

* `.copilot-tracking/plans/2026-03-07/pi-station-tflite-integration-plan.instructions.md`

## Implementation Date

* 2026-03-07

## Summary of Changes

* Replaced the Pi station placeholder classifier path with manifest-driven TensorFlow Lite inference.
* Added live image capture support for runtime classification without changing downstream session or event contracts.
* Documented the deployable model asset contract and validated the integration with Python tests.

## Added

* `devices/pi-station/src/binsight_station/camera_capture.py`
* `devices/pi-station/tests/test_classification_tflite.py`
* `.copilot-tracking/research/2026-03-07/pi-station-tflite-integration-research.md`
* `.copilot-tracking/research/subagents/2026-03-07/pi-station-ml-cv-pipeline.md`
* `.copilot-tracking/research/subagents/2026-03-07/pi-tflite-inference-patterns.md`
* `.copilot-tracking/plans/2026-03-07/pi-station-tflite-integration-plan.instructions.md`
* `.copilot-tracking/details/2026-03-07/pi-station-tflite-integration-details.md`
* `.copilot-tracking/plans/logs/2026-03-07/pi-station-tflite-integration-log.md`

## Modified

* `devices/pi-station/src/binsight_station/classification.py`
* `devices/pi-station/src/binsight_station/main.py`
* `devices/pi-station/tests/test_runtime_session.py`
* `devices/pi-station/tests/test_smoke.py`
* `devices/pi-station/pyproject.toml`
* `devices/pi-station/.env.example`
* `devices/pi-station/README.md`
* `docs/firebase-rehearsal-runbook.md`

## Removed

* None.

## Additional or Deviating Changes

* During review, the initial implementation exposed an NCHW normalization broadcasting defect in the TensorFlow Lite preprocessing path. The fix was applied in `devices/pi-station/src/binsight_station/classification.py` and locked in with an additional regression test.
* Local diffs in the training-capture files existed in the working tree and were left unchanged because they were outside the scope of this integration.

## Release Summary

* The Raspberry Pi station is now ready to run compatible quantized TensorFlow Lite models once `model.tflite`, `manifest.json`, `labels.txt`, and optional `aliases.json` are placed in the configured model directory.