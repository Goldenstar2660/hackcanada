---
title: Repo Layout Research
description: Research document for the recommended top-level repository layout for the BinBuddy project
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - repository layout
  - monorepo
  - raspberry pi
  - esp8266
  - firebase
  - dashboard
estimated_reading_time: 8
---

## Research status

Status: Complete

## Research topics

* Determine the best top-level repository layout for a greenfield BinBuddy repository.
* Separate the website dashboard, Raspberry Pi station runtime, ESP8266 firmware, backend and cloud services, shared code, infrastructure, docs, and spec.
* Keep the layout aligned with the product and technical constraints in the project spec.
* Identify boundaries that reduce coupling between hardware, cloud, and UI workstreams.
* Evaluate whether a monorepo with apps, packages, firmware, and infra boundaries is preferable to flatter or split layouts for this project.

## Local context

* Source of truth: `spec/binbuddy-spec.md`.
* Current workspace is greenfield with spec and repo metadata only.
* Spec-defined technical surfaces: dashboard website, Raspberry Pi 5 runtime, ESP8266 controller firmware, Firebase Firestore, Firebase Cloud Functions, shared business rules and event contracts.
* Spec-defined device split is explicit: ESP8266 handles poster LEDs and ultrasonic sensing, while Raspberry Pi 5 handles camera, LCD, inference, disposal tracking, and Firebase publishing.
* Spec requires configurable rule presets, event creation, live monitoring, and historical analytics. Those concerns create shared contracts that span dashboard, station runtime, and backend.

## Findings

* A single repository is the best fit for the current scope because the spec defines one product with tightly coupled contracts across the dashboard, Pi runtime, ESP8266 firmware, and Firebase backend.
* The top-level structure should separate by deployable surface first, then by reusable assets. This keeps ownership and build tooling clear while preserving a single source of truth for rules and event schemas.
* The JavaScript and TypeScript workspace should be limited to web and cloud packages. Firmware and Raspberry Pi runtime should remain isolated from JS workspace assumptions unless the Pi runtime is later confirmed to use Node.js.
* Shared business definitions should live in language-neutral packages. The most important shared assets are disposal event schemas, live status payloads, station metadata, rules presets, and analytics derivation logic.
* Infrastructure should remain top-level and separate from service code. The Firebase project configuration, emulators, deployment config, and optional Terraform should be grouped in `infra/` so application directories do not mix source code with stateful deployment concerns.
* The spec should remain in its own top-level `spec/` directory instead of being folded into `docs/`. The project instructions explicitly treat the spec as the source of truth, so it should stay distinct from explanatory documentation.

## Recommended folder layout

```text
.
├── apps/
│   └── dashboard/
├── devices/
│   └── pi-station/
├── firmware/
│   └── esp8266-controller/
├── services/
│   └── cloud-functions/
├── packages/
│   ├── analytics/
│   ├── contracts/
│   ├── rules/
│   └── tooling/
├── infra/
│   ├── firebase/
│   └── terraform/
├── docs/
│   ├── architecture/
│   ├── operations/
│   └── adr/
├── spec/
├── scripts/
└── .github/
```

### Layout rationale

* `apps/dashboard/` should contain the website dashboard only. It maps directly to the spec's station insights and live monitoring surfaces.
* `devices/pi-station/` should contain the Raspberry Pi runtime, on-device inference pipeline, LCD integration, Wi-Fi communication with the ESP8266, and Firebase publishing client. This keeps the station runtime isolated from web bundling and serverless conventions.
* `firmware/esp8266-controller/` should contain the microcontroller code, board-specific configuration, and flashing workflow. This boundary matches the separate hardware unit described in the spec.
* `services/cloud-functions/` should contain Firebase Cloud Functions only. This service owns backend endpoints, aggregation jobs, event fan-out, and dashboard-specific backend logic without forcing those concerns into the dashboard app.
* `packages/contracts/` should be the canonical home for shared payload definitions such as disposal events, live station status, station metadata, and API DTOs. Prefer language-neutral schemas first, then generate or hand-maintain language bindings as needed.
* `packages/rules/` should contain the configurable item-to-disposal mappings, zone mappings, locality presets, and threshold defaults from the spec. Both the Pi runtime and cloud services need the same rule vocabulary.
* `packages/analytics/` should contain pure aggregation logic for metrics such as first-try correct rate, compliance score, contamination rollups, and time-bucket summaries. Keeping this separate prevents metric drift between dashboard and backend.
* `packages/tooling/` should contain shared lint, TypeScript, test, or schema generation configuration for workspace-managed packages only.
* `infra/firebase/` should hold `firebase.json`, emulator configuration, hosting targets, Firestore rules and indexes, and deployment wiring.
* `infra/terraform/` should be optional but reserved from the start for cloud-hosted dashboard or supporting infrastructure. Use provider or environment subdirectories only inside this boundary.
* `docs/` should hold explanatory documentation such as architecture diagrams, deployment notes, station setup instructions, and ADRs.
* `spec/` should remain unchanged as the authoritative product specification.
* `scripts/` should hold cross-cutting automation such as local bootstrap, schema generation, fixture sync, and CI helper scripts.

### Recommended sub-boundaries

* `devices/pi-station/` should likely use `src/`, `tests/`, `models/`, `drivers/`, and `config/` subdirectories so inference assets, hardware interfaces, and session logic do not blur together.
* `firmware/esp8266-controller/` should follow a firmware-native layout such as PlatformIO with `src/`, `include/`, `lib/`, and `test/`.
* `services/cloud-functions/` should group functions by domain, for example `events/`, `stations/`, `analytics/`, and `monitoring/`, instead of one large entry file.
* `packages/contracts/` should separate `schemas/`, `examples/`, and generated bindings if generation is adopted.
* `infra/terraform/` should separate `modules/` from environment or stack roots if Terraform is introduced.

## Rejected alternatives

* A flat top-level split such as `frontend/`, `backend/`, and `hardware/` is too coarse. It hides the difference between Raspberry Pi runtime and ESP8266 firmware, and it does not give shared rules or contracts an obvious home.
* Multiple repositories, one per surface, are a poor fit for the current greenfield stage. The spec depends on shared event models, shared rules presets, and coordinated end-to-end changes, so cross-repo drift would be likely.
* Putting everything under a single `apps/` directory is not recommended. Firmware, infrastructure, and documentation have different toolchains and lifecycle expectations, and forcing them into application semantics reduces clarity.
* Embedding infrastructure inside the cloud service directory is also weaker. Firebase project config, Firestore indexes, hosting, and optional Terraform affect more than one deployable surface and should not appear to belong only to Cloud Functions.
* Merging `spec/` into `docs/` should be avoided. The instructions for this repository explicitly designate the spec as the primary source of truth, so it should stay separately identifiable.

## References and evidence

* The project spec defines one product with a dashboard, a Raspberry Pi station runtime, an ESP8266 controller, Firebase Firestore, Firebase Cloud Functions, and shared configurable rules. That combination argues for one repository with explicit surface boundaries rather than separate repos or one undifferentiated codebase.
* Firebase documents support organizing Cloud Functions as multiple source packages inside a monorepo by using separate `source` and `codebase` entries in `firebase.json`. That supports keeping `services/cloud-functions/` isolated while staying in one repository.
* Turborepo recommends splitting workspace-managed packages into `apps/` for applications and `packages/` for reusable libraries, and it warns against leaking across package boundaries with relative imports. This supports putting dashboard code in `apps/` and reusable contracts, rules, and analytics in `packages/`.
* monorepo.tools describes a monorepo as multiple distinct projects with well-defined relationships rather than simple code colocation. That aligns with this recommendation to separate deployable surfaces and shared packages explicitly.
* PlatformIO documents explicit firmware directory concepts such as `src_dir`, `include_dir`, `lib_dir`, `test_dir`, and `shared_dir`. That supports keeping ESP8266 firmware in a dedicated firmware project rather than forcing it into a web or backend workspace.
* HashiCorp recommends separating infrastructure configuration from reusable modules and, when repositories grow, splitting resources by logical groups and environment boundaries. That supports a top-level `infra/` directory with room for both Firebase configuration and optional Terraform stacks.

## Discovered follow-on questions

* What should be shared between Pi runtime, dashboard, and backend versus duplicated for firmware?
* Where should environment-specific configuration and station rules live?
* Should infrastructure stay grouped by provider or by deployable surface?

## Answers to follow-on questions

* Share contracts, rules presets, analytics formulas, and fixture data across dashboard, Pi runtime, and backend. Do not try to share runtime code directly with ESP8266 firmware unless code generation produces tiny artifacts that fit firmware constraints.
* Keep environment-specific configuration outside reusable packages. Station- or environment-specific values should live in deployable app and service config directories, while default rules and schemas live in `packages/`.
* Group infrastructure first under `infra/`, then choose provider or environment splits inside it based on actual operational needs. Starting with `infra/firebase/` and optional `infra/terraform/` is simpler than premature per-environment sprawl.

## Next research

* Confirm the Raspberry Pi runtime language before establishing the workspace tooling strategy.
* Decide whether infrastructure will remain Firebase-only for v1 or whether Terraform-backed hosting and secrets management are in scope.
* Define the canonical schema format for `packages/contracts/` so firmware, Pi runtime, and cloud services stay aligned.

## Remaining questions

* Should the Raspberry Pi runtime be Python-first or Node.js-first?
* Will the dashboard use Firebase Hosting only, or is separate cloud hosting expected in v1?
* Do you want `packages/contracts/` to be schema-first with generated client types, or manually maintained per-language bindings?
