---
title: Validation Setup Blockers Research
description: Audit of Binsight validation workflows, setup requirements, environment dependencies, and demo-day operational blockers
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - validation
  - setup
  - blockers
  - demo day
  - binsight
estimated_reading_time: 10
---

## Research status

Status: Complete

## Research topics

* Audit the current validation workflow across the repository root, web app, backend functions, Raspberry Pi runtime, and ESP8266 firmware.
* Verify which build, lint, test, and run entry points exist and what they depend on.
* Identify missing local tools, missing environment configuration, missing secrets, and other setup blockers.
* Determine which validation commands are likely to pass today and which are blocked by missing implementation or environment assumptions.
* Recommend the exact validation and demo-day hardening approach for this cycle, including fallback plans for partial integration.

## Local context

* Source of truth: `spec/binsight-spec.md`.
* The root workspace uses `pnpm` for TypeScript packages, `uv` for the Raspberry Pi Python runtime, and PlatformIO for the ESP8266 firmware.
* The repository already contains prior research notes for 2026-03-07, including layout and runtime-boundary decisions that help interpret current validation entry points.
* Existing research already established that the Pi should remain the authoritative live control loop, the ESP boundary should stay narrow, and the backend acts as the normalization and persistence boundary.

## Findings

### Validation workflow inventory

Root workflows are explicitly documented and implemented.

* `README.md` directs contributors to `just --list` and `just validate` as the top-level validation entry points.
* The root `package.json` defines `lint`, `build`, and `test` as `corepack pnpm` recursive workspace commands.
* `justfile` adds surface-specific recipes: `web`, `backend`, `pi`, `firmware`, `check`, and `validate`.
* `just validate` runs TypeScript lint, build, and test first, then `uv run pytest` in `devices/pi-station`, then a PlatformIO firmware build through `.venv/bin/pio` or global `pio`.

Surface-level workflow reality today:

* Root TypeScript workspace:
  * `corepack pnpm lint` exists and passes.
  * `corepack pnpm build` exists and passes.
  * `corepack pnpm test` exists and passes, but only because no workspace package currently defines a `test` script.
* Web surface:
  * `apps/web/package.json` defines `lint`, `build`, and `dev`.
  * `dev` is only `tsc -w`; it is not a real app server, browser preview, Vite/Next runtime, or Firebase-hosted local preview.
  * The package README explicitly describes the web surface as a minimal TypeScript shell with framework and UI bootstrap deferred.
* Backend functions:
  * `services/backend-functions/package.json` defines `lint`, `build`, and `dev`.
  * `dev` is only `tsc -w`; it does not start Firebase emulators or serve callable or HTTP functions locally.
  * The backend README explicitly says Firebase runtime wiring and emulator support are deferred follow-on work.
* Pi runtime:
  * `devices/pi-station/pyproject.toml` defines `binsight-station` and pytest configuration.
  * The Pi README documents `uv sync`, `uv run pytest`, and `uv run binsight-station`.
  * This surface is the only one with a meaningful automated test suite today.
* Firmware:
  * `firmware/esp8266-controller/README.md` documents `../../.venv/bin/pio run` and `pio run`.
  * The firmware surface only has a build validation path today. There are no firmware-native tests under `test/`.

### Commands verified during this research

Commands that passed in the current workspace:

* `corepack pnpm lint`
* `corepack pnpm build`
* `corepack pnpm test`
* `../../.venv/bin/pio run` from `firmware/esp8266-controller`

Commands that failed in the current workspace:

* `uv run pytest` in `devices/pi-station`
* `uv run binsight-station` in `devices/pi-station`
* `pio run` from `firmware/esp8266-controller` when relying on PATH
* `just validate`

### What is likely to pass today

These commands are reliable validation gates for the current cycle because they completed successfully during this audit.

* Root TypeScript compile-only validation: `corepack pnpm lint` and `corepack pnpm build`
* Root test command as a smoke indicator for workspace script wiring only: `corepack pnpm test`
* Firmware compilation when using the repository-local binary: `cd firmware/esp8266-controller && ../../.venv/bin/pio run`
* `just check`, by implication, is likely to pass because it only runs the same root lint and build steps that already passed

### What is blocked today

#### Pi runtime implementation drift blocks the real end-to-end validation gate

The Pi runtime is the primary blocker for `just validate` and for any live demo that depends on the runtime.

Verified failures:

* `uv run pytest` fails with 8 failing tests and 11 passing tests.
* `uv run binsight-station` fails immediately.
* `just validate` fails in the Pi pytest phase before it reaches the firmware phase.

Root causes found in code and test evidence:

* `StationRuntime._publish_runtime_status()` calls `LiveStatusPublisher.build_status(..., device_health=..., session_state_override=...)`, but `LiveStatusPublisher.build_status()` does not accept either keyword. This produces the immediate `TypeError` that breaks runtime startup and multiple tests.
* `devices/pi-station/tests/test_smoke.py` references `MemoryEspTransport` without importing it, which produces `NameError` failures in three smoke tests.
* `devices/pi-station/src/binsight_station/live_status.py` contains conflicting duplicate dataclass definitions and a live-status builder that hardcodes its own `DeviceHealth()` instead of honoring runtime-supplied device health. That inconsistency matches the failing call signature and confirms contract drift inside the runtime surface.

#### Pi example environment is internally inconsistent

The documented Pi setup has a configuration trap.

* `devices/pi-station/.env.example` sets `RULES_PRESET_VERSION=demo-v1`.
* The actual preset file is `packages/rules/presets/demo-canada-ottawa.1.0.0.json`.
* `devices/pi-station/src/binsight_station/rules.py` loads presets by exact `presetId` and exact `version`, and raises `ValueError` when the requested version is not found.

Consequence:

* A user who copies the example env file without correcting the version would block runtime startup on rules loading even after the current live-status bug is fixed.

#### Firmware validation is path-sensitive

The firmware surface is valid only through the repository-local PlatformIO path right now.

* `command -v pio` returns missing in a fresh shell.
* `.venv/bin/pio` exists and successfully builds the firmware.
* `pio run` fails from the firmware directory because PATH does not include PlatformIO.
* The root `justfile` correctly compensates for this by preferring `$PWD/.venv/bin/pio`.

Consequence:

* The documented direct firmware command that relies on a global `pio` is blocked on this machine.
* The repository-level `just firmware` and `just validate` design is correct for local builds, but only if the user follows the repo-level path or has global PlatformIO installed.

#### Web and backend are compilable shells, not runnable operator workflows

The TypeScript packages compile, but the product surfaces needed for demo-day operation are still partial.

Web gaps:

* The web README says framework selection and UI implementation are intentionally deferred.
* `apps/web` has no actual dev server command, only `tsc -w`.
* There is no workspace CI or package-level test suite for the web surface.
* The Firebase layer in `apps/web/src/lib/firebase` is transport abstraction only. There is no checked-in Firebase app initialization, no authenticated operator bootstrap, and no local app hosting command.

Backend gaps:

* The backend README says Firebase runtime wiring and emulator support are deferred.
* `services/backend-functions` has no `test` script.
* No `.github/workflows` CI definitions exist in the workspace.
* No local emulator start command is declared in package scripts or `justfile`.

Consequence:

* The web and backend can be typechecked, but not meaningfully validated as runnable demo-day surfaces from the current repo commands alone.

### Missing tools, environment, secrets, and setup assumptions

#### Tools and executables

* `uv` is installed and resolves on PATH.
* Global `pio` is not installed on PATH in the fresh shell used for validation.
* Repository-local `.venv/bin/pio` exists and works.
* `just` and `corepack` are available.

#### Missing or undocumented environment setup

Pi runtime expectations:

* The Pi runtime loads `.env` from `devices/pi-station` via `python-dotenv`.
* Expected settings include `STATION_ID`, `RULES_PRESET_ID`, `RULES_PRESET_VERSION`, `ESP_ENDPOINT`, `FIREBASE_PROJECT_ID`, and timing values.
* There is no checked-in `.env` file, only `.env.example`.
* The example file is incomplete relative to runtime settings and mismatched on preset version.

Backend runtime expectations:

* `services/backend-functions/src/runtime/bootstrap.ts` requires `BINSIGHT_DEVICE_CREDENTIALS_JSON` to authenticate Pi device writes.
* The same bootstrap path also expects `BINSIGHT_STORAGE_BUCKET` for camera frame storage.
* Firebase Admin initialization depends on project credentials and project selection outside the repo, but no local credential bootstrap or emulator recipe is documented in this package.

Operator access expectations:

* Firestore rules allow direct reads only for `stationLiveStatus` and only for authenticated operators with `binsightOperator`, `admin`, or equivalent role claims.
* Callable backend endpoints also require operator authorization via those claims.
* No local auth seeding or claim assignment workflow is documented in this repo.

Data and fixture expectations:

* Dashboard queries assume Firestore data exists for `stations`, `rulesPresets`, `stationLiveStatus`, `disposalEvents`, and analytics rollup collections.
* The repo includes a rules preset JSON file, but no verified Firestore seed or emulator import workflow was found during this audit.

#### Missing implementation assumptions that affect validation

* Root `test` is currently not a quality gate for TypeScript because there are no JS or TS tests wired into package scripts.
* The backend and web `dev` commands do not start real surfaces, so “run” support exists only in the narrow sense of watch-mode compilation.
* The Pi README says hardware integration, Firebase credentials, and model execution remain follow-on work, which means successful local execution does not imply integrated demo readiness.

### Demo-day operational blockers

These are the blockers most likely to prevent a coherent live demo if left unresolved.

* The Pi runtime does not start because of the `LiveStatusPublisher.build_status()` signature mismatch.
* The Pi test suite already captures that mismatch, so the main validation recipe cannot pass.
* A copied Pi `.env.example` would request a non-existent rules preset version.
* No operator auth bootstrap, claim assignment, or Firebase emulator workflow is documented for dashboard/backend validation.
* The web surface is not packaged as a browser app with a local serving command.
* Backend local execution is not packaged as a Firebase emulator or deployed-function workflow.
* The backend requires device credential JSON and storage bucket config that are not provided in the repo.
* Firestore-backed dashboard reads assume seeded station metadata and rules preset data, but a seeding workflow was not identified.

### Recommended validation approach for this cycle

The correct validation strategy for this cycle is to separate compile health from integration health and stop treating `corepack pnpm test` as meaningful product validation.

Recommended exact validation stack for this cycle:

1. Compile gates that should stay mandatory on every change:
   * `corepack pnpm lint`
   * `corepack pnpm build`
2. Pi runtime gate that should be restored as the primary integration blocker:
   * `cd devices/pi-station && uv run pytest`
3. Firmware gate using the repository-local binary:
   * `cd firmware/esp8266-controller && ../../.venv/bin/pio run`
4. Optional top-level convenience gate once the Pi suite is fixed:
   * `just validate`

For this cycle, do not rely on these commands as evidence of demo readiness:

* `corepack pnpm test`, because it currently validates only script presence and not behavior
* `pnpm --filter @binsight/web run dev` and `pnpm --filter @binsight/backend-functions run dev`, because both are watch-mode compilers rather than running services

### Recommended demo-day hardening approach for this cycle

#### Primary path

Use a staged hardening plan centered on restoring the Pi runtime first.

* First, fix the Pi runtime contract drift so `uv run pytest`, `uv run binsight-station`, and `just validate` can pass their Python phase.
* Second, correct `devices/pi-station/.env.example` so a copied local config resolves the shipped rules preset.
* Third, freeze on the repository-local PlatformIO path and document `../../.venv/bin/pio run` as the canonical firmware build command for the team.
* Fourth, treat root TypeScript compile success as necessary but insufficient, because the web and backend are not yet operationally complete demo surfaces.

#### Partial-integration fallback plan

If full cloud integration is not ready for demo day, keep the demo aligned with the spec by prioritizing the live control loop over cloud persistence.

Fallback order:

* Run the Pi and firmware locally with LCD plus LED guidance and disposal-result logic as the primary demo.
* Use the Pi runtime’s local publication seam or recorded payloads as an observability artifact instead of blocking the demo on live Firebase writes.
* If backend ingress authentication or storage is not fully configured, defer live camera-frame upload and show the station behavior plus locally captured event payloads.
* If the dashboard cannot be run as a real hosted app, use precomputed or previously seeded Firestore-backed screenshots only if they are clearly presented as historical dashboard evidence rather than live control-loop validation.

#### What should be considered done for this cycle

For this cycle, the strongest defensible definition of validation readiness is:

* Root TypeScript workspace compiles cleanly.
* Pi runtime tests pass.
* Pi runtime starts with a valid local `.env`.
* Firmware builds through `.venv/bin/pio`.
* `just validate` passes once the Pi issues are fixed.

That is the minimum end-to-end validation baseline supported by the current repository shape.

## References and evidence

* Root validation contract: `README.md`, `package.json`, and `justfile`.
* Web and backend workflow limits: `apps/web/README.md`, `apps/web/package.json`, `services/backend-functions/README.md`, and `services/backend-functions/package.json`.
* Pi runtime commands and env expectations: `devices/pi-station/README.md`, `devices/pi-station/pyproject.toml`, `devices/pi-station/.env.example`, `devices/pi-station/src/binsight_station/main.py`, `devices/pi-station/src/binsight_station/rules.py`, and `devices/pi-station/src/binsight_station/live_status.py`.
* Pi runtime failure evidence: `devices/pi-station/tests/test_smoke.py`, `devices/pi-station/tests/test_runtime_session.py`, `devices/pi-station/tests/test_runtime_serialization.py`, plus the executed `uv run pytest`, `uv run binsight-station`, and `just validate` commands.
* Firmware build-path evidence: `firmware/esp8266-controller/README.md`, `firmware/esp8266-controller/platformio.ini`, and executed `pio run` and `../../.venv/bin/pio run` commands.
* Backend env and auth assumptions: `services/backend-functions/src/runtime/bootstrap.ts`, `services/backend-functions/src/auth/device-auth.ts`, `services/backend-functions/src/auth/operator-auth.ts`, `services/backend-functions/src/runtime/firebase-runtime.ts`, `services/backend-functions/src/runtime/firebase-bridges.ts`, `services/backend-functions/src/storage/firebase-storage.ts`, `infra/firebase/firebase.json`, and `infra/firebase/firestore.rules`.
* Existing research that supports the interpretation of the current blockers: `.copilot-tracking/research/subagents/2026-03-07/runtime-architecture-research.md`, `.copilot-tracking/research/subagents/2026-03-07/protocol-boundary-research.md`, `.copilot-tracking/research/subagents/2026-03-07/pi-codebase-runtime-research.md`, and `.copilot-tracking/research/subagents/2026-03-07/backend-dataflow-hardening-research.md`.

## Next research

* No additional research is required to answer the current audit question.
* If a later cycle needs deployment confidence, the next useful research thread is a concrete Firebase emulator and seed-data workflow audit for the dashboard and backend.

## Remaining questions

* None. The spec and current repository state are sufficient to identify the actionable blockers for this cycle.