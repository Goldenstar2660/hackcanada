---
title: System Spec Alignment Remediation Details
description: Detailed execution notes for bringing the BinSight implementation into alignment with the current spec
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: how-to
keywords:
  - binsight
  - spec alignment
  - remediation
  - planning
estimated_reading_time: 8
---
<!-- markdownlint-disable-file -->

## Context Reference

Sources:

* `spec/binsight-spec.md`
* `.copilot-tracking/research/2026-03-07/system-spec-implementation-gap-research.md`
* `.copilot-tracking/research/2026-03-07/system-spec-alignment-remediation-research.md`
* `.copilot-tracking/research/subagents/2026-03-07/system-spec-alignment-remediation-workstreams.md`
* `.copilot-tracking/plans/2026-03-07/pi-station-tflite-integration-plan.instructions.md`

## Implementation Phase 1: Lock the Runtime Boundary

<!-- parallelizable: false -->

### Step 1.1: Move hand sensing ownership to the Pi runtime

Use the Pi camera path as the single perception source for item classification, hand presence,
and hand zone tracking. Narrow the ESP role to LED control, health reporting, and transport.
This matches the current spec's one-camera scope and avoids preserving placeholder ESP
telemetry as a production dependency.

Files:
* `devices/pi-station/src/binsight_station/main.py` - runtime wiring and perception loop ownership
* `devices/pi-station/src/binsight_station/session.py` - session transitions after always-on sensing
* `devices/pi-station/src/binsight_station/esp_client.py` - remove hand telemetry dependency
* `firmware/esp8266-controller/src/main.cpp` - narrow firmware payload to LED and device health
* `firmware/esp8266-controller/src/protocol.cpp` - update protocol fields accordingly

Success criteria:
* The runtime no longer depends on placeholder `handPresent` or `handZone` values from firmware
* The selected ownership boundary is documented consistently across runtime and firmware code

Context references:
* `spec/binsight-spec.md` (Lines 14-35) - always-on detection, guidance, and disposal detection
* `.copilot-tracking/research/subagents/2026-03-07/system-spec-alignment-remediation-workstreams.md` (Lines 31-69) - runtime workstream and alternatives

Dependencies:
* None

### Step 1.2: Implement a working LLM fallback path for low-confidence classifications

Replace the stubbed low-confidence fallback return with a working LLM fallback path. Full spec
alignment requires low-confidence classifications to route through fallback rather than recording
fallback as unavailable. If external integration is not ready, treat that as a blocking gap during
implementation and validation instead of a valid aligned end state.

Files:
* `devices/pi-station/src/binsight_station/classification.py` - fallback invocation and provenance
* `devices/pi-station/tests/test_classification_tflite.py` - fallback behavior coverage
* `devices/pi-station/tests/test_smoke.py` - end-to-end fallback expectations

Success criteria:
* Low-confidence classifications never emit placeholder labels
* Low-confidence classifications invoke the LLM fallback path when the confidence threshold is crossed
* Disposal events preserve `modelConfidence` and `llmFallbackUsed`

Context references:
* `spec/binsight-spec.md` (Lines 20-24, 43-51) - fallback threshold and event payload
* `.copilot-tracking/research/2026-03-07/system-spec-implementation-gap-research.md` (Lines 88-90, 165-166) - fallback is stubbed today

Dependencies:
* Step 1.1 completion

## Implementation Phase 2: Lock the Live Taxonomy and Asset Bundle

<!-- parallelizable: false -->

### Step 2.1: Verify the local model asset bundle and live runtime labels

Inspect the checked-in and local model assets before locking the runtime label contract. Confirm
that the live classifier bundle, manifest metadata, aliases, and labels resolve cleanly to the
intended three-class live model or record the exact gap before implementation begins.

Files:
* `devices/pi-station/src/binsight_station/classification.py` - runtime asset discovery and label loading
* `devices/pi-station/models/` or the configured model directory - runtime asset bundle location
* `devices/pi-station/tests/test_classification_tflite.py` - label and asset expectations
* `devices/pi-station/README.md` - documented asset contract for operators and developers

Success criteria:
* Implementation starts from a verified asset bundle or an explicit blocker list
* The runtime label set is confirmed before live-loop code is finalized

Context references:
* `.copilot-tracking/research/2026-03-07/system-spec-alignment-remediation-research.md` (Lines 54-57) - asset verification risk
* `.copilot-tracking/research/subagents/2026-03-07/system-spec-alignment-remediation-workstreams.md` (Lines 70-95) - taxonomy boundary and runtime-label decision

Dependencies:
* Step 1.2 completion

### Step 2.2: Use the active local rules preset for disposal and zone mapping while narrowing live labels

Preserve the broad demo-facing rules preset for seeded analytics and dashboard comparisons,
but constrain the real Pi runtime to exactly three detectable classes: granola bar,
aluminium can, and pickled radishes. Implement that constraint through model labels,
manifest metadata, or runtime settings rather than removing broader demo items from the preset.
Keep the active local rules preset as the authoritative mapping from item to disposal method and
from disposal method to the configured left, middle, or right zone.

Files:
* `packages/rules/presets/demo-canada-ottawa.1.0.0.json` - disposal mappings retained for broad demo items
* `devices/pi-station/src/binsight_station/classification.py` - runtime-supported label enforcement
* `devices/pi-station/tests/test_classification_tflite.py` - three-class runtime coverage
* `devices/pi-station/README.md` - explain runtime versus demo taxonomy

Success criteria:
* The live classifier accepts only the three intended real labels
* Runtime guidance and event creation resolve disposal method through the active rules preset
* Guidance and correctness logic honor the preset's configurable left, middle, or right zone mapping
* Seeded analytics can still use a wider catalog without violating runtime constraints

Context references:
* `spec/binsight-spec.md` (Lines 43-49, 72-82) - correctness logic and configurable business rules
* `.copilot-tracking/research/subagents/2026-03-07/system-spec-alignment-remediation-workstreams.md` (Lines 70-95) - taxonomy decision space

Dependencies:
* Step 2.1 completion

## Implementation Phase 3: Complete the Live Perception and Guidance Loop

<!-- parallelizable: false -->

### Step 3.1: Implement Pi-side hand presence and zone tracking

Add a real hand-tracking path on the Pi that continuously yields presence and last-known zone
from the single camera feed used by the station. Keep the session rule unchanged: a drop is
inferred when a present hand disappears.

Files:
* `devices/pi-station/src/binsight_station/main.py` - always-on loop integration
* `devices/pi-station/src/binsight_station/session.py` - drop inference inputs
* `devices/pi-station/src/binbuddy_station/` or `devices/pi-station/src/binsight_station/` - new hand-tracking module
* `devices/pi-station/tests/test_runtime_session.py` - session behavior with live perception inputs
* `devices/pi-station/tests/test_live_demo.py` - demo-grade live loop coverage

Success criteria:
* Hand presence and zone are produced by the Pi runtime instead of firmware placeholders
* The station remains always-on and only starts a session when an item is actually presented

Context references:
* `spec/binsight-spec.md` (Lines 15-18, 30-35, 94-103) - live loop and hardware roles
* `.copilot-tracking/research/subagents/2026-03-07/system-spec-alignment-remediation-workstreams.md` (Lines 57-69) - runtime order and validation

Dependencies:
* Step 1.1 completion
* Step 2.2 completion

### Step 3.2: Keep event creation and live status spec-complete

Audit the Pi emitters, backend normalization, and shared contracts so the live event path
always includes predicted item, disposal method, actual zone, success, confidence, and
fallback provenance, while preserving the established device-to-backend boundary.

Files:
* `devices/pi-station/src/binsight_station/main.py` - emitted payload fields
* `packages/contracts/src/index.ts` - shared TypeScript exports if schema changes are needed
* `packages/contracts/src/index.d.ts` - declaration parity for package consumers
* `services/backend-functions/src/domain/normalization.ts` - normalization of device payloads
* `services/backend-functions/src/firestore/collections.ts` - persisted field mapping if needed

Success criteria:
* Live and persisted events include every field required by the spec
* Backend normalization does not drop confidence or fallback provenance

Context references:
* `spec/binsight-spec.md` (Lines 43-61, 104-109) - event payload and technical notes
* `/memories/repo/binbuddy-architecture-facts.md` (Lines 1-6) - canonical contract and normalization boundary

Dependencies:
* Step 1.2 completion
* Step 3.1 completion

### Step 3.3: Preserve LED guidance, LCD feedback, and station counter behavior

Ensure the live runtime still drives the LED guidance signal, shows the current item and
disposal method on the LCD, and updates the station counter defaults called for by the spec.
Treat these station outputs as first-class alignment targets rather than incidental side effects
of the sensing refactor.

Files:
* `devices/pi-station/src/binsight_station/main.py` - guidance and counter state orchestration
* `devices/pi-station/src/binsight_station/esp_client.py` - LED command path after ownership changes
* `devices/pi-station/src/binsight_station/lcd_client.py` - item, method, and counter messaging
* `devices/pi-station/tests/test_lcd_client.py` - LCD message coverage
* `devices/pi-station/tests/test_runtime_session.py` - station output assertions during sessions

Success criteria:
* Correct-bin guidance is still emitted to LEDs for every classified attempt
* The LCD shows item, disposal method, and the default station counter state required by the spec

Context references:
* `spec/binsight-spec.md` (Lines 26-29, 33-39, 60-63) - user guidance and station counter
* `.copilot-tracking/research/2026-03-07/system-spec-alignment-remediation-research.md` (Lines 33-40) - remaining live-loop gaps and planning defaults

Dependencies:
* Step 3.1 completion
* Step 3.2 completion

## Implementation Phase 4: Raise Dashboard Parity

<!-- parallelizable: false -->

### Step 4.1: Surface spec-required event and live-monitoring fields

Expose live device status, current session state, model confidence, fallback provenance, current
detected item, current disposal decision, and latest event details anywhere the contracts already
provide them. Keep the live view honest about camera-state or sensing availability instead of
implying richer output than exists.

Files:
* `apps/web/src/features/events/event-history-panel.tsx` - event field visibility
* `apps/web/src/features/live/live-station-panel.tsx` - live station state details
* `apps/web/src/pages/live-monitoring.tsx` - current session and latest event presentation
* `apps/web/src/lib/query/dashboard-query.ts` - include any missing selected fields

Success criteria:
* Operators can see confidence and fallback provenance without inspecting raw payloads
* The live page shows device status and current session state explicitly
* The live page matches the spec's current monitoring requirements

Context references:
* `spec/binsight-spec.md` (Lines 84-88) - live monitoring page requirements
* `.copilot-tracking/research/subagents/2026-03-07/system-spec-alignment-remediation-workstreams.md` (Lines 96-118) - dashboard gaps

Dependencies:
* Step 3.2 completion

### Step 4.2: Surface station metadata, rules preset visibility, and filter coverage

Bring the station directory and history controls up to spec by exposing station status,
station metadata, the active rules preset per station, and filters for station, floor,
building, location, and time range.

Files:
* `apps/web/src/pages/stations.tsx` or the current station-directory route - station metadata view
* `apps/web/src/features/stations/` - station cards or table metadata surface
* `apps/web/src/features/events/event-history-panel.tsx` - filter controls and active preset display
* `apps/web/src/lib/query/dashboard-query.ts` - filter and grouping query coverage

Success criteria:
* Operators can see station status, metadata, and active rules preset from the dashboard
* Station, floor, building, location, and time-range filtering are explicit and testable

Context references:
* `spec/binsight-spec.md` (Lines 76-83) - dashboard business features
* `.copilot-tracking/research/2026-03-07/system-spec-alignment-remediation-research.md` (Lines 33-40) - dashboard and taxonomy findings

Dependencies:
* Step 3.2 completion
* Step 5.1 contract-field alignment if new intervention metadata fields are added

### Step 4.3: Surface analytics, leaderboard, and comparison outputs required by the spec

Expand analytics and comparison views so compliance, contamination, worst times, and bin purity
are visible as first-class outputs rather than only inferable through partial cards or raw tables.
Add the floor or building leaderboard as an explicit displayed KPI. Keep comparison paths aligned
with the richer seeded intervention stories from the demo-data phase.

Files:
* `apps/web/src/features/analytics/analytics-summary-panel.tsx` - headline and grouped metrics
* `apps/web/src/pages/analytics.tsx` - analytics layout and charts
* `apps/web/src/features/comparisons/comparison-overview.tsx` - comparison detail
* `apps/web/src/lib/query/dashboard-query.ts` - grouped query coverage as needed

Success criteria:
* The dashboard surfaces the full required metrics set described in the spec
* The floor or building leaderboard is displayed as a first-class output, not an implied view
* Comparison views show intervention effects, contamination shifts, or purity trends clearly

Context references:
* `spec/binsight-spec.md` (Lines 52-71, 76-83) - metrics and dashboard business features
* `.copilot-tracking/research/subagents/2026-03-07/system-spec-alignment-remediation-workstreams.md` (Lines 96-118) - presentation workstream

Dependencies:
* Step 3.2 completion

## Implementation Phase 5: Expand Demo Data and Comparison Support

<!-- parallelizable: true -->

### Step 5.1: Expand seeded demo narratives and demo-data flags

Upgrade seed generation so demo records explicitly model interventions, contamination trends,
station variation, and demo-data marking without being limited by the live three-class model.
Ensure the comparison surfaces from Phase 4 have the data they need without narrowing the live
runtime or weakening the demo story.
Seed multiple stations, floors, time periods, campaign dates, signage variants, layout variants,
and confusion-item improvement patterns so before/after and A/B-style comparisons are visible.

Files:
* `services/backend-functions/scripts/seed-demo-data.mjs` - richer seed scenarios and demo flags
* `services/backend-functions/src/analytics/query-service.ts` - analytics queries if new groupings are required
* `packages/contracts/schemas/domain/` - schema updates for any new seedable metadata
* `packages/contracts/src/index.ts` - exported types for new demo or intervention fields
* `packages/contracts/src/index.d.ts` - declaration parity for package consumers

Success criteria:
* Seeded data visibly supports before-and-after and A/B style comparisons
* Seeded records cover multiple stations, floors, time periods, and intervention dimensions
* Demo records can be filtered or labeled consistently in backend and frontend surfaces

Context references:
* `spec/binsight-spec.md` (Lines 62-71) - metrics and business insights
* `spec/binsight-spec.md` (Lines 89-93, 96-120) - demo data seeding and comparison requirements

Dependencies:
* Step 2.2 completion

### Step 5.2: Validate backend and contract packages touched in this phase

Run targeted backend and contracts validation for the seed-data and comparison-support changes
before the final workspace validation phase. This phase can run in parallel with Phase 4 after
Phase 3 completes.

Validation commands:
* `npx --yes -p typescript@5.8.2 tsc --noEmit -p services/backend-functions/tsconfig.json`
* `npx --yes -p typescript@5.8.2 tsc --noEmit -p packages/contracts/tsconfig.json`

Success criteria:
* Backend and contract changes typecheck before Phase 6 begins
* Contract exports remain synchronized between `index.ts` and `index.d.ts`

Dependencies:
* Step 5.1 completion

## Implementation Phase 6: Documentation and Validation

<!-- parallelizable: false -->

### Step 6.1: Update operator and developer documentation

Align docs and tracking artifacts to the selected runtime architecture, the three-class live model,
the broad demo taxonomy, the dashboard feature set, and the actual live-dashboard surface.

Files:
* `devices/pi-station/README.md` - runtime setup and sensing ownership
* `docs/firebase-rehearsal-runbook.md` - demo rehearsal steps and validation
* `README.md` - top-level project behavior summary if needed
* `.copilot-tracking/research/2026-03-07/system-spec-implementation-gap-research.md` - note stale spec assumptions if this file remains active context

Success criteria:
* Documentation no longer implies placeholder sensing is acceptable steady-state behavior
* Demo operators can rehearse the aligned live loop from capture through dashboard verification

Context references:
* `spec/binsight-spec.md` (Lines 9-18, 84-93) - demo scope and operator-facing outcomes
* `.copilot-tracking/research/subagents/2026-03-07/system-spec-alignment-remediation-workstreams.md` (Lines 133-142) - documentation cleanup

Dependencies:
* Steps 4.1 through 5.1 completion

### Step 6.2: Run full validation and fix minor issues

Execute focused device, firmware, frontend, backend, and workspace validation. Fix only minor
issues discovered during validation; record larger follow-up work instead of broadening scope.

Validation commands:
* `cd devices/pi-station && uv run pytest tests/test_classification_tflite.py tests/test_runtime_session.py tests/test_esp_http.py tests/test_smoke.py`
* `cd devices/pi-station && uv run binsight-realtime-sim`
* `cd firmware/esp8266-controller && pio run`
* `npx --yes -p typescript@5.8.2 tsc --noEmit -p apps/web/tsconfig.json`
* `npx --yes -p typescript@5.8.2 tsc --noEmit -p services/backend-functions/tsconfig.json`
* `just validate`

Success criteria:
* All edited surfaces pass targeted validation or have explicit documented blockers
* Remaining issues are small, localized, and ready for direct implementation follow-up

Dependencies:
* Step 6.1 completion

## Dependencies

* Python environment for `devices/pi-station`
* PlatformIO for `firmware/esp8266-controller`
* TypeScript compiler access via `npx --yes -p typescript@5.8.2 tsc`

## Success Criteria

* The implementation path aligns the live station behavior, dashboard, and seed data with the current spec
* The remaining open questions are reduced to deployment assets or deliberate follow-on work