<!-- markdownlint-disable-file -->
# Planning Log: Spec Alignment Remediation

## Discrepancy Log

Gaps and differences identified between research findings and the implementation plan.

### Unaddressed Research Items

* None. The current plan fixes the publication-path decision and preview-tool choice explicitly. Remaining work is execution, not planning ambiguity.

### Implementation Deviations

* DD-01: Phase 1 Step 1.2 can only reach subscription-binding readiness in this remediation pass.
  * Plan specifies: the live page should maintain a real-time subscription in the web surface.
  * Implementation differs: the live page model now exposes the long-lived station subscription, but the repository still lacks a mounted browser host that can consume that binding and re-render continuously.
  * Rationale: `apps/web` is still a TypeScript render-library shell. The browser-host dependency is already tracked by `full-station-demo-integration-hardening-plan.instructions.md` Phase 4, so duplicating that infrastructure work inside this remediation plan would create conflicting planning ownership.

## Implementation Paths Considered

### Selected: Strict spec alignment with Pi-local developer preview

* Approach: Remove product-facing camera behavior from the website and shared data flow, make live monitoring real time for operational status only, and add a separate Pi-side developer preview workflow for Windows-over-SSH.
* Rationale: This path resolves the explicit product contradiction while preserving the developer debugging need.
* Evidence: `/home/handwash/Projects/hackcanada/spec/binsight-spec.md`; `/home/handwash/Projects/hackcanada/.copilot-tracking/research/subagents/2026-03-07/camera-live-reconciliation-research.md`

### IP-01: Feature-flag dashboard camera support

* Approach: Keep the backend and contract camera path in place behind a feature flag while removing it from default operator navigation.
* Trade-offs: This lowers short-term code churn but preserves a product/data-model path that the spec and user direction no longer want.
* Rejection rationale: It weakens the source-of-truth boundary and keeps unnecessary camera complexity in the operator stack.

### IP-02: Preserve dashboard camera support and amend the spec later

* Approach: Treat the current backend and web camera architecture as the future product path, then update the spec to match.
* Trade-offs: This uses more of the existing code but directly conflicts with the user's clarified requirement and leaves the Pi-to-backend path incomplete.
* Rejection rationale: The user has already resolved the product decision in the opposite direction.

## Suggested Follow-On Work

* WI-01: Add an explicit internal diagnostics mode for station operators who need non-product debugging tools during demos. (medium)
  * Source: Camera workflow planning
  * Dependency: Complete the strict spec-alignment remediation first
* WI-02: Expand authored rules presets beyond the Ottawa demo baseline after the core v1 remediation is stable. (low)
  * Source: Original spec gap analysis
  * Dependency: Demo-data and intervention modeling work completed
* WI-03: Finish browser-hosted live re-rendering by executing the Vite host work already tracked in the full-station hardening plan. (high)
  * Source: Spec alignment remediation Phase 1 execution
  * Dependency: `full-station-demo-integration-hardening-plan.instructions.md` Phase 4