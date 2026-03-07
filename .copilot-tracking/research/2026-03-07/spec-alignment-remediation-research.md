<!-- markdownlint-disable-file -->
---
title: Spec Alignment Remediation Research
description: Planning-oriented synthesis of the spec gap analysis and camera workflow clarification for Binsight remediation work.
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - spec
  - remediation
  - planning
  - camera-preview
estimated_reading_time: 8
---

## Task Research: Spec Alignment Remediation

Plan the implementation work needed to reconcile the repository with the Binsight spec, using the existing gap analysis as the main evidence base and the user's camera-preview clarification as an explicit requirement.

## Task Implementation Requests

* Create an implementation plan to resolve the spec mismatches identified in the current repository.
* Treat the website camera feed as out of scope for the product experience.
* Preserve a developer-only camera preview on the Raspberry Pi that is usable from a Windows SSH workflow.
* Keep the live monitoring page focused on spec-required operational state and make it genuinely real time.

## Scope and Success Criteria

* Scope: Planning only. This document does not change source code outside `.copilot-tracking/`.
* Assumptions:
  * `/home/handwash/Projects/hackcanada/spec/binsight-spec.md` remains the source of truth.
  * The camera-preview clarification from the user is treated as a current product requirement and aligns with the current spec wording.
  * Existing gap-analysis research remains valid unless superseded here.
* Success Criteria:
  * A single remediation path is selected.
  * The selected path resolves the dashboard camera contradiction.
  * The selected path sequences broader spec-alignment work across web, shared contracts, backend, Pi runtime, firmware, and demo-data surfaces.

## Research Inputs

### Primary sources

* `/home/handwash/Projects/hackcanada/spec/binsight-spec.md`
* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/2026-03-07/spec-implementation-gap-analysis-research.md`
* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/subagents/2026-03-07/camera-live-reconciliation-research.md`

### User override folded into planning

* The website should no longer expose a camera feed.
* No camera feed should leave the Pi for the product dashboard path.
* Developers still need a preview on the Windows machine from which they SSH into the Pi.

## Selected Planning Interpretation

The repository should be remediated toward a strict spec-alignment path rather than preserving the current operator-facing camera architecture.

This means:

* remove dashboard camera rendering and related product-facing flow
* keep live monitoring for device status, session state, detected item, disposal decision, and latest event
* implement a Pi-local developer preview workflow suitable for Windows-over-SSH
* reconcile the remaining runtime, analytics, event-history, demo-data, and configuration gaps from the original gap analysis

## Planning Consequences

### Website and live-monitoring consequences

* `apps/web` should stop rendering or navigating to camera-frame UI as part of the product flow.
* The live page should use the repository's existing subscription primitive instead of a one-shot snapshot.

### Shared-contract and backend consequences

* `cameraFeed` and latest-frame ingestion should be removed from the planned product path unless retained strictly as an internal debug-only seam.
* If retained for debugging, it should be isolated from the operator dashboard and clearly documented as non-product infrastructure.

### Pi runtime consequences

* Pi camera preview should be implemented as a developer-only local workflow, not a dashboard upload feature.
* A headless-friendly network stream viewed from Windows is the recommended preview approach.
* The remediation pass assumes a documented manual Windows viewer workflow is sufficient; automatic local-window launch is deferred.

### Publication-path assumption

* The Pi publication path should use the repository's existing backend-ingestion architecture rather than a direct Firebase client path.
* The remediation plan therefore assumes authenticated HTTP ingestion from the Pi into the existing backend surface, with on-device credential provisioning treated as part of the same implementation phase.

### Broader spec-alignment consequences

* The remaining gaps from the original research still need implementation work: real classification, fallback handling, disposal-zone detection, LCD behavior, low-power mode, bin-purity visualization, event-history pagination, demo-data markers and seeds, historical intervention metadata, and broader authored presets within v1 scope.

## Recommended Implementation Path

Use a phased remediation plan with one selected path:

1. Align the web live-monitoring experience with the spec and remove camera rendering.
2. Remove website-facing camera-feed transport from shared contracts and backend product flows while locking Pi publication to authenticated backend ingestion endpoints.
3. Add a developer-only Pi preview workflow for Windows-over-SSH using `rpicam-vid` on the Pi and a local Windows viewer such as VLC or `ffplay`.
4. Complete the larger device, firmware, analytics, and demo-data alignment gaps in parallel where file ownership allows.

## Deferred Questions

The planning path assumes manual developer launch of the preview on Windows is sufficient. If the team later wants automatic local-window launch behavior, that should be treated as a follow-on enhancement rather than a blocker for spec alignment.