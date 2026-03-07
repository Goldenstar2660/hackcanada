<!-- markdownlint-disable-file -->
# Planning Log: Full Station Demo Integration Hardening

**Related Plan**: full-station-demo-integration-hardening-plan.instructions.md

## Discrepancy Log

Gaps and deviations identified during implementation.

### Unaddressed Research Items

* DR-01: Real Firebase rehearsal prerequisites remain external to the repository.
  * Source: .copilot-tracking/research/2026-03-07/full-station-demo-integration-hardening-research.md (Lines 251-278)
  * Reason: A direct workspace check confirmed that `apps/web/.env` is present with the required `VITE_FIREBASE_*` keys, `devices/pi-station/.env` is present with the Pi runtime keys, `services/backend-functions/.env.vastum-binsight` is present with backend bucket and device-credential values, and the `secrets/` folder contains a Firebase Admin SDK JSON file. Firestore and Functions were deployed to `vastum-binsight`, and the demo dataset was seeded successfully from this laptop. The remaining gap is no longer repo-owned bootstrap. It is the physical station rehearsal that requires the actual Pi and ESP hardware for a live sort.
  * Impact: High

### Implementation Deviations

* DD-02: Phase 1 branch state had already resolved the Pi startup and test failures.
  * Plan specifies: Phase 1 begins by recovering a broken Pi runtime and validation path before broader integration work.
  * Implementation differs: The checked-out branch already passed the Pi startup and validation gates, so the phase work narrowed to publication-envelope hardening, regression coverage, and environment documentation.
  * Rationale: Preserving the working branch state was lower risk than attempting to recreate already-fixed failures, and it still satisfied the phase success criteria.
* DD-03: Phase 3 started from an already-wired authenticated publisher transport.
  * Plan specifies: Step 3.1 centers on implementing the authenticated event and live-status publication path from the Pi to the backend ingress handlers.
  * Implementation differs: The checked-out branch already contained the authenticated publication transport, so the phase work focused on explicit endpoint configuration, timeout hardening, seed workflow creation, and bootstrap documentation.
  * Rationale: Replacing an existing working transport would have added unnecessary risk; configuration hardening and reproducible demo data were the remaining gaps.
* DD-01: Browser operator access currently accepts any authenticated Firebase user.
  * Plan specifies: Basic Firebase Auth users are acceptable for operator access, while operator-facing access remains aligned to the backend auth model.
  * Implementation differs: The web host and backend operator-auth checks now allow any signed-in Firebase user instead of requiring explicit operator claims.
  * Rationale: This keeps the selected basic email/password login path usable without a separate custom-claims provisioning step during the current cycle.
* DD-04: Root deploy and validation scripts required laptop-specific fallback handling.
  * Plan specifies: Final rehearsal and validation use the repository-owned `pnpm` and Firebase command surface directly.
  * Implementation differs: The repo now includes `firebase.json` at the root plus `scripts/pnpm-cli.mjs` so the tracked deploy scripts work from the repository root and the root package scripts fall back to `npx pnpm@10.6.3` when Corepack fails on this machine.
  * Rationale: Without these changes, the documented deploy and validation commands were not reproducible on the laptop even though the underlying code and Firebase project were ready.

## Suggested Follow-On Work

* WI-02: Confirm SPA deep-link hosting behavior — Verify static hosting rewrites for routes such as `/stations/:stationId/live` before demo deployment. (medium)
  * Source: Phase 4, Step 4.1
  * Dependency: Web deploy target selection
* WI-03: Reduce the main bundle size — Split the live or analytics surfaces if the current Vite bundle size becomes a demo-hosting concern. (low)
  * Source: Phase 4, Step 4.3
  * Dependency: None
* WI-04: Add Pi publication integration coverage — Validate the authenticated HTTP publisher and ingress auth headers once the real transport is wired in Phase 3. (medium)
  * Source: Phase 1, Step 1.3
  * Dependency: Phase 3 publisher implementation
* WI-05: Verify LED wiring on the live ESP rig — Confirm that the recycle, compost, and garbage poster LEDs map to D1, D2, and D7 with the expected polarity before the final rehearsal. (medium)
  * Source: Phase 2, Step 2.4
  * Dependency: Physical station hardware availability
* WI-06: Add a seed-data verification mode — Provide a dry-run or validation path for the demo seed script so dataset shape can be checked without writing Firestore documents. (medium)
  * Source: Phase 3, Step 3.4
  * Dependency: None
* WI-07: Provision the live demo Firebase environment — Set `FIREBASE_PROJECT_ID`, `BINSIGHT_STORAGE_BUCKET`, `BINSIGHT_DEVICE_CREDENTIALS_JSON`, `GOOGLE_APPLICATION_CREDENTIALS`, and `VITE_FIREBASE_*`, then rerun the seed and rehearsal flow. (high)
  * Source: Phase 5, Step 5.4
  * Dependency: Access to the demo Firebase project and operator account provisioning
* WI-08: Run the physical-station rehearsal on the actual hardware — Use the deployed `vastum-binsight` backend, seeded dataset, local Vite dashboard, and the real Pi plus ESP station to verify presence sensing, LED guidance, LCD output, disposal capture, and live dashboard updates during a real sort. (high)
  * Source: Phase 5, Step 5.1
  * Dependency: Access to the Raspberry Pi, ESP controller, and the assembled station rig

## User Decisions

* ID-01: Operator auth model — Basic Firebase Auth users selected
  * Rationale: The current cycle prioritizes a thin-slice operator login path over custom operator-claim provisioning.