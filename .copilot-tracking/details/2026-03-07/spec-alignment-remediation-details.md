<!-- markdownlint-disable-file -->
# Implementation Details: Spec Alignment Remediation

## Context Reference

Sources:

* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/2026-03-07/spec-alignment-remediation-research.md`
* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/2026-03-07/spec-implementation-gap-analysis-research.md`
* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/subagents/2026-03-07/camera-live-reconciliation-research.md`
* `/home/handwash/Projects/hackcanada/spec/binsight-spec.md`

## Implementation Phase 1: Align Website Live Monitoring With the Spec

<!-- parallelizable: false -->

### Step 1.1: Remove dashboard camera-feed behavior and invalid live navigation

Delete the operator-facing camera experience from the web app and clean up navigation so live monitoring stays station-scoped instead of exposing a generic parameterized route entry.

Files:

* `apps/web/src/features/live/live-station-panel.tsx` - remove the camera-frame card and any camera-specific display logic
* `apps/web/src/pages/live-monitoring.tsx` - remove camera-dependent view assumptions and keep only spec-required live fields
* `apps/web/src/pages/station-detail.tsx` - preserve the station-specific live entry point if it remains valid after navigation cleanup
* `apps/web/src/app/router.tsx` - remove `showInNavigation` behavior for the parameterized live route or replace it with a non-broken navigation pattern
* `apps/web/src/app/layout.tsx` - ensure sidebar generation no longer emits an unresolved live path
* `apps/web/src/lib/firebase/live-monitoring.ts` - remove camera-frame URL resolution from the web live data path if no longer needed by the product UI

Discrepancy references:

* None. This step directly implements the selected remediation path.

Success criteria:

* The dashboard no longer exposes a camera card or frame placeholder.
* Live monitoring navigation resolves through a station-specific path only.
* The remaining live page content matches the spec's required operator fields.

Context references:

* `/home/handwash/Projects/hackcanada/spec/binsight-spec.md` - Live monitoring and developer-only preview requirements
* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/subagents/2026-03-07/camera-live-reconciliation-research.md` - Website camera surfacing findings and affected files

Dependencies:

* None

### Step 1.2: Make the live page maintain a real-time subscription

Refactor the live page to consume the existing long-lived subscription primitive instead of taking a single Firestore snapshot at render time. The live page should continue updating device status, current session, detected item, disposal decision, and latest event until the user leaves the page.

Files:

* `apps/web/src/pages/live-monitoring.tsx` - introduce the real-time client-side or equivalent subscription flow
* `apps/web/src/lib/firebase/live-monitoring.ts` - keep `subscribeToStation` as the primary real-time API and narrow the snapshot helper to initial bootstrap only if still required
* `apps/web/src/features/live/live-station-panel.tsx` - render subscription-driven state updates without camera dependencies
* `apps/web/src/app/providers.tsx` - update app wiring only if needed to support the live subscription model already used by the route

Discrepancy references:

* None. This step directly implements the selected remediation path.

Success criteria:

* Live monitoring updates without a page reload.
* The live page uses one subscription path consistently.
* No camera-feed dependency is required for the live view to function.

Context references:

* `/home/handwash/Projects/hackcanada/spec/binsight-spec.md` - Live monitoring page requirements
* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/subagents/2026-03-07/camera-live-reconciliation-research.md` - Snapshot-versus-subscription findings

Dependencies:

* Step 1.1 completion

### Step 1.3: Validate website changes

Run type-check and workspace validation for the modified web surface.

Validation commands:

* `corepack pnpm --filter @binsight/web run lint` - validate web TypeScript changes
* `corepack pnpm --filter @binsight/web run build` - validate compiled web output

## Implementation Phase 2: Remove Camera Transport From Product Data Flows

<!-- parallelizable: false -->

### Step 2.1: Lock Pi publication to authenticated backend ingestion and remove website-facing camera-feed contracts

Normalize the shared data model around the selected product path. The intended publication path is the existing backend-ingestion architecture, not a direct Firebase client path from the Pi. In the same phase, remove camera-feed fields, upload handlers, and storage patching from the website-facing live-status pipeline. If temporary debug seams are needed during migration, document and isolate them and remove them before final validation.

Files:

* `packages/contracts/src/index.ts` - remove or isolate camera-feed types from canonical live status
* `packages/contracts/schemas/domain/live-station-status.schema.json` - align the live-status schema with the selected contract shape
* `devices/pi-station/src/binsight_station/publishers.py` and transport configuration modules - lock the Pi publication target to the existing authenticated backend ingestion endpoints
* `services/backend-functions/src/functions/ingest-camera-frame.ts` - remove, deprecate, or internalize latest-frame ingestion
* `services/backend-functions/src/storage/latest-frame-storage.ts` - remove or isolate product-unused frame storage behavior
* `services/backend-functions/src/firestore/repositories/firestore.ts` - stop patching product live-status records with camera metadata
* `services/backend-functions/src/runtime/firebase-runtime.ts` - remove unused camera ingestion wiring if the endpoint is retired
* `devices/pi-station/README.md` or device configuration documentation - document the credential and endpoint provisioning needed for Pi publication

Discrepancy references:

* None. This step directly implements the selected remediation path.

Success criteria:

* Product live-status contracts no longer require camera-feed fields.
* Backend live-status writes no longer depend on latest-frame metadata.
* The Pi publication target and authentication model are explicitly fixed to the existing backend ingestion endpoints.
* Any temporary migration-only debug path is explicitly non-product, unreachable from the dashboard, and removed before final validation completes.

Context references:

* `/home/handwash/Projects/hackcanada/spec/binsight-spec.md` - Camera preview is developer-only and Pi publication still feeds dashboard state through backend data flows
* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/subagents/2026-03-07/camera-live-reconciliation-research.md` - Current backend and contract camera path

Dependencies:

* Implementation Phase 1 completion

### Step 2.2: Remove Pi-side product publication assumptions for camera metadata

Clean up Pi live-status publication code so camera metadata is not part of the normal station publication path, and replace the current no-op publication seam with a real authenticated event and live-status transport. The Pi runtime should publish spec-required events and live status to the backend, while preview remains a separate developer workflow.

Files:

* `devices/pi-station/src/binsight_station/live_status.py` - remove camera-feed fields from normal live-status assembly if they are no longer canonical
* `devices/pi-station/src/binsight_station/main.py` - separate developer preview wiring from station publication logic
* `devices/pi-station/src/binsight_station/publishers.py` - replace the no-op seam with real authenticated event and live-status publication behavior through the backend ingestion endpoints
* `devices/pi-station/src/binsight_station/esp_client.py` and runtime transport configuration modules - align station publication dependencies and credentials handling with the real backend path if those files own the transport boundary

Discrepancy references:

* None. This step directly implements the selected remediation path.

Success criteria:

* Normal Pi live-status publication does not include camera-feed metadata.
* Camera preview code paths do not imply a backend upload path.
* The Pi runtime publishes spec-required events and live-status updates through a real backend transport rather than an in-memory no-op seam.

Context references:

* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/subagents/2026-03-07/camera-live-reconciliation-research.md` - Pi runtime and publisher findings

Dependencies:

* Step 2.1 completion

### Step 2.3: Validate shared-contract, backend, and Pi publication changes

Run the affected surface validation commands.

Validation commands:

* `corepack pnpm --filter @binsight/contracts run build` - validate shared contract compilation
* `corepack pnpm --filter @binsight/backend-functions run lint` - validate backend TypeScript changes
* `corepack pnpm --filter @binsight/backend-functions run build` - validate backend compilation
* `uv run pytest` from `devices/pi-station` - validate Pi runtime tests covering serialization and session behavior
* `rg "cameraFeed|cameraFeedActive|ingest-camera-frame|latest-frame-storage" apps/web packages/contracts services/backend-functions devices/pi-station` - confirm any remaining camera-transport references are intentionally removed or isolated from the product path

Acceptance checks:

* Verify the live-status contract exposed to the website no longer requires camera-feed fields.
* Verify the normal Pi publication path does not publish camera metadata or invoke a website-facing frame upload path.
* Verify Pi event and live-status publication reaches the backend ingestion endpoints in a non-placeholder integration test or smoke-test flow.

## Implementation Phase 3: Add a Developer-Only Pi Camera Preview Workflow

<!-- parallelizable: false -->

### Step 3.1: Implement a headless Windows-over-SSH preview path

Add a developer-only preview workflow for Pi camera debugging that does not publish frames to the website. The selected design is a Pi-hosted `rpicam-vid` network stream viewed on Windows through SSH port forwarding or a local player such as VLC or `ffplay`.

This remediation pass assumes a documented manual viewer workflow on Windows is sufficient. Automatic local-window launch behavior is out of scope unless the product requirement changes later.

Files:

* `devices/pi-station/src/binsight_station/` - add a camera-preview helper or wrapper around the `rpicam-vid` developer workflow separated from product publication code
* `devices/pi-station/README.md` - document the Windows SSH preview workflow and required commands
* `devices/pi-station/tests/` - add tests around preview configuration parsing or feature gating where feasible

Discrepancy references:

* None. This step directly implements the selected remediation path.

Success criteria:

* A developer can view the camera preview from a Windows SSH workflow using the documented `rpicam-vid` plus VLC or `ffplay` path without involving the website.
* Preview startup is clearly separated from product event and live-status publication.
* The preview can be disabled entirely outside developer workflows.

Context references:

* `/home/handwash/Projects/hackcanada/spec/binsight-spec.md` - Developer-only preview requirement
* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/subagents/2026-03-07/camera-live-reconciliation-research.md` - Preview options and recommended path

Dependencies:

* Implementation Phase 2 completion

### Step 3.2: Preserve clear runtime boundaries between developer preview and product behavior

Ensure runtime configuration and documentation distinguish between preview-only behavior and production demo flow. Starting the preview should not mutate operator-facing data contracts, cloud transport behavior, or dashboard output.

Files:

* `devices/pi-station/src/binsight_station/main.py` - gate preview startup behind explicit developer configuration
* `devices/pi-station/src/binsight_station/events.py` or equivalent runtime config module - separate preview flags from product session-state logic
* `devices/pi-station/README.md` - document the boundary and operational expectations

Discrepancy references:

* None. This step directly implements the selected remediation path.

Success criteria:

* Developer preview is opt-in.
* Product telemetry is unchanged when preview is enabled.
* Documentation makes the boundary obvious to future implementers.

Context references:

* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/2026-03-07/spec-alignment-remediation-research.md` - Selected planning interpretation

Dependencies:

* Step 3.1 completion
* Device authentication and credential provisioning for the chosen Pi-to-backend publication path

### Step 3.3: Validate preview workflow changes

Run Pi runtime validation for the preview-specific changes.

Validation commands:

* `uv run pytest` from `devices/pi-station` - validate Pi runtime and preview-related tests

Acceptance checks:

* From the Windows machine that initiated the SSH session, run the documented preview workflow and confirm live camera frames are visible locally.
* Verify the preview path works without opening the website or invoking backend camera-ingestion code.

## Implementation Phase 4: Close Remaining Cross-Surface Spec Gaps

<!-- parallelizable: false -->

### Step 4.1: Finish runtime and firmware behavior that currently remains simulated or partial

Replace the demo-grade or stubbed sections of the station loop with spec-aligned behavior: real item capture and classification, low-confidence fallback, independent disposal-zone detection, LCD default behavior, low-power session start, and removal of environment-specific Wi-Fi fallback behavior from firmware runtime logic.

Files:

* `devices/pi-station/src/binsight_station/classification.py` - replace stub classification with real on-device inference and fallback handoff
* `devices/pi-station/src/binsight_station/main.py` - align session flow, LCD defaults, low-power handling, and publication timing
* `devices/pi-station/src/binsight_station/events.py` - ensure emitted events carry the final spec-required fields
* `firmware/esp8266-controller/src/main.cpp` - implement true hand-zone and disappearance-driven disposal detection instead of guided-zone echoing
* `firmware/esp8266-controller/src/protocol.cpp` and `firmware/esp8266-controller/include/protocol.h` - align firmware telemetry to the product responsibilities actually required by the spec
* `firmware/esp8266-controller/README.md` or adjacent firmware configuration docs - remove or explicitly relocate environment-specific Wi-Fi fallback behavior out of product runtime logic

Discrepancy references:

* None. This step directly implements the selected remediation path.

Success criteria:

* The station runtime no longer relies on placeholder classification.
* Disposal-zone detection reflects observed hand position rather than LED guidance.
* LCD and low-power behavior match the current spec language.
* Firmware no longer carries environment-specific Wi-Fi fallback behavior as implicit product logic.

Context references:

* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/2026-03-07/spec-implementation-gap-analysis-research.md` - Runtime and firmware gap summary

Dependencies:

* Implementation Phase 3 completion

### Step 4.2: Fill dashboard, analytics, and event-history gaps required for the demo

Complete the missing dashboard features identified in research: bin-purity presentation, event-history pagination, demo-data markers and filters, historical intervention data for before-and-after analysis, historical effective windows for station metadata, and additional authored presets within the intended v1 scope.

Files:

* `apps/web/src/pages/analytics.tsx` and analytics feature modules - render bin purity and intervention-aware views
* `apps/web/src/pages/event-history.tsx` and related data loaders - expose cursor-based pagination in the UI
* `services/backend-functions/src/analytics/` and `services/backend-functions/src/firestore/` - extend read models for intervention metadata, historical station-metadata windows, and demo-data filtering
* `packages/contracts/schemas/analytics/`, `packages/contracts/schemas/domain/`, and `packages/contracts/src/index.ts` - add schema support for demo markers, intervention metadata, and historical effective windows where required
* `packages/rules/presets/` - add or expand authored presets required for the demo scope
* `infra/firebase/` and seeding scripts under `scripts/` or service tooling - add demo data and markers for presentation and filtering

Discrepancy references:

* None. This step directly implements the selected remediation path.

Success criteria:

* Operators can see bin purity in the dashboard.
* Event history supports forward pagination in the UI.
* Demo data and intervention-aware comparisons are explicitly modeled and filterable.
* Historical station metadata windows support before-and-after and A/B comparisons over time.

Context references:

* `/home/handwash/Projects/hackcanada/.copilot-tracking/research/2026-03-07/spec-implementation-gap-analysis-research.md` - Dashboard, analytics, and demo-data findings

Dependencies:

* Implementation Phase 1 completion

### Step 4.3: Validate runtime, firmware, analytics, and demo-data changes

Run the surface-specific validation commands that correspond to the modified areas.

Validation commands:

* `uv run pytest` from `devices/pi-station` - validate Pi runtime behavior
* `/home/handwash/Projects/hackcanada/.venv/bin/pio run` from `firmware/esp8266-controller` - validate ESP8266 firmware compilation
* `corepack pnpm --filter @binsight/backend-functions run lint` - validate backend TypeScript
* `corepack pnpm --filter @binsight/backend-functions run build` - validate backend compilation
* `corepack pnpm --filter @binsight/web run lint` - validate dashboard TypeScript
* `corepack pnpm --filter @binsight/web run build` - validate dashboard compilation

## Implementation Phase 5: Final Validation and Release Readiness Check

<!-- parallelizable: false -->

### Step 5.1: Run full project validation

Execute the repository-wide validation commands once all implementation phases complete.

* `corepack pnpm run lint`
* `corepack pnpm run build`
* `corepack pnpm run test`
* `uv run pytest` from `devices/pi-station`
* `/home/handwash/Projects/hackcanada/.venv/bin/pio run` from `firmware/esp8266-controller`

Final acceptance checks:

* Re-run the documented Windows-over-SSH preview workflow from the developer machine and confirm the preview still renders after the later Pi/runtime changes.
* Re-confirm that the website-facing product path does not depend on camera-feed transport or backend latest-frame ingestion.

### Step 5.2: Fix minor validation issues

Resolve straightforward lint, typing, test, and firmware-build issues that fall directly out of the planned changes without expanding scope.

### Step 5.3: Report blocking issues

When validation failures reveal larger design gaps, document them, capture the affected files, and spin follow-on planning instead of folding broad unplanned refactors into the remediation pass.

## Dependencies

* `pnpm` workspace tooling through `corepack`
* Python `uv` environment for `devices/pi-station`
* PlatformIO build environment for `firmware/esp8266-controller`

## Success Criteria

* The selected implementation path removes the dashboard camera contradiction.
* The live page is genuinely real time for spec-required operator fields.
* Developer preview remains available from a Windows SSH workflow without becoming a product feature.
* Remaining high-impact spec gaps are sequenced into concrete cross-surface implementation work.