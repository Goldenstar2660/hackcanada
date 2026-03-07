# Shared Contracts Research

## Status
- Complete

## Research topics and questions
- What should be shared versus duplicated across website, Raspberry Pi code, ESP8266 firmware, and optional backend/shared code?
- Which contract definition pattern best fits a smart device project where one target is an ESP8266 microcontroller?
- How should JSON Schema, OpenAPI, and manual DTO approaches be combined or avoided?
- What versioning and compatibility strategy best supports iterative development without breaking constrained firmware?

## Project-specific constraints from the spec
- BinBuddy has two hardware units: ESP8266 for poster LEDs and ultrasonic sensing, and Raspberry Pi 5 for camera inference and LCD.
- ESP8266 and Raspberry Pi communicate over Wi-Fi.
- Raspberry Pi runs offline on-device inference.
- Backend/dashboard may be cloud hosted, and Firebase is acceptable for event storage and dashboard data.
- Demo scope is a single tabletop station with three disposal zones and event reporting.

## Key discoveries
- The spec implies at least two different contract surfaces and they should not be forced into one identical representation:
  - Pi <-> ESP8266 local device messages for LEDs, ultrasonic sensing, heartbeats, and device status.
  - Pi/backend/dashboard contracts for events, station metadata, rules presets, and analytics-facing APIs.
- The practical split is semantic sharing, not full implementation sharing.
  - Share business meanings, names, enums, required fields, examples, and version rules.
  - Duplicate transport-specific adapters, serializers, validation code, and memory-management details per runtime.
- JSON Schema is the best primary contract language for shared JSON payloads because it is language-agnostic, validation-oriented, referenceable by URI, and supports external references and reusable schemas.
- OpenAPI is a good outer contract for HTTP APIs that web, dashboard, and backend consumers will call, but it should consume shared schemas rather than become the only source of truth for every device message.
- For ESP8266-class firmware, generated SDKs and large reflective schema tooling are the wrong default. A minimal hand-written DTO/codec layer is a better fit.
- Protobuf is viable on constrained devices, but it is a better fit when wire efficiency dominates and every participant can accept the additional generator/runtime/tooling burden. That does not appear to be the main constraint in this demo-oriented architecture.

## Recommended contract strategy

### 1. Use a layered contract model
- Make JSON Schema 2020-12 the source of truth for shared domain payloads.
- Use OpenAPI only for backend and Pi-hosted HTTP APIs, with request and response bodies referencing those shared schemas.
- For Pi <-> ESP8266, use a very small JSON message protocol whose message shapes are documented by the same shared schemas, but implemented in firmware with manual DTO structs and explicit parse/serialize code.

### 2. Share semantics, not full runtime code
- Share these artifacts across website, Pi, backend, and firmware teams:
  - Canonical enum values: disposal methods, zones, event types, command names, device states.
  - Stable field names and required/optional field rules.
  - Example payloads.
  - Schema IDs and contract version identifiers.
  - Compatibility rules for adding, deprecating, and removing fields.
- Do not try to share these artifacts verbatim across all targets:
  - Generated clients or reflective schema validators inside ESP8266 firmware.
  - Browser/backend-oriented model classes that assume dynamic memory and full validation support.
  - A single DTO implementation package spanning TypeScript, Python, and Arduino C++.

### 3. Define two schema families
- Domain schemas:
  - `disposal-event`
  - `station-config`
  - `rules-preset`
  - `station-status`
- Device message schemas:
  - `device-hello`
  - `heartbeat`
  - `sensor-reading`
  - `led-command`
  - `ack`
  - `error`

### 4. Keep ESP8266 payloads deliberately simple
- Prefer flat or lightly nested objects.
- Prefer small enums and booleans over deep polymorphic objects.
- Prefer explicit message `type` plus a compact payload object over highly generic envelopes.
- Avoid large arrays, free-form maps, and deeply nested optional structures in the Pi <-> ESP8266 link.
- Keep binary media out of the ESP8266 protocol. The spec already places image inference on the Pi, which is the correct boundary.

### 5. Publish shared contracts as data, not only code
- Recommended repo shape:
  - `contracts/schemas/*.schema.json`
  - `contracts/examples/*.json`
  - `contracts/openapi/*.yaml`
  - `contracts/firmware/` for hand-maintained notes or generated constant tables if needed
- Pi/backend/web can consume schemas directly.
- Firmware should consume a minimal derivative artifact if needed, such as checked-in constants, enum headers, or manually maintained field tables.

## What should be shared versus duplicated

### Share
- Disposal method vocabulary: `recycle`, `compost`, `garbage`
- Zone vocabulary and mapping metadata: `left`, `middle`, `right`
- Event schema fields from the spec:
  - `stationId`
  - `timestamp`
  - `predictedItem`
  - `correctDisposalMethod`
  - `actualDisposalZone`
  - `success`
  - `modelConfidence`
  - `llmFallbackUsed`
- Station configuration concepts:
  - confidence threshold
  - supported item set
  - item-to-method mapping
  - station metadata
- Message type names, version fields, and examples

### Duplicate intentionally
- ESP8266 parsing and serialization code
- Pi-side transport handlers and retry logic
- Backend persistence models if storage needs denormalization or analytics-specific indexes
- Frontend view models derived from backend payloads
- Validation implementation details per platform

### Reasoning
- Shared semantics reduce drift.
- Duplicated adapters let each runtime honor its own constraints.
- This is the right compromise between consistency and deployability.

## Schema and contract definition patterns

### JSON Schema as primary shared model
- JSON Schema explicitly describes structure, constraints, and types for JSON data.
- It supports `$id` and `$ref`, which makes it suitable for a contracts folder with reusable components.
- It is strong for validation, examples, and documentation.
- It maps naturally to event payloads and station configuration data from the spec.

### OpenAPI as HTTP surface description
- OpenAPI defines HTTP APIs and includes reusable Schema Objects.
- It is ideal for dashboard/backend APIs and any Pi-exposed HTTP endpoints.
- It should reference the shared JSON Schemas or mirror them closely.
- It should not be the only contract artifact for the ESP8266 link, because that link is a device protocol first and an HTTP API only if the team explicitly chooses HTTP there.

### Manual DTOs for firmware
- Firmware should use hand-written structs and codec functions for each message type.
- This keeps memory use explicit and avoids pulling in generator-heavy or reflection-heavy toolchains.
- The DTO definitions should be mechanically aligned to schema field names and enums, but not automatically generated unless the generated output is proven small and reviewable.

### Envelope pattern for device messages
- Recommended Pi <-> ESP8266 message shape:

```json
{
  "schemaVersion": 1,
  "type": "ledCommand",
  "messageId": "abc123",
  "sentAt": "2026-03-07T12:00:00Z",
  "payload": {
    "zone": "left",
    "state": "on"
  }
}
```

- Why this pattern fits:
  - `type` allows straightforward routing in firmware.
  - `schemaVersion` gives a clear compatibility gate.
  - `messageId` supports ack/retry handling.
  - `payload` isolates per-message fields cleanly.

## JSON Schema vs OpenAPI vs manual DTOs

### JSON Schema
- Best for:
  - shared event definitions
  - station config definitions
  - local device message definitions when JSON is the wire format
  - validation in TypeScript, Python, and backend code
- Weakness on ESP8266:
  - schema-driven validation at runtime is unnecessary overhead
  - many JSON Schema toolchains assume more memory and dynamic behavior than firmware wants

### OpenAPI
- Best for:
  - backend APIs
  - dashboard-facing endpoints
  - optional Pi-hosted admin/config endpoints
- Weakness for firmware link:
  - models HTTP operations, not just message shapes
  - tends to pull teams toward generator-first workflows that are awkward on small firmware targets

### Manual DTOs
- Best for:
  - ESP8266 codecs
  - very small stable command/telemetry messages
  - explicit memory and error handling
- Weakness:
  - easy to drift without a canonical schema source
- Conclusion:
  - manual DTOs are good only when anchored to a separate source of truth, which here should be JSON Schema plus examples

## Versioning and compatibility strategy

### Contract versioning model
- Use independent semantic versioning for the contracts package itself.
- Put a simple integer `schemaVersion` in every Pi <-> ESP8266 message envelope.
- Version OpenAPI documents independently from the contract package if needed, but keep payload schemas aligned.

### Compatibility rules for Pi <-> ESP8266 messages
- Backward-compatible changes:
  - add optional fields
  - add new message types
  - add enum values only when old firmware can safely ignore or treat them as unknown
  - add new top-level schemas
- Conditionally safe changes:
  - widening numeric ranges if old firmware still receives old-range values during rollout
- Breaking changes:
  - rename fields
  - change field meaning
  - change required fields to incompatible new required fields
  - reuse message types with different payload semantics
  - rely on old firmware understanding new enum semantics

### Firmware compatibility behavior
- Unknown message `type`: reject and return structured `error` or ignore safely.
- Unknown fields in known messages: ignore.
- Missing required fields: reject.
- Unknown enum values: map to `_unknown` or fail safe, never to an arbitrary real action.
- If `schemaVersion` is higher than supported:
  - reject commands that can change hardware behavior
  - allow only a conservative subset of read-only or status behavior if explicitly designed for it

### Event compatibility behavior
- Treat event payloads as append-only where possible.
- Do not change the meaning of existing event fields once written to storage.
- When semantics change materially, create a new event type rather than silently mutating field interpretation.

### Deprecation policy
- Mark fields as deprecated in schema descriptions and OpenAPI descriptions before removal.
- Keep deprecated fields readable longer than writable.
- Remove only after all firmware/Pi/backend consumers are known to have rolled forward.

## Rejected or lower-priority alternatives

### One universal generated model package for all targets
- Rejected because the smallest target is ESP8266 firmware.
- The browser/backend/Pi ergonomics of generated models are not the firmware ergonomics.
- This would optimize for code reuse at the expense of runtime fit.

### OpenAPI-only approach
- Rejected as the sole source of truth.
- OpenAPI is the wrong abstraction level for the entire system because not every contract surface is an HTTP API.
- It is still recommended for actual HTTP APIs.

### Protobuf as the primary contract for the whole project
- Rejected for now, not because it is invalid, but because it is mismatched to the likely dominant needs.
- Benefits:
  - compact data
  - good schema evolution story
  - good cross-language support
  - can fit on constrained devices via nanopb
- Costs:
  - requires `.proto` compiler workflow and generated bindings
  - binary payloads are harder to debug live than JSON
  - protobuf messages are not self-describing without the `.proto`
  - protobuf JSON mapping and browser/backend usage add another layer of complexity when JSON is already the natural format for dashboard and Firebase-style storage
- Reconsider protobuf only if the Pi <-> ESP8266 link becomes bandwidth-sensitive, latency-sensitive, or message-volume-heavy enough that JSON overhead is a measured problem.

### Full runtime JSON Schema validation on the ESP8266
- Rejected.
- The firmware should validate only what it needs with targeted code paths.
- The value of JSON Schema here is design-time consistency and validation on richer runtimes.

## Key risks
- Schema drift between shared schemas and firmware DTO code if no discipline exists around updates.
- Enum expansion can still break application logic even when structurally compatible.
- Over-generalized device messages will make firmware parsing brittle and memory-heavy.
- If event semantics change after data is stored, dashboard analytics can become historically inconsistent.
- If the team later introduces multiple transports, coupling schema semantics too tightly to one transport envelope may create migration pain.

## Practical implementation guidance
- Start with JSON over local Wi-Fi between Pi and ESP8266 because it is easy to inspect, test, and iterate during the hackathon/demo stage.
- Keep firmware messages tiny and action-focused.
- Validate schemas in Pi/backend/web CI, not on the ESP8266 at runtime.
- Generate documentation and examples from shared schemas for humans.
- Write firmware conformance tests against captured example payloads.

## External evidence collected
- JSON Schema says it is a declarative language for defining structure and constraints for JSON data, and recommends the current draft 2020-12.
- JSON Schema documentation demonstrates `$schema`, `$id`, `properties`, `required`, and `$ref`, which supports a reusable shared-contracts folder structure.
- OpenAPI defines a standard, language-agnostic interface description specifically for HTTP APIs, and its Schema Object is based on JSON Schema.
- OpenAPI includes guidance for versioning and deprecation of the specification itself, reinforcing its use as an API description layer rather than a catch-all device-protocol layer.
- ArduinoJson supports streaming parse/serialize, input filtering, memory-saving features such as string deduplication, and direct use on Wi-Fi streams, which makes it well suited for small JSON device payloads on ESP8266.
- Espressif describes ESP8266 as a 160 MHz single-core Wi-Fi MCU with basic peripherals, reinforcing that it is a constrained edge device rather than a full general-purpose application host.
- Nanopb explicitly targets tight embedded constraints such as less than 10 kB ROM and less than 1 kB RAM, confirming protobuf can fit on small devices when necessary.
- Protobuf documentation says it supports adding and deleting fields compatibly, but also requires `.proto` definitions, generated code, and careful field-number management, and it notes protobuf is less suitable when a formal standard or self-describing data is required.

## Final recommendation
- Use shared JSON Schema documents as the canonical contract source.
- Use OpenAPI for backend/dashboard and optional Pi HTTP APIs by referencing those shared schemas.
- Use manual firmware DTOs plus ArduinoJson for the ESP8266, aligned to the same schemas and examples.
- Adopt additive, append-only evolution rules with explicit `schemaVersion` in device messages.
- Defer protobuf unless measured constraints show JSON is materially too large or slow on the Pi <-> ESP8266 link.

## References
- Project spec: `/home/handwash/Projects/hackcanada/spec/binbuddy-spec.md`
- JSON Schema overview: https://json-schema.org/overview/what-is-jsonschema
- JSON Schema getting started and references: https://json-schema.org/learn/getting-started-step-by-step
- OpenAPI Specification: https://spec.openapis.org/oas/latest.html
- ArduinoJson: https://arduinojson.org/
- ESP8266 product page: https://www.espressif.com/en/products/socs/esp8266ex
- Nanopb: https://jpa.kapsi.fi/nanopb/
- Protocol Buffers overview: https://protobuf.dev/overview/
- Protocol Buffers update guidance: https://protobuf.dev/programming-guides/proto3/#updating

## Recommended next research
- Define the exact Pi <-> ESP8266 transport choice: HTTP, WebSocket, raw TCP, or MQTT.
- Draft the first concrete schemas for `disposal-event`, `station-config`, `device-hello`, `led-command`, and `heartbeat`.
- Decide whether schema examples will be used as firmware conformance fixtures in CI.
- Decide how rules presets should be versioned independently from transport/message versions.

## Clarifying questions not answerable by research alone
- Which transport will the Pi <-> ESP8266 link actually use?
- Will the Pi expose local HTTP endpoints, or is the local device protocol non-HTTP?
- Is the backend intended to be contract-first now, or only after the demo path is stable?