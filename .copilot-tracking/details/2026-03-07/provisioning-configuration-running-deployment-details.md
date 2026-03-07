<!-- markdownlint-disable-file -->
# Implementation Details: Provisioning, Configuration, Running, and Deployment

## Context Reference

Sources: .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md, spec/binsight-spec.md, README.md, apps/web/README.md, services/backend-functions/README.md, infra/firebase/firebase.json, package.json, and justfile.

## Implementation Phase 1: Close Repository Deployment Contract Gaps

<!-- parallelizable: false -->

### Step 1.1: Define the Firebase Functions packaging and deployment contract

Resolve the current ambiguity around how `services/backend-functions` is built and deployed through Firebase. The implementation should make one deploy path explicit in-repo by aligning the package entrypoint, build output, Firebase source expectations, and the deploy-time runtime configuration mechanism. Prefer a contract that requires an explicit build before deploy, uses a per-project Firebase env file for deployed Functions runtime values, and keeps local seed execution on shell exports plus ADC rather than relying on operator memory.

Files:
* infra/firebase/firebase.json - Make the Functions source and any predeploy behavior match the selected packaging contract.
* services/backend-functions/package.json - Add or correct the package entrypoint, deploy-facing scripts, and any build hook needed by Firebase.
* services/backend-functions/tsconfig.json - Confirm the emitted output path remains consistent with the deploy contract.
* services/backend-functions/.env.example - Template the deployed Functions runtime values that must exist before `firebase deploy`.
* services/backend-functions/README.md - Document the deploy packaging and runtime configuration contract in beginner-friendly terms.

Discrepancy references:
* Resolves the selected deploy-contract gap for the live Firebase rehearsal path.

Success criteria:
* One documented and reproducible Functions deploy contract exists in the repository.
* The backend package clearly states which built artifact Firebase should execute.
* The repository defines where deployed Functions receive `BINSIGHT_STORAGE_BUCKET` and `BINSIGHT_DEVICE_CREDENTIALS_JSON` at deploy time.
* Operators no longer need to infer whether a manual pre-build step is required.

Context references:
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 157-163) - Functions deploy packaging is currently ambiguous.
* spec/binsight-spec.md (Lines 121-130) - Cloud Functions is the intended backend surface.

Dependencies:
* Existing backend package layout in services/backend-functions/.

### Step 1.2: Add repo-owned deploy, seed, and local-run command surfaces

Turn the research-backed workflow into explicit repository commands so setup is repeatable. Add narrow, task-oriented commands for backend build, Firestore rules and indexes deployment, Functions deployment, demo seeding, and local web startup. Prefer command wrappers in existing command surfaces such as `package.json`, `justfile`, or both, so the repository owns the exact sequence instead of burying it across multiple README files.

Files:
* package.json - Add root-level scripts for the supported provisioning and rehearsal flow where they improve discoverability.
* justfile - Add operator-facing tasks for deploy, seed, and local run steps that are currently manual.
* README.md - Add a concise command map that points users to the full runbook.
* services/backend-functions/package.json - Add any package-local scripts reused by the root or Just tasks.

Discrepancy references:
* Converts the selected rehearsal path into repository-owned commands.

Success criteria:
* The repository exposes one obvious command surface for each major workflow step.
* Command names map directly to the beginner flow in the runbook.
* Local commands stop short of provisioning external resources that require user access in the Firebase console.

Context references:
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 244-305) - Recommended command order for the selected approach.
* README.md (Lines 86-102) - Current live rehearsal failed because provisioning and setup steps were missing.

Dependencies:
* Step 1.1 completion.

### Step 1.3: Validate phase changes

Run repository-owned validation that does not require a live Firebase project yet.

Validation commands:
* cd /home/handwash/Projects/hackcanada && corepack pnpm --filter @binsight/backend-functions run build
* cd /home/handwash/Projects/hackcanada && corepack pnpm lint
* cd /home/handwash/Projects/hackcanada && corepack pnpm build

## Implementation Phase 2: Standardize Configuration Templates and Beginner Setup Guidance

<!-- parallelizable: false -->

### Step 2.1: Normalize environment templates across web, backend, and Pi surfaces

Make the required configuration visible and internally consistent. Keep the web and Pi templates aligned with the variable names already enforced in code, and standardize the backend on one hybrid configuration contract: a checked-in `services/backend-functions/.env.example` template for deployed Functions runtime values plus documented shell exports for the local seed workflow. The resulting configuration story must explicitly cover Firebase project id, Firebase Web SDK values, storage bucket, ADC path expectations, and device credential alignment between backend and Pi.

Files:
* apps/web/.env.example - Keep the required `VITE_FIREBASE_*` variables complete and in the order users need them.
* devices/pi-station/.env.example - Keep station, Firebase, and device-auth variables aligned with the selected demo station path.
* services/backend-functions/.env.example - Template the deployed Functions runtime values for per-project Firebase env files.
* services/backend-functions/README.md - Document the canonical hybrid contract: per-project env file for deployed Functions, shell exports for local seed commands.

Discrepancy references:
* Makes the selected configuration contract discoverable from templates instead of code inspection.

Success criteria:
* Every runtime surface has one clear configuration template or one explicit documented environment contract.
* Variable names match the code-enforced names already present in the repository.
* The backend setup contract explicitly distinguishes deployed Functions runtime config from local seed workflow config.
* The backend and Pi device credentials are documented as one shared credential pair that must stay aligned.

Context references:
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 184-242) - Required environment variables and config files across web, backend, and Pi.
* apps/web/src/main.tsx (Lines 11-35) - Web startup fails if required Firebase browser variables are absent.
* devices/pi-station/src/binsight_station/main.py (Lines 91-120) - Pi silently falls back to a no-op publisher when publication credentials are missing.

Dependencies:
* None.

### Step 2.2: Write a single beginner-first runbook with an explicit repo-versus-manual boundary

Create one command-first document that walks a beginner from tool installation through local web startup, backend deployment, demo seeding, and live station operation. The document should end with a dedicated boundary section that separates work the repository can automate from work the operator must still do manually in Firebase, Google Cloud, or on hardware. Keep the step order identical to the selected path from research, and include exact copy-pasteable commands for every in-repo action.

Files:
* docs/firebase-rehearsal-runbook.md - Primary step-by-step runbook for provisioning, deployment, seeding, local web startup, and live demo operation.
* README.md - Point to the runbook from the workspace root.
* apps/web/README.md - Replace duplicated setup prose with a short pointer to the shared runbook where appropriate.
* services/backend-functions/README.md - Replace duplicated deploy and seed prose with a short pointer to the shared runbook where appropriate.
* devices/pi-station/README.md - Point station operators to the same runbook for aligned demo setup.

Discrepancy references:
* Replaces fragmented setup instructions with one beginner path.

Success criteria:
* A beginner can follow one document from start to finish without jumping across multiple READMEs.
* Every command in the selected path appears exactly once in a copy-pasteable format.
* The runbook ends with a clear boundary between repo-owned work and manual operator tasks.

Context references:
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 244-305) - Selected approach and beginner-friendly sequence.
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 307-324) - Important caveats and recommended validation commands.

Dependencies:
* Step 1.1 completion for the final deploy contract.
* Step 1.2 completion for the final command names.

### Step 2.3: Validate phase changes

Run documentation and template validation that can complete without live Firebase access.

Validation commands:
* cd /home/handwash/Projects/hackcanada && corepack pnpm lint
* cd /home/handwash/Projects/hackcanada && corepack pnpm build

## Implementation Phase 3: Prepare Rehearsal Automation Without Adding New Product Scope

<!-- parallelizable: false -->

### Step 3.1: Keep the website local with Vite and document Hosting as deferred work

Make the repository explicit that the supported rehearsal path keeps the dashboard local with Vite while Firebase hosts the backend and data plane. Do not add Firebase Hosting configuration in this task. Instead, tighten the local web startup path, confirm which environment variables the web app needs, and document Hosting as a separate follow-on if the presentation later requires a hosted frontend.

Files:
* apps/web/README.md - Clearly state that the supported rehearsal path uses local Vite.
* infra/firebase/firebase.json - Leave Hosting absent unless the repository owner explicitly changes scope.
* docs/firebase-rehearsal-runbook.md - Show the local Vite command as the supported website path.
* .copilot-tracking/plans/logs/2026-03-07/provisioning-configuration-running-deployment-log.md - Record the selected path and rejected Hosting alternative.

Discrepancy references:
* Implements DD-01 by keeping Hosting out of the critical path for this plan.

Success criteria:
* The supported rehearsal path is unambiguous: Vite-local web, Firebase-hosted backend.
* No one needs to guess whether a Hosting deploy is required for the current demo path.
* Hosting remains clearly documented as future work rather than hidden scope.

Context references:
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 164-168) - Firebase Hosting is not configured in-repo.
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 246-259) - The selected path keeps the website local with Vite.

Dependencies:
* Step 2.2 completion.

### Step 3.2: Encode the exact live rehearsal execution order for the operator

Translate the selected path into a single, ordered command sequence that can be executed after the repository-side setup work lands. This sequence should begin with local tool bootstrap and environment file creation, continue through backend build, Firestore deployment, Functions deployment, demo seeding, and local web startup, and finish with Pi runtime startup. Keep external-console actions in the same order but call them out as manual prerequisites instead of wrapping them in scripts that cannot hold credentials or project access on behalf of the user.

Files:
* docs/firebase-rehearsal-runbook.md - Add the final ordered rehearsal sequence with exact commands.
* README.md - Add a short summary section that lists the top-level command sequence and links to the runbook.
* justfile - Add tasks whose names match the runbook sequence where that reduces operator error.

Discrepancy references:
* Addresses DR-01 and DR-03 by making the manual rehearsal sequence explicit and reproducible.

Success criteria:
* The operator can see the full live rehearsal order in one place.
* Each command in the sequence either exists in-repo or is clearly marked as an external manual action.
* The repository does not promise emulator support or Hosting deploy support that it does not implement.

Context references:
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 268-305) - Detailed step-by-step setup and deployment sequence.
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 326-334) - Remaining open questions that should stay explicit.

Dependencies:
* Step 1.2 completion.
* Step 2.2 completion.

### Step 3.3: Validate phase changes

Run the local execution surfaces that the supported rehearsal path depends on, without attempting live deployment.

Validation commands:
* cd /home/handwash/Projects/hackcanada && corepack pnpm --filter @binsight/web run build
* cd /home/handwash/Projects/hackcanada/devices/pi-station && uv run pytest
* cd /home/handwash/Projects/hackcanada/firmware/esp8266-controller && /home/handwash/Projects/hackcanada/.venv/bin/pio run

## Implementation Phase 4: Manual Operator Provisioning and Live Rehearsal

<!-- parallelizable: false -->

### Step 4.1: Provision the external Firebase resources and credentials

These actions remain manual because they require project ownership and console access outside the repository. Keep them in the runbook exactly in this order so later command steps work without backtracking.

Files:
* docs/firebase-rehearsal-runbook.md - Document the manual Firebase and Google Cloud steps in beginner-friendly language.
* apps/web/.env.example - Source for the web values the operator will fill into apps/web/.env.
* devices/pi-station/.env.example - Source for the Pi values the operator will fill into devices/pi-station/.env.
* services/backend-functions/.env.example - Source for the deployed Functions runtime values.
* services/backend-functions/README.md - Source for backend shell environment exports.

Manual steps and exact commands:
* Use the repository-standard Firebase CLI invocation. No separate global install is required.
* Authenticate and verify Firebase access:

```bash
cd /home/handwash/Projects/hackcanada
corepack pnpm dlx firebase-tools@latest login
corepack pnpm dlx firebase-tools@latest projects:list
```

* Create one Firebase project for the demo.
* Enable Firestore Database, Cloud Functions, Authentication with Email/Password, and Cloud Storage in the Firebase console.
* Create one Firebase Auth email/password user for the dashboard operator.
* Download a service-account JSON file that has access to the Firebase project.
* Export backend shell variables for the local seed workflow:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
export FIREBASE_PROJECT_ID=your-firebase-project-id
export BINSIGHT_STORAGE_BUCKET=your-firebase-project-id.firebasestorage.app
export BINSIGHT_DEVICE_CREDENTIALS_JSON='[{"deviceId":"pi-demo-001","stationId":"demo-station-001","sharedSecret":"replace-with-demo-secret","enabled":true}]'
```

Success criteria:
* The operator has one real Firebase project and one operator login account.
* Backend environment exports exist in the current shell.
* The device credential JSON matches the station and secret that will be used on the Pi.

Context references:
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 170-183) - Required Firebase resources.
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 184-242) - Required credentials and environment variables.

Dependencies:
* Implementation Phases 1 through 3 completion.

### Step 4.2: Fill configuration files and execute the repository command sequence

After the external project and credentials exist, execute the command path the repository now documents. Keep the web and Pi configuration aligned to the same Firebase project and device credential pair.

Files:
* docs/firebase-rehearsal-runbook.md - Document the exact command sequence.
* services/backend-functions/.env.$FIREBASE_PROJECT_ID - Manual per-project file created from the backend template for deployed Functions runtime values.
* apps/web/.env - Manual file created from the template.
* devices/pi-station/.env - Manual file created from the template.

Manual steps and exact commands:

```bash
cd /home/handwash/Projects/hackcanada
corepack enable
corepack pnpm install

cd /home/handwash/Projects/hackcanada/devices/pi-station
uv sync

cd /home/handwash/Projects/hackcanada
cp apps/web/.env.example apps/web/.env
cp devices/pi-station/.env.example devices/pi-station/.env

cat > apps/web/.env <<EOF
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_APP_ID=your-firebase-app-id
VITE_FIREBASE_AUTH_DOMAIN=$FIREBASE_PROJECT_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
VITE_FIREBASE_FUNCTIONS_REGION=us-central1
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_STORAGE_BUCKET=$FIREBASE_PROJECT_ID.firebasestorage.app
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
EOF

cat > "services/backend-functions/.env.$FIREBASE_PROJECT_ID" <<EOF
BINSIGHT_STORAGE_BUCKET=$FIREBASE_PROJECT_ID.firebasestorage.app
BINSIGHT_DEVICE_CREDENTIALS_JSON=[{"deviceId":"pi-demo-001","stationId":"demo-station-001","sharedSecret":"replace-with-demo-secret","enabled":true}]
EOF

corepack pnpm --filter @binsight/backend-functions run build
corepack pnpm dlx firebase-tools@latest deploy --project "$FIREBASE_PROJECT_ID" --config infra/firebase/firebase.json --only firestore:rules,firestore:indexes
corepack pnpm dlx firebase-tools@latest deploy --project "$FIREBASE_PROJECT_ID" --config infra/firebase/firebase.json --only functions
corepack pnpm --filter @binsight/backend-functions run seed:demo
corepack pnpm --filter @binsight/web run dev
```

* Open `http://localhost:5173` in the browser.
* Sign in with the Firebase Auth operator email and password created in Step 4.1 before moving on to the Pi runtime.
* Keep the current any-authenticated-user access model for this rehearsal. Do not add role claims or tighter operator authorization in this task.

Success criteria:
* The dashboard starts locally with a completed apps/web/.env file.
* The deployed Functions runtime receives `BINSIGHT_STORAGE_BUCKET` and `BINSIGHT_DEVICE_CREDENTIALS_JSON` from `services/backend-functions/.env.$FIREBASE_PROJECT_ID`.
* Firestore rules, indexes, and Functions deploy to the selected Firebase project.
* The demo seed command completes against the live project.
* The operator can open the dashboard and authenticate successfully before the hardware run begins.
* The runbook explicitly states that role-claim hardening is deferred for this rehearsal path.

Context references:
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 268-305) - Exact deploy and startup order.
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 307-314) - Remaining deploy caveat that must be closed by Phase 1.

Dependencies:
* Step 4.1 completion.

### Step 4.3: Start the station hardware and run the live demo

Finish the rehearsal by aligning hardware-side configuration with the same cloud project and then running the Pi runtime while the local dashboard is open. Keep this section explicit that ESP flashing and Wi-Fi alignment remain manual hardware work.

Files:
* docs/firebase-rehearsal-runbook.md - Document the final live-demo procedure.
* firmware/esp8266-controller/README.md - Reference for Wi-Fi build flags and flashing steps.
* devices/pi-station/README.md - Reference for Pi runtime startup expectations.

Manual steps and exact commands:
* Add the rehearsal Wi-Fi credentials under `build_flags` in `firmware/esp8266-controller/platformio.ini`:

```text
-D BINSIGHT_WIFI_SSID="your-ssid"
-D BINSIGHT_WIFI_PASS="your-password"
```

* Upload the firmware with the repository-standard command:

```bash
cd /home/handwash/Projects/hackcanada/firmware/esp8266-controller
../../.venv/bin/pio run -e nodemcuv2 -t upload
```

* Fill `devices/pi-station/.env` with `STATION_ID=demo-station-001`, `RULES_PRESET_ID=demo-canada-ottawa`, `RULES_PRESET_VERSION=1.0.0`, `FIREBASE_PROJECT_ID=your-firebase-project-id`, `BINSIGHT_DEVICE_ID=pi-demo-001`, and the same shared secret used in `BINSIGHT_DEVICE_CREDENTIALS_JSON`.
* Start the Pi runtime:

```bash
cd /home/handwash/Projects/hackcanada/devices/pi-station
uv run binsight-station
```

* Record a go or no-go decision for the current Pi runtime before the public demo. If the station exits too quickly for the intended rehearsal flow, stop here and open a follow-on implementation task for a persistent runtime loop instead of treating the setup plan as sufficient.

Success criteria:
* The Pi publishes to the deployed Functions instead of silently staying on the no-op path.
* The dashboard shows live station status and seeded analytics using the same Firebase project.
* The operator can complete one end-to-end disposal flow against `demo-station-001`.
* The operator records whether the current Pi runtime is acceptable for the intended rehearsal duration.

Context references:
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 161-169) - Pi runtime and ESP network caveats.
* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 315-324) - The Pi runtime may still be too short-lived for a sustained rehearsal.

Dependencies:
* Step 4.2 completion.

## Execution Boundary

### What can be completed in-repo

* Define and document the Functions deploy contract.
* Add repeatable command wrappers for build, deploy, seed, and local run steps.
* Normalize environment templates and write one beginner-first runbook.
* Clarify that the supported rehearsal path uses local Vite instead of Firebase Hosting.

### What still requires manual operator work afterward

* Create and configure the real Firebase project.
* Create the operator Auth user and obtain a service-account JSON file.
* Export backend credentials into the shell used for deploy and seeding.
* Fill `apps/web/.env` and `devices/pi-station/.env` with real project values.
* Flash the ESP8266 with the correct Wi-Fi settings.
* Run the live deploy, seed, dashboard, and Pi startup sequence against the real project.

## Implementation Phase 5: Final Validation and Handoff

<!-- parallelizable: false -->

### Step 5.1: Run full project validation

Execute the local validation surfaces that the repository can own directly before asking the operator to run the manual rehearsal.

Validation commands:
* cd /home/handwash/Projects/hackcanada && just validate
* cd /home/handwash/Projects/hackcanada && corepack pnpm lint
* cd /home/handwash/Projects/hackcanada && corepack pnpm build

### Step 5.2: Fix minor validation issues

Resolve straightforward lint, build, documentation, or command-surface issues discovered during Step 5.1. Do not expand scope into Hosting setup, emulator orchestration, or Pi runtime redesign during this cleanup pass.

### Step 5.3: Report blocking issues and manual next actions

If the live rehearsal still cannot be completed after repository changes, report the remaining blockers in two groups only: repository issues that still need implementation and manual operator tasks that still need access or credentials. Keep the manual command list unchanged unless a repository-owned command changed in this phase.

## Dependencies

* Node.js with Corepack-enabled pnpm for workspace, backend, and web tasks.
* Python 3.11 plus uv for Pi dependency sync and runtime execution.
* PlatformIO for firmware validation and ESP flashing.
* Node.js with Corepack-enabled pnpm available for the repository-standard `pnpm dlx firebase-tools@latest` invocation.
* Access to a real Firebase project for manual rehearsal execution.

## Success Criteria

* The repository defines one reproducible backend deploy contract and one beginner-first command surface for rehearsal work.
* Environment templates and setup documentation cover web, backend, Pi, and external credential prerequisites without requiring code inspection.
* The final runbook clearly separates repo-owned implementation work from manual operator actions.
* The operator can follow one exact command sequence to deploy Firestore assets, deploy Functions, seed demo data, run the dashboard locally, and start the Pi runtime.

## Final Execution Boundary

### Repository work complete before handoff

* Define and document the Functions deploy contract.
* Standardize the backend runtime configuration split: per-project Firebase env file for deployed Functions, shell exports for local seed commands.
* Add repeatable command wrappers and one beginner-first runbook.
* Keep the supported dashboard path explicit as Vite-local.

### Manual operator work after handoff

* Authenticate with Firebase by running `corepack pnpm dlx firebase-tools@latest login`.
* Create and configure the Firebase project and operator account.
* Export backend credentials in the current shell.
* Create `services/backend-functions/.env.$FIREBASE_PROJECT_ID` before deploying Functions.
* Upload firmware with `../../.venv/bin/pio run -e nodemcuv2 -t upload` after setting Wi-Fi build flags.
* Run the deploy, seed, dashboard, and Pi startup sequence against the real project.