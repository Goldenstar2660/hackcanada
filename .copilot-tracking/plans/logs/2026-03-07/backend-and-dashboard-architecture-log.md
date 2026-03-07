<!-- markdownlint-disable-file -->
# Planning Log: Backend and Dashboard Architecture

## Discrepancy Log

Gaps and differences identified between research findings and the implementation plan.

### Unaddressed Research Items

None at this time.

### Plan Deviations from Research

None at this time.

### Implementation Deviations

* DD-01: Phase 1 validation used `npx -p typescript@5.8.2 tsc --noEmit` checks instead of the exact `corepack pnpm` commands in the plan.
  * Plan specifies: Validate with package and workspace `corepack pnpm` commands.
  * Implementation differs: Ran equivalent TypeScript checks via `npx` because Corepack could not verify the pnpm signing key and the workspace did not have installed package binaries.
  * Rationale: This preserved Phase 1 validation coverage without blocking the implementation on local package-manager setup.
* DD-02: Phase 1 added a temporary source declaration entrypoint and TS path aliases for cross-package resolution.
  * Plan specifies: Use the contract package as the canonical vocabulary.
  * Implementation differs: Added `packages/contracts/src/index.d.ts` and workspace path aliases so validation can resolve package imports before the normal build output exists.
  * Rationale: The repo has not yet been installed or built in this environment, so a temporary type-resolution bridge was required to validate new shared modules.
* DD-03: Phase 2 now binds the backend to Firebase-shaped HTTP, callable, and trigger entry points, but it compiles through local SDK shims until workspace dependencies are installed.
  * Plan specifies: Implement Firebase Functions ingress, callable APIs, repositories, and storage-backed camera transport.
  * Implementation differs: Added Firestore-backed repositories, a Firebase Storage adapter, runtime bootstrap wiring, and Firebase bridge exports, but kept temporary Firebase module shims because the workspace still lacks installed SDK packages and a lockfile refresh.
  * Rationale: This closes the scaffold-only architecture gap while preserving compileability in the current dependency-blocked environment.
* DD-04: Phase 3 now resolves live-monitoring data through the live listener boundary and exposes route-backed interactive filters, but the web shell still only resolves an initial live snapshot.
  * Plan specifies: Implement live station views, event history, analytics pages, and explicit operator filters.
  * Implementation differs: The route layer now loads a real initial live snapshot and the filter surface is interactive, but continuous browser-side live updates after first render remain outside the current shell architecture.
  * Rationale: The spec-critical product gap is closed without widening scope into a full client-runtime rewrite.
* DD-05: Phase 4 kept the Pi payloads device-shaped and versioned them as `device.v1` rather than converting the Pi runtime to canonical persisted shapes.
  * Plan specifies: Align the Raspberry Pi emitters and decide whether to move fully to canonical payloads or preserve a stable device shape with backend normalization.
  * Implementation differs: Preserved snake_case device payloads, expanded live-status coverage, and made backend normalization explicit in `services/backend-functions/src/domain/normalization.ts`.
  * Rationale: This keeps the Pi runtime simple and close to device operations while making the contract boundary explicit, versioned, and testable.
* DD-06: Phase 5 full validation used direct TypeScript and Python fallbacks instead of the exact workspace pnpm commands.
  * Plan specifies: Run workspace lint, build, and test commands plus Pi smoke tests.
  * Implementation differs: `uv run pytest` passed and direct `npx --yes -p typescript@5.8.2 tsc` checks passed, but all `corepack pnpm` commands failed before pnpm executed because Corepack could not verify the pnpm signing key.
  * Rationale: This provided substantive validation coverage for the changed code while isolating the remaining failure to the local package-manager environment.

## Implementation Paths Considered

### Selected: Hybrid Firebase backend-for-frontend

* Approach: Use HTTP Cloud Functions for Pi ingress, callable Cloud Functions for operator-facing dashboard APIs, Firestore-triggered materializers for analytics read models, and direct Firestore listeners for live station state.
* Rationale: This preserves the Pi as the live control-loop owner while using Firebase where it is strongest and keeping browser query complexity bounded.
* Evidence: .copilot-tracking/research/2026-03-07/backend-and-dashboard-research.md (Lines 194-300)

### IP-01: Thin browser-only Firestore dashboard

* Approach: Push dashboard reads directly into Firestore queries and avoid backend query functions.
* Trade-offs: Simpler service surface, but weaker security posture, more browser query complexity, and poor fit for grouped analytics and comparisons.
* Rejection rationale: Research explicitly rejects this because the dashboard needs metadata-heavy filtering and analytics composition that do not fit cleanly in browser Firestore queries alone.

### IP-02: Full backend-proxied dashboard with no direct Firestore listeners

* Approach: Route all dashboard reads through backend APIs, including rapidly changing live status.
* Trade-offs: Stronger central control over queries, but unnecessary latency and more service code for live monitoring.
* Rejection rationale: Research rejects this because Firestore listeners are the strongest fit for low-latency operator monitoring.

### IP-03: Cloud-centered control loop for classification and guidance

* Approach: Shift more guidance and disposal-session logic from the Raspberry Pi into Cloud Functions.
* Trade-offs: More centralized business logic, but worse latency and more fragility in the most visible interaction path.
* Rejection rationale: The spec and research keep the Pi as the authority for classification, guidance, and disposal detection.

## Suggested Follow-On Work

* WI-01: Evaluate full-motion streaming only if the demo outgrows the selected latest-frame camera transport. (medium)
  * Source: Selected research and planning decision in this package
  * Dependency: Revisit only if current-frame updates no longer satisfy the live monitoring experience.
* WI-02: Write emulator and deployment runbooks for Firebase backend and dashboard validation. (medium)
  * Source: package.json and services/backend-functions/package.json validation scripts
  * Dependency: Complete before demo environment handoff.
* WI-03: Replace the temporary contract declaration shim with generated package declarations once the workspace install and build flow is stable. (low)
  * Source: Phase 1 validation workaround in this package
  * Dependency: Complete after package install and normal build output generation are working.
* WI-04: Swap the generic Firestore converter wrappers for Firebase Admin SDK-native converters when backend persistence modules are added in Phase 2. (low)
  * Source: Phase 1 Firestore foundation in this package
  * Dependency: Complete when repository and ingestion modules begin using the Admin SDK directly.
* WI-05: Install `firebase-admin` and `firebase-functions`, refresh the workspace lockfile, and remove the temporary Firebase SDK shims. (high)
  * Source: Phase 2 backend rework in this package
  * Dependency: Complete before deployment or emulator-backed integration testing.
* WI-06: Add focused tests for idempotent event ingestion, camera-feed stale-state handling, operator authorization, and rollup materialization retries. (medium)
  * Source: Phase 2 backend implementation in this package
  * Dependency: Complete after runtime adapters are in place or mocked in a stable test harness.
* WI-07: Add a mounted browser-side live subscription loop if the web shell evolves beyond the current initial-snapshot render model. (medium)
  * Source: Phase 3 dashboard rework in this package
  * Dependency: Complete only if the dashboard needs persistent in-browser live updates after first render.
* WI-08: Add end-to-end ingress tests that post device.v1 event and live-status payloads through the backend HTTP handlers. (medium)
  * Source: Phase 4 integration hardening in this package
  * Dependency: Complete after runtime handler adapters are stable enough to exercise in tests.
* WI-09: Repair the local Corepack or pnpm environment, then rerun the exact workspace `lint`, `build`, and `test` commands. (high)
  * Source: Phase 5 final validation in this package
  * Dependency: Complete before treating this implementation as fully environment-validated for handoff.