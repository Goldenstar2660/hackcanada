# Spec Constraints Research

## Research Topics

- System components explicitly required by the BinBuddy spec.
- Product boundaries, assumptions, and non-goals that constrain foundation work.
- Likely execution environments and deployment boundaries.
- Architecture constraints that should drive the initial top-level folder layout and shared-contracts approach.

## Status

- Complete.

## Findings

- The spec defines four distinct product surfaces that should be reflected in the repository foundation: the station hardware stack, the Raspberry Pi station runtime, the cloud-hosted dashboard/backend surface, and shared business-rule/event definitions. Evidence: demo scope requires poster LEDs, LCD feedback, and a dashboard; technical notes require an ESP8266 hardware unit and a Raspberry Pi 5 hardware unit communicating over Wi-Fi, with the dashboard/backend allowed to be cloud hosted. References: `spec/binbuddy-spec.md:9-16`, `spec/binbuddy-spec.md:128-136`.
- The Raspberry Pi is the primary business-logic host for the station flow. The spec assigns item capture, classification, low-confidence fallback handling, disposal tracking, correctness evaluation, and event creation to one continuous station workflow, and separately states that the Pi runs offline on-device inference. This implies the Pi application should own the session state machine and event assembly. References: `spec/binbuddy-spec.md:19-58`, `spec/binbuddy-spec.md:133-136`.
- The ESP8266 has a narrower device-control role. The only explicit hardware responsibilities attached to it are poster LEDs and the ultrasonic sensor, plus Wi-Fi communication with the Pi. That suggests a thin firmware boundary centered on sensor readings and actuator commands rather than shared business logic. References: `spec/binbuddy-spec.md:19-23`, `spec/binbuddy-spec.md:31-34`, `spec/binbuddy-spec.md:128-132`.
- Shared contracts are required even in a minimal v1 because the spec fixes an event shape and a configurable rules surface. The event contract includes station id, timestamp, predicted item, correct disposal method, actual disposal zone, success/failure, model confidence, and whether LLM fallback was used. The configuration surface includes supported item set, item-to-disposal mapping, city/province rules preset, zone mapping, low-confidence threshold, and station metadata. References: `spec/binbuddy-spec.md:50-58`, `spec/binbuddy-spec.md:107-113`.
- Product boundaries are intentionally demo-scoped and should prevent overbuilding the foundation. The spec limits v1 to a single tabletop station, one camera view, three disposal zones, approximate demo-grade drop detection, and explicitly excludes production-grade bin verification, automatic bin opening, multi-camera verification, and full national rule coverage. The initial repository layout should therefore optimize for one deployable station stack plus analytics, not a generalized fleet platform. References: `spec/binbuddy-spec.md:9-16`, `spec/binbuddy-spec.md:115-125`.
- Dashboard scope is analytics and comparison oriented, not real-time station control. Required dashboard features are station viewing, station status and metadata, active rules preset, event history, metrics, filters, grouping/comparisons, signage/layout comparisons, and before/after and A/B historical analysis. That supports a separate web app surface and likely a backend or data-access layer distinct from the Pi runtime. References: `spec/binbuddy-spec.md:85-105`.
- The top-level repository layout should be organized by execution boundary first, not by generic technical layer. The strongest partition in the spec is deployable/runtime separation: microcontroller firmware, edge computer runtime, web app, and optional cloud backend. Shared rules and event definitions should sit in a separate package because they cross Pi, backend, and dashboard boundaries. This layout keeps the spec-required surfaces explicit and prevents firmware concerns from being mixed with web or cloud code.
- Recommended initial layout:

```text
apps/
	dashboard/               # web dashboard for insights, filters, comparisons
	station-pi/              # Raspberry Pi runtime: camera, inference, LCD, session logic, event creation
firmware/
	esp8266/                 # ultrasonic + LED firmware, Wi-Fi transport to Pi
services/
	backend/                 # optional cloud API, event ingestion, analytics jobs, Firebase adapters
packages/
	contracts/               # canonical event, station-status, command, and rules schemas/types
	rules/                   # local preset data, item mappings, zone mappings, station metadata samples
	tooling/                 # shared scripts for validation, schema generation, fixture data
spec/
	binbuddy-spec.md
docs/
	architecture/            # transport, deployment, and protocol notes as the codebase grows
```

- Recommended shared-contracts approach:
	- Keep one canonical contract set for business entities in `packages/contracts`.
	- Treat `disposal event`, `rules preset`, `station metadata`, `station status`, and `Pi <-> backend payloads` as first-class shared models because the spec already defines them.
	- Keep `Pi <-> ESP8266` transport contracts minimal and separate from richer dashboard/backend contracts, because the firmware role is narrower and the spec does not require business logic on the microcontroller.
	- Keep rules presets in data files under `packages/rules` so they can be consumed by the Pi runtime and surfaced in the dashboard/backend without duplicating mappings.

- Likely execution environments implied by the spec:
	- `firmware/esp8266`: embedded runtime, Wi-Fi connected, sensor/LED responsibilities only.
	- `apps/station-pi`: Raspberry Pi 5 runtime with camera and LCD attached, offline inference, fallback-to-LLM integration, disposal-session orchestration.
	- `apps/dashboard`: browser-based analytics UI for station/event history and comparisons.
	- `services/backend`: cloud-hosted service or serverless layer for event storage, aggregation, leaderboard/history queries, and Firebase integration.

- Current repository context reinforces that this is foundation work, not refactoring. A workspace file listing collected with `find . -maxdepth 4 -type f | sort` showed only the spec, the source-of-truth instruction file, Git internals, and one in-progress research note. There is no existing application code to preserve, so the initial folder layout can be established directly from the spec without migration constraints.

## Evidence

- Spec-defined demo surfaces:
	- `spec/binbuddy-spec.md:9-16` defines the tabletop demo, one camera, three disposal zones, LEDs, LCD, and dashboard.
- Station runtime business flow:
	- `spec/binbuddy-spec.md:19-58` defines detection start, item identification, guidance, disposal detection, correctness logic, and event creation.
- Shared business data requirements:
	- `spec/binbuddy-spec.md:50-58` defines the disposal event payload.
	- `spec/binbuddy-spec.md:107-113` defines configurable rules and metadata.
- Analytics/dashboard scope:
	- `spec/binbuddy-spec.md:67-105` defines tracked metrics, filtering, comparison, and historical analysis features.
- Product boundaries and non-goals:
	- `spec/binbuddy-spec.md:115-125` constrains v1 and prevents premature expansion.
- Technical deployment constraints:
	- `spec/binbuddy-spec.md:128-136` defines the ESP8266, Raspberry Pi 5, Wi-Fi communication, offline on-device inference, LLM fallback, and cloud/Firebase allowance.
- Repository context:
	- Workspace file listing via shell showed no app, backend, firmware, or package directories yet.
	- `.github/instructions/source-of-truth.instructions.md` requires the spec to be treated as the authoritative source for scope and technical constraints.

## Open Questions

- The spec does not choose implementation languages or frameworks for the dashboard, backend, Raspberry Pi runtime, or firmware.
- The spec does not define the Pi-to-ESP8266 transport protocol shape, retry behavior, or whether communication is request/response, pub/sub, or both.
- The spec allows cloud hosting and Firebase, but does not specify whether Firebase is the system of record, an analytics sink, or just an acceptable implementation option.
- The spec defines historical metrics and comparisons, but does not specify where aggregation logic should live: backend, dashboard queries, or precomputed jobs.
- The spec does not state whether the Pi must buffer events locally during network loss before syncing to cloud storage.
- The spec does not specify authentication, user roles, or station provisioning flows for the dashboard.

## Recommended Follow-up Research

- Research candidate runtime stacks for `apps/station-pi`, especially camera/inference/LCD support tradeoffs on Raspberry Pi 5.
- Research lightweight ESP8266-to-Pi communication patterns that fit the narrow firmware role defined by the spec.
- Research a contract format that can serve dashboard/backend/Pi cleanly while allowing a thinner firmware protocol definition.
- Research Firebase data modeling for event history, leaderboard queries, time-bucketed metrics, and rules preset management.
- Research offline-first event buffering and sync strategies for the Pi, since offline inference is required but cloud upload is optional and network reliability is unspecified.
- Decide whether the backend should exist as a separate deployable from the start or whether an initial dashboard-to-Firebase architecture is sufficient for v1 demo scope.