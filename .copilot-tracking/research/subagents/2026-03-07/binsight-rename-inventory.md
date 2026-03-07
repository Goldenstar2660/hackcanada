---
title: Binsight to Binsight Rename Research
description: Repo-wide inventory of Binsight naming surfaces and rename considerations for migrating to Binsight
ms.date: 2026-03-07
ms.topic: reference
---

## Research Topics

* Identify all meaningful `Binsight` / `binsight` / `BINSIGHT` references in the workspace outside ignored dependency and VCS directories
* Categorize references into product-facing text, code namespaces and package names, environment or config names, and filesystem paths
* Call out rename risks, dependency ordering, and sequencing concerns for a repo-wide rename to `Binsight`

## Findings In Progress

## Findings

### Product-facing text and developer-facing docs

* The product name appears in the source-of-truth spec title and filename at `spec/binsight-spec.md`.
* Root and surface READMEs use `Binsight` in titles, descriptions, overview copy, setup guidance, and commands:
	* `README.md`
	* `apps/web/README.md`
	* `devices/pi-station/README.md`
	* `firmware/esp8266-controller/README.md`
	* `services/backend-functions/README.md`
* Additional repository-area READMEs use `Binsight` in descriptions or boundary text:
	* `apps/README.md`
	* `devices/README.md`
	* `docs/README.md`
	* `firmware/README.md`
	* `infra/README.md`
	* `packages/README.md`
	* `scripts/README.md`
	* `packages/analytics/metrics/README.md`
	* `packages/rules/presets/README.md`
	* `firmware/esp8266-controller/include/README.md`
	* `firmware/esp8266-controller/test/README.md`

### Package names, code namespaces, and module identifiers

* The root workspace package is named `binsight` in `package.json`.
* TypeScript workspace packages use the `@binsight/*` scope in package metadata:
	* `apps/web/package.json`
	* `services/backend-functions/package.json`
	* `packages/contracts/package.json`
	* `packages/analytics/package.json`
	* `packages/rules/package.json`
	* `packages/tooling/package.json`
* TypeScript import and alias surfaces depend on `@binsight/*`:
	* `tsconfig.base.json`
	* `apps/web/tsconfig.json`
	* `apps/web/vite.config.ts`
	* `apps/web/src/**`
	* `services/backend-functions/src/**`
	* `services/backend-functions/dist/**`
	* `pnpm-lock.yaml`
* The Raspberry Pi Python package uses `binsight-station` and `binsight_station` in:
	* `devices/pi-station/pyproject.toml`
	* `devices/pi-station/src/binsight_station/`
* Firmware code uses a `binsight` C++ namespace and related symbols in:
	* `firmware/esp8266-controller/include/protocol.h`
	* `firmware/esp8266-controller/src/protocol.cpp`
	* `firmware/esp8266-controller/src/main.cpp`

### Environment variables, protocol constants, and config names

* Firmware build-time Wi-Fi macros use the `BINSIGHT_` prefix in `firmware/esp8266-controller/src/main.cpp` and are documented in `firmware/esp8266-controller/README.md`:
	* `BINSIGHT_WIFI_SSID`
	* `BINSIGHT_WIFI_PASS`
* Pi runtime environment and settings use `BINSIGHT_` keys in:
	* `devices/pi-station/.env.example`
	* `devices/pi-station/src/binsight_station/main.py`
	* `devices/pi-station/README.md`
	* Keys: `BINSIGHT_DEVICE_ID`, `BINSIGHT_DEVICE_SHARED_SECRET`, `BINSIGHT_PUBLICATION_TIMEOUT_SECONDS`
* Backend runtime and seed workflow use `BINSIGHT_` keys in:
	* `services/backend-functions/src/runtime/bootstrap.ts`
	* `services/backend-functions/scripts/seed-demo-data.mjs`
	* `services/backend-functions/README.md`
	* Keys: `BINSIGHT_DEVICE_CREDENTIALS_JSON`, `BINSIGHT_STORAGE_BUCKET`
* Cross-surface device-auth protocol identifiers use `binsight` in wire-level names:
	* `devices/pi-station/src/binsight_station/esp_client.py`
	* `devices/pi-station/tests/test_smoke.py`
	* `services/backend-functions/src/auth/device-auth.ts`
	* `services/backend-functions/dist/auth/device-auth.js`
	* Headers: `x-binsight-device-id`, `x-binsight-station-id`, `x-binsight-timestamp`, `x-binsight-signature`
	* Signature prefix: `binsight-v1`
* A non-protocol default value still includes the old product name:
	* `devices/pi-station/.env.example` and `devices/pi-station/src/binsight_station/main.py` default `FIREBASE_PROJECT_ID=binsight-demo`

### Filesystem paths and hidden metadata

* Meaningful non-generated path names that include `binsight`:
	* `spec/binsight-spec.md`
	* `devices/pi-station/src/binsight_station/`
* Hidden repo metadata references the spec path or package/runtime paths:
	* `.github/instructions/source-of-truth.instructions.md`
	* `.copilot-tracking/plans/2026-03-07/full-station-demo-integration-hardening-plan.instructions.md`
	* `.copilot-tracking/plans/2026-03-07/spec-alignment-remediation-plan.instructions.md`
	* `.copilot-tracking/changes/2026-03-07/full-station-demo-integration-hardening-changes.md`
	* `.copilot-tracking/plans/logs/2026-03-07/full-station-demo-integration-hardening-log.md`
	* `.copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md`
	* `.copilot-tracking/research/subagents/2026-03-07/backend-dataflow-hardening-research.md`
	* `.copilot-tracking/research/subagents/2026-03-07/validation-setup-blockers-research.md`

### Rename risks and sequencing concerns

* Wire protocol risk: Renaming `x-binsight-*` headers or `binsight-v1` requires coordinated Pi and backend deployment. A rolling migration should either deploy both ends together or add temporary dual-read support.
* Environment migration risk: Renaming `BINSIGHT_*` keys affects local `.env` files, deployment secrets, validation docs, and any external Firebase or CI provisioning. This is operationally wider than a code-only rename.
* TypeScript workspace risk: Renaming `@binsight/*` requires synchronized changes to package names, imports, `tsconfig` path aliases, Vite aliases, and `pnpm-lock.yaml`. `services/backend-functions/dist/**` should be regenerated after the rename rather than hand-edited.
* Python packaging risk: Renaming `binsight-station` and `binsight_station` changes the console script, package import path, and filesystem layout simultaneously. Tests and docs that call `uv run binsight-station` must move in the same change set.
* Firmware risk: Renaming the C++ namespace and `BINSIGHT_*` build macros changes source identifiers and PlatformIO override documentation together. Header guards in `include/protocol.h` also move with that rename.
* Source-of-truth risk: Because `.github/instructions/source-of-truth.instructions.md` hard-codes `/spec/binsight-spec.md`, renaming the spec file must happen together with the instruction update. Otherwise repo guidance points at a missing spec.
* Tracking-artifact risk: `.copilot-tracking/**` contains many historical references. These are low runtime risk compared with code and config surfaces, but they will remain search noise unless explicitly renamed or accepted as historical records.

## Next Research

* If execution begins later, decide whether historical `.copilot-tracking/**` artifacts should be renamed or intentionally left as historical records.
* If a staged rollout is required, design temporary backward compatibility for `BINSIGHT_*` environment variables and `x-binsight-*` headers.
* Verify whether Firebase project ids, storage buckets, and any external deployment assets should also move from `binsight-*` naming or remain unchanged.

## Open Questions

* Should `.copilot-tracking/**` historical artifacts be updated for consistency, or preserved unchanged as point-in-time records?
* Is the rename intended to include protocol headers and environment variable keys immediately, or only product-facing names and package/module identifiers in the first phase?
