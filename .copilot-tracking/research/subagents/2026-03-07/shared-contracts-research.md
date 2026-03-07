---
title: Shared contracts research
description: Research on canonical shared contracts strategy for Binsight across web, backend, Raspberry Pi, and ESP8266 surfaces
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - shared contracts
  - json schema
  - openapi
  - protobuf
  - esp8266
estimated_reading_time: 10
---

## Research scope

Research the best shared contracts strategy for Binsight using the project spec as
the source of truth.

Focus areas:

* Canonical definitions for disposal events
* Canonical definitions for live station status
* Canonical definitions for rules presets
* Canonical definitions for station metadata
* Canonical definitions for analytics DTOs
* Canonical definitions for HTTP and API contracts across the website, Firebase backend,
  Raspberry Pi runtime, and ESP8266 firmware
* Evaluation of JSON Schema, OpenAPI-first, protobuf, and handwritten per-service DTOs

## Source-of-truth constraints from the spec

Key product and system constraints extracted from `/spec/binsight-spec.md`:

* Demo scope is a single tabletop station with one camera and three disposal zones
* Disposal event correctness depends on predicted disposal method versus detected drop zone
* Every disposal attempt must create one event with: station id, timestamp, predicted item,
  correct disposal method, actual disposal zone, success or failure, model confidence, and
  whether LLM fallback was used
* The dashboard must show stations, station status and metadata, active rules preset,
  event history, metrics, historical charts, and comparisons
* The live monitoring page must show live device status, current camera feed when active,
  current detected item, current disposal decision, and latest event in real time
* Configurable business rules include supported item set, item to disposal-method mapping,
  city or province rules preset, left or middle or right zone mapping, low-confidence
  threshold, and station metadata
* Hardware split is explicit: ESP8266 handles poster LEDs and ultrasonic sensor, Raspberry Pi
  handles camera and LCD, both communicate over Wi-Fi
* Firebase Firestore is the database, Firebase Cloud Functions is the website backend,
  and the Pi sends event and live-status data to Firebase

## Initial findings

### JSON Schema

* JSON Schema is a declarative standard for defining structure and constraints for JSON data
* It has a mature validation and tooling ecosystem across languages
* It is suitable as a shared data contract language for JSON payloads and persisted JSON-like
  documents
* JSON Schema 2020-12 is the current version recommended by the JSON Schema project

### OpenAPI

* OpenAPI is specifically a standard for HTTP API descriptions rather than a general-purpose
  canonical model language for all runtime message shapes
* Modern OpenAPI Schema Objects are based on JSON Schema, which means OpenAPI can reference the
  same schema concepts but is centered on HTTP paths, operations, parameters, and responses
* OpenAPI is strongest at documenting and generating HTTP clients and servers, not at describing
  firmware-to-runtime internal payloads on its own

### Protocol Buffers

* Protocol Buffers provide compact, extensible, cross-language serialization with strong
  backward-compatibility rules
* They do not inherently self-describe without the `.proto` source
* They are a poorer fit when the surrounding system is primarily JSON, Firestore documents, and
  HTTP APIs for a web dashboard
* Nanopb makes protobuf possible on constrained embedded systems, including devices with very
  small ROM and RAM budgets, but adopting protobuf would add a second serialization regime
  across a stack that already needs JSON for Firebase and browser surfaces

### ESP8266 constraints

* ArduinoJson is a well-supported embedded JSON library with ESP8266 usage and explicit memory
  optimization guidance
* ESP8266-class constraints make it preferable to keep firmware payloads tiny, flat, and stable
* Stream-based parsing and avoiding large heap allocations are important on the firmware side
* Long-lived firmware should avoid broad generated model layers and large schema tooling

## Working recommendation

Current recommendation: use JSON Schema as the canonical source for shared domain contracts,
use OpenAPI for HTTP surface definitions only, and keep ESP8266 firmware on a deliberately
small manual DTO subset aligned to the canonical schemas.

This recommendation matches the repo memory and aligns with the project's stated use of
Firestore, Firebase Cloud Functions, and web dashboard surfaces.

## Recommended architecture

### Canonical source

Use JSON Schema 2020-12 as the canonical source of truth for shared domain data that exists
across more than one non-firmware surface.

Why this is the best fit here:

* The product already centers on JSON-shaped data across Firestore, Firebase-hosted backend
  APIs, and a browser dashboard
* JSON Schema is transport-agnostic, so it can define Firestore document shapes, Pi-produced
  payloads, API bodies, and analytics read models without forcing everything into an HTTP-first
  mental model
* OpenAPI 3.1 and later already build on JSON Schema, so HTTP contracts can reference the same
  data models rather than inventing parallel API-only definitions
* The ESP8266 can consume only the tiny subset it actually needs through manual DTOs, instead of
  paying the complexity cost of schema tooling or protobuf end to end

### Layering model

Use three layers rather than one artifact for every concern.

1. Domain schemas

   JSON Schema files for durable or cross-surface business objects.

2. HTTP descriptions

   OpenAPI documents for Cloud Functions or API endpoints, referencing the domain schemas.

3. Firmware wire contracts

   Manual C or C++ structs, enums, field constants, and serializers for the ESP8266's narrow
   command and telemetry subset.

### Important boundary decision

Do not force the ESP8266 to share the full business-domain contract set.

The spec assigns business event creation, item classification, correctness logic, and Firebase
publishing to the Raspberry Pi side. The ESP8266 only owns poster LEDs and the ultrasonic sensor.
That means the firmware should only implement a narrow control-plane contract such as:

* person-near or person-gone sensor signal
* LED target command
* health ping
* firmware status or ack

It should not need to know about full disposal events, analytics DTOs, or rules presets beyond
the minimum command values that affect its own behavior.

## Proposed canonical contract set

### Disposal event

This is the primary immutable domain record and should be canonical.

Required fields from the spec:

* `stationId`
* `timestamp`
* `predictedItem`
* `correctDisposalMethod`
* `actualDisposalZone`
* `success`
* `modelConfidence`
* `llmFallbackUsed`

Recommended additions that preserve spec intent and improve extensibility:

* `eventId`
* `rulesPresetId`
* `sessionId`
* `classificationSource` with values such as `model` or `llm-fallback`
* `zoneMappingVersion`
* `schemaVersion`

Design guidance:

* Treat this as append-only
* Use explicit enums for disposal method and zone values
* Keep it Pi-authored and backend-stored
* Use ISO 8601 `date-time` strings in canonical JSON-facing contracts

### Live station status

This should be a snapshot contract, not an event log entry.

Recommended sections:

* station identity: `stationId`, `stationName`, `locationRef`
* connectivity: `piOnline`, `espOnline`, `lastHeartbeatAt`
* session state: `idle`, `detecting`, `guiding`, `awaiting-drop`, `completed`, `error`
* current guidance: `currentDetectedItem`, `currentDisposalMethod`, `confidence`, `llmFallbackUsed`
* current live detection context: `handPresent`, `lastTrackedZone`, `personDetected`
* UX state: `activeLedZone`, `lcdLine1`, `lcdLine2`, `stationCounter`
* latest event pointer: `latestEventId`, `latestEventAt`
* diagnostics: `cameraOk`, `lcdOk`, `ultrasonicOk`, `wifiRssi` when available

Design guidance:

* Treat this as mutable latest-state data
* Separate public dashboard fields from debug-only diagnostics if needed
* Avoid embedding large images or camera blobs in the status object

### Rules preset

This is a versioned business configuration object and should be canonical.

Recommended sections:

* `presetId`, `name`, `region`, `version`, `isActive`
* `supportedItems`
* `itemMappings`: item to disposal method
* `zoneMapping`: left or middle or right to disposal method
* `llmFallbackThreshold`
* `notes` or `description`
* `effectiveFrom`, `effectiveTo`

Design guidance:

* Treat rules as versioned configuration, never silently mutate historical meaning
* Store presets independently from stations
* A station references an active preset id instead of copying mappings into every event

### Station metadata

This should be canonical but stable and low-churn.

Recommended sections:

* `stationId`
* `displayName`
* `floor`
* `building`
* `locationLabel`
* `signageVariant`
* `layoutVariant`
* `hardware` information such as Pi model and firmware revision
* `installedAt`
* `tags`

Design guidance:

* Keep this separate from live status
* Keep analytics dimensions here so dashboard queries can group by floor, building,
  signage variant, and layout variant without rewriting event structure

### Analytics DTOs

These should be canonical as read models, but separate from the raw disposal event.

Recommended DTO families:

* time-series bucket DTOs
* leaderboard row DTOs
* contamination item DTOs
* success-rate summary DTOs
* comparison DTOs for before or after and A or B slices

Design guidance:

* Keep analytics DTOs derived and query-oriented
* Do not overload the raw disposal event with dashboard aggregation fields
* Distinguish request DTOs from response DTOs

### HTTP and API contracts

These should be OpenAPI-defined wrappers around the canonical schemas.

Likely API families:

* stations list and details
* station status read endpoint
* rules preset list and activation endpoint
* disposal event query endpoint
* analytics query endpoints
* health endpoints

If live monitoring needs an HTTP push channel beyond Firestore listeners, prefer SSE or NDJSON
from the backend or Pi-facing gateway rather than inventing a custom ad hoc streaming format.

## Where types should live

Assuming the recommended repo foundation from repo memory, use these locations.

### Canonical schemas and examples

* `packages/contracts/schemas/domain/`
* `packages/contracts/schemas/analytics/`
* `packages/contracts/schemas/common/`
* `packages/contracts/examples/`

Suggested files:

* `packages/contracts/schemas/domain/disposal-event.schema.json`
* `packages/contracts/schemas/domain/live-station-status.schema.json`
* `packages/contracts/schemas/domain/rules-preset.schema.json`
* `packages/contracts/schemas/domain/station-metadata.schema.json`
* `packages/contracts/schemas/analytics/analytics-query.schema.json`
* `packages/contracts/schemas/analytics/analytics-summary.schema.json`

### Generated web and backend types

* `packages/contracts/generated/typescript/`

The website and Firebase backend can both import generated TypeScript types from the same package.
If runtime validation is needed, keep validators in the same package or generate them beside the
schemas.

### OpenAPI documents

* `services/api/openapi/openapi.yaml`
* `services/api/openapi/components/`

The OpenAPI documents should reference canonical schemas instead of redefining them inline.

### Raspberry Pi runtime types

Two acceptable options exist, depending on Pi language choice:

* If Pi runtime is TypeScript: import from `packages/contracts/generated/typescript/`
* If Pi runtime is Python: generate Python models into `devices/pi-station/generated/contracts/`
  from the same JSON Schemas, or validate outbound payloads against the schemas during tests

The important part is that Pi runtime does not become the schema authoring surface.

### Rules presets data

* `packages/rules/presets/*.json`

Each preset JSON document should validate against the canonical rules preset schema.

### Firmware manual types

* `firmware/esp8266/include/contracts/`
* `firmware/esp8266/src/contracts/`

Suggested firmware-facing artifacts:

* `led_command.h`
* `presence_signal.h`
* `firmware_status.h`
* `wire_keys.h`

These should be hand-maintained and intentionally tiny.

## Firmware limitations and implications

The ESP8266 should be treated as a constrained client with strict contract discipline.

Implications:

* Prefer small flat payloads over nested flexible objects
* Prefer enum codes and short stable keys on the firmware wire if payload size matters
* Avoid general schema validators on-device
* Avoid generated full-domain models on-device
* Parse streams directly and avoid buffering large payloads
* Store repeated string literals in flash when possible
* Keep optional fields to a minimum on the firmware wire

Practical firmware rules:

* Firmware messages should stay focused on sensor input and LED output
* Use Pi as the protocol translation boundary between firmware wire messages and cloud-facing
  JSON domain contracts
* Let the Pi stamp timestamps and construct business events
* Let the Pi join firmware input with camera inference and rules presets

## Evaluation of alternatives

### JSON Schema as canonical source

Assessment: best fit.

Strengths:

* Matches the project's JSON and Firestore-oriented architecture
* Works across web, backend, persisted documents, and Pi payloads
* Lets OpenAPI reuse the same models
* Avoids forcing HTTP semantics onto non-HTTP contracts

Tradeoffs:

* Code generation quality varies by language and tooling
* Some annotation keywords are not fully validating in all tools
* Embedded firmware will still need a manual subset

### OpenAPI-first for everything

Assessment: rejected as the canonical source, retain for HTTP only.

Why rejected:

* OpenAPI is fundamentally an HTTP API description language
* Many Binsight contracts are not primarily HTTP contracts, including Firestore document shapes,
  Pi-internal state, and ESP-to-Pi messages
* An OpenAPI-first approach tends to make non-HTTP contracts second-class or duplicated

### Protobuf as canonical source

Assessment: rejected for this project.

Why rejected:

* The stack already needs JSON for browser clients, Firebase, and Firestore-like storage
* Protobuf would introduce a second primary representation and translation layer everywhere
* The business objects need to be easy to inspect, debug, and store in JSON-oriented systems
* Embedded viability via nanopb is real, but the project does not benefit enough from binary-first
  transport to justify the stack-wide complexity

When protobuf would be better:

* If the project moved to binary-first device messaging at scale
* If bandwidth and latency between devices became a dominant bottleneck
* If a gRPC service backbone replaced Firebase-centric APIs

### Handwritten per-service DTOs

Assessment: rejected as the primary strategy.

Why rejected:

* Drift risk is high across website, backend, Pi runtime, and firmware
* Analytics and event definitions would diverge under schedule pressure
* Manual duplication would make rule and event evolution error-prone

Where handwritten DTOs remain valid:

* ESP8266 firmware subset contracts
* Service-local view models that are clearly derived from canonical types
* UI-only presentation types that should not leak back into domain contracts

## Firestore shape implications

Firestore guidance favors root-level collections or subcollections for growing datasets.
For this project that suggests:

* `stations` collection for station metadata
* `stationStatus` collection for latest mutable status snapshots, or a status subdocument under each
  station if query patterns are simple
* `rulesPresets` collection for versioned rules
* `disposalEvents` root-level collection for high-volume event querying and time filters
* analytics materializations in separate collections if precomputed summaries are needed

The raw disposal event schema should not be shaped around one specific Firestore nesting pattern.

## Versioning guidance

Use explicit schema and contract versioning from the start.

Recommendations:

* Add `$id` and `$schema` to standalone schema documents
* Include `schemaVersion` on major domain payloads that may be persisted or streamed
* Use additive evolution first
* Never repurpose enum values
* Keep rules preset versions explicit and immutable
* For firmware wire contracts, version the message envelope separately from the domain schema set

## Evidence notes

Evidence gathered so far:

* JSON Schema overview and specification pages
* OpenAPI overview page and current specification
* Protobuf overview page
* Nanopb embedded protobuf documentation
* Firebase Cloud Functions HTTP documentation
* Firestore structure guidance
* ArduinoJson feature and memory usage guidance

## Next research

* Define the domain boundary between canonical contracts and transport-specific wrappers
* Determine where generated TypeScript and Python contracts should live in the repo structure
* Determine whether Pi to backend live updates should be modeled as REST snapshots, NDJSON,
  SSE, or Firestore-only document updates
* Spell out firmware-safe field design rules for enums, timestamps, optionality, and payload size

## Open questions

* Should the Pi communicate with Firebase only through Firestore writes, or should some live
  monitoring data also have direct HTTP endpoints for the website?
* Is the ESP8266 expected to talk only to the Pi, or also directly to Firebase or backend APIs?