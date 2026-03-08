---
description: Plan to align the BinSight implementation with the current product spec across device, dashboard, and demo data
applyTo: '.copilot-tracking/changes/2026-03-07/system-spec-alignment-remediation-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: System Spec Alignment Remediation

## Overview

Align the live station runtime, taxonomy boundaries, dashboard surfaces, seeded demo data, and
supporting documentation to the current BinSight product spec while treating stale March 7 gap
research as context rather than source of truth.

## Objectives

### User Requirements

* Plan how to fix the project and ensure full alignment with the specs. Source: current
  conversation request on 2026-03-07.
* Prefer the authoritative spec over slightly stale research when they differ. Source: current
  conversation request and `spec/binsight-spec.md`.

### Derived Objectives

* Remove remaining implementation drift in the live disposal loop, especially placeholder sensing
  and stubbed fallback behavior. Derived from: spec Sections 1 through 6 and current gap research.
* Preserve the station guidance outputs required by the spec, including LED direction, LCD item and
  disposal feedback, and the LCD station counter defaults. Derived from: spec demo scope and
  station-counter business logic.
* Preserve active local rules-preset mapping as the authoritative path from classified item to
  disposal method and configured zone mapping while narrowing only the live detectable label set.
  Derived from: spec item-identification flow and configurable business rules.
* Keep the real on-device runtime limited to three detectable classes while preserving broad demo
  seed data and comparison stories. Derived from: user-scoped intent captured in research and
  current spec seeding requirements.
* Surface already-available contract fields plus station metadata, rules preset visibility, and
  filter coverage in the dashboard before expanding backend scope. Derived from: research showing
  backend and shared contracts are ahead of the UI.

## Context Summary

### Project Files

* `spec/binsight-spec.md` - authoritative behavior for runtime, event payloads, dashboard outputs,
  and seed data
* `devices/pi-station/src/binsight_station/main.py` - primary live runtime integration point
* `devices/pi-station/src/binsight_station/classification.py` - classifier and fallback behavior
* `firmware/esp8266-controller/src/main.cpp` - current placeholder hand telemetry source
* `services/backend-functions/scripts/seed-demo-data.mjs` - demo history and intervention seeding
* `apps/web/src/pages/live-monitoring.tsx` - live monitoring parity target

### References

* `.copilot-tracking/research/2026-03-07/system-spec-implementation-gap-research.md` - current
  gap inventory with some stale spec assumptions
* `.copilot-tracking/research/2026-03-07/system-spec-alignment-remediation-research.md` - planning
  baseline that reconciles the spec with existing research
* `.copilot-tracking/research/subagents/2026-03-07/system-spec-alignment-remediation-workstreams.md`
  - workstream ordering, file targets, and validation scope
* `.copilot-tracking/plans/2026-03-07/pi-station-tflite-integration-plan.instructions.md` -
  existing narrow device-model plan that this broader alignment plan absorbs

### Selected Defaults

* Pi owns camera-based hand presence and zone sensing end to end; ESP is reduced to LEDs, device
  health, and transport.
* The active Ottawa rules preset remains the disposal-mapping authority; the live Pi runtime is
  constrained to the three real detectable classes through model labels or runtime metadata.

## Implementation Checklist

### [ ] Implementation Phase 1: Lock the runtime boundary

<!-- parallelizable: false -->

* [ ] Step 1.1: Move hand sensing ownership to the Pi runtime
  * Details: `.copilot-tracking/details/2026-03-07/system-spec-alignment-remediation-details.md`
    (Lines 30-53)
* [ ] Step 1.2: Implement a working LLM fallback path for low-confidence classifications
  * Details: `.copilot-tracking/details/2026-03-07/system-spec-alignment-remediation-details.md`
    (Lines 55-77)

### [ ] Implementation Phase 2: Lock the live taxonomy and asset bundle

<!-- parallelizable: false -->

* [ ] Step 2.1: Verify the local model asset bundle and live runtime labels
  * Details: `.copilot-tracking/details/2026-03-07/system-spec-alignment-remediation-details.md`
    (Lines 83-104)
* [ ] Step 2.2: Use the active local rules preset for disposal and zone mapping while narrowing live labels
  * Details: `.copilot-tracking/details/2026-03-07/system-spec-alignment-remediation-details.md`
    (Lines 106-132)

### [ ] Implementation Phase 3: Complete the live perception and guidance loop

<!-- parallelizable: false -->

* [ ] Step 3.1: Implement Pi-side hand presence and zone tracking
  * Details: `.copilot-tracking/details/2026-03-07/system-spec-alignment-remediation-details.md`
    (Lines 138-161)
* [ ] Step 3.2: Keep event creation and live status spec-complete
  * Details: `.copilot-tracking/details/2026-03-07/system-spec-alignment-remediation-details.md`
    (Lines 163-186)
* [ ] Step 3.3: Preserve LED guidance, LCD feedback, and station counter behavior
  * Details: `.copilot-tracking/details/2026-03-07/system-spec-alignment-remediation-details.md`
    (Lines 188-212)

### [ ] Implementation Phase 4: Raise dashboard parity

<!-- parallelizable: false -->

* [ ] Step 4.1: Surface spec-required event and live-monitoring fields
  * Details: `.copilot-tracking/details/2026-03-07/system-spec-alignment-remediation-details.md`
    (Lines 218-241)
* [ ] Step 4.2: Surface station metadata, rules preset visibility, and filter coverage
  * Details: `.copilot-tracking/details/2026-03-07/system-spec-alignment-remediation-details.md`
    (Lines 243-265)
* [ ] Step 4.3: Surface analytics, leaderboard, and comparison outputs required by the spec
  * Details: `.copilot-tracking/details/2026-03-07/system-spec-alignment-remediation-details.md`
    (Lines 267-288)

After Phase 3 completes, Implementation Phase 4 and Implementation Phase 5 can execute in
parallel. Phase 4 remains internally sequential because it touches shared query and dashboard
presentation files. If Phase 5 introduces new shared contract fields, those contract updates must
land before Step 4.3 is finalized.

### [ ] Implementation Phase 5: Expand demo data and comparison support

<!-- parallelizable: true -->

* [ ] Step 5.1: Expand seeded demo narratives and demo-data flags
  * Details: `.copilot-tracking/details/2026-03-07/system-spec-alignment-remediation-details.md`
    (Lines 296-323)
  * Include multiple stations, floors, time periods, campaign dates, signage or layout variants,
    and confusion-item improvement patterns so before/after and A/B views are visibly testable.
* [ ] Step 5.2: Validate backend and contract packages touched in this phase
  * Details: `.copilot-tracking/details/2026-03-07/system-spec-alignment-remediation-details.md`
    (Lines 324-344)

### [ ] Implementation Phase 6: Documentation and validation

<!-- parallelizable: false -->

* [ ] Step 6.1: Update operator and developer documentation
  * Details: `.copilot-tracking/details/2026-03-07/system-spec-alignment-remediation-details.md`
    (Lines 345-366)
* [ ] Step 6.2: Run full validation and fix minor issues
  * Details: `.copilot-tracking/details/2026-03-07/system-spec-alignment-remediation-details.md`
    (Lines 367-390)

## Planning Log

See [system-spec-alignment-remediation-log.md](.copilot-tracking/plans/logs/2026-03-07/system-spec-alignment-remediation-log.md) for discrepancy tracking, implementation
paths considered, and suggested follow-on work.

## Dependencies

* Python environment for `devices/pi-station`
* PlatformIO for `firmware/esp8266-controller`
* TypeScript validation via `npx --yes -p typescript@5.8.2 tsc`
* Existing device ingress normalization in `services/backend-functions/src/domain/normalization.ts`

## Success Criteria

* The live station uses the current spec's always-on, camera-led workflow without placeholder hand
  telemetry or fake fallback labels, and it still drives LED guidance plus LCD counter behavior.
  Traces to: spec Sections 1 through 7.
* The project distinguishes the narrow three-class live runtime from broad seeded demo analytics
  without collapsing the demo story. Traces to: current conversation scope and spec seeding section.
* The dashboard exposes station metadata, active preset visibility, filtering, metrics, and event
  provenance fields required by the spec. Traces to: spec dashboard features and live monitoring.
* Seeded demo data supports intervention stories, contamination trends, and comparison workflows.
  Traces to: spec metrics and demo seeding sections.