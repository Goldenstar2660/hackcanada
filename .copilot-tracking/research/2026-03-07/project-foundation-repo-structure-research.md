<!-- markdownlint-disable-file -->
# Task Research: Project Foundation, Shared Contracts, and Repo Structure

Research the best approach for implementing the project foundation, shared contracts, and repo structure for Binsight, a smart waste-sorting station with a dashboard website, Raspberry Pi station runtime, ESP8266 firmware, and Firebase-backed data services.

## Task Implementation Requests

* Recommend a top-level folder organization that clearly separates the website, Raspberry Pi code, ESP8266 firmware, backend, and shared code.
* Recommend how shared contracts, rules, and analytics definitions should be represented across web, backend, and device code.
* Evaluate monorepo structure alternatives and select one approach aligned with the project spec and current repository state.

## Scope and Success Criteria

* Scope: Repository foundation, top-level folder layout, shared package boundaries, contract strategy, and Firebase/backend placement for the demo scope defined in the spec. Excludes full implementation of product features.
* Assumptions:
  * The repository is in an early state with only spec and instructions present.
  * The spec is the source of truth for product boundaries and demo scope.
  * The demo includes four technical surfaces: website, Raspberry Pi station runtime, ESP8266 firmware, and cloud backend/data services.
* Success Criteria:
  * One recommended repo structure is selected with rationale.
  * Shared contracts strategy covers disposal events, live status, station metadata, rules presets, and analytics DTOs.
  * Alternatives are evaluated with trade-offs and evidence.

## Outline

* Gather repository context and source-of-truth constraints.
* Research monorepo and shared-contract patterns relevant to mixed web, backend, Pi, and firmware systems.
* Evaluate alternatives for package boundaries and canonical schema ownership.
* Select a recommended project foundation with concrete folder structure and implementation implications.

## Potential Next Research

* Firestore collection and rollup design
  * Reasoning: The structure recommendation depends on keeping immutable events separate from mutable live status and aggregate materializations.
  * Reference: Consolidated from runtime-boundaries research.
* Pi-to-ESP local protocol definition
  * Reasoning: The recommended structure assumes the Pi is the anti-corruption layer and the ESP8266 only implements a narrow command and telemetry protocol.
  * Reference: Consolidated from shared-contracts and runtime-boundaries research.

## Research Executed

### File Analysis

* /home/handwash/Projects/hackcanada/spec/binsight-spec.md
  * [Demo scope and device UX surfaces](../../../spec/binsight-spec.md#L8-L16) require one station runtime, one dashboard surface, one camera flow, LEDs, and LCD feedback.
  * [Classification, local rules usage, and fallback behavior](../../../spec/binsight-spec.md#L21-L27) require the Pi runtime to make live disposal decisions from a local rules preset even when cloud services are not in the loop.
  * [Event fields, metrics, and dashboard requirements](../../../spec/binsight-spec.md#L43-L104) require shared contracts for events, station status, metadata, and analytics read models.
  * [Hardware split and Firebase notes](../../../spec/binsight-spec.md#L124-L145) explicitly separate ESP8266 firmware from Raspberry Pi runtime and place Firestore and Cloud Functions on the cloud side.
* /memories/repo/foundation.md
  * Existing repository memory already suggested a four-surface architecture and JSON Schema-first shared contracts, which matched the independent subagent findings.

### Code Search Results

* Workspace structure scan
  * Repository currently contains only .github and spec, indicating the structure decision is greenfield.

### External Research

* Delegated subagent: [repo-layout-research.md](../subagents/2026-03-07/repo-layout-research.md)
  * Confirmed that a single repository with surface-first top-level boundaries is the best fit for the current greenfield state.
* Delegated subagent: [shared-contracts-research.md](../subagents/2026-03-07/shared-contracts-research.md)
  * Recommended JSON Schema 2020-12 as the canonical source for shared domain contracts, with OpenAPI reserved for HTTP-facing APIs.
* Delegated subagent: [runtime-boundaries-research.md](../subagents/2026-03-07/runtime-boundaries-research.md)
  * Confirmed the Pi should own the session state machine, local rules engine, event creation, and ESP boundary, while backend and web stay out of the live control loop.

### Project Conventions

* Standards referenced: Source-of-truth instructions, markdown guidance, writing-style guidance, task-research prompt.
* Instructions followed: Use spec as source of truth, research-only writes inside .copilot-tracking/research, and consolidate one recommended approach.

## Key Discoveries

### Project Structure

The project naturally decomposes into four runtime surfaces plus shared artifacts:

* Dashboard website
* Firebase backend
* Raspberry Pi station runtime
* ESP8266 firmware
* Shared contracts, rules data, analytics definitions, infrastructure, and documentation

The spec makes this split explicit through the hardware notes and the distinct requirements for live guidance, event creation, dashboard analytics, and live monitoring. A single repository is still the right foundation because those surfaces share event semantics, rules presets, and analytics definitions from day one.

### Implementation Patterns

The strongest implementation pattern is surface-first repository organization with language-neutral shared data definitions:

* Put deployable surfaces at top-level boundaries so ownership and toolchains are obvious.
* Keep the TypeScript workspace limited to the dashboard, backend, and shared packages that actually benefit from a JS or TS workspace.
* Keep the Pi runtime as its own Python project because it owns offline inference, the session state machine, and device orchestration.
* Keep the ESP8266 firmware as its own PlatformIO-native project because embedded build and flashing concerns are materially different from web and cloud builds.
* Share contracts as schemas and versioned configuration, not as one cross-language executable runtime library.

The Pi is the critical anti-corruption layer. It translates between a narrow local ESP protocol and the richer cloud-facing event and status contracts.

### Complete Examples

```text
.
├── apps/
│   └── web/
├── devices/
│   └── pi-station/
├── firmware/
│   └── esp8266-controller/
├── services/
│   └── backend-functions/
├── packages/
│   ├── analytics/
│   ├── contracts/
│   ├── rules/
│   └── tooling/
├── infra/
│   └── firebase/
├── docs/
│   ├── adr/
│   ├── architecture/
│   └── operations/
├── scripts/
└── spec/
```

### API and Schema Documentation

Recommended canonical shared models:

* Disposal event
* Live station status
* Rules preset
* Station metadata
* Analytics request and response DTOs

Recommended ownership model:

* JSON Schema 2020-12 is the canonical source for cross-surface domain contracts.
* OpenAPI describes HTTP APIs only and references the canonical schemas rather than redefining them.
* The ESP8266 uses a deliberately small manual DTO subset for LED, ultrasonic, ack, and health messages.

This keeps web and backend code aligned without forcing firmware to carry cloud-shaped data models.

### Configuration Examples

```text
packages/contracts/
  schemas/
    domain/
      disposal-event.schema.json
      live-station-status.schema.json
      rules-preset.schema.json
      station-metadata.schema.json
    analytics/
      analytics-query.schema.json
      analytics-summary.schema.json
  generated/
    typescript/

packages/rules/
  presets/
  fixtures/

infra/firebase/
  firebase.json
  firestore.rules
  firestore.indexes.json
```

## Technical Scenarios

### Monorepo Foundation for Binsight

Binsight should start as a single monorepo with surface-first top-level folders and a small set of shared packages. This gives the team one source of truth for product rules, event contracts, and analytics semantics while keeping runtime-specific toolchains independent.

**Requirements:**

* Separate website, Pi runtime, ESP8266 firmware, backend, and shared code.
* Preserve clear ownership for shared contracts and rules.
* Fit the current early-stage repository and demo scope.
* Preserve offline local guidance and local rules application on the Pi.
* Avoid coupling firmware to Firestore or dashboard DTOs.

**Preferred Approach:**

* Use a single repository with these top-level folders: `apps/`, `devices/`, `firmware/`, `services/`, `packages/`, `infra/`, `docs/`, `scripts/`, and `spec/`.
* Put the dashboard in `apps/web`, Firebase Cloud Functions in `services/backend-functions`, the Pi runtime in `devices/pi-station`, and ESP8266 code in `firmware/esp8266-controller`.
* Keep canonical contracts in `packages/contracts`, rules presets in `packages/rules`, and shared analytics definitions in `packages/analytics`.
* Use `infra/firebase` for Firebase config, rules, indexes, emulator config, and deployment wiring.

```text
Top-level ownership map

apps/web
  Dashboard UI, live monitoring UI, operator views

services/backend-functions
  Firebase APIs, ingestion validation, rollups, analytics jobs

devices/pi-station
  Session state machine, camera capture, inference, local rules engine,
  disposal event creation, cloud sync, ESP communication

firmware/esp8266-controller
  Ultrasonic sensing, LED control, health and ack messages

packages/contracts
  Canonical schemas and generated TS types for cloud-facing contracts

packages/rules
  Versioned rules presets and validation assets

packages/analytics
  Metric definitions and query/read-model contracts
```

**Implementation Details:**

The selected approach works because it matches the business flow in the spec instead of treating hardware, cloud, and UI as interchangeable app folders.

Key implementation decisions:

* The Pi runtime owns the live session state machine because it must classify items, apply the active local rules preset, guide the user with LEDs and LCD output, detect disposal, and author the final event.
* The backend validates, stores, and aggregates. It should not be required for the live control loop because the spec requires offline inference and local rules application.
* The web app presents live and historical data but does not own rules evaluation or metric formulas that can drift from backend summaries.
* The ESP8266 should never consume the full disposal-event or dashboard contract set. It only needs a small local wire contract that the Pi translates.
* Shared packages should be data-first and versioned. A schema-first approach reduces drift across web and backend while still allowing the Pi to validate payloads and the firmware to remain lean.

Recommended tooling split:

* `pnpm` workspaces for `apps/`, `services/`, and workspace-managed `packages/`
* `uv` or a standard Python project setup inside `devices/pi-station`
* PlatformIO inside `firmware/esp8266-controller`
* A lightweight root task runner such as `just`, `make`, or `Taskfile.yml` for cross-runtime orchestration

```text
Example near-term foundation tasks

1. Create the top-level directory tree and minimal README files.
2. Initialize the TS workspace for apps, services, and packages only.
3. Initialize the Pi project independently under devices/pi-station.
4. Initialize PlatformIO under firmware/esp8266-controller.
5. Author canonical JSON Schemas for disposal events, live status, rules presets,
   and station metadata.
6. Add Firebase emulator config, Firestore rules, and indexes under infra/firebase.
```

#### Considered Alternatives

Alternative 1: Split into multiple repositories

Rejected because the project is greenfield and the spec already requires tight alignment across events, rules presets, live status, and analytics. Multiple repos would add coordination cost without reducing real coupling.

Alternative 2: Use only broad folders such as `frontend/`, `backend/`, and `hardware/`

Rejected because it obscures the most important boundary in the system: the difference between Raspberry Pi station logic and ESP8266 firmware.

Alternative 3: Make OpenAPI the canonical source for all contracts

Rejected because core contracts are not only HTTP payloads. The project also depends on Firestore document shapes, Pi-authored events, live status snapshots, and a local device protocol.

Alternative 4: Share one executable library across web, backend, Pi, and firmware

Rejected because runtime and language constraints differ too much. Shared data contracts are valuable; shared runtime code across TS, Python, and embedded C++ is not a good foundation choice.

Alternative 5: Put rules evaluation in the backend

Rejected because the spec requires the system to map the item to a disposal method using the active local rules preset during the live station session, and the Pi already owns offline inference and user guidance.

## Selected Approach Summary

Selected approach: one monorepo with surface-first folders and schema-first shared contracts.

Why this approach wins:

* It matches the spec's explicit hardware split and cloud responsibilities.
* It preserves local decision-making on the Pi for the live guidance loop.
* It gives the web and backend one canonical contract set without overfitting firmware to cloud models.
* It keeps the repo simple enough for a greenfield team while leaving room for Firebase and analytics growth.

Recommended top-level structure:

* `apps/web`
* `devices/pi-station`
* `firmware/esp8266-controller`
* `services/backend-functions`
* `packages/contracts`
* `packages/rules`
* `packages/analytics`
* `packages/tooling`
* `infra/firebase`
* `docs`
* `scripts`
* `spec`