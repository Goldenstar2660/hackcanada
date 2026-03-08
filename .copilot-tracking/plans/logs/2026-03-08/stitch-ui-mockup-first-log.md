---
title: Stitch UI Mockup-First Planning Log
description: Discrepancy tracking, implementation path decisions, and follow-on work for the mockup-first Stitch UI plan
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: overview
keywords:
  - stitch
  - ui
  - planning-log
  - mockup-first
estimated_reading_time: 7
---
<!-- markdownlint-disable-file -->

## Discrepancy Log

Gaps and differences identified between the research findings and the implementation plan.

### Unaddressed Research Items

* `DR-01`: The exported `dashboard` mockup is unusable because it duplicates the landing page instead of providing a distinct authenticated dashboard design
  * Source: `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md`
  * Reason: The plan cannot implement a distinct dashboard route from an invalid source asset without inventing behavior
  * Impact: medium

* `DR-02`: `Settings` or `System` appears in mockup navigation language, but no screen, route contract, or backend capability currently defines what that destination should do
  * Source: `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md`
  * Reason: The plan intentionally defers this route until scope and supporting seams exist
  * Impact: medium

* `DR-03`: The landing-page metrics and final public-routing strategy still need confirmation if the team wants the Stitch landing surface to show live data or coexist with a separate public marketing host later
  * Source: `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md`
  * Reason: Current implementation can add the landing page safely, but live metric sourcing and long-term hosting strategy remain product decisions
  * Impact: low

### Plan Deviations from Research

* `DD-01`: The plan expects a manual route smoke test for the public landing and signed-out login surfaces, but that interactive browser validation is still pending
  * Plan specifies: Complete manual route smoke validation for `/` and the signed-out login entry during Phase 2
  * Implementation differs: Phase 2 completed the code changes and TypeScript validation, but left manual rendered-route verification open
  * Rationale: Available tooling here validates code paths and diagnostics, but does not provide a reliable assertion path for interactive rendered-state verification

* `DD-02`: The plan expects a manual route smoke test for the Devices and device-details flows, but that interactive browser validation is still pending
  * Plan specifies: Complete manual route smoke validation for `/devices`, `/devices/:deviceId`, redirected `/stations`, and retained live routes during Phase 3
  * Implementation differs: Phase 3 completed the code changes and TypeScript validation, but left manual rendered-route verification open
  * Rationale: Available tooling here validates code paths and diagnostics, but does not provide a reliable assertion path for interactive rendered-state verification

## Implementation Paths Considered

### Selected: Mockup-first visible IA over existing application seams

* Approach: Rebuild the visible route model, navigation language, and page composition around landing, login, analytics, devices, and device details while reusing the current provider shell, gateway construction, contracts, and Firestore live subscriptions underneath
* Rationale: This is the only path that matches the user’s Stitch-first visual requirement without discarding working auth and data infrastructure
* Evidence: `.copilot-tracking/research/2026-03-08/stitch-ui-implementation-research.md`

### `IP-01`: Keep the current visible stations-first IA and restyle pages only

* Approach: Preserve `/stations`, `/history`, `/comparisons`, and `/stations/:stationId/live` as the visible top-level model while applying Stitch-inspired styling
* Trade-offs: Lower migration cost, but it conflicts with the research route mapping and does not treat the mockups as the visible source of truth
* Rejection rationale: It would preserve the old UX model instead of implementing the requested redesign

### `IP-02`: Rewrite the full shell directly from static Stitch exports

* Approach: Replace the router, auth shell, and provider-owned navigation behavior with a new shell built directly from the exported mockup HTML
* Trade-offs: Highest visual literalism, but it would duplicate working auth, data-loading, and live-subscription behavior with no architectural coverage from the mockups
* Rejection rationale: The mockup set is incomplete and the existing provider and gateway seams already solve the riskiest behavior correctly

## Suggested Follow-On Work

* `WI-01`: Decide how far to push live media and richer scan analysis on the device-details surface (high)
  * Source: Research blocked-feature matrix for device-details
  * Dependency: Backend and contract support for camera frames, richer scan payloads, or AI summaries

* `WI-02`: Add verified Google and GitHub sign-in only if the Stitch social buttons must become working controls (medium)
  * Source: Research login mapping and blocked-feature matrix
  * Dependency: Firebase Auth provider configuration and UX approval

* `WI-03`: Define and implement device registration and settings mutation flows if those mockup affordances are required in scope (medium)
  * Source: Research devices page hookup matrix and `DR-02`
  * Dependency: Product decision, route design, backend endpoints, and contract additions

* `WI-04`: Add export-report generation and AI-generated analytics insight capabilities if the analytics mockup buttons must become functional (medium)
  * Source: Research analytics hookup matrix
  * Dependency: Backend generation endpoints, contract additions, and product approval

* `WI-05`: Decide whether `/history` and retained live-monitoring routes remain permanent secondary routes after rollout or are later absorbed fully into device-details and analytics (low)
  * Source: Research compatibility-routing recommendation
  * Dependency: Post-rollout product review of operator navigation needs

* `WI-06`: Obtain a corrected dashboard mockup or explicitly remove dashboard from this phase’s route expectations (medium)
  * Source: `DR-01`
  * Dependency: Product or design clarification

* `WI-07`: Confirm whether landing-page metrics should remain static, become live, or move to a separate public host strategy (low)
  * Source: `DR-03`
  * Dependency: Product and deployment decision

* `WI-08`: Harden operator authorization before treating the redesigned login as the reliable gate to protected operator routes (high)
  * Source: Research login hookup matrix and blocked-feature assessment
  * Dependency: Auth policy review, role or allowlist enforcement design, and validation against the deployed Firebase Auth and backend environment

* `WI-09`: Run a browser smoke pass for `/`, `/login`, and a signed-out protected route such as `/analytics` after the UI phases land (low)
  * Source: Phase 2 validation gap
  * Dependency: Runnable local app session with browser verification

* `WI-10`: Run a browser smoke pass for `/devices`, `/devices/:deviceId`, `/stations`, and `/devices/:deviceId/live` after the UI phases land (low)
  * Source: Phase 3 validation gap
  * Dependency: Runnable local app session with browser verification