---
title: UI Source of Truth Audit Research
description: Audit of Stitch mockups under spec/ui against the current apps/web shell and routes, with route mapping recommendations when spec/ui is treated as the primary authority for the web redesign
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: reference
keywords:
  - binsight
  - stitch
  - ui
  - routes
  - audit
estimated_reading_time: 7
---

## Research Scope

This audit treats `spec/ui` as the effective source of truth for the web UI redesign, per the user's explicit override for this research task.

Research questions covered:

* What exact page set and primary navigation are implied by the Stitch mockups?
* Which parts of the current `apps/web` shell and route structure can preserve those mockups closely?
* Where do the mockups conflict with the current app routes or older spec-driven assumptions?
* What route and page mapping is most defensible if the mockups, not `spec/binsight-spec.md`, drive the redesign?

## Artifacts Reviewed

UI mockups reviewed under `spec/ui`:

* `spec/ui/landing page/code.html`
* `spec/ui/login/code.html`
* `spec/ui/dashboard/code.html`
* `spec/ui/devices/code.html`
* `spec/ui/device details/code.html`
* `spec/ui/analytics/code.html`

Current web implementation reviewed under `apps/web`:

* `apps/web/src/app/router.tsx`
* `apps/web/src/app/layout.tsx`
* `apps/web/src/app/providers.tsx`
* `apps/web/src/app/types.ts`
* `apps/web/src/pages/stations.tsx`
* `apps/web/src/pages/station-detail.tsx`
* `apps/web/src/pages/live-monitoring.tsx`
* `apps/web/src/pages/event-history.tsx`
* `apps/web/src/pages/analytics.tsx`
* `apps/web/src/pages/comparisons.tsx`
* `apps/web/src/features/stations/station-directory.tsx`
* `apps/web/src/features/live/live-station-panel.tsx`

Reference spec sections reviewed for prior structure assumptions:

* `spec/binsight-spec.md` dashboard business features
* `spec/binsight-spec.md` live monitoring page requirements

## Key Findings

### Mockup-defined page set

The concrete page surfaces present in `spec/ui` are:

* Public landing page
* Login page
* Analytics overview page
* Devices directory page
* Device details page

Additional navigation intent is implied but not fully designed:

* `Dashboard` appears in authenticated top navigation
* `Settings` appears in most authenticated top navigation
* `System` appears in the landing-page navigation instead of `Settings`

Two important findings change the route interpretation materially:

* `spec/ui/dashboard/code.html` is effectively a duplicate of `spec/ui/landing page/code.html`, including the same hero, system-login CTA, and footer metrics. It does not provide a distinct authenticated dashboard design.
* There is no dedicated Stitch mockup for event history, comparisons as a standalone page, live monitoring as a standalone page, or settings.

### Navigation model implied by the mockups

The mockups imply two different shells rather than one global shell:

* Public shell: landing page with simple top navigation and a prominent `System Login` CTA
* Authenticated shell: top header, compact brand block, notifications/avatar actions, top navigation, and footer

The authenticated primary navigation shown repeatedly is:

* Dashboard
* Analytics
* Devices
* Settings

The landing page differs slightly:

* Dashboard
* Analytics
* Devices
* System

That difference looks like naming inconsistency inside the mockup exports, not a well-defined separate information architecture.

### What the current app can preserve closely

The current app already has several implementation seams that can preserve the mockups closely without throwing away the working product logic:

* Firebase-auth-driven signed-out flow in `apps/web/src/app/providers.tsx`
* Route matching and per-page loader model in `apps/web/src/app/router.tsx`
* Existing analytics, history, comparison, station-directory, and live-status data seams
* Existing station detail and live monitoring loaders, which already separate metadata and realtime data concerns
* Existing filter/query model, which can continue to power analytics and hidden deep-link routes

The parts that do not preserve Stitch closely and should not be treated as stable are:

* The current sidebar dashboard shell in `apps/web/src/app/layout.tsx`
* The current route labels and top-level navigation taxonomy
* The assumption that the authenticated app must start at `/stations`

### Where the current app structure conflicts with the mockups

#### Entry flow conflict

Current app behavior is dashboard-first after auth and defaults to `/stations`.

Mockup authority implies:

* public landing page first
* dedicated login page second
* authenticated product area after login

If `spec/ui` is the authority, the redesign should expose at least `/` and `/login` as first-class routes or route-like entry states.

#### Navigation taxonomy conflict

Current primary navigation in `apps/web/src/app/router.tsx` is:

* Stations
* Live view
* History
* Analytics
* Comparisons

Mockup navigation is:

* Dashboard
* Analytics
* Devices
* Settings or System

This is not a cosmetic mismatch. It changes the visible product information architecture.

#### Page set conflict

The current app exposes dedicated top-level pages for:

* station directory
* live monitoring
* event history
* analytics
* comparisons

The mockups support dedicated pages only for:

* landing
* login
* analytics
* devices
* device details

Standalone event history, comparisons, and live monitoring are current-product constructs, not mockup-defined primary pages.

#### Comparison-page conflict

The current app treats comparisons as its own route and nav item.

The Stitch analytics page already contains:

* comparison tool controls
* cross-location variance section
* AI-powered insights

If the mockups are primary, comparisons should be absorbed into analytics rather than remain a top-level destination.

#### Live monitoring conflict

The current spec-driven structure has a dedicated live monitoring route and page.

The mockups do not show a separate live-monitoring destination. Instead, the device-details mockup includes overview-style monitoring content such as:

* device map
* recent scans
* scan analysis modal
* improvement recommendations

That is closer to an integrated device dashboard/detail page than a separate `/live` destination.

#### Event history conflict

The current app has a full `/history` route and page. The mockups do not define a dedicated recent-scans or event-history page outside the device-details composition.

This means event history is still useful product functionality, but it is not part of the primary Stitch page set.

#### Dashboard ambiguity

The mockups imply a `Dashboard` nav item, but the actual `dashboard` export does not provide a unique dashboard layout. The best available evidence is contradictory:

* the folder name suggests a dashboard page should exist
* the exported HTML duplicates the public landing page
* the `device details` page is the only interior mockup with dashboard-like density and overview content

This is the single biggest unresolved ambiguity in the Stitch set.

## Exact Page and Navigation Audit

### Page inventory from mockups

| Mockup folder | Concrete page? | Intended audience | Notes |
| --- | --- | --- | --- |
| `landing page` | Yes | Public | Distinct public marketing or product-intro surface |
| `login` | Yes | Signed-out | Distinct auth page |
| `dashboard` | Ambiguous | Unclear | Export duplicates landing page instead of showing an authenticated dashboard |
| `analytics` | Yes | Authenticated | Strong, self-contained page |
| `devices` | Yes | Authenticated | Strong, self-contained page |
| `device details` | Yes | Authenticated | Strong, self-contained page, but behaves more like an overview-plus-detail dashboard than a narrow metadata page |

### Primary navigation implied by repeated mockup evidence

Recommended interpretation of the repeated navigation evidence:

* Public nav: `Dashboard`, `Analytics`, `Devices`, `System`
* Authenticated nav: `Dashboard`, `Analytics`, `Devices`, `Settings`

Recommended normalized navigation model:

* Dashboard
* Analytics
* Devices

Optional fourth item only with explicit approval:

* Settings

Reason:

* `Settings/System` has repeated label evidence but no actual page mockup
* exposing it as first-class navigation without a design source would still require product invention

## Preservation Assessment Against Current App

### High-confidence preservation candidates

These current structures can stay and still support a mockup-first redesign:

* The provider lifecycle in `apps/web/src/app/providers.tsx`
* Firebase auth gating and signed-out handling in `apps/web/src/app/providers.tsx`
* Page-specific data loaders in `apps/web/src/app/router.tsx`
* Station directory data seams behind the current stations page
* Station detail metadata loader in `apps/web/src/pages/station-detail.tsx`
* Realtime live-status subscription machinery in `apps/web/src/pages/live-monitoring.tsx` and `apps/web/src/features/live/live-station-panel.tsx`
* Analytics and comparison back-end seams already used by `apps/web/src/pages/analytics.tsx` and `apps/web/src/pages/comparisons.tsx`
* Event-history back-end seam in `apps/web/src/pages/event-history.tsx`

### Low-confidence preservation candidates

These should be preserved only as implementation details, not as user-visible architecture:

* Current route names `stations`, `event-history`, and `comparisons`
* Current left-sidebar shell and route list
* Current default path `/stations`
* Current decision to surface live monitoring as a primary navigation item

## Recommended Route and Page Mapping

If the UI mockups are the primary design authority, the most defensible route map is:

| Recommended route | Primary mockup authority | Use current implementation from | Recommendation |
| --- | --- | --- | --- |
| `/` | `landing page` | New public shell using existing app bootstrapping only where needed | Make this the public landing page |
| `/login` | `login` | Signed-out auth state in `apps/web/src/app/providers.tsx` | Promote to a first-class auth route or equivalent route-state |
| `/dashboard` | Ambiguous, closest fit is `device details` overview sections | Compose from existing station/live/history seams | Create a new authenticated overview page only if needed; do not reuse the duplicate `dashboard` export blindly |
| `/analytics` | `analytics` | `apps/web/src/pages/analytics.tsx` plus comparison data seam | Keep as a top-level page |
| `/devices` | `devices` | `apps/web/src/pages/stations.tsx` and `apps/web/src/features/stations/station-directory.tsx` | Rename or remap station directory to devices |
| `/devices/:deviceId` | `device details` | `apps/web/src/pages/station-detail.tsx` plus selected live/history content | Treat as the main device drill-down page |

### Secondary or hidden routes

These routes still have technical value, but the mockups do not support them as primary navigation:

| Current capability | Recommended route treatment | Why |
| --- | --- | --- |
| live monitoring | Keep as `/devices/:deviceId/live` or convert to a detail subview without top-nav exposure | Current realtime feature exists, but Stitch does not define it as a primary destination |
| event history | Keep as `/history` deep link or fold into device detail and analytics entry points | Useful functionality, not part of the mockup-defined nav |
| comparisons | Redirect `/comparisons` to `/analytics` or retain as a legacy alias only | Stitch places comparison tooling inside analytics |
| old station routes | Redirect `/stations` to `/devices` and `/stations/:stationId` to `/devices/:deviceId` | Keeps compatibility while aligning visible IA to the mockups |

## Recommended IA Decision

If the team wants the closest possible alignment to `spec/ui`, use this visible primary navigation:

* Dashboard
* Analytics
* Devices

Use this only after explicit design confirmation:

* Settings

Do not surface these as primary navigation when following the mockups strictly:

* History
* Comparisons
* Live view
* Stations

## Conflicts With Prior Spec-Driven Structure

The older spec-driven/current-implementation structure assumed these first-class product surfaces:

* stations directory
* station detail
* dedicated live monitoring page
* event history page
* analytics page
* comparisons page

That structure is still coherent against `spec/binsight-spec.md`, especially for dashboard business features and the live monitoring page requirements. It is not the same as the Stitch-first route model.

The clearest conflicts are:

* `spec/binsight-spec.md` explicitly supports a dedicated live monitoring page, while the mockups do not
* `spec/binsight-spec.md` supports dedicated historical and comparison analysis flows, while the mockups consolidate comparison inside analytics and omit a standalone history page
* current planning artifacts assumed the route map could stay stable; that assumption is weakened if `spec/ui` becomes the primary UI authority instead of a styling reference

## Executive Recommendation

Treat `spec/ui` as defining the visible page hierarchy and visual shell, but not as a complete feature map.

Best-fit approach:

* Make `landing page`, `login`, `analytics`, `devices`, and `device details` the visible first-class page set
* Rename the current station-oriented IA to device-oriented IA in the visible routing layer
* Demote live monitoring, event history, and comparisons from primary navigation to secondary routes, tabs, deep links, or internal utility pages
* Replace the current sidebar shell with the mockup-style top header and footer
* Do not trust `spec/ui/dashboard` as a real dashboard source until design confirms whether that duplicate export is intentional

## Clarifying Questions Requiring Human Input

* Is `spec/ui/dashboard/code.html` intentionally the same as the landing page, or was the wrong Stitch export saved under `dashboard`?
* Should `Settings` or `System` exist as a real page, or is that label only decorative in the current mockups?
* If `spec/ui` is authoritative, should the existing dedicated history and live-monitoring routes remain accessible as secondary pages, or should they be folded into dashboard and device-detail compositions?
* Does the product want `/dashboard` to exist as a first-class route even though the mockup set does not contain a distinct authenticated dashboard design?

## Recommended Next Research

* Verify whether the dashboard export duplication is a Stitch-export mistake or an intentional placeholder
* Decide whether to expose `Settings/System` in navigation before implementation work locks the header
* Audit whether current device detail should absorb enough live/history content to retire `/history` from primary navigation
* Confirm whether backward-compatible redirects from `/stations` to `/devices` are required for demos or bookmarks

## Status

Complete.