---
title: Spec and Stitch Audit Research
description: Research audit of the Binsight product spec and Stitch UI artifacts for the Hack Canada workspace
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: reference
keywords:
  - binsight
  - stitch
  - product spec
  - ui audit
  - research
estimated_reading_time: 8
---

## Research scope

This document audits the Binsight source of truth in `spec/binsight-spec.md` and the Stitch UI artifacts under `spec/ui/**`.

## Research questions

* What product scope, demo scope, assumptions, non-goals, and business logic does the spec define?
* What pages and interaction patterns do the Stitch artifacts imply?
* Where do the Stitch artifacts align with or diverge from the product spec?
* Which pages should be implemented first for the app?

## Executive summary

The product spec defines Binsight as a smart waste-sorting station plus dashboard workflow, not a generic waste analytics brand site. The core demo is one tabletop station with three disposal zones, immediate item identification, LED and LCD guidance, approximate drop detection, event creation, and dashboard insights. The dashboard scope explicitly includes station browsing, station metadata, active rules preset, disposal history, historical metrics, filters, comparisons, and before or after analysis. The spec also calls for a dedicated live monitoring page.

The Stitch assets provide five page concepts plus paired screenshots:

* `spec/ui/landing page/code.html` and `image.png`
* `spec/ui/login/code.html` and `image.png`
* `spec/ui/analytics/code.html` and `image.png`
* `spec/ui/devices/code.html` and `image.png`
* `spec/ui/device details/code.html` and `image.png`
* `spec/ui/dashboard/code.html` and `image.png`

The most important discrepancy is that `spec/ui/dashboard/code.html` is not a dashboard. It duplicates the landing page instead of representing the spec's dashboard or live monitoring requirements. The closest Stitch artifact to the spec's live monitoring page is `spec/ui/device details/code.html`, but it behaves more like a hybrid station detail plus scan history page than a true real-time monitoring surface.

## Product source of truth

### Product scope and demo scope

The spec defines the product as a smart waste-sorting station that identifies an item before disposal, guides the user to the correct bin, detects where it was actually dropped, and reports sorting quality and station insights at `spec/binsight-spec.md:3-7`. The demo scope is deliberately narrow: one tabletop station, one camera view, three disposal zones, LED guidance, LCD live feedback, and a dashboard at `spec/binsight-spec.md:9-16`.

### Core business logic

The business flow is explicit and sequential.

* Detection begins immediately when an item is presented. There is no wake-up gate or person-trigger sensor at `spec/binsight-spec.md:20-23`.
* Item identification captures the item in hand, classifies it, maps it to a disposal method using active local rules, and optionally uses an LLM fallback below a threshold at `spec/binsight-spec.md:25-30`.
* User guidance turns on the corresponding LED and updates the LCD while the session waits for disposal at `spec/binsight-spec.md:32-35`.
* Disposal detection tracks hand zone and hand presence, then infers a drop event from hand disappearance at `spec/binsight-spec.md:37-41`.
* Correctness compares predicted disposal method against the actual detected drop zone at `spec/binsight-spec.md:43-47`.
* Event creation records station id, timestamp, predicted item, correct disposal method, actual disposal zone, success or failure, confidence, and LLM fallback usage at `spec/binsight-spec.md:49-58`.
* The LCD station counter defaults to the correct bin during a session and total correct sorts otherwise at `spec/binsight-spec.md:60-65`.

### Analytics scope and business features

The metrics the dashboard should directly track and display are at `spec/binsight-spec.md:67-85`.

* Total attempts
* Total correct sorts
* First-try correct rate
* Participation or compliance score
* Top contamination items
* Worst times of day
* Bin purity by hour or day
* Floor or building leaderboard

The dashboard must also support browsing stations, station status and metadata, active rules preset, disposal event history, historical charts, location and time filtering, grouped comparisons, signage or layout comparisons, and before or after analysis at `spec/binsight-spec.md:96-105`.

The spec separately requires a live monitoring page that shows live device status, current session state, current detected item, current disposal decision, and the latest event in real time at `spec/binsight-spec.md:107-112`.

### Assumptions and non-goals

The demo assumptions are explicit at `spec/binsight-spec.md:130-134`.

* Disposal zones are visual placeholders, not physical bins
* Drop detection is inferred from hand disappearance
* Actual bin detection is approximate and demo-grade
* The item set can expand later without changing core flow

The v1 non-goals are also clear at `spec/binsight-spec.md:136-140`.

* Production-grade physical bin verification
* Fully automatic bin opening
* Multi-camera verification
* Full national rule coverage at launch

## Stitch artifact inventory

### Landing page artifact

Files:

* `spec/ui/landing page/code.html`
* `spec/ui/landing page/image.png`

Likely route: `/` or public marketing landing page.

Purpose: public brand entry page leading to authenticated product surfaces.

Key visual sections and expectations:

* A top nav advertises `Dashboard`, `Analytics`, `Devices`, and `System` at `spec/ui/landing page/code.html:157-160`.
* The hero is an editorial statement, `We are Experts Refining Disposal`, at `spec/ui/landing page/code.html:167-170`.
* The product description markets computer-vision waste classification rather than describing the station workflow at `spec/ui/landing page/code.html:174`.
* The main call to action is `System Login` at `spec/ui/landing page/code.html:182`.
* Footer stats show `Network Precision`, `Contamination`, and `Active Nodes` at `spec/ui/landing page/code.html:189-197`.

Interaction expectations:

* Users can navigate to authenticated areas or start login.
* This page should not be treated as the operational dashboard.

Assessment against spec:

* Compatible as a marketing shell, but not required by the spec.
* Footer metrics are brand-level and vague. They do not match the spec's named KPIs.

### Login artifact

Files:

* `spec/ui/login/code.html`
* `spec/ui/login/image.png`

Likely route: `/login`.

Purpose: authenticated access into the dashboard.

Key visual sections and expectations:

* The page title area says `Login to BiNSIGHT` and `Access your data intelligence dashboard` at `spec/ui/login/code.html:77-78`.
* Email and password inputs appear at `spec/ui/login/code.html:83-92`.
* Primary action is `Login to Dashboard` at `spec/ui/login/code.html:99`.
* Secondary access methods appear under `Or continue with` at `spec/ui/login/code.html:108`.
* `Request Access` is present for non-users at `spec/ui/login/code.html:131`.

Interaction expectations:

* Email and password login.
* Optional social sign-in.
* Password visibility toggle.
* Recovery and access request paths.

Assessment against spec:

* Reasonable supporting page.
* Authentication is not described in the spec, so this is product scaffolding rather than source-of-truth functionality.

### Analytics artifact

Files:

* `spec/ui/analytics/code.html`
* `spec/ui/analytics/image.png`

Likely route: `/analytics`.

Purpose: aggregated performance, comparisons, trends, and insight generation.

Key visual sections and expectations:

* Hero actions and status include `EXPORT REPORT`, `ANALYTICS OVERVIEW`, and `LIVE FEED ACTIVE` at `spec/ui/analytics/code.html:64-72`.
* Summary metrics are `CORRECT BIN PLACEMENT`, `CONTAMINATION RATE`, and `TOTAL ITEM COUNT` at `spec/ui/analytics/code.html:79-99`.
* A `COMPARISON TOOL` compares primary and secondary locations at `spec/ui/analytics/code.html:108-123`.
* `CROSS-LOCATION VARIANCE` visualizes location comparisons at `spec/ui/analytics/code.html:132`.
* `AI-POWERED INSIGHTS` produces narrative recommendations at `spec/ui/analytics/code.html:173-178`.
* `CLASSIFICATION TRENDS [24H]` visualizes daily behavior at `spec/ui/analytics/code.html:194`.

Interaction expectations:

* Switch compared locations.
* Refresh comparative charts.
* Toggle time range.
* Export reporting output.

Assessment against spec:

* Strong alignment with grouped comparisons and historical analysis at `spec/binsight-spec.md:96-105`.
* Metric labels partially diverge from the source-of-truth KPI vocabulary. `Correct bin placement` is close to first-try correct rate or compliance score, but it is not the same named KPI.
* The page lacks explicit filters for station, floor, building, location, and time range as required by the spec.
* The AI narrative is plausible as an inferred insight layer, but the spec frames such narratives as derived from comparisons rather than separate tracked KPIs at `spec/binsight-spec.md:87-94`.

### Devices artifact

Files:

* `spec/ui/devices/code.html`
* `spec/ui/devices/image.png`

Likely route: `/devices` or `/stations`. The current app structure suggests `/stations` because `apps/web/src/pages/stations.tsx` exists.

Purpose: browse station inventory and operational status.

Key visual sections and expectations:

* The hero states `24 CURRENT ACTIVE DEVICES` at `spec/ui/devices/code.html:73`.
* A global health line says `System Status: All Operational` at `spec/ui/devices/code.html:76`.
* Primary action is `REGISTER NEW DEVICE` at `spec/ui/devices/code.html:80`.
* Device filtering starts with `All Devices` at `spec/ui/devices/code.html:85`.
* Station cards expose a station id, online state, location, and `Details` action. Example lines include `Station WL-042`, `Active / Online`, and `Sector A-1: Main Hub` at `spec/ui/devices/code.html:99-106`.
* One card explicitly shows `Offline / Syncing` at `spec/ui/devices/code.html:195`.
* The grid ends with an `Add New Device` ghost card at `spec/ui/devices/code.html:209-214`.

Interaction expectations:

* Filter stations by category or state.
* Open station details.
* Register a new device.
* Open station settings.

Assessment against spec:

* Strong alignment with `view stations` and `view station status and metadata` at `spec/binsight-spec.md:97-98`.
* The current filter labels `Industrial`, `Monitoring`, and `Sensors` do not align with the product domain. The spec is station-centric, not generic IoT inventory.
* Device registration and settings are plausible admin features, but they are not explicit in the spec.

### Device details artifact

Files:

* `spec/ui/device details/code.html`
* `spec/ui/device details/image.png`

Likely route: `/devices/:stationId`, `/stations/:stationId`, or a live-monitoring route for a single station. The current app structure suggests a hybrid mapping to `apps/web/src/pages/station-detail.tsx` and `apps/web/src/pages/live-monitoring.tsx`.

Purpose: station-level operational detail, scan history, and diagnostic insight.

Key visual sections and expectations:

* The top controls include `Select Location` and `New Scan` at `spec/ui/device details/code.html:70-73`.
* `Device Map` appears as a live spatial module at `spec/ui/device details/code.html:112`.
* The map is labeled `Live Network Visualization` at `spec/ui/device details/code.html:129`.
* The main data table is `Recent Scans` at `spec/ui/device details/code.html:138`.
* Example scan rows include `Plastic Bottle (PET)` at `spec/ui/device details/code.html:161`.
* One scan uses `Manual Review` state at `spec/ui/device details/code.html:227`.
* A footer panel exposes `AI Summary` and `Improvements` at `spec/ui/device details/code.html:254-266`.
* A `Scan Analysis` modal with `Model Determination` and `Technical Breakdown` is defined at `spec/ui/device details/code.html:280-297`.

Interaction expectations:

* Filter or inspect recent station events.
* Open a modal for per-scan analysis.
* Trigger a new scan in a demo context.
* Read station recommendations and operational suggestions.

Assessment against spec:

* This is the closest Stitch page to the spec's station event history and live monitoring requirements.
* It aligns with event history and station detail requirements better than any other Stitch artifact.
* It does not explicitly expose the source-of-truth live monitoring fields: current session state, current detected item, current disposal decision, and latest real-time event at `spec/binsight-spec.md:107-112`.
* The `New Scan` action is operator-driven, which conflicts with the spec's always-running detection model at `spec/binsight-spec.md:20-23`.
* The scan table exposes classification and status, but not actual disposal zone, success or failure logic provenance, LLM fallback usage, or rules preset.

### Dashboard artifact

Files:

* `spec/ui/dashboard/code.html`
* `spec/ui/dashboard/image.png`

Likely route: intended to be `/dashboard`, but the artifact content does not support that interpretation.

Observed content:

* The file title is `BiNSIGHT | Vastum Generis` at `spec/ui/dashboard/code.html:6`.
* The file repeats the same marketing description as the landing page at `spec/ui/dashboard/code.html:174`.
* It repeats footer stats like `Active Nodes` at `spec/ui/dashboard/code.html:197`.

Assessment against spec:

* This artifact is a duplicate of the landing page rather than a dashboard.
* It does not represent the dashboard business features at `spec/binsight-spec.md:96-105`.
* It does not represent the live monitoring page at `spec/binsight-spec.md:107-112`.
* This is the single biggest Stitch-to-spec gap.

## Cross-artifact discrepancies

### Major discrepancies

* The `dashboard` Stitch artifact is incorrect or stale. It duplicates the landing page instead of a dashboard at `spec/ui/dashboard/code.html:6`, `spec/ui/dashboard/code.html:174`, and `spec/ui/dashboard/code.html:197`.
* The spec requires a dedicated live monitoring page with current session state, detected item, disposal decision, and latest event at `spec/binsight-spec.md:107-112`. No Stitch page cleanly models that exact surface.
* The `device details` page includes a manual `New Scan` trigger at `spec/ui/device details/code.html:73`, which conflicts with the always-on detection model at `spec/binsight-spec.md:20-23`.
* The source-of-truth event contract requires actual disposal zone, success or failure, confidence, and LLM fallback usage at `spec/binsight-spec.md:49-58`. The Stitch tables do not expose that full event record.
* The dashboard spec requires explicit filters by station, floor, building, location, and time range at `spec/binsight-spec.md:102`. The Stitch analytics page only exposes a comparison selector, not a full filter system.

### Medium discrepancies

* The analytics page uses KPI labels such as `Correct bin placement` and `Contamination rate` at `spec/ui/analytics/code.html:79-89`, while the spec defines first-try correct rate, compliance score, top contamination items, worst times of day, bin purity, and leaderboard at `spec/binsight-spec.md:70-85`.
* The devices page uses generic IoT categories such as `Industrial`, `Monitoring`, and `Sensors` at `spec/ui/devices/code.html:85-88`, which do not match the domain model in the spec.
* The landing page emphasizes brand and network posture more than the tabletop demo story described in the spec at `spec/binsight-spec.md:9-16`.

### Areas of good alignment

* The analytics artifact strongly supports comparison and trend analysis, which matches `group and compare stations or locations` and before or after analysis at `spec/binsight-spec.md:103-105`.
* The devices artifact supports station inventory and health review, which matches station browsing and station status at `spec/binsight-spec.md:97-98`.
* The device details artifact is directionally aligned with event history and station diagnostics, even though it is not yet a faithful live monitoring page.

## Recommended first pages to implement

The most concise first implementation set should prioritize source-of-truth product behavior over visual completeness.

* `Devices or Stations list` first. This is the clearest entry to the operational product, maps well to the Stitch `devices` artifact, and aligns with `view stations` plus `view station status and metadata`.
* `Station detail or Live monitoring` second. This should merge the strongest parts of `device details` with the spec's required live fields: session state, detected item, disposal decision, latest event, actual disposal zone, and confidence data.
* `Analytics overview` third. This should keep the Stitch comparison and trend layout direction, but rename and structure KPIs to match the spec.
* `Event history` fourth if separated from station detail. The current app already has `apps/web/src/pages/event-history.tsx`, and the spec clearly calls for disposal event history.
* `Login` only when authentication is needed for the demo environment.
* `Landing page` last. It is optional relative to the source-of-truth product scope.

If the team wants a strict minimum viable app for demo execution, the first three pages should be:

* Stations list
* Single-station live monitoring and detail page
* Analytics overview

## Route mapping notes

The current web app structure suggests these likely route alignments:

* `spec/ui/analytics` maps naturally to `apps/web/src/pages/analytics.tsx`
* `spec/ui/devices` maps naturally to `apps/web/src/pages/stations.tsx`
* `spec/ui/device details` is closest to a combination of `apps/web/src/pages/station-detail.tsx` and `apps/web/src/pages/live-monitoring.tsx`
* The spec's grouped comparison behavior likely maps to `apps/web/src/pages/comparisons.tsx`
* The spec's disposal event history likely maps to `apps/web/src/pages/event-history.tsx`

## Open questions

* Should the single-station page be split into two routes, one for station detail and one for live monitoring, or deliberately combined for demo simplicity?
* Should the app keep a public landing page at all, given that the spec focuses on the station and dashboard workflow rather than marketing?
* Should operator-triggered actions such as `New Scan` appear in the demo UI, or should they be removed to preserve the always-on station behavior described in the spec?
* Do the paired `image.png` screenshots contain visual details that differ materially from the `code.html` files, or are they faithful exports of the same concepts?

## Recommended next research

* Audit the current implementation in `apps/web/src/pages/*` against this Stitch-to-spec mapping, especially `live-monitoring.tsx`, `station-detail.tsx`, `stations.tsx`, and `analytics.tsx`
* Inspect shared contracts under `packages/contracts` to confirm the dashboard fields available for live status, event history, and analytics views
* Verify whether seeded demo data already supports the spec's required filters, comparisons, and historical intervention analysis
* Determine whether the product should present station detail and live monitoring as one surface or two separate routes

## Open questions

Research in progress.

## Recommended next research

* Inspect each Stitch `code.html` artifact and map it to likely application routes
* Cross-check UI artifacts against the spec's dashboard and live monitoring requirements
* Summarize implementation priorities for the first app slice