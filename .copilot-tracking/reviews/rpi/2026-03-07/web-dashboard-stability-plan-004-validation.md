---
title: Web dashboard stability plan phase 4 validation
description: Validation of Phase 4 backend callable error handling against the implementation plan, changes log, research, and source-of-truth spec
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - rpi validation
  - phase 4
  - backend callable
  - dashboard stability
estimated_reading_time: 4
---

## Validation scope

* Plan: [.copilot-tracking/plans/2026-03-07/web-dashboard-stability-plan.instructions.md](../../plans/2026-03-07/web-dashboard-stability-plan.instructions.md)
* Changes log: [.copilot-tracking/changes/2026-03-07/web-dashboard-stability-changes.md](../../changes/2026-03-07/web-dashboard-stability-changes.md)
* Research: [.copilot-tracking/research/2026-03-07/web-dashboard-stability-research.md](../../research/2026-03-07/web-dashboard-stability-research.md)
* Source of truth: [spec/binsight-spec.md](../../../../spec/binsight-spec.md)
* Phase validated: `4`
* Overall status: `Passed`

## Phase requirements extracted

* Phase 4 requires the backend callable bridge to map `ValidationError` to Firebase `invalid-argument` instead of surfacing those failures as internal errors. Evidence: [.copilot-tracking/plans/2026-03-07/web-dashboard-stability-plan.instructions.md](../../plans/2026-03-07/web-dashboard-stability-plan.instructions.md#L44) and [.copilot-tracking/plans/2026-03-07/web-dashboard-stability-plan.instructions.md](../../plans/2026-03-07/web-dashboard-stability-plan.instructions.md#L46).
* Phase 4 requires backend validation or normalization helpers to add only the temporary scalar-to-array compatibility needed for dashboard filter inputs. Evidence: [.copilot-tracking/plans/2026-03-07/web-dashboard-stability-plan.instructions.md](../../plans/2026-03-07/web-dashboard-stability-plan.instructions.md#L47).
* Research narrows the required outcome to callable-boundary error mapping plus temporary compatibility normalization for stale callers. Evidence: [.copilot-tracking/research/2026-03-07/web-dashboard-stability-research.md](../../research/2026-03-07/web-dashboard-stability-research.md#L32), [.copilot-tracking/research/2026-03-07/web-dashboard-stability-research.md](../../research/2026-03-07/web-dashboard-stability-research.md#L33), and [.copilot-tracking/research/2026-03-07/web-dashboard-stability-research.md](../../research/2026-03-07/web-dashboard-stability-research.md#L59).

## Requirement-to-change comparison

* Requirement met: the changes log states Phase 4 backend stabilization was implemented and explicitly claims the callable error mapping and scalar-filter coercion. Evidence: [.copilot-tracking/changes/2026-03-07/web-dashboard-stability-changes.md](../../changes/2026-03-07/web-dashboard-stability-changes.md#L13), [.copilot-tracking/changes/2026-03-07/web-dashboard-stability-changes.md](../../changes/2026-03-07/web-dashboard-stability-changes.md#L14), and [.copilot-tracking/changes/2026-03-07/web-dashboard-stability-changes.md](../../changes/2026-03-07/web-dashboard-stability-changes.md#L15).
* Requirement met: the changes log lists exactly the two backend files expected for Phase 4. Evidence: [.copilot-tracking/changes/2026-03-07/web-dashboard-stability-changes.md](../../changes/2026-03-07/web-dashboard-stability-changes.md#L21) and [.copilot-tracking/changes/2026-03-07/web-dashboard-stability-changes.md](../../changes/2026-03-07/web-dashboard-stability-changes.md#L22).
* Requirement met: workspace changes outside these two files exist, but they align to Phases 1 through 3 rather than unlogged Phase 4 scope expansion. No additional backend Phase 4 implementation files were required based on the validated code paths.

## Verified file evidence

* The callable bridge now imports `ValidationError` and converts it to `HttpsError("invalid-argument", ...)` in the shared callable error path. Evidence: [services/backend-functions/src/runtime/firebase-bridges.ts](../../../../services/backend-functions/src/runtime/firebase-bridges.ts#L11), [services/backend-functions/src/runtime/firebase-bridges.ts](../../../../services/backend-functions/src/runtime/firebase-bridges.ts#L49), and [services/backend-functions/src/runtime/firebase-bridges.ts](../../../../services/backend-functions/src/runtime/firebase-bridges.ts#L54).
* The validator now normalizes known scalar dashboard filter fields into arrays before validation. Evidence: [services/backend-functions/src/domain/validation.ts](../../../../services/backend-functions/src/domain/validation.ts#L169), [services/backend-functions/src/domain/validation.ts](../../../../services/backend-functions/src/domain/validation.ts#L176), and [services/backend-functions/src/domain/validation.ts](../../../../services/backend-functions/src/domain/validation.ts#L177).
* The normalization is actually applied on both analytics and event-history callable inputs before the existing array validators run. Evidence: [services/backend-functions/src/domain/validation.ts](../../../../services/backend-functions/src/domain/validation.ts#L441), [services/backend-functions/src/domain/validation.ts](../../../../services/backend-functions/src/domain/validation.ts#L443), [services/backend-functions/src/domain/validation.ts](../../../../services/backend-functions/src/domain/validation.ts#L480), and [services/backend-functions/src/domain/validation.ts](../../../../services/backend-functions/src/domain/validation.ts#L482).
* The compatibility scope stays aligned with the contract surface. `AnalyticsQuery` and `EventHistoryQuery` are still canonically array-based contracts, and `attemptResults` remains array-based for event history. Evidence: [packages/contracts/src/index.ts](../../../../packages/contracts/src/index.ts#L159), [packages/contracts/src/index.ts](../../../../packages/contracts/src/index.ts#L228), and [packages/contracts/src/index.ts](../../../../packages/contracts/src/index.ts#L239).
* Workspace diagnostics show no current errors in the two edited backend files, which supports the changes log claim about targeted validation. Evidence: [.copilot-tracking/changes/2026-03-07/web-dashboard-stability-changes.md](../../changes/2026-03-07/web-dashboard-stability-changes.md#L32).

## Findings by severity

### Critical

* None.

### Major

* None.

### Minor

* None.

## Coverage assessment

* Coverage is complete for the two explicit Phase 4 checklist items.
* The implemented behavior matches the research recommendation to stop malformed callable input from surfacing as HTTP 500 while preserving canonical array contracts at the type level.
* The changes are consistent with the product spec because they improve dashboard access to event history and analytics without altering dashboard business behavior defined in [spec/binsight-spec.md](../../../../spec/binsight-spec.md).

## Residual risks

* This validation confirms static implementation evidence and clean file diagnostics, but it does not independently rerun deployed callable integration tests from the research recommendations.
* Temporary scalar compatibility remains a rollout aid. Once stale callers are removed, the team should decide whether to retain or remove that normalization path.

## Clarifying questions

* None.
