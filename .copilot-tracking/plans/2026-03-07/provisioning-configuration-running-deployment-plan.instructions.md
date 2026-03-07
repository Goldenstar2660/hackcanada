---
applyTo: '.copilot-tracking/changes/2026-03-07/provisioning-configuration-running-deployment-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Provisioning, Configuration, Running, and Deployment

## Overview

Turn the current research-backed Firebase rehearsal path into a reproducible repository workflow by closing the Functions deploy contract gap, standardizing configuration and runbook guidance, and ending with a clearly separated manual operator sequence for the live rehearsal.

## Objectives

### User Requirements

* Create an implementation plan for provisioning, configuration, running, and deployment based on the attached research. - Source: user request in conversation.
* Include all setup work the repository still needs before a live Firebase rehearsal can be attempted cleanly. - Source: user request in conversation and .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 157-168).
* End the plan with a clear separation between work that can be completed in-repo and work the user must still do manually afterward. - Source: user request in conversation.
* Keep the instructions simple, easy to understand, and step by step, including exact commands. - Source: user request in conversation and .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 268-305).

### Derived Objectives

* Resolve the Functions deploy packaging ambiguity before any beginner-facing runbook is finalized. - Derived from: .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 157-163).
* Convert the selected rehearsal flow into explicit repository command surfaces so the deployment sequence is reproducible instead of README-only. - Derived from: .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 244-305).
* Standardize the backend operator contract as a per-project Firebase env file for deployed Functions plus shell exports for the local seed workflow, and standardize the Firebase CLI contract on `corepack pnpm dlx firebase-tools@latest` so the runbook can stay exact and beginner-friendly. - Derived from: .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 184-242, 268-305, 326-334).
* Keep the selected path aligned to the spec by using a real Firebase backend while leaving the dashboard local on Vite for the current rehearsal cycle. - Derived from: spec/binsight-spec.md (Lines 121-130) and .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 244-259).
* Keep the current any-authenticated-user dashboard access model for the rehearsal path and defer role-claim hardening unless a later task explicitly selects it. - Derived from: .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Open Questions).
* Keep Hosting, emulator orchestration, and Pi runtime redesign out of the critical path unless a later task explicitly selects them. - Derived from: .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 164-168, 315-334).
* Preserve an explicit manual boundary for Firebase project creation, credentials, Auth user creation, hardware flashing, and live rehearsal execution because those actions cannot be completed solely through repository edits. - Derived from: .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 170-305).
* Use the first real rehearsal to make an explicit go or no-go decision on whether the current Pi runtime is acceptable, rather than leaving that readiness question implicit. - Derived from: .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 315-324, 326-334).

## Context Summary

### Project Files

* infra/firebase/firebase.json - Current Firebase infrastructure configuration and current source of the Functions deploy ambiguity.
* services/backend-functions/package.json - Backend build, seed, and deploy-facing script surface.
* services/backend-functions/tsconfig.json - Backend emitted output contract.
* services/backend-functions/README.md - Existing backend setup and seeding instructions.
* apps/web/.env.example - Current web configuration template.
* apps/web/README.md - Current web startup guidance.
* devices/pi-station/.env.example - Current Pi configuration template.
* devices/pi-station/README.md - Current Pi setup and runtime guidance.
* package.json - Root command surface for workspace scripts.
* justfile - Existing operator task surface that can host deploy and rehearsal shortcuts.
* README.md - Root entry point for setup and deployment documentation.

### References

* .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md - Primary research source for delivery state, blockers, required configuration, selected path, and manual sequence.
* spec/binsight-spec.md - Product source of truth for Firebase-backed architecture and demo behavior.

### Standards References

* #file:../../../spec/binsight-spec.md - Product source of truth for backend architecture, dashboard hosting expectations, and demo scope.
* #file:../../../.github/instructions/source-of-truth.instructions.md - Requirement to treat the spec as authoritative unless the user overrides it.

## Implementation Checklist

### [x] Implementation Phase 1: Close Repository Deployment Contract Gaps

<!-- parallelizable: false -->

* [x] Step 1.1: Define the Firebase Functions packaging and deployment contract.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 12-38)
* [x] Step 1.2: Add repo-owned deploy, seed, and local-run command surfaces.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 39-63)
* [x] Step 1.3: Validate phase changes.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 64-71)

### [x] Implementation Phase 2: Standardize Configuration Templates and Beginner Setup Guidance

<!-- parallelizable: false -->

* [x] Step 2.1: Normalize environment templates across web, backend, and Pi surfaces.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 77-103)
* [x] Step 2.2: Write a single beginner-first runbook with an explicit repo-versus-manual boundary.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 104-130)
* [x] Step 2.3: Validate phase changes.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 131-137)

### [x] Implementation Phase 3: Prepare Rehearsal Automation Without Adding New Product Scope

<!-- parallelizable: false -->

* [x] Step 3.1: Keep the website local with Vite and document Hosting as deferred work.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 143-167)
* [x] Step 3.2: Encode the exact live rehearsal execution order for the operator.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 168-192)
* [x] Step 3.3: Validate phase changes.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 193-200)

### [ ] Implementation Phase 4: Manual Operator Provisioning and Live Rehearsal

<!-- parallelizable: false -->

* [ ] Step 4.1: Provision the external Firebase resources and credentials.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 206-251)
* [ ] Step 4.2: Fill configuration files and execute the repository command sequence.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 252-317)
* [ ] Step 4.3: Start the station hardware and run the live demo.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 318-382)

### [x] Implementation Phase 5: Final Validation and Handoff

<!-- parallelizable: false -->

* [x] Step 5.1: Run full project validation.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 387-395)
* [x] Step 5.2: Fix minor validation issues.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 396-399)
* [x] Step 5.3: Report blocking issues and manual next actions.
  * Details: .copilot-tracking/details/2026-03-07/provisioning-configuration-running-deployment-details.md (Lines 400-434)

## Planning Log

See [provisioning-configuration-running-deployment-log.md](../../plans/logs/2026-03-07/provisioning-configuration-running-deployment-log.md) for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* Node.js with Corepack-enabled pnpm for workspace, backend, and web tasks.
* Python 3.11 with uv for the Pi runtime.
* PlatformIO for ESP firmware validation and flashing.
* Node.js with Corepack-enabled pnpm available for the repository-standard `pnpm dlx firebase-tools@latest` invocation.
* Access to a real Firebase project and service-account credentials for the manual rehearsal phase.

## Success Criteria

* The repository defines one clear, reproducible backend deploy contract for Firebase Functions. - Traces to: .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 157-163)
* Beginners can discover all required configuration from templates, the per-project Functions env-file contract, documented seed-time shell exports, and one shared runbook without inspecting source code. - Traces to: .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 184-242, 268-305)
* The supported rehearsal path is explicit: Firebase for backend and data, Vite-local for the dashboard. - Traces to: spec/binsight-spec.md (Lines 121-130) and .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 244-259)
* The rehearsal path explicitly keeps the current authenticated-user access model and defers role-claim hardening. - Traces to: .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Open Questions)
* The final planning artifacts separate repository work from manual operator steps and include exact commands for Firebase authentication, per-project Functions runtime configuration, deploys, and firmware upload in the manual rehearsal sequence. - Traces to: user request in conversation and .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 268-305, 326-334)
* The first real rehearsal ends with an explicit Pi runtime readiness decision instead of leaving the one-pass behavior as an unowned risk. - Traces to: .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 315-324, 326-334)

## Final Execution Boundary

### Repository-Owned Work

* Close the backend deploy contract gap.
* Add repeatable command wrappers for build, deploy, seed, and local run flows.
* Normalize environment templates and standardize the backend runtime configuration split between per-project deploy env files and seed-time shell exports.
* Write one beginner-first runbook and root-level pointers.
* Clarify that the supported rehearsal path uses local Vite rather than Firebase Hosting.

### Manual Operator Work Afterward

* Run `corepack pnpm dlx firebase-tools@latest login` and confirm project access.
* Create and configure the real Firebase project.
* Create the Firebase Auth operator account.
* Obtain and export service-account credentials.
* Create `services/backend-functions/.env.$FIREBASE_PROJECT_ID` before deploying Functions.
* Fill the real values into apps/web/.env and devices/pi-station/.env.
* Open the local dashboard and sign in with the Firebase Auth operator account before starting the Pi runtime.
* Upload firmware with `../../.venv/bin/pio run -e nodemcuv2 -t upload` after setting Wi-Fi build flags.
* Execute the live deploy, seed, dashboard, and Pi runtime sequence.