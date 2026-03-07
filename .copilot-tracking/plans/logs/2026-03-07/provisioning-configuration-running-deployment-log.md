<!-- markdownlint-disable-file -->
# Planning Log: Provisioning, Configuration, Running, and Deployment

## Discrepancy Log

Gaps and differences identified between research findings and the implementation plan.

### Unaddressed Research Items

* None. The planning artifacts now carry forward the selected rehearsal access model, the manual Firebase sequence, the dashboard sign-in order, and the Pi runtime go or no-go decision explicitly.

### Plan Deviations from Research

* DD-01: The plan standardizes deployed Functions runtime configuration on a per-project Firebase env file rather than leaving the deploy-time secret-management mechanism open.
  * Research recommends: Keep deploy-time backend secret management explicit until the repository selects a supported mechanism, because the runtime depends on backend environment values.
  * Plan implements: `services/backend-functions/.env.$FIREBASE_PROJECT_ID` for deployed Functions runtime values, while keeping local seed execution on shell exports plus ADC.
  * Rationale: This is the simplest beginner-friendly path that matches the current `process.env` runtime shape without requiring code changes to the backend bootstrap.
* DD-02: Phase 3 keeps the dashboard on local Vite and leaves `infra/firebase/firebase.json` without a Firebase Hosting section.
  * Research recommends: Keep Firebase Hosting out of the critical path unless presentation requirements explicitly demand a hosted frontend.
  * Plan implements: One explicit rehearsal sequence across the runbook, root README, and `justfile` that deploys Firestore and Functions, seeds demo data, then starts the dashboard locally with Vite.
  * Rationale: This preserves the selected Firebase backend path, avoids new frontend deployment scope, and keeps the operator sequence aligned with the current repo contract.

## Implementation Paths Considered

### Selected: Real Firebase backend with local Vite dashboard

* Approach: Close the Functions deploy contract in-repo, standardize deployed Functions runtime configuration on `services/backend-functions/.env.$FIREBASE_PROJECT_ID`, keep local seed execution on shell exports plus ADC, use `corepack pnpm dlx firebase-tools@latest` as the canonical Firebase CLI path, add repeatable deploy and seed commands, keep the website local with Vite, and document one exact rehearsal order for deploy, seed, dashboard startup, sign-in, Pi validation, and Pi startup.
* Rationale: This matches the spec and research with the fewest moving parts while directly addressing the blockers that prevented the live Firebase rehearsal.
* Evidence: .copilot-tracking/research/2026-03-07/provisioning-configuration-deployment-research.md (Lines 244-305)

### IP-01: Add Firebase Hosting as part of this task

* Approach: Extend `infra/firebase/firebase.json`, web build outputs, and deploy scripts to host the dashboard on Firebase.
* Trade-offs: Could simplify the final presentation URL, but it introduces a new deployment surface, additional configuration, and more failure modes unrelated to the current blockers.
* Rejection rationale: Research shows Hosting is not configured today, and adding it now would expand scope without resolving the provisioning and Functions deploy gaps first.

### IP-02: Rehearse entirely with Firebase emulators

* Approach: Route web, backend, and seed flows through local emulators instead of a real Firebase project.
* Trade-offs: Easier to test locally, but it diverges from the real rehearsal goal and leaves project provisioning, Auth, and cloud deployment risks unresolved.
* Rejection rationale: The research and repository documentation explicitly prefer a real Firebase project for the intended demo path.

## Suggested Follow-On Work

* WI-01: Extend the Pi runtime into a persistent loop only if the manual rehearsal records a no-go decision for the current one-pass behavior. (high)
  * Source: Implementation Phase 4, Step 4.3
  * Dependency: Completion of one manual live rehearsal against the real project
* WI-02: Add Firebase Hosting only if presentation requirements demand a hosted dashboard URL. (medium)
  * Source: DD-01
  * Dependency: Completion of the supported Vite-local rehearsal path
* WI-03: Add CI or scripted validation for the deployment command surface after the contract is stable. (medium)
  * Source: Implementation Phase 1 and Phase 3
  * Dependency: Completion of one successful manual live rehearsal
* WI-04: Add explicit role claims or tighter operator authorization only if rehearsal scope expands beyond the current authenticated-user access model. (low)
  * Source: Research open questions and the selected rehearsal access model
  * Dependency: Completion of the supported live rehearsal path