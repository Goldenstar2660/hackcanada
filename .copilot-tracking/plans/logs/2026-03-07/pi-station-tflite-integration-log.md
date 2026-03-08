<!-- markdownlint-disable-file -->

## Discrepancy Log

### Unaddressed Research Items

* None after validation.

### Plan Deviations from Research

* None after validation.

## Implementation Paths Considered

* Selected: Manifest-driven TFLite classifier with Pi camera capture and runtime settings.
* Rejected: Hardcoded single-model integration with fixed tensor assumptions.
* Rejected: Keeping deterministic demo classification as the default runtime path.

## Suggested Follow-on Work

* Add a real LLM fallback path for low-confidence classifications.
* Add model/version metadata to live status or event payloads if operators need runtime observability.
* Reconcile Pi live-status phase names with backend normalization if end-to-end device ingress starts failing.