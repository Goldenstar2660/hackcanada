<!-- markdownlint-disable-file -->
# Implementation Details: Full Station Demo Integration Hardening

## Context Reference

Sources: .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md, spec/binsight-spec.md, package.json, apps/web/package.json, services/backend-functions/package.json, devices/pi-station/pyproject.toml, and justfile.

## Implementation Phase 1: Pi Runtime Recovery and Validation Gates

<!-- parallelizable: false -->

### Step 1.1: Reconcile live-status and publisher APIs

Repair the Pi runtime first so the station process starts and the Python test suite becomes meaningful again. Align the call signatures and payload builders across the runtime composition root, live-status projection, and publisher seam. Keep the contract vocabulary already established in shared schemas, and do not widen the event or live-status payloads during this recovery pass.

Files:
* devices/pi-station/src/binsight_station/main.py - Reconcile runtime callers with the canonical live-status builder and publication flow.
* devices/pi-station/src/binsight_station/live_status.py - Make the live-status builder and projection helpers match the runtime call pattern.
* devices/pi-station/src/binsight_station/publishers.py - Keep no-op and real publishers on one coherent interface for live status and disposal events.
* devices/pi-station/src/binsight_station/events.py - Preserve canonical disposal-event shaping while the publisher seam is stabilized.

Discrepancy references:
* Restores the runtime path the selected thin-slice plan depends on.

Success criteria:
* `uv run binsight-station` can start the runtime without the current live-status API crash.
* The publisher seam accepts the same payload shape the runtime now emits.
* No contract or schema changes are introduced during the recovery step.

Context references:
* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 100-164) - Verified surface state and bridge gaps across Pi, backend, and web.
* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 199-207) - Immediate blocker: live-status drift prevents Pi startup.

Dependencies:
* Existing Pi runtime package structure in devices/pi-station/src/binsight_station/.

### Step 1.2: Restore Pi dependency declarations, validation, and configuration guidance

Fix the broken smoke-test imports, declare any Python dependencies required for real publication and deterministic demo adapters, and tighten the minimal runtime configuration story so the Pi package has credible local validation again. Add or update the station setup guidance only for values needed by this cycle: station id, rules preset id and version, ESP endpoint, Firebase project id, device publication credentials, and timing controls.

Files:
* devices/pi-station/tests/test_smoke.py - Repair the import path and startup coverage.
* devices/pi-station/tests/test_runtime_session.py - Keep runtime lifecycle coverage aligned after the API repair.
* devices/pi-station/tests/test_runtime_serialization.py - Keep payload serialization tests aligned to the restored runtime surface.
* devices/pi-station/pyproject.toml - Declare the minimum Python dependencies required for this cycle's runtime and publication work.
* devices/pi-station/README.md - Document the minimum environment variables and corrected preset version for this cycle.
* devices/pi-station/.env.example - Add a minimal runnable configuration template if one does not already exist.

Discrepancy references:
* Reduces setup ambiguity and clean-environment risk before broader integration work proceeds.

Success criteria:
* `uv run pytest` passes from devices/pi-station.
* `devices/pi-station/pyproject.toml` declares the dependencies required by the selected runtime and publication path.
* The Pi README and example environment describe the minimum values required to start the runtime in this cycle.
* `just validate` can reach the Pi validation step without immediate import or startup failure.

Context references:
* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 165-207) - Current runtime, setup, and validation gaps.
* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 251-278) - Missing dependencies, incomplete environment guidance, and failing validation gates.

Dependencies:
* Step 1.1 completion.

### Step 1.3: Validate phase changes

Run the Pi-focused validation commands once the runtime and tests are back in sync.

Validation commands:
* cd /home/handwash/Projects/hackcanada/devices/pi-station && uv run pytest
* cd /home/handwash/Projects/hackcanada/devices/pi-station && uv run binsight-station
* cd /home/handwash/Projects/hackcanada && just validate

## Implementation Phase 2: Local Demo Loop Hardening Without Camera Feed

<!-- parallelizable: false -->

### Step 2.1: Freeze the ESP HTTP boundary and complete three-zone indicator behavior

Keep the ESP boundary narrow at `GET /health`, `POST /signal`, and `POST /reset` while finishing the real demo-grade LED behavior. Limit firmware responsibility to presence sensing, indicator actuation, and health reporting. Do not move disposal inference or rules logic into the microcontroller.

Files:
* firmware/esp8266-controller/src/main.cpp - Complete real three-zone LED actuation and preserve the existing HTTP surface.
* firmware/esp8266-controller/include/protocol.h - Reference only unless a small constant update is needed for LED signaling.
* devices/pi-station/src/binsight_station/esp_client.py - Keep the Pi transport aligned to the frozen HTTP endpoints and health semantics.

Discrepancy references:
* Addresses the selected-path requirement to keep the ESP boundary stable while finishing visible station behavior.

Success criteria:
* The ESP still exposes only the existing health, signal, and reset endpoints.
* The requested recycle, compost, and garbage guidance can be shown through the real LED output path.
* Firmware build validation still passes after the LED work.

Context references:
* spec/binsight-spec.md (Lines 25-33) - User guidance requires the corresponding LED to turn on.
* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 211-223) - Selected approach freezes the HTTP boundary and adds real three-zone LED behavior.

Dependencies:
* Implementation Phase 1 completion.

### Step 2.2: Add deterministic hand-tracking input and remove camera-feed work from the critical path

Finish the minimum Pi-side demo loop needed for a reliable presentation by wiring a real or deterministic hand-tracking adapter into `observe_hand(zone, hand_present)` and keeping item identification camera-free for this cycle. Preserve the existing classification seam, but use deterministic demo inputs where necessary so the loop remains stable. Keep live monitoring text-first and do not implement camera-frame capture, storage, or browser rendering in this cycle.

Files:
* devices/pi-station/src/binsight_station/main.py - Wire the selected hand-tracking source into the session flow and keep disposal detection on the Pi.
* devices/pi-station/src/binsight_station/session.py - Preserve the hand-present to hand-absent drop heuristic required by the spec.
* devices/pi-station/src/binsight_station/classification.py - Keep deterministic demo classification inputs explicit and isolated behind the classifier seam.
* devices/pi-station/src/binsight_station/live_status.py - Ensure live status reflects current item, disposal decision, and latest event without camera metadata requirements.

Discrepancy references:
* Addresses DD-01 by explicitly removing camera feed work from the cycle while preserving text-only live monitoring.

Success criteria:
* The Pi runtime can infer an actual disposal zone from recent hand-zone tracking and hand disappearance.
* The live-status payload remains useful to the dashboard without relying on camera-frame fields.
* Camera capture and storage remain outside the implementation scope for this cycle.

Context references:
* spec/binsight-spec.md (Lines 35-56) - Disposal detection and correctness logic remain required even without camera feed work.
* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 224-242) - Minimum runtime behavior, publication target, and optional camera path called out by research.

Dependencies:
* Step 2.1 completion.

### Step 2.3: Restore LCD guidance and cumulative station-counter behavior

Complete the Pi-local LCD path so the station can show the current identified item, disposal guidance, and cumulative station activity required by the demo spec. Keep the LCD logic on the Pi, not the ESP, and make sure the standby and result states can render total attempts and total correct sorts from the runtime state.

Files:
* devices/pi-station/src/binsight_station/lcd_client.py - Implement or harden the LCD rendering surface for standby, guidance, result, and reset states.
* devices/pi-station/src/binsight_station/main.py - Wire LCD updates to the runtime states and cumulative counters.
* devices/pi-station/src/binsight_station/session.py - Preserve or expose the counters needed for LCD station-activity output.
* devices/pi-station/tests/test_runtime_session.py - Add or extend coverage for station-counter updates and LCD-facing state output.

Discrepancy references:
* Restores the explicit LCD and station-counter behavior required by the spec.

Success criteria:
* The LCD can render the current item and correct disposal method during an active session.
* Standby or result screens can render cumulative total attempts and total correct sorts.
* LCD behavior is covered by targeted runtime validation rather than left implicit.

Context references:
* spec/binsight-spec.md (Lines 25-33) - LCD shows live feedback during guidance.
* spec/binsight-spec.md (Lines 59-65) - LCD station counter must show cumulative station activity.
* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 92-116, 180-193) - The Pi owns the live control loop and LCD formatting surface.

Dependencies:
* Step 2.2 completion.

### Step 2.4: Validate phase changes

Run the local station validation that exercises the Pi and firmware boundaries together.

Validation commands:
* cd /home/handwash/Projects/hackcanada/devices/pi-station && uv run pytest
* cd /home/handwash/Projects/hackcanada/firmware/esp8266-controller && /home/handwash/Projects/hackcanada/.venv/bin/pio run

## Implementation Phase 3: Cloud Publication and Seeded Demo Data

<!-- parallelizable: true -->

### Step 3.1: Implement authenticated event and live-status publication

Replace the Pi no-op publication default with a best-effort authenticated HTTP publisher for `ingestEvent` and `ingestLiveStatus`. Keep publication failures non-fatal to the local session loop. Reuse the existing backend ingress handlers and device-auth surface rather than adding a new transport or queue in this cycle.

Files:
* devices/pi-station/src/binsight_station/publishers.py - Implement the authenticated HTTP publisher and keep no-op fallback support.
* devices/pi-station/src/binsight_station/main.py - Wire the real publisher into the runtime composition root without making session completion depend on network success.
* services/backend-functions/src/auth/device-auth.ts - Confirm the expected credential shape and request authentication contract.
* services/backend-functions/src/functions/ingest-event.ts - Reference or adjust only if the Pi publication payload or response handling needs a small hardening change.
* services/backend-functions/src/functions/ingest-live-status.ts - Reference or adjust only if the Pi publication payload or response handling needs a small hardening change.

Discrepancy references:
* Completes the bridge between the Pi runtime and the backend ingress surface.

Success criteria:
* The Pi can publish disposal events and live status to the existing backend HTTP functions.
* Failed publication attempts degrade gracefully and do not crash the local session loop.
* The cycle still excludes `ingestCameraFrame` from the critical path.

Context references:
* spec/binsight-spec.md (Lines 99-104) - The Pi must send event and live-status data to Firebase for dashboard and live monitoring.
* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 150-164, 224-242) - Backend ingress is real, but the Pi publication bridge is missing.

Dependencies:
* Implementation Phase 1 completion.
* Implementation Phase 2 completion.

### Step 3.2: Create the required seeded dataset and station bootstrap path

Make seeded historical data a first-class demo asset instead of a fallback. Add a seed workflow that provisions one primary live-demo station, at least one comparison station or location, the active Ottawa preset reference, and enough representative disposal events to populate station detail, history, analytics, comparisons, and leaderboard views. Keep the seed path narrow but honest about the minimum comparative data those surfaces require.

Files:
* services/backend-functions/scripts/seed-demo-data.mjs - Seed the minimum multi-station metadata, live status stubs, and representative historical events needed for dashboard coverage.
* services/backend-functions/package.json - Add a script entry for the demo seed command.
* packages/rules/presets/demo-canada-ottawa.1.0.0.json - Reference the seeded preset id and version used by the station and dashboard.
* infra/firebase/firestore.rules - Adjust only if the seed path or operator reads require a small rule hardening change.
* README.md - Document the required demo seed workflow at the workspace level.

Discrepancy references:
* Addresses DD-02 by promoting seeded historical data from backup to required demo infrastructure.

Success criteria:
* A single documented seed command can provision the required demo station data.
* The seeded dataset includes enough comparative coverage for station-detail, history, analytics, comparisons, and leaderboard views even with few live runs.
* The seed path provisions at least two comparison targets across station, floor, building, location, signage, or layout dimensions used by the dashboard.
* The active preset reference matches `demo-canada-ottawa` version `1.0.0`.

Context references:
* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 243-278) - Seed path, missing setup, and fallback dataset findings.
* User decision in conversation - Seeded historical data is required for the demo because live runs will be limited.

Dependencies:
* Step 3.1 completion.

### Step 3.3: Provision demo credentials and verify bootstrap prerequisites

Provision and verify the minimum demo-environment credentials before the final rehearsal phase. Establish one working device-auth credential for Pi publication, one basic Firebase Auth operator user path for dashboard access, and one coherent environment-variable set for the Pi runtime, backend, and Vite host. Treat a real Firebase demo environment as the intended target for this cycle, and verify those prerequisites before treating the cloud slice as ready.

Files:
* devices/pi-station/.env.example - Add the device publication and Firebase project variables required by the Pi runtime.
* apps/web/.env.example - Add the Firebase web configuration values required by the Vite host.
* services/backend-functions/README.md - Document device credential provisioning, operator bootstrap, and verification steps.
* README.md - Add a cross-surface bootstrap checklist for the demo environment.

Discrepancy references:
* Makes credential provisioning and bootstrap verification explicit before final rehearsal.

Success criteria:
* One documented device credential path is verified against the existing ingestion surface before end-to-end rehearsal.
* One basic Firebase Auth operator user path is documented and verified for dashboard access.
* The Pi, backend, and web environment templates describe one coherent demo configuration set.

Context references:
* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 165-188) - Minimum configuration surfaces across Pi, backend, and dashboard.
* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 251-278) - Credentials, auth setup, and seeding workflow remain setup gaps.
* User decision in conversation - Basic Firebase Auth users are acceptable for operator login.

Dependencies:
* Step 3.1 completion.
* Step 3.2 completion.

### Step 3.4: Validate phase changes

Run the cloud-surface validation that does not conflict with the web-host work.

Validation commands:
* cd /home/handwash/Projects/hackcanada && corepack pnpm lint
* cd /home/handwash/Projects/hackcanada && corepack pnpm build

## Implementation Phase 4: Vite Dashboard Host and Operator Access

<!-- parallelizable: true -->

### Step 4.1: Turn the dashboard package into a minimal Vite browser app

Wrap the existing route, loader, and feature-layer abstractions in the smallest possible Vite host. Keep the current app structure and reuse the already-defined dashboard providers, routes, and page loaders instead of rewriting the UI surface.

Files:
* apps/web/package.json - Add Vite scripts and browser-side dependencies required by the selected host.
* apps/web/index.html - Create the browser entry document.
* apps/web/vite.config.ts - Add the minimal Vite configuration.
* apps/web/src/main.tsx - Mount the dashboard application into the browser host.
* apps/web/src/app/providers.tsx - Wire runtime dependencies into the browser host instead of the current render-only shell.
* apps/web/src/index.ts - Keep exports aligned while the new browser entrypoint is introduced.

Discrepancy references:
* Resolves the user-selected browser host decision by standardizing on Vite.

Success criteria:
* `apps/web` can run as a browser app through Vite.
* Existing routes and page loaders still power the UI rather than a parallel host-specific implementation.
* The new host does not widen scope beyond the existing dashboard surfaces.

Context references:
* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 140-164, 224-242) - Dashboard abstractions exist, but there is no concrete browser host.
* User decision in conversation - Vite is an acceptable browser host for this cycle.

Dependencies:
* Implementation Phase 2 completion.

### Step 4.2: Add Firebase callables, Firestore subscriptions, and basic operator login

Implement the concrete browser-side Firebase adapters required by the existing dashboard abstractions. Use basic Firebase Auth user login for operator access, and keep live monitoring text-first by subscribing to live status without requiring camera-frame resolution. Harden the operator-facing loading, empty, unauthorized, backend-failure, and stale-live-status states needed for the presentation.

Files:
* apps/web/src/lib/api/dashboard-gateway.ts - Wire backend callable access for station directory, history, analytics, and comparisons reads.
* apps/web/src/lib/firebase/live-status.ts - Bind Firestore document subscriptions to the existing operator-session authorization model.
* apps/web/src/lib/firebase/live-monitoring.ts - Remove camera-frame resolution from the critical path and create a text-first live snapshot model.
* apps/web/src/pages/live-monitoring.tsx - Render live status, current decision, latest event, and stale or unavailable states without a camera panel.
* apps/web/src/app/types.ts - Extend dependency typing if the browser host introduces new auth or Firebase clients.
* services/backend-functions/src/auth/operator-auth.ts - Keep operator-claim expectations aligned with the selected basic Firebase Auth model.

Discrepancy references:
* Addresses DD-01 by keeping live monitoring useful without camera-feed implementation.

Success criteria:
* Operator users can authenticate through Firebase Auth and reach the dashboard read surfaces.
* Live monitoring subscribes to Firestore live status after initial load.
* The required presentation states are explicit: loading, empty, unauthorized, backend failure, and stale live feed.

Context references:
* spec/binsight-spec.md (Lines 85-98) - Dashboard and live-monitoring features required by the demo scope.
* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 150-164, 231-242) - Dashboard loaders exist, but browser transport and auth bootstrap do not.
* User decision in conversation - Basic Firebase Auth users are acceptable for operator login.

Dependencies:
* Step 4.1 completion.

### Step 4.3: Validate phase changes

Run web-focused validation after the Vite host and Firebase adapters are in place.

Validation commands:
* cd /home/handwash/Projects/hackcanada/apps/web && corepack pnpm run lint
* cd /home/handwash/Projects/hackcanada/apps/web && corepack pnpm run build

## Implementation Phase 5: End-to-End Demo Rehearsal and Final Validation

<!-- parallelizable: false -->

### Step 5.1: Rehearse the full thin-slice demo path

Run the complete station-to-cloud-to-dashboard path against the intended real Firebase demo environment with one seeded live-demo station and the required comparative historical dataset available. Verify the live path for presence, LED and LCD guidance, disposal result, live status publication, and dashboard live updates. Verify the seeded fallback views for history, analytics, comparisons, station detail, and leaderboard surfaces even when only a small number of live attempts are available.

Files:
* README.md - Update the end-to-end demo run order once the validated workflow is known.
* apps/web/README.md - Document the Vite host and operator login steps.
* devices/pi-station/README.md - Document the final Pi runtime startup sequence.
* services/backend-functions/README.md - Document the device credential and demo seed requirements.

Discrepancy references:
* Addresses DR-01 by documenting the minimum reproducible rehearsal flow for the team.

Success criteria:
* The team has one documented run order for seeding, starting the backend surface, running the Pi runtime, and launching the dashboard host.
* Live station updates can reach the dashboard when network and auth are available.
* Seeded history remains available as the required demo backup and baseline dataset for comparison and leaderboard surfaces.

Context references:
* .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 211-278) - Selected thin-slice approach, blockers, setup gaps, and final recommendation.

Dependencies:
* Implementation Phases 3 and 4 completion.

### Step 5.2: Run full project validation

Execute all validation commands for the final integrated path:
* cd /home/handwash/Projects/hackcanada && corepack pnpm lint
* cd /home/handwash/Projects/hackcanada && corepack pnpm build
* cd /home/handwash/Projects/hackcanada && corepack pnpm test
* cd /home/handwash/Projects/hackcanada/devices/pi-station && uv run pytest
* cd /home/handwash/Projects/hackcanada/devices/pi-station && uv run binsight-station
* cd /home/handwash/Projects/hackcanada/firmware/esp8266-controller && /home/handwash/Projects/hackcanada/.venv/bin/pio run
* cd /home/handwash/Projects/hackcanada && just validate

### Step 5.3: Fix minor validation issues

Iterate on isolated lint, build, test, and configuration problems discovered during the rehearsal and validation pass. Keep the fixes scoped to demo hardening, not architecture expansion.

### Step 5.4: Report blocking issues

If the final rehearsal still fails because of missing credentials, environment provisioning, or broader Firebase setup gaps, document those blockers explicitly and spin a narrow follow-on plan instead of broadening this cycle.

## Dependencies

* Node.js with Corepack-enabled pnpm for workspace, backend, and web validation.
* uv-managed Python 3.11 environment for the Pi station package.
* PlatformIO available at /home/handwash/Projects/hackcanada/.venv/bin/pio for firmware validation.
* Firebase project configuration, device credentials, and basic operator-auth provisioning for the demo environment.

## Success Criteria

* The Pi runtime starts, publishes canonical live status and disposal events, and has meaningful validation coverage again.
* The ESP boundary stays narrow while providing real indicator behavior and stable demo-loop inputs.
* The Pi LCD renders live guidance and cumulative station-counter output required by the demo loop.
* The dashboard runs in a Vite browser host with Firebase-backed callables, Firestore live status, and basic operator login.
* Seeded historical data is available as a required demo dataset for history, analytics, comparisons, station-detail, and leaderboard views.
* Camera feed work remains explicitly out of scope for this cycle.