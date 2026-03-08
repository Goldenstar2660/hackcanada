<!-- markdownlint-disable-file -->

## Discrepancy Log

### Unaddressed Research Items

* None. DR-01 was closed by adding an explicit validation and sign-off phase.

### Plan Deviations from Research

* None after validation.

## Implementation Paths Considered

Selected path:

* Use the existing classifier/inference stack as the base.
* Extend it just enough to support the checked-in asset layout.
* Keep ESP presence intact and add only hand-zone CV inference.

Alternatives rejected:

* Invent a no-hand heuristic from `hand_location` outputs.
* Keep the runtime on the old `item_classifier` folder name and require manual user-side file relocation.

## Follow-On Work Candidates

* Add a real `hand_presence` model once assets exist.
* Decide whether ESP `hand_zone` should become a fallback source.
* Capture verified preprocessing metadata for the real models on Raspberry Pi hardware.

## Blocker Disposition

* No remaining blockers.
* The follow-on work candidates above are accepted as non-blocking future work.
