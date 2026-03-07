<!-- markdownlint-disable-file -->
# Task Research: Full Station Demo Integration and Hardening

Research the best approach for integrating and hardening the full Binsight smart waste-sorting station demo for a reliable hackathon presentation.

## Task Implementation Requests

* Audit the current merged state of the station runtime, firmware boundary, backend, dashboard, contracts, and Firebase setup.
* Determine whether the surfaces are already integrated correctly and identify what is still missing or only scaffolded.
* Identify remaining tasks, missing dependencies, setup gaps, and validation blockers for the current cycle.
* Recommend the exact integration and hardening approach for this cycle.
* Record open implementation questions where the spec does not define the answer.

## Scope and Success Criteria

* Scope: End-to-end demo readiness across the Raspberry Pi runtime, ESP8266 controller boundary, Firebase backend, dashboard, shared contracts, validation commands, and local setup requirements.
* Assumptions:
  * The product spec in `spec/binsight-spec.md` remains the source of truth.
  * Existing dated research documents in `.copilot-tracking/research/2026-03-07/` are treated as verified inputs unless contradicted by new evidence.
  * This cycle is about integration and presentation reliability, not expanding scope beyond the demo spec.
* Success Criteria:
  * Establish the current integration status of runtime, backend, and dashboard.
  * Enumerate missing wiring, missing dependencies, setup gaps, and blockers that would prevent a reliable demo.
  * Select one concrete hardening approach for this cycle with evidence and rationale.
  * Capture unresolved implementation questions that require user decisions.

## Outline

* Load existing verified research and current repo state.
* Audit the runtime and firmware boundary for completeness and demo reliability.
* Audit backend, data flow, Firebase setup, and dashboard readiness.
* Identify validation blockers and environmental gaps.
* Evaluate integration and hardening approaches, then select one.

## Potential Next Research

* Re-audit after the Pi live-status and publisher path are reconciled.
  * Reasoning: That single repair changes the actual blocker set more than any further pre-implementation research.
  * Reference: `.copilot-tracking/research/subagents/2026-03-07/runtime-integration-hardening-research.md`
* Validate a concrete Firebase seed and emulator workflow if this cycle includes full local dashboard rehearsal.
  * Reasoning: Current read models depend on Firestore data and auth setup that are not yet provisioned by a visible workflow.
  * Reference: `.copilot-tracking/research/subagents/2026-03-07/backend-dataflow-hardening-research.md`

## Research Executed

### File Analysis

* Existing verified research loaded:
  * `.copilot-tracking/research/2026-03-07/station-runtime-implementation-research.md`
  * `.copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md`
* Primary manifests loaded:
  * `package.json`
  * `apps/web/package.json`
  * `services/backend-functions/package.json`
  * `devices/pi-station/pyproject.toml`
* Delegated audit documents loaded:
  * `.copilot-tracking/research/subagents/2026-03-07/runtime-integration-hardening-research.md`
  * `.copilot-tracking/research/subagents/2026-03-07/backend-dataflow-hardening-research.md`
  * `.copilot-tracking/research/subagents/2026-03-07/dashboard-integration-hardening-research.md`
  * `.copilot-tracking/research/subagents/2026-03-07/validation-setup-blockers-research.md`

### Code Search Results

* Runtime and firmware audit confirms the Pi and ESP are now aligned on an HTTP boundary, but the station loop is blocked by Pi live-status drift and missing real disposal sensing.
* Backend audit confirms Firebase functions, repositories, contract validation, and analytics rollups are substantially implemented, but the Pi publisher and web transport are not connected.
* Dashboard audit confirms routes and typed loaders exist for the required spec surfaces, but there is no browser host or concrete Firebase client wiring.
* Validation audit confirms the only meaningful failing integration gate today is the Pi runtime; TypeScript compile gates and firmware build pass.

### External Research

* Existing verified subagent findings from prior dated research were reused where still accurate.
* Current-cycle delegated research documents are the authoritative evidence for this audit:
  * `.copilot-tracking/research/subagents/2026-03-07/runtime-integration-hardening-research.md`
  * `.copilot-tracking/research/subagents/2026-03-07/backend-dataflow-hardening-research.md`
  * `.copilot-tracking/research/subagents/2026-03-07/dashboard-integration-hardening-research.md`
  * `.copilot-tracking/research/subagents/2026-03-07/validation-setup-blockers-research.md`

### Project Conventions

* Standards referenced: product spec, existing repo structure research, existing station runtime research.
* Instructions followed: Task Researcher mode, source-of-truth spec rule, research-only file write boundary.

## Key Discoveries

### Project Structure

The merged repository is farther along than the README files imply. The surface boundaries remain correct: the Pi owns the live station control loop, the ESP owns narrow hardware control, the backend owns normalization and persistence, and the web owns operator-facing reads. The current problem is not repo structure. It is integration completeness across those already-correct boundaries.

Verified surface state:

* The Pi runtime contains session phases, rules loading, classification seams, event shaping, LCD formatting, and an HTTP ESP client.
* The firmware exposes a real HTTP control surface and compiles successfully.
* The backend already contains ingestion handlers, callables, Firestore repositories, and analytics rollups.
* The web app already contains routing, page loaders, feature components, and contract-aware data abstractions.

The app is therefore beyond scaffold stage, but it is not end-to-end integrated.

### Implementation Patterns

The strongest existing pattern is a thin-slice architecture that is almost complete at the boundary level:

* The Pi runtime is intended to publish live status and disposal events.
* The backend is intended to normalize device ingress, persist Firestore documents, and materialize analytics.
* The dashboard is intended to read history through callables and live state through Firestore.

What is missing is the concrete bridge between those layers:

* The Pi publisher defaults to no-op sinks.
* The Pi live-status model has drifted from its callers and tests.
* The dashboard has abstractions for Firebase, but not real browser-side transport.
* Firestore seed data and operator bootstrap are not documented or automated.

This means the codebase already supports a narrow integration strategy. It does not support a broad feature-expansion strategy without first stabilizing the bridges.

### Complete Examples

```text
Actual current integration shape

ESP8266 firmware
  -> GET /health, POST /signal, POST /reset
  -> ultrasonic presence + indicator actuation only

Pi runtime
  -> polls ESP health and presence
  -> owns session phases, rules, classification seam, event shaping
  -> currently blocked by live-status API drift
  -> publisher still defaults to no-op

Firebase backend
  -> ingestEvent, ingestLiveStatus, ingestCameraFrame
  -> getAnalyticsSummary, getEventHistory, getStationDirectory
  -> Firestore repositories + analytics rollups

Dashboard
  -> stations, station detail, live monitoring, history, analytics, comparisons
  -> typed loaders and query model present
  -> no concrete browser host or Firebase client wiring
```

### API and Schema Documentation

Canonical contract alignment is already present in the TypeScript layers. Shared schemas cover disposal events, live station status, station metadata, rules presets, and analytics DTOs under `packages/contracts/schemas`, and the backend uses those contracts for validation and normalization.

Important integration findings:

* The backend ingress and query surfaces are real and mostly aligned to the spec.
* The Pi runtime is not yet emitting the backend ingress payloads through a real authenticated publisher.
* The camera feed path exists in shape, but its storage path is not demo-ready and the web has no resolver.

### Configuration Examples

```text
Current minimum demo configuration set

Pi runtime
  STATION_ID=...
  RULES_PRESET_ID=demo-canada-ottawa
  RULES_PRESET_VERSION=1.0.0
  ESP_ENDPOINT=http://192.168.4.1
  FIREBASE_PROJECT_ID=...
  PRESENCE_CONFIRM_MS=...
  HAND_PRESENT_STABLE_MS=...
  HAND_ABSENT_STABLE_MS=...
  DISPOSAL_WAIT_TIMEOUT_MS=...
  RESET_COOLDOWN_MS=...

Backend runtime
  BINSIGHT_DEVICE_CREDENTIALS_JSON=...
  BINSIGHT_STORAGE_BUCKET=...
  Firebase project configuration

Dashboard runtime
  Browser host selection
  Firebase web SDK configuration
  Operator auth bootstrap
```

## Technical Scenarios

### Current Integration Status and Demo Hardening Plan

The current merged state is partially integrated and not yet reliable enough for a full hackathon demo.

Current state by surface:

* Station runtime and firmware:
  * Transport boundary is aligned on HTTP.
  * Firmware build passes.
  * Pi runtime does not start because `LiveStatusPublisher.build_status()` does not match how `main.py` calls it.
  * Pi tests fail for the same live-status drift plus missing smoke-test imports.
  * Classification, camera capture, LCD I/O, and Pi-side disposal tracking remain placeholder or seam-only implementations.
* Backend and data flow:
  * Ingestion, repositories, and analytics exist.
  * End-to-end flow is blocked because the Pi does not publish to Firebase through a real publisher.
  * Station metadata and rules preset seeding are not provisioned through a visible workflow.
  * Camera frame ingestion exists but is not reliable enough to keep in scope without extra repair.
* Dashboard:
  * Route and loader model align well with the spec.
  * Historical pages are designed around backend callables.
  * Live monitoring is designed around Firestore live status.
  * The package is not yet a running browser app and has no concrete Firebase client adapters.
* Validation and setup:
  * `corepack pnpm lint` and `corepack pnpm build` pass.
  * `corepack pnpm test` passes only because there are no package-level tests.
  * Firmware build passes through `.venv/bin/pio`.
  * `uv run pytest`, `uv run binsight-station`, and therefore `just validate` are blocked by the Pi runtime.

## Evaluated Alternatives

### Alternative 1: Full-scope end-to-end completion in one cycle

This would mean completing real camera capture, real classification, Pi hand tracking, Firebase publication, camera frame storage, browser hosting, auth bootstrap, live subscriptions, and polished analytics together.

Rejected because:

* The blocker set is concentrated in the Pi runtime and transport wiring, not in missing broad architecture.
* The camera path and dashboard host path are both still unfinished enough to create schedule risk.
* This approach spreads effort across too many surfaces before the local station loop is reliable.

### Alternative 2: Thin-slice integration and hardening for one reliable demo path

This means stabilizing the Pi runtime first, freezing the Pi to ESP boundary, wiring only the minimum backend publication path, standing up the smallest possible browser host for the existing dashboard, and seeding one station plus one rules preset.

Selected because:

* It matches the actual current code shape.
* It fixes the primary blocker first.
* It creates one defensible live demo path without depending on every optional surface being perfect.
* It leaves room for a fallback historical dataset if live publication slips.

### Alternative 3: Local-only station demo plus non-live dashboard evidence

This means prioritizing the local Pi plus ESP loop and treating Firebase and the dashboard as static or seeded artifacts.

Rejected as the primary plan because:

* The backend and dashboard are already too far implemented to ignore.
* The spec explicitly includes dashboard insights and live monitoring in demo scope.
* It should remain the fallback, not the target.

## Selected Approach

Use a thin-slice integration and hardening cycle built around one reliable station-to-cloud-to-dashboard path.

Recommended implementation sequence:

1. Stabilize the Pi runtime before any wider integration.
   * Reconcile `live_status.py`, `main.py`, `publishers.py`, and the Pi tests around one coherent live-status API.
   * Fix the broken smoke-test imports.
   * Restore `uv run pytest`, `uv run binsight-station`, and `just validate` as meaningful gates.
2. Freeze the ESP boundary at HTTP `GET /health`, `POST /signal`, and `POST /reset`.
   * Keep the ESP responsible only for ultrasonic presence and indicator actuation.
   * Do not move disposal logic or inferred actual-bin logic into the ESP.
   * Add real three-zone LED output wiring without changing the HTTP surface if possible.
3. Finish the minimum Pi runtime behaviors needed for the demo loop.
   * Keep rules loading as implemented.
   * Add a real Pi-local hand-tracking adapter that feeds `observe_hand(zone, hand_present)`.
   * Treat real camera capture and classification as in-scope only if they can be finished without destabilizing the loop; otherwise preserve the seam and use deterministic demo inputs.
4. Wire the Pi publisher to the backend ingress path.
   * Implement authenticated HTTP publication to `ingestLiveStatus` and `ingestEvent` first.
   * Keep publication best-effort so local session completion is not blocked by network or auth issues.
   * Keep `ingestCameraFrame` out of the critical path unless the storage path is repaired in the same cycle.
5. Stand up the smallest browser host around the existing web surface.
   * Reuse the current routes, loaders, and feature components.
   * Add concrete Firebase callable and Firestore subscription adapters.
   * Make the live monitoring page actually subscribe after initial load.
6. Seed the minimum demo dataset.
   * One station metadata document.
   * One rules preset based on `packages/rules/presets/demo-canada-ottawa.1.0.0.json`.
   * Optional seeded history only as a fallback or backup.
7. Harden only the operator-facing states needed for the presentation.
   * Loading
   * Empty
   * Unauthorized
   * Backend failure
   * Live feed unavailable or stale

```text
Recommended hackathon cycle target

Real-time path:
  ESP presence -> Pi session -> Pi event/live status publisher -> Firebase -> dashboard live monitoring

Required hardening:
  Pi runtime startup green
  Pi tests green
  real three-zone LED behavior
  real or deterministic hand-tracking input
  one station seeded in Firestore
  one browser host with Firebase adapters

Fallback-only path:
  seeded historical events for analytics/history if live publication slips
```

## Missing Tasks and Blockers

### Immediate blockers

* Pi runtime startup failure from live-status API drift.
* Pi test suite failure.
* No real Pi publisher to Firebase ingress.
* No concrete browser host or Firebase client in the dashboard.
* No visible station metadata seed path.

### Remaining tasks

* Repair Pi live-status and publication models.
* Fix Pi smoke tests and restore validation gates.
* Add real three-zone LED actuation in firmware.
* Add Pi-local hand tracking.
* Implement authenticated Pi publication for events and live status.
* Add browser app entrypoint and Firebase adapters in `apps/web`.
* Seed one station and one rules preset.
* Decide whether camera feed is in or out for this cycle.
* Decide operator auth bootstrap path.

### Missing dependencies and setup gaps

* The Pi package declares almost none of the dependencies needed for real camera, LCD, model, or cloud publication work.
* Backend runtime requires credentials and storage configuration not provided in the repo.
* The dashboard lacks Firebase browser SDK dependencies.
* The Pi example environment guidance is incomplete and, based on validation findings, the documented preset version needs correction to `1.0.0`.
* There is no documented end-to-end Firebase emulator and seeding workflow.

### Validation blockers

* `uv run pytest` fails.
* `uv run binsight-station` fails.
* `just validate` therefore fails in the Pi phase.
* `corepack pnpm test` is not a meaningful quality signal yet.

## Exact Recommendation for This Cycle

Treat this as an integration-hardening cycle, not a feature-expansion cycle.

The exact recommended approach is:

* Fix the Pi runtime first until startup and tests are green.
* Keep the ESP boundary narrow and stable.
* Implement only the minimum real publication path needed for live status and disposal events.
* Turn the current web package into the smallest possible real browser app and wire only the existing dashboard abstractions.
* Seed one station and one rules preset so the dashboard has a stable dataset.
* Keep camera feed optional unless the storage and web resolver path can be completed safely.
* Prepare a fallback plan where live station behavior remains primary and seeded historical data backs up analytics and history if cloud publication slips.

Why this is the best fit:

* It addresses the actual blocker concentration.
* It preserves the current architecture rather than thrashing boundaries.
* It creates the shortest path to a reliable presentation-quality demo.
* It keeps fallback options open without violating the spec.

## Open Questions

These are the implementation questions not fully answered by the spec and still need your decision:

* Should the current camera feed be in scope for this cycle's live demo, or is text-only live monitoring acceptable if the storage path is not repaired in time?
* Which browser host should wrap `apps/web` for this cycle: a minimal Vite client, another thin SPA host, or something else already preferred by the team?
* How should operator access be provisioned for the demo: real Firebase Auth users with custom claims, emulator-only auth, or another temporary operator bootstrap?
* If Pi publishing is not finished in time, is a seeded historical dataset acceptable as demo backup for history and analytics, or must all displayed history come from live station runs?