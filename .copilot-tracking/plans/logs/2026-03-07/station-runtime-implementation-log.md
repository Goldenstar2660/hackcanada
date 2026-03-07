<!-- markdownlint-disable-file -->
# Planning Log: Station Runtime Implementation

## Discrepancy Log

Gaps and differences identified between research findings and the implementation plan.

### Unaddressed Research Items

* DR-01: Hardware timing values still need on-device calibration.
  * Source: .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 32-39)
  * Reason: The plan can structure debounce and timeout configuration, but it cannot determine correct production values without measured sensor and camera latency.
  * Impact: Medium
* DR-03: Canonical on-device rules preset packaging still needs a concrete source format decision.
  * Source: .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 40-42)
  * Reason: The plan moves to schema-backed preset loading, but the exact preset storage and distribution format remains follow-on implementation detail.
  * Impact: Low

### Plan Deviations from Research

* DD-02: The runtime composition root bypasses observed stable presence when starting a session.
  * Plan specifies: Phase 1 and the selected runtime architecture require stable presence confirmation before identification begins.
  * Implementation differs: `StationRuntime.start_session()` originally armed presence and immediately advanced to identification using a synthetic elapsed timestamp instead of waiting for polled ESP presence telemetry.
  * Rationale: Resolved in Phase 5. The runtime now requires observed stable presence frames to persist through the debounce window before identification begins.

* DD-01: Firmware presence telemetry currently emits protocol-shaped placeholder absence frames instead of measured ultrasonic-derived presence.
  * Plan specifies: Step 3.1 should let the Pi observe stable presence and health updates from the ESP boundary.
  * Implementation differs: The ESP protocol and adapter initially supported stable presence telemetry, but the firmware published a placeholder absence state until ultrasonic sampling was wired in.
  * Rationale: Resolved in Phase 5. The firmware now emits ultrasonic-backed presence telemetry while keeping the existing frame vocabulary unchanged.

## Implementation Paths Considered

### Selected: Explicit finite state machine runtime

* Approach: Keep StationRuntime as the composition root and make SessionStateMachine the authoritative lifecycle model for presence detection, identification, guidance, disposal tracking, and result emission.
* Rationale: It matches the spec-driven station lifecycle and fits the existing package seams with the least churn.
* Evidence: .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 193-248)

### IP-01: Procedural loop with flags and conditionals

* Approach: Extend the current runtime with additional booleans, timers, and branch-heavy loop logic instead of a canonical FSM.
* Trade-offs: Lower short-term refactor cost, but weaker lifecycle clarity and a higher risk of sensor-state regressions as more behaviors are added.
* Rejection rationale: The research shows the station behavior is phase-based and context-sensitive, which makes a flag-driven loop harder to reason about and test.

### IP-02: Full asynchronous event pipeline as the primary model

* Approach: Rebuild the runtime as an async-first event bus where each adapter publishes events concurrently and the runtime coordinates them through tasks.
* Trade-offs: Better fit for future high-concurrency I/O, but more complexity than the current deterministic demo runtime requires.
* Rejection rationale: Research indicates async is useful at the edges, not as the primary domain model for this station lifecycle.

## Suggested Follow-On Work

* WI-01: Hardware timing calibration - Measure ultrasonic jitter, camera latency, and hand-presence stability windows on the target station hardware. (High)
  * Source: .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 32-35)
  * Dependency: Runtime configuration surfaces from Phase 1 must exist first.
* WI-03: Offline publish and retry policy - Define durable local buffering and retry behavior for event publication during network loss. (Medium)
  * Source: .copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md (Lines 233-240)
  * Dependency: Publisher seam from Phase 3 must exist first.

## Phase 4 Execution Notes

### Validation and Test Coverage

* Added focused Phase 4 tests for successful disposal, incorrect disposal, timeout reset, fallback classification, and canonical payload serialization.
* Verified station counters remain available across result emission and reset so the LCD standby screen can continue showing cumulative correct sorts versus total attempts.
* Final validation status:
  * `corepack pnpm lint` - Passed across 6 of 7 workspace projects.
  * `corepack pnpm build` - Passed across 6 of 7 workspace projects.
  * `uv run pytest` - Passed with 19 tests.
  * `/home/handwash/Projects/hackcanada/.venv/bin/pio run` - Passed for `nodemcuv2`.

### Remaining External Blockers

* DR-01 remains open. Presence debounce and disposal timeout behavior are now covered by tests, but correct production timing values still require on-device measurement.
* No additional Phase 4 code blockers remain after validation.

## Phase 5 Rework Notes

* Review-driven continuation scope: enforce stable ESP presence gating in the runtime, replace placeholder firmware presence telemetry with sensor-backed frames, and update traceability for the expanded `test_smoke.py` scenarios.
* Source evidence:
  * .copilot-tracking/reviews/2026-03-07/station-runtime-implementation-plan-review.md
  * .copilot-tracking/reviews/rpi/2026-03-07/station-runtime-implementation-plan-001-validation.md
  * .copilot-tracking/reviews/rpi/2026-03-07/station-runtime-implementation-plan-003-validation.md
* Completion status:
  * Phase 5 closed the review findings for the runtime debounce gate and placeholder firmware presence telemetry.
  * Validation re-ran successfully with `uv run pytest`, `pio run`, `corepack pnpm lint`, and `corepack pnpm build`.

## Follow-On Resolution Notes

* DR-02 is now resolved in the branch.
  * Decision: Use standard Wi-Fi station mode on the ESP8266 plus a local HTTP server on port 80 with JSON payloads.
  * Pi endpoints: `GET /health`, `POST /signal`, and `POST /reset`.
  * Failure policy: Pi transport failures degrade ESP device health in live status but do not terminate the active session; the ESP retries Wi-Fi association in the background.