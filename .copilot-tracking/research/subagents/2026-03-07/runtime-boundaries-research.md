---
title: Runtime Boundaries Research
description: Research on repository boundaries, runtime ownership, and tooling for the BinBuddy mixed web backend device codebase
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binbuddy
  - monorepo
  - firebase
  - raspberry-pi
  - esp8266
  - runtime-boundaries
estimated_reading_time: 8
---

## Research status

Status: Complete

## Research topics

* Best project foundation boundaries for a mixed web, backend, Raspberry Pi, and ESP8266 repository matching the BinBuddy spec
* Language and runtime split between Firebase website and backend, Raspberry Pi station software, and ESP8266 firmware
* Package and workspace strategy for shared contracts, rules, and analytics without forcing the same toolchain onto firmware
* Placement of analytics logic and disposal rules engine across cloud and device surfaces
* Techniques to avoid coupling firmware to cloud or web internals while preserving a coherent system contract

## Initial assumptions from the spec

* Firebase Firestore is the database and Firebase Cloud Functions is the website backend
* Raspberry Pi 5 runs offline on-device inference and communicates with ESP8266 over Wi-Fi
* ESP8266 controls poster LEDs and ultrasonic sensor only
* Raspberry Pi sends live status and disposal events to Firebase for dashboards and monitoring
* LLM classification is a fallback path, not the primary runtime path

## Findings

### Recommended runtime boundary map

The repo should treat BinBuddy as four cooperating surfaces with one narrow local
device protocol and one shared cloud contract layer:

1. Web app runtime

   * Responsibility: dashboard UI, live monitoring UI, station management views,
     charting, filtering, and operator workflows.
   * Recommended stack: TypeScript web app deployed to Firebase Hosting.
   * Allowed dependencies: Firebase web SDK, charting, UI libraries, generated
     types from shared cloud contracts.
   * Must not own: disposal rules evaluation, device orchestration, or firmware
     transport details.

2. Cloud backend runtime

   * Responsibility: API endpoints, event ingestion validation, aggregate metric
     materialization, historical analytics jobs, auth-aware writes, and admin
     station configuration workflows.
   * Recommended stack: Firebase Cloud Functions 2nd gen in TypeScript.
   * Rationale: Firebase explicitly supports TypeScript functions, code-defined
     runtime options, and multi-codebase organization in a monorepo.
   * Must not own: real-time station control loop or the first-pass rules engine
     needed for offline station behavior.

3. Raspberry Pi station runtime

   * Responsibility: session state machine, camera capture, on-device inference,
     local rules evaluation, LLM fallback trigger, hand-zone tracking, event
     construction, cloud sync, and ESP command/control.
   * Recommended stack: Python application on Raspberry Pi 5.
   * Rationale: the spec requires offline on-device inference and a local active
     rules preset. That makes the Pi the operational source of truth for the
     classification-to-disposal decision during a station session.
   * Must not depend on: web code, Firebase client UI concerns, or any direct
     inclusion of firmware source.

4. ESP8266 firmware runtime

   * Responsibility: ultrasonic sensing, LED output, simple health reporting,
     and execution of commands from the Pi.
   * Recommended stack: C++ firmware with PlatformIO.
   * Rationale: PlatformIO is designed for cross-platform embedded workflows,
     board-specific toolchain setup, build, upload, monitor, unit testing, and
     static analysis.
   * Must not know: Firestore schema, dashboard concepts, analytics formulas,
     A/B analysis fields, or cloud authentication models.

5. Shared contracts and rules artifacts

   * Responsibility: event schemas, live status schemas, station config schema,
     rules preset data model, and canonical enumerations like disposal methods
     and zone labels.
   * Recommended ownership: language-neutral artifacts first, adapters second.
   * Canonical rule: shared artifacts describe data, not runtime behavior.

### Language and runtime split

* Use TypeScript for the website and Firebase backend.
* Use Python for the Pi station software.
* Use C++ for the ESP8266 firmware.
* Do not try to force a single language across all surfaces.

This split matches the spec and current platform strengths:

* Firebase documents first-class TypeScript support for Cloud Functions,
  including TypeScript builds via predeploy hooks and modern Node runtimes.
* The Pi needs practical access to CV and device libraries and must run offline.
  Python is the least-friction runtime for that part of the system.
* The ESP8266 is resource-constrained and should remain a tiny command executor,
  not a peer application runtime.

### Where the rules engine should live

The disposal rules engine should live primarily on the Pi, with cloud-authored
rule data.

Recommended model:

* The cloud stores rules presets as versioned data.
* The Pi downloads and caches the active preset for its station.
* The Pi applies item-to-disposal mapping locally during the classification
  session.
* The backend validates writes and can run consistency checks, but it should not
  be required to decide the disposal target during a live session.

Why this is the best fit:

* The spec requires offline on-device inference.
* The spec says the active local rules preset is used for mapping item type to
  disposal method.
* A backend-only rules engine would break the local guidance path when the
  station is offline or degraded.

Implementation implication:

* Treat rules presets as data in a shared schema package or directory.
* Keep rule evaluation logic in the Pi app, with a mirror validator in backend
  code only where useful for ingestion safeguards and admin preview tools.

### Where analytics logic should live

Split analytics into three layers:

1. Pi runtime

   * Owns immediate session counters needed for the LCD and current session
     decisioning.
   * Produces raw event records and lightweight station heartbeat snapshots.

2. Backend materialization layer

   * Owns durable aggregates, leaderboard snapshots, contamination rollups,
     hourly purity summaries, and before-after comparison datasets.
   * Computes analytics from immutable event history instead of trusting device
     counters as system-of-record analytics.

3. Web app presentation layer

   * Owns only formatting, filtering, chart selection, and comparative views.
   * Must not recompute business metrics independently from raw events in a way
     that diverges from backend summaries.

This is the cleanest split because the spec’s dashboard metrics are historical
and comparative. They belong near the durable event store, not in firmware and
not only in the browser.

### Coupling rules for firmware

To avoid coupling firmware to cloud or web internals:

* Define a tiny Pi-to-ESP protocol that contains only command and sensor fields.
* Keep firmware message shapes local to the device boundary. Do not expose
  Firestore documents or dashboard DTOs directly to firmware.
* Use simple command enums such as `set_led_state`, `ping`,
  `report_distance`, and `report_health`.
* Prefer compact JSON or line-delimited JSON over ad hoc string parsing.
  ArduinoJson is purpose-built for ESP-class devices, supports direct
  stream-based serialization and deserialization, and emphasizes memory-aware
  parsing strategies.
* Version the local device protocol independently from cloud event schemas.
* Let the Pi translate between the local device protocol and cloud contracts.

The Pi should be the anti-corruption layer between embedded control concerns and
cloud application concerns.

### Candidate tooling and workspace structure

Recommended top-level shape:

* `apps/web`
* `services/backend-functions`
* `devices/pi-station`
* `firmware/esp8266-controller`
* `packages/contracts`
* `packages/rules-data`
* `packages/analytics-definitions`
* `infra/firebase`
* `docs`
* `spec`
* `scripts`

Recommended tool ownership:

* JavaScript and TypeScript packages: `pnpm` workspaces at the repo root.
* Pi Python runtime: `uv` project, likely independent under `devices/pi-station`.
* Firmware: PlatformIO under `firmware/esp8266-controller`.
* Cross-repo task orchestration: lightweight root tasks via `just`, `make`, or
  a simple `Taskfile.yml`, instead of forcing one language-specific workspace
  manager across everything.

Why this combination fits best:

* Firebase functions and the website naturally share TypeScript packages and
  benefit from a JavaScript workspace.
* `uv` supports Python projects and Cargo-style workspaces, but its own docs note
  that workspaces are not ideal when members need conflicting requirements or
  separate environments. The Pi runtime is better treated as a native Python
  project first, not as a dependency of the TypeScript workspace.
* PlatformIO already solves embedded dependency, board, build, upload, test, and
  monitoring concerns. Wrapping firmware in a Node or Python package model adds
  indirection without reducing embedded complexity.

Recommended boundary for shared packages:

* `packages/contracts`: JSON Schema files as the canonical source for cloud and
  Pi event, heartbeat, and config payloads, plus generated TypeScript types.
* `packages/rules-data`: preset data definitions, station metadata examples,
  seed data, and schema validation assets. No runtime-specific code.
* `packages/analytics-definitions`: metric names, aggregation parameter
  definitions, and chart field contracts. Avoid runtime calculators here unless
  they are truly language-agnostic and duplicated intentionally.

Do not place Python or firmware code under `packages` just to make the repo look
symmetrical.

### Firebase-specific implications

* Firebase CLI supports multi-codebase function organization in one monorepo via
  the `functions` array in `firebase.json`, with `source` and `codebase`
  properties.
* Firebase recommends TypeScript support through predeploy builds and supports
  current Node runtimes, including Node 20 and 22.
* Firebase Local Emulator Suite supports Firestore, Hosting, Functions, Auth,
  and related local workflows, which is enough to cover the web plus backend side
  of the repository.
* Use the Emulator Suite for cloud-side integration tests and Firestore rules
  validation, but not as a replacement for Pi or firmware local integration.

Repo consequence:

* Keep `firebase.json`, rules, indexes, and emulator config in a dedicated
  `infra/firebase` area or root-managed config set.
* Deploy the web and functions from explicit build outputs, not from source
  directories that also contain unrelated device code.

### Firestore data modeling implications

For event-heavy station telemetry:

* Use auto-generated document IDs for high-write event collections to avoid
  hotspotting.
* Store immutable disposal events separately from mutable station status
  documents.
* Exempt large non-query fields from indexing when possible to reduce index
  fanout and write latency.
* Be careful with timestamp-heavy collections and large maps or arrays in event
  documents.
* Avoid making one station summary document absorb excessive write frequency.
  Prefer event streams plus backend rollups.

This supports the spec’s need for event history, live status, and historical
analytics without turning Firestore into a hot document bottleneck.

### Recommended developer workflow

* One repository, multiple native work areas.
* Root commands orchestrate, but each runtime remains buildable on its own.
* Cloud developers can work with the Firebase Emulator Suite without needing the
  ESP toolchain.
* Device developers can work on PlatformIO and Pi code without booting the web
  stack.
* Contract changes require explicit regeneration or validation steps at the
  boundaries.

Recommended root task examples:

* `just web-dev`
* `just backend-emulators`
* `just pi-run`
* `just firmware-build`
* `just test-contracts`
* `just test-cloud`
* `just lint-all`

## References and evidence

* BinBuddy spec:
  * Pi runs offline on-device inference
  * ESP8266 handles LEDs and ultrasonic sensing
  * Pi and ESP communicate over Wi-Fi
  * Firestore is the database
  * Cloud Functions is the website backend
  * Item-to-disposal mapping uses the active local rules preset
* Firebase Cloud Functions docs:
  * TypeScript is directly supported with build and predeploy workflows
  * Runtime options are intended to be source-controlled in function code
  * Supported Node runtimes include Node 20 and Node 22
* Firebase function organization docs:
  * Multi-codebase function deployment is supported in monorepos
  * Codebases can isolate heavy or separately managed function groups
* Firebase CLI docs:
  * `firebase.json` supports multiple `functions` entries with `source` and
    `codebase`
  * Emulator Suite configuration and predeploy hooks are root-configured
* Firebase Emulator Suite docs:
  * Interoperable local workflows are supported for Hosting, Firestore,
    Functions, Auth, and related products
  * `emulators:exec` is suited for CI workflows
* Firestore best practices docs:
  * Use scattered IDs instead of sequential ones
  * Reduce indexing for non-query fields and high-write patterns
  * Avoid hot documents and narrow write ranges
* PlatformIO docs:
  * PlatformIO is built for embedded board-specific toolchains, build, upload,
    monitor, testing, and static analysis
  * It supports multi-project VS Code workflows without needing to absorb the
    rest of the repo into the same build system
* uv docs:
  * uv supports Python projects and workspaces with a single lockfile
  * uv workspaces are not ideal when members need conflicting requirements or
    separate virtual environments
* ArduinoJson docs:
  * Stream-oriented JSON IO is supported on Wi-Fi streams
  * The library is designed for memory-conscious embedded use

## Discovered follow-on topics

* Exact Firebase Hosting choice for the web app: static SPA hosting versus App
  Hosting versus another frontend deployment path
* Exact Pi model-serving stack for on-device inference and LLM fallback trigger
* Contract generation pipeline: JSON Schema only, or JSON Schema plus OpenAPI for
  HTTP endpoints
* Firestore collection design for event history, live station status, and
  rollups
* Station configuration sync strategy and offline cache invalidation on the Pi

## Next research

* Define the canonical schema set for events, heartbeats, configs, and rules
* Design Firestore collections and indexes around live status versus immutable
  event history
* Choose the frontend stack under `apps/web`
* Define the Pi-to-ESP protocol and message versioning rules
* Decide whether backend analytics should be near-real-time on write or
  scheduled rollups

## Clarifying questions

* None required for the requested boundary recommendation. The remaining choices
  are implementation decisions, not blockers to the foundation split.

## Risks

* If rules evaluation is implemented only in the backend, the station loses its
  offline guidance path and violates the spec intent.
* If analytics formulas are duplicated in the browser and backend, the dashboard
  will drift from durable aggregates.
* If firmware consumes Firestore-shaped payloads directly, even small backend
  schema changes will destabilize the embedded path.
* If the repo forces one package manager across TypeScript, Python, and
  embedded C++, developer workflow will become brittle and harder to onboard.
* If live counters are treated as the authoritative analytics source, retries,
  reconnects, and partial syncs will eventually create data discrepancies.
* If Firestore writes concentrate on a few status or rollup documents, hotspotting
  and contention will show up early.

## Rejected alternatives

### Backend-only rules engine

Rejected because the spec calls for an active local rules preset and offline
Pi inference. A cloud round-trip should not be required to illuminate the
correct LED.

### Browser-owned analytics formulas

Rejected because it turns dashboard code into the system of record for business
metrics and creates drift risk across views and exports.

### Shared runtime library consumed by web, backend, Pi, and firmware

Rejected because the common denominator becomes too weak. Firmware and Pi have
fundamentally different constraints from the TypeScript cloud stack.

### One universal monorepo toolchain for everything

Rejected because it usually means forcing Python and embedded builds through a
Node-centric wrapper or forcing web code into a Python-centric workflow. Native
toolchains already solve their own domains better.

### Firmware talking directly to Firebase

Rejected because it expands the ESP8266 surface area far beyond its role,
increases credential and protocol complexity, and couples the smallest runtime to
the most volatile application contracts.

### Shared analytics package with executable cross-language metric code

Rejected for now because cross-language executable sharing is more complex than
the problem requires. Shared metric definitions plus backend-owned computation is
the lower-risk starting point.