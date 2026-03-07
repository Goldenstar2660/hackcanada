---
title: Spec Implementation Gap Analysis
description: Research comparing the current Binsight implementation against the product spec to identify scope, logic, and architecture mismatches.
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - spec
  - implementation
  - gap analysis
  - research
estimated_reading_time: 12
---

<!-- markdownlint-disable-file -->

## Task Research: Spec Implementation Gap Analysis

Review the full smart waste-sorting station implementation against the Binsight spec as the source of truth. Identify mismatches in scope, business logic, live monitoring behavior, dashboard behavior, hardware responsibilities, configuration rules, and non-goals. Call out both over-implementation beyond the spec and missing required behavior.

## Task Implementation Requests

* Compare the implementation across web, backend, shared packages, Raspberry Pi runtime, and ESP8266 firmware to the spec.
* Identify implemented behavior that is absent from or conflicts with the spec.
* Identify spec-required behavior that appears to be missing or only partially implemented.
* Recommend one evidence-based interpretation of the current implementation state.

## Scope and Success Criteria

* Scope: Repository analysis only, focused on the current implementation in apps, services, devices, firmware, packages, infra, and docs where relevant. Excludes speculative future roadmap work unless already represented in the repository.
* Assumptions:
  * The authoritative source of truth is /home/handwash/Projects/hackcanada/spec/binsight-spec.md.
  * The repository may contain scaffolding, placeholders, or partial implementations.
  * Absence from discovered code or configuration is treated as likely missing, not definitively impossible.
* Success Criteria:
  * Each major surface is compared against the spec with evidence.
  * Gaps are separated into missing-from-implementation, extra-beyond-spec, and direct contradictions.
  * One recommended overall assessment is selected and justified.

## Outline

1. Gather implementation evidence by surface.
2. Map discovered behavior to spec sections.
3. Evaluate mismatch categories.
4. Select the best-supported overall assessment.

## Potential Next Research

* Validate any ambiguous runtime behavior through tests or execution paths discovered by subagents.
  * Reasoning: Static structure may hide behavior behind abstractions or unexecuted paths.
  * Reference: /home/handwash/Projects/hackcanada/devices/pi-station and /home/handwash/Projects/hackcanada/services/backend-functions

## Research Executed

### File Analysis

* `.copilot-tracking/research/subagents/2026-03-07/web-surface-research.md`
  * Web routes, dashboard pages, filters, analytics panels, comparisons, and live monitoring were checked against the dashboard and live-monitoring sections of the spec.
* `.copilot-tracking/research/subagents/2026-03-07/backend-shared-research.md`
  * Backend functions, shared contracts, analytics materialization, rules presets, and Firebase configuration were checked against the event, analytics, configuration, and demo-data requirements in the spec.
* `.copilot-tracking/research/subagents/2026-03-07/device-firmware-research.md`
  * Raspberry Pi station runtime and ESP8266 firmware were checked against the session flow, hardware split, disposal detection, and fallback-classification requirements in the spec.

### Code Search Results

* `demo`
  * Authored demo-oriented rules data exists in `packages/rules/presets/demo-canada-ottawa.1.0.0.json`, but subagent research did not find comparable authored demo seed datasets, demo markers, or demo filters for events and stations.
* `cameraFeed`
  * Camera-feed support exists in backend contracts and live monitoring, even though the spec says camera preview is developer-only.
* `subscribeToStation`
  * The live data library supports subscription semantics, but the web page currently loads an initial snapshot rather than maintaining a real-time UI subscription.
* `lowConfidenceThreshold`
  * Rules and control-flow support for threshold-driven fallback exist, but the actual fallback classification remains a placeholder implementation.

### External Research

* None required. This task is repository- and spec-centered.

### Project Conventions

* Standards referenced: source-of-truth.instructions.md, markdown.instructions.md, writing-style.instructions.md
* Instructions followed: Spec is treated as authoritative; research output is stored under .copilot-tracking/research/.

## Key Discoveries

### Project Structure

The repository already spans the four surfaces implied by the spec: the dashboard website in `apps/web`, the Raspberry Pi runtime in `devices/pi-station`, the ESP8266 controller firmware in `firmware/esp8266-controller`, and shared backend or contract infrastructure in `services/backend-functions`, `packages/contracts`, `packages/rules`, `packages/analytics`, and `infra/firebase`. That matches the high-level system shape described in the spec.

The implementation is not uniformly mature across those surfaces. The shared contracts, backend ingestion, analytics rollups, and most dashboard routes are materially implemented. The device stack preserves the intended session-state shape, but several hardware-critical behaviors are still stubbed or simulated.

### Implementation Patterns

The strongest pattern is a contract-first architecture. Shared schemas in `packages/contracts` define the canonical event, live-status, rules-preset, station-metadata, and analytics shapes, and the backend normalizes device ingress into those types before persisting to Firestore.

The dashboard is read-model driven. Historical analytics and event history are retrieved through backend callable functions, while live monitoring reads the Firestore live-status document directly. This split is coherent, but the live UI currently stops at an initial snapshot instead of maintaining a real-time subscription.

The station runtime is built around a clean software state machine, but its surrounding integrations are still demo-grade. Classification, fallback inference, camera capture, Firebase publishing, and end-to-end disposal-zone detection are either placeholders, seams, or partial implementations.

### Complete Examples

```text
Aligned vertical slice:

- Device event and live-status contracts exist.
- Firebase ingestion and analytics materialization exist.
- Web pages for stations, analytics, comparisons, event history, and live monitoring exist.

Largest incomplete loop:

- Real camera capture -> local inference -> fallback call -> independent drop-zone detection -> Firebase publication -> true real-time live page
```

### API and Schema Documentation

The disposal-event shape is well aligned to the spec in shared contracts and backend normalization. The live-station-status contract also aligns broadly with the spec's live monitoring fields. Rules presets model supported items, item mappings, zone mappings, and low-confidence thresholds as required.

The biggest schema-level concern is historical context and demo data. The current contracts do not model demo-data markers, intervention metadata, campaign dates, or historical effective windows for station metadata. That weakens the spec's before/after and A/B analysis requirements, especially for event-history views.

### Configuration Examples

```text
Implemented configuration surfaces:

- Rules preset: supported items, itemMappings, zoneMapping, lowConfidenceThreshold
- Station metadata: building, floor, location, signageVariant, layoutVariant, activeRulesPresetId
- Analytics filters: station, floor, building, location, time range, signage, layout

Missing or thin configuration surfaces:

- Multiple authored city or province presets
- Demo-data marker and filter configuration
- Historical intervention metadata
```

## Technical Scenarios

### Full Spec-to-Implementation Alignment Assessment

The best-supported assessment is that the repository is a partially implemented vertical slice that already matches the spec's architecture and much of its data model, but does not yet fully satisfy several critical product behaviors. It is farther along than a scaffold, especially in backend, contracts, analytics, and dashboard breadth, but it is not spec-complete because core runtime behavior and some dashboard/live features remain simulated, partial, or out of scope.

**Requirements:**

* Cover scope, business logic, live monitoring, dashboard behavior, hardware boundaries, configuration rules, and non-goals.

**Preferred Approach:**

* Treat the current codebase as a strong contract-and-dashboard foundation with partial device implementation, then reconcile spec deviations explicitly rather than assuming current behavior is authoritative.

```text
Selected interpretation: partial vertical slice with strong backend/contracts, broad dashboard coverage, and demo-grade device/runtime gaps.

Why this is the best fit:
- Too much real implementation exists to call the repo scaffolding.
- Too many core behaviors remain stubbed or partial to call it spec-complete.
- A few implemented features actively exceed or conflict with the spec and need explicit product decisions.
```

**Implementation Details:**

What is already aligned to the spec:

* Scope and surfaces: The repo contains the website, Pi runtime, ESP8266 firmware, shared contracts, rules, analytics, and Firebase backend described by the spec.
* Event model: Shared contracts and backend normalization implement the spec-required disposal event fields.
* Core dashboard breadth: Stations, station detail, event history, analytics, comparisons, and live monitoring routes are present.
* Analytics model: Total attempts, total correct sorts, first-try correct rate, compliance score, contamination, worst times, leaderboard, and grouped analytics are modeled and computed.
* Configuration rules: Rules presets and station metadata cover supported items, item mappings, zone mapping, thresholds, and station metadata.
* Hardware split: Pi and ESP communicate over Wi-Fi, with the ESP handling indicator and proximity sensing while the Pi handles orchestration and LCD output.

What the spec requires that still appears missing or only partial:

* Real camera capture and on-device inference are not implemented end to end; the classifier still returns stubbed labels.
* LLM fallback is wired by control flow but not implemented as a real fallback classification path.
* Disposal detection is correct in the state machine but not in real hardware flow; the runtime synthesizes disposal and the firmware does not detect left, middle, and right zones.
* The live monitoring page is not truly real time at the UI layer because it does not keep an active subscription after the initial snapshot.
* Bin purity is computed but not rendered in the dashboard UI.
* Event-history pagination is only partial because the backend returns a cursor but the UI does not let users page forward.
* Demo-data seeding, demo-data markers, and demo-data filtering required by the spec are largely absent.
* Historical intervention support for before/after and A/B analysis is thin; contracts do not model campaign dates, signage changes, or historical metadata windows.
* Authored rules coverage is narrow; only one Ottawa preset is present.
* The LCD counter behavior does not match the spec's stated default of showing the correct bin during a session and total correct sorts.
* Low-power mode is not implemented in the reviewed Pi or firmware code.
* The default Pi publication adapter is still a no-op seam, so Firebase publication is not fully represented in the reviewed device runtime itself.

What is implemented that is missing from or beyond the spec:

* Operator-facing camera-frame support exists in backend contracts and the live monitoring surface even though the spec says camera preview is developer-only.
* The firmware supports extra protocol or telemetry details such as numeric `step`, `transport`, and `failurePolicy`, which are not part of the product spec.
* The firmware contains environment-specific Wi-Fi fallback behavior that is outside the spec.

What directly conflicts with the spec or with repository contracts:

* Camera preview in the dashboard conflicts with the spec's statement that camera preview is developer-only.
* Firmware `handZone` telemetry reflects the guided LED zone rather than an independently observed disposal zone, which conflicts with the intended actual-bin detection logic.
* The Pi `cameraFeed` payload uses snake_case keys that do not match the camelCase shared schema if that payload is ever populated.
* The live navigation includes a placeholder dynamic route entry, indicating unfinished behavior in a core operator flow.

Recommended interpretation for planning:

* Keep the spec as the product truth.
* Treat current backend/contracts as the most mature foundation.
* Treat the device runtime and live-monitoring path as partially implemented and still requiring spec-driven completion.
* Decide explicitly whether camera-feed support should be removed from product surfaces or added to the spec.

```text
Primary evidence anchors:

- Web surface: .copilot-tracking/research/subagents/2026-03-07/web-surface-research.md
- Backend/shared: .copilot-tracking/research/subagents/2026-03-07/backend-shared-research.md
- Device/firmware: .copilot-tracking/research/subagents/2026-03-07/device-firmware-research.md
```

#### Considered Alternatives

Alternative 1: Treat the implementation as mostly spec-complete.

Rejected because the runtime still uses stub classification and simulated disposal, the web live page is not truly real time, and demo-data support is largely absent.

Alternative 2: Treat the implementation as only scaffolding.

Rejected because the contracts, Firebase handlers, analytics materializers, and dashboard routes are already materially implemented and aligned with large parts of the spec.

Alternative 3: Treat the implementation as a partial vertical slice with a few product deviations.

Selected because it best matches the evidence across all surfaces.