<!-- markdownlint-disable-file -->
---
applyTo: '.copilot-tracking/changes/2026-03-07/spec-alignment-remediation-changes.md'
---
# Implementation Plan: Spec Alignment Remediation

## Overview

Remediate the current Binsight implementation toward the updated spec by removing product-facing camera feed behavior, preserving developer-only Pi preview, and sequencing the remaining cross-surface gaps into executable phases.

## Objectives

### User Requirements

* Resolve the implementation inconsistencies against the spec. — Source: user request and `/home/handwash/Projects/hackcanada/.copilot-tracking/research/2026-03-07/spec-implementation-gap-analysis-research.md`
* Remove the website camera feed from the product experience. — Source: user request and `/home/handwash/Projects/hackcanada/spec/binsight-spec.md`
* Ensure there is no need for a camera feed to leave the Pi for the website path. — Source: user request
* Preserve a developer-only camera preview visible on the Windows machine used to SSH into the Pi. — Source: user request and `/home/handwash/Projects/hackcanada/spec/binsight-spec.md`

### Derived Objectives

* Make the live-monitoring page genuinely real time for spec-required operator state only. — Derived from: the current page uses a snapshot path despite an existing subscription primitive in research.
* Remove website-facing camera-feed fields from shared contracts and backend flows so the product data model matches the selected direction. — Derived from: current backend and contract camera seams exceed the selected product scope.
* Replace the current Pi no-op publisher seam with real event and live-status publication as part of spec alignment. — Derived from: the gap analysis identifies Firebase publication as incomplete in the current device runtime.
* Treat a documented manual Windows viewer workflow as sufficient for developer preview in this remediation pass. — Derived from: the headless Windows-over-SSH preview research and the user's developer-only requirement.
* Sequence the larger runtime, firmware, analytics, and demo-data gaps behind the camera decision so remediation is coherent across surfaces. — Derived from: the original gap analysis identified multiple unfinished behaviors beyond the camera contradiction.

## Context Summary

### Project Files

* `apps/web/src/pages/live-monitoring.tsx` - current live page uses an initial snapshot rather than a persistent subscription
* `apps/web/src/features/live/live-station-panel.tsx` - current live panel renders the operator-facing camera card
* `packages/contracts/src/index.ts` - canonical live-status types currently include camera-feed concepts
* `services/backend-functions/src/functions/ingest-camera-frame.ts` - backend handler exists for latest-frame publication
* `devices/pi-station/src/binsight_station/main.py` - Pi runtime is central to both preview boundaries and later runtime-behavior alignment
* `firmware/esp8266-controller/src/main.cpp` - firmware remains part of the disposal-detection remediation path

### References

* `/home/handwash/Projects/hackcanada/spec/binsight-spec.md` - Source-of-truth product behavior including developer-only preview
* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/2026-03-07/spec-alignment-remediation-research.md` - Planning-oriented synthesis for the selected path
* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/2026-03-07/spec-implementation-gap-analysis-research.md` - Primary repository-wide gap analysis
* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/subagents/2026-03-07/camera-live-reconciliation-research.md` - Focused camera and live-monitoring implementation evidence

### Standards References

* `#file:../../.github/instructions/source-of-truth.instructions.md` - The spec remains authoritative unless the user explicitly overrides it
* `#file:../../.vscode-server/extensions/ise-hve-essentials.hve-core-3.0.2/.github/instructions/hve-core/markdown.instructions.md` - Markdown authoring constraints for planning artifacts
* `#file:../../.vscode-server/extensions/ise-hve-essentials.hve-core-3.0.2/.github/instructions/hve-core/writing-style.instructions.md` - Writing style constraints for planning artifacts

## Implementation Checklist

### [ ] Implementation Phase 1: Align the web live-monitoring experience

<!-- parallelizable: false -->

* [x] Step 1.1: Remove dashboard camera-feed behavior and invalid live navigation
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 17-47)
* [ ] Step 1.2: Make the live page maintain a real-time subscription
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 49-77)
* [x] Step 1.3: Validate phase changes
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 79-86)
  * Run lint and build commands for the modified web surface

### [ ] Implementation Phase 2: Remove website-facing camera transport from product data flows

<!-- parallelizable: false -->

* [ ] Step 2.1: Lock Pi publication to authenticated backend ingestion and remove website-facing camera-feed contracts
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 92-125)
* [ ] Step 2.2: Remove Pi-side camera publication assumptions and implement real event/status publication
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 127-154)
* [ ] Step 2.3: Validate shared-contract, backend, and Pi publication changes
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 156-172)

### [ ] Implementation Phase 3: Add the developer-only Pi preview workflow

<!-- parallelizable: false -->

* [ ] Step 3.1: Implement the `rpicam-vid` plus Windows viewer preview path
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 178-207)
* [ ] Step 3.2: Preserve clear runtime boundaries between developer preview and product behavior
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 209-236)
* [ ] Step 3.3: Validate preview workflow changes
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 238-249)

### [ ] Implementation Phase 4: Close the remaining cross-surface spec gaps

<!-- parallelizable: false -->

* [ ] Step 4.1: Finish runtime and firmware behavior that remains simulated or partial
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 255-285)
* [ ] Step 4.2: Fill dashboard, analytics, and event-history gaps required for the demo
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 287-317)
* [ ] Step 4.3: Validate runtime, firmware, analytics, and demo-data changes
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 319-330)
  * Skip per-phase validation only if shared validation scope conflicts during execution

### [ ] Implementation Phase 5: Final validation

<!-- parallelizable: false -->

* [ ] Step 5.1: Run full project validation
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 336-349)
  * Execute all lint commands, builds, tests, Pi tests, and firmware compilation
* [ ] Step 5.2: Fix minor validation issues
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 351-353)
* [ ] Step 5.3: Report blocking issues
  * Details: `.copilot-tracking/details/2026-03-07/spec-alignment-remediation-details.md` (Lines 355-357)

## Planning Log

See [spec-alignment-remediation-log.md](../../plans/logs/2026-03-07/spec-alignment-remediation-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* `corepack` with workspace `pnpm` scripts
* `uv` for the Pi runtime environment
* PlatformIO for ESP8266 firmware validation
* Access to the current Firebase and contract code paths during implementation
* Device authentication and credential provisioning for Pi event and live-status publication
* Availability of `rpicam-vid` on the Pi and a documented Windows viewer workflow using VLC or `ffplay`

## Success Criteria

* The product dashboard no longer exposes camera feed behavior. — Traces to: user requirement and selected implementation path
* The website-facing product path no longer depends on any camera feed leaving the Pi. — Traces to: user requirement and Phase 2 validation scope
* Developers can still preview the Pi camera from a Windows SSH workflow without routing that preview through the website. — Traces to: user requirement and spec technical note
* The live page maintains real-time updates for the spec-required fields. — Traces to: spec live-monitoring requirements and camera-live reconciliation research
* High-impact spec mismatches are organized into executable implementation phases spanning web, shared contracts, backend, Pi runtime, firmware, and demo data. — Traces to: spec-implementation-gap-analysis research