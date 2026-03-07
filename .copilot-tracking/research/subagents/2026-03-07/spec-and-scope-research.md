---
title: Spec And Scope Research
description: Research summary of authoritative product scope, demo assumptions, and Firebase rehearsal prerequisites for Binsight
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - spec
  - scope
  - firebase
  - rehearsal
estimated_reading_time: 6
---

## Research Scope

This note consolidates the repository's authoritative product scope and demo assumptions for provisioning, configuration, running, and deployment. The primary source is `spec/binsight-spec.md`, with supporting operational assumptions from the root, web, backend, infrastructure, and Raspberry Pi READMEs.

## Sources Reviewed

* `spec/binsight-spec.md`
* `README.md`
* `apps/README.md`
* `apps/web/README.md`
* `services/backend-functions/README.md`
* `devices/README.md`
* `devices/pi-station/README.md`
* `infra/README.md`
* `firmware/README.md`
* `infra/firebase/firebase.json`
* `justfile`

## Authoritative Scope Findings

### Product and demo scope

The spec defines Binsight as a smart waste-sorting station that identifies an item before disposal, instructs the user where to place it, detects the actual drop zone, and reports sorting quality and station insights. The demo scope is intentionally narrow: one tabletop station, one camera view, three visual disposal zones, poster LEDs, a 16x2 LCD, and a dashboard for station insights.

Evidence:

* `spec/binsight-spec.md:3-16`

### Core business flow

The business flow is fixed in the spec and should not be redistributed across surfaces. The station starts from ultrasonic-triggered presence detection, performs item classification, maps the item through the active rules preset, optionally falls back to an LLM below a configurable threshold, guides the user through LEDs and LCD, infers disposal from the most recent hand zone before disappearance, and emits one event per attempt.

Evidence:

* `spec/binsight-spec.md:18-58`
* `devices/pi-station/README.md:8-17`

### Dashboard and analytics scope

The dashboard is not a generic admin UI. It is scoped to stations, live monitoring, event history, historical charts, filtering by station and location dimensions, comparison workflows, and before/after or A/B analysis. Seed data is therefore part of the intended demo behavior, not optional demo polish.

Evidence:

* `spec/binsight-spec.md:67-120`
* `spec/binsight-spec.md:96-112`
* `apps/web/README.md:8-20`

### Demo assumptions and non-goals

The spec is explicit that the disposal zones are demo placeholders, actual drop detection is approximate, and physical verification is not production-grade. Multi-camera verification, automatic bin opening, and full national rules coverage are out of scope for v1. This is important for rehearsal expectations: the live demo is intended to prove the flow and analytics story, not physical-bin certainty.

Evidence:

* `spec/binsight-spec.md:130-154`

## Surface Ownership and Technical Boundaries

The repository overview and device docs reinforce a strict surface split:

* The spec is the source of truth.
* The Raspberry Pi owns the live control loop.
* The backend owns normalization and cloud persistence.
* The web app consumes deployed Firebase surfaces rather than running a separate local backend.

This means scope decisions should preserve the Pi as the owner of classification, rules evaluation, guidance, disposal detection, and event creation.

Evidence:

* `README.md:8-10`
* `README.md:24-30`
* `devices/pi-station/README.md:19-45`
* `services/backend-functions/README.md:8-19`

## Provisioning and Configuration Assumptions

### One shared Firebase project

The intended thin-slice demo assumes a single Firebase project shared by the Pi runtime, deployed Cloud Functions, Firestore, and the Vite dashboard. The backend is not a local long-running process for the rehearsal path.

Evidence:

* `README.md:86-106`
* `services/backend-functions/README.md:21-24`
* `services/backend-functions/README.md:56-70`
* `apps/web/README.md:38-52`

### Required cross-surface environment values

The root README provides the minimum environment contract across surfaces:

* Pi runtime: station id, rules preset id and version, ESP endpoint, Firebase project id, functions region or base URL, device id, shared secret, and publication timeout.
* Backend: Firebase project id, storage bucket, and `BINSIGHT_DEVICE_CREDENTIALS_JSON`.
* Web: Firebase web SDK configuration for the same target project.

Evidence:

* `README.md:107-142`
* `devices/pi-station/README.md:110-141`
* `services/backend-functions/README.md:25-38`
* `apps/web/README.md:21-36`

### Device authentication contract

The rehearsal depends on shared device identity across Pi and backend. The backend expects the Pi to sign ingress requests with `x-binsight-device-id`, `x-binsight-station-id`, `x-binsight-timestamp`, and `x-binsight-signature`, and the Pi README states that `STATION_ID`, `BINSIGHT_DEVICE_ID`, and `BINSIGHT_DEVICE_SHARED_SECRET` must align with the backend credential record.

Evidence:

* `services/backend-functions/README.md:29-38`
* `devices/pi-station/README.md:33-45`
* `devices/pi-station/README.md:83-109`

## Running and Deployment Assumptions

### Local validation path

The repository supports a local validation flow that stops short of a real Firebase rehearsal. The validated command path is root TypeScript lint, build, and test; Pi pytest and startup; ESP8266 PlatformIO build; then `just validate`.

Evidence:

* `README.md:48-64`
* `README.md:66-84`
* `justfile`

### Real demo run order

The documented real demo order is:

1. Provision the demo environment across all three surfaces.
2. Seed the Firebase dataset.
3. Deploy backend functions and Firestore configuration.
4. Start the dashboard.
5. Sign in as the operator.
6. Start the Pi runtime.
7. Run the live station interaction against `demo-station-001`.

Evidence:

* `README.md:86-102`
* `services/backend-functions/README.md:56-77`
* `apps/web/README.md:38-60`
* `devices/pi-station/README.md:83-109`

### Seed data is required

The docs consistently treat seeded data as mandatory for the rehearsal because live station traffic alone will not populate analytics, comparisons, history, or leaderboard views. The seed script writes the Ottawa preset, three demo stations, live-status stubs, deterministic event history, analytics rollups, and materialization ledger entries.

Evidence:

* `spec/binsight-spec.md:114-120`
* `README.md:144-160`
* `services/backend-functions/README.md:39-55`

## Verified Rehearsal Blockers and Open Questions

### Confirmed blockers

* The root README records that the real Firebase rehearsal was not validated because `FIREBASE_PROJECT_ID` was missing, Firebase application credentials were absent, and the web `.env` was not provisioned.
* The backend README records that the demo seed workflow failed immediately without `FIREBASE_PROJECT_ID` and backend credentials.
* The Pi README records that cloud publication remains blocked without a provisioned Pi `.env`, reachable Firebase credentials, and a seeded backend project.
* The web README records that live login and Firebase-backed reads were not validated because no `apps/web/.env` file or operator credentials were present.
* Repository inspection found no `.env.example` files anywhere in the workspace even though both the web and Pi READMEs instruct the operator to copy `.env.example` before configuration. That is a practical rehearsal blocker because the docs reference bootstrap artifacts that are not present.

Evidence:

* `README.md:100-102`
* `services/backend-functions/README.md:75-80`
* `devices/pi-station/README.md:154-156`
* `apps/web/README.md:58-60`

### Open questions for a live Firebase rehearsal

* The README files say to deploy backend functions and Firestore configuration, but they do not provide a single authoritative deploy command sequence for the target Firebase project. `infra/firebase/firebase.json` defines the functions source and Firestore assets, but the docs do not spell out the exact CLI invocation or required project selection workflow.
* The backend README says Firebase runtime wiring and emulator support are deferred, which raises a practical question for rehearsal ownership: which callable endpoints and triggers are already production-ready enough for the live demo path, and which remain placeholders.
* The root and backend docs require a shared Firebase project and operator account, but no documented provisioning checklist exists yet for creating that project, enabling Auth providers, or loading deploy-time secrets in a repeatable order.
* The Pi runtime currently starts, polls ESP health once, attempts live-status publication, prints a one-line summary, and exits. That matches the current Phase 5 entrypoint, but it leaves an open rehearsal question around whether the live demo expects a persistent runtime loop or only a proof-of-publication startup path.

Evidence:

* `services/backend-functions/README.md:17-24`
* `services/backend-functions/README.md:56-70`
* `devices/pi-station/README.md:100-109`
* `infra/firebase/firebase.json`

## Recommended Next Research

* Trace the deployed backend path in `services/backend-functions/src` to confirm which callable functions, triggers, and Firestore writes are already implemented for rehearsal use.
* Trace the web app's Firebase bootstrap and auth flow in `apps/web/src` to verify exact startup failure conditions, sign-in behavior, and live-status query assumptions.
* Trace the Pi cloud publication path in `devices/pi-station/src/binsight_station` to confirm whether event publishing, live-status publishing, and request signing are fully wired or still placeholders.
* Document the exact Firebase deployment workflow for rehearsal use, including CLI commands, project selection, function deployment, Firestore rules and index deployment, and secret provisioning.
* Decide whether missing `.env.example` files should be created or whether the READMEs should be revised to document manual `.env` creation instead.

## Status

Research status: complete for repository-level scope and README-defined demo assumptions. The next useful step is implementation-level verification of the live Firebase path.