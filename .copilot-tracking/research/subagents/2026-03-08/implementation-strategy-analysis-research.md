---
title: Implementation Strategy Analysis Research
description: Research comparing implementation strategies for replacing the current web UI with Stitch-designed pages in the hackcanada workspace
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: reference
keywords:
  - stitch
  - frontend
  - routing
  - contracts
  - research
estimated_reading_time: 8
---

## Research Scope

* Evaluate implementation approaches for replacing the current apps/web UI with the Stitch-designed pages in spec/ui.
* Use spec/binsight-spec.md as the product source of truth.
* Use apps/web as the current frontend architecture baseline.
* Use services/backend-functions and packages/contracts as the backend and contract boundary baseline.
* Compare these alternatives:
  1. Full shell-and-route rewrite from Stitch pages.
  2. Keep existing routes and data loaders, then replace page bodies incrementally.
  3. Embed Stitch pages as static prototypes beside the current app.

## Status

* State: Complete
* Conclusion: Keep the existing route and data shell, then replace page bodies incrementally with React implementations of the Stitch screens.

## Current-State Evidence

### Product scope and source of truth

* The product spec defines the dashboard as an operator surface for station views, live monitoring, event history, analytics, filters, comparisons, and historical analysis. See spec/binsight-spec.md:96-112.
* The spec also fixes Firebase Firestore as the database and Firebase Cloud Functions as the website backend. See spec/binsight-spec.md:150-151.
* This means any UI replacement still needs to preserve operator workflows and the current backend data boundaries. A purely visual swap is not enough if it loses history, comparisons, or live monitoring.

### Current web architecture

* The current web package is explicitly a Vite-hosted React dashboard backed by Firebase Auth, Firebase callable functions, and Firestore live-status subscriptions. See apps/web/README.md:19.
* The package depends on React, Firebase, Vite, and shared workspace contracts, not Tailwind. See apps/web/package.json:12-21.
* The browser bootstrap mounts a single DashboardBrowserApplication and imports a handwritten dashboard.css shell. See apps/web/src/main.tsx:8-9 and apps/web/src/main.tsx:54.
* The app uses a custom route table rather than React Router. The current route definitions are stations, station detail, live monitoring, event history, analytics, and comparisons. See apps/web/src/app/router.tsx:15-65.
* The layout contract is stable and narrow: one header, one sidebar nav, and one main content region. See apps/web/src/app/layout.tsx:15-46 and apps/web/src/app/dashboard.css:1-82.

### Current auth, navigation, and data flow

* Operator auth is enforced in the browser shell, not as a distinct route file. The signed-out experience is rendered by DashboardLoginState inside the provider shell. See apps/web/src/app/providers.tsx:167-208 and apps/web/src/app/providers.tsx:324-343.
* Firebase auth state controls whether the app renders the login view or constructs the live and callable dependencies. See apps/web/src/app/providers.tsx:220-270.
* The provider shell creates the callable API gateway and the live-status client from the authenticated session. See apps/web/src/app/providers.tsx:228-242.
* Client-side navigation is handled by manual history interception for links and GET forms. See apps/web/src/app/providers.tsx:314-404.
* Route-level filters are encoded in the query string and normalized through shared query helpers. See apps/web/src/lib/query/dashboard-query.ts:123-224.

### Current page composition

* Each current page is a thin composition layer over the shared provider interfaces.
* Stations loads station directory data and filters visible stations. See apps/web/src/pages/stations.tsx:14-20.
* Station detail derives one station and a nearby comparison set from the shared directory. See apps/web/src/pages/station-detail.tsx:14-32.
* Live monitoring derives station context from the directory and subscribes to live updates through the live provider. See apps/web/src/pages/live-monitoring.tsx:38-54 and apps/web/src/pages/live-monitoring.tsx:68-116.
* Event history, analytics, and comparisons all combine directory filters with backend requests rather than querying Firestore directly in page bodies. See apps/web/src/pages/event-history.tsx:14-25, apps/web/src/pages/analytics.tsx:14-27, and apps/web/src/pages/comparisons.tsx:12-24.

### Backend and contract boundaries

* The frontend talks to three callable functions only: getAnalyticsSummary, getEventHistory, and getStationDirectory. See apps/web/src/lib/api/dashboard-api.ts:9-38.
* The gateway layer translates UI filters into canonical EventHistoryQuery and AnalyticsQuery requests and derives comparison scenarios from the same filter state. See apps/web/src/lib/api/dashboard-gateway.ts:74-121 and apps/web/src/lib/query/dashboard-query.ts:180-286.
* Shared contracts define the shapes the UI is already built around: LiveStationStatus, StationRecord, AnalyticsQuery, AnalyticsSummary, EventHistoryQuery, EventHistoryResponse, and StationDirectoryResponse. See packages/contracts/src/index.ts:67-98, packages/contracts/src/index.ts:128-129, packages/contracts/src/index.ts:159-225, and packages/contracts/src/index.ts:228-279.
* Backend callable handlers all enforce operator auth before returning directory, history, or analytics data. See services/backend-functions/src/functions/get-station-directory.ts:13-16, services/backend-functions/src/functions/get-event-history.ts:14-18, and services/backend-functions/src/functions/get-analytics-summary.ts:13-18.
* The query service already materializes the station directory, event history, analytics summary, and live-status collection path expected by the current app. See services/backend-functions/src/analytics/query-service.ts:33-35, services/backend-functions/src/analytics/query-service.ts:118-197, services/backend-functions/src/analytics/query-service.ts:199-226, and services/backend-functions/src/analytics/query-service.ts:228-257.

### Stitch page inventory and mismatches

* Stitch provides six static HTML exports: landing page, login, devices, device details, analytics, and dashboard. See spec/ui/landing page/code.html, spec/ui/login/code.html, spec/ui/devices/code.html, spec/ui/device details/code.html, spec/ui/analytics/code.html, and spec/ui/dashboard/code.html.
* Every Stitch page is static HTML that pulls Tailwind from the CDN and relies on Google-hosted fonts or symbols. See spec/ui/devices/code.html:6-11, spec/ui/analytics/code.html:7-12, spec/ui/login/code.html:7-12, spec/ui/landing page/code.html:7-8, and spec/ui/dashboard/code.html:7-8.
* The devices screen maps most closely to the current station directory route because it centers on a device grid and CTA-heavy station list. See spec/ui/devices/code.html:55-85 and apps/web/src/pages/stations.tsx:14-33.
* The analytics screen maps partly to analytics and partly to comparisons because it contains both KPI overview and location comparison tooling. See spec/ui/analytics/code.html:68-143 and apps/web/src/pages/analytics.tsx:14-46 plus apps/web/src/pages/comparisons.tsx:12-41.
* The current app has dedicated history and comparisons routes, but Stitch does not provide standalone history or comparisons pages. See apps/web/src/app/router.tsx:38-62.
* The current app has a dedicated live-monitoring route, but Stitch does not provide a standalone live-monitoring page. The closest concept is likely folded into device details. See apps/web/src/app/router.tsx:28-36 and apps/web/src/pages/live-monitoring.tsx:38-116.
* The Stitch login page is a natural visual replacement for the current signed-out shell state, but not necessarily for a new route, because the current app does not model login as its own route. See spec/ui/login/code.html:77-99 and apps/web/src/app/providers.tsx:167-208.
* The Stitch dashboard export appears to duplicate the landing-page hero treatment rather than the operator dashboard information architecture. The same WERD hero and System Login CTA appear in both files. See spec/ui/dashboard/code.html:167-182 and spec/ui/landing page/code.html:167-182.
* The Stitch nav uses Dashboard, Analytics, Devices, and Settings, while the product spec and current app require Stations or Devices, Live view, History, Analytics, and Comparisons. See spec/ui/devices/code.html:55-57, spec/ui/analytics/code.html:47-49, apps/web/src/app/router.tsx:15-62, and spec/binsight-spec.md:96-112.

## Alternatives To Evaluate

### 1. Full shell-and-route rewrite from Stitch pages

Principles:

* Replace the current provider shell, layout, navigation model, and page structure with a new Stitch-first route map.
* Treat Stitch exports as the primary information architecture, then re-thread auth and data flows into that new structure.

Advantages:

* Produces the cleanest visual reset.
* Allows the team to fully align the app chrome with the Stitch style system from the top level down.
* Avoids carrying forward the current sidebar and CSS shell if the team wants a completely different navigation model.

Limitations:

* Stitch does not cover the full current product surface. There is no standalone history page, no standalone comparisons page, and no standalone live-monitoring page even though those are required by the spec and implemented today.
* The Stitch dashboard export is currently closer to a landing page than an operator dashboard, so a shell rewrite would still require major reinterpretation work.
* The current login flow is embedded in the provider shell, so a full rewrite has to rebuild auth gating, session bootstrap, history interception, and loader orchestration before any visual parity is achieved.
* Raw Stitch HTML depends on Tailwind CDN and remote fonts, which does not match the current Vite package setup.

Alignment with repo conventions:

* Weak alignment. The repo currently uses React components, shared workspace contracts, and local CSS. A full Stitch-first rewrite pushes toward static prototype HTML and a new styling pipeline.

Impact on routing, data, auth, and contracts:

* High routing churn because the current route table would need a new map and likely new page splits or merged pages.
* High auth risk because the sign-in state, callable gateway creation, and live-session bootstrap currently live in DashboardBrowserApplication.
* High data risk because page loaders are already thin and useful; replacing them means re-implementing working backend contracts rather than reusing them.
* High contract risk if the new shell starts designing around fields that the Stitch prototypes imply but the contracts do not provide.

Risks:

* High schedule risk.
* High regression risk across auth, query-string filters, history behavior, and live monitoring.
* High ambiguity risk because the Stitch exports do not cover the same route taxonomy as the product spec.

### 2. Keep existing routes and data loaders and replace page bodies incrementally

Principles:

* Preserve the existing provider shell, route table, query model, auth flow, and backend contract layer.
* Replace current page bodies and shared feature components with React implementations inspired by the Stitch screens.
* Split or adapt Stitch screens where needed to fit the existing product routes.

Advantages:

* Best reuse of working code. The current routes already match the product spec better than the Stitch exports do.
* The loader and provider boundaries are narrow, so most of the redesign can happen inside page and feature components.
* Keeps Firebase Auth, callable functions, live Firestore subscriptions, and query-string filters intact.
* Lets the team map the Stitch devices page to stations, the Stitch analytics page to analytics and comparisons, and the Stitch login page to the signed-out shell without breaking backend contracts.
* Supports phased delivery. One route can be redesigned at a time while the rest of the operator flow remains usable.

Limitations:

* Some Stitch screens need reinterpretation rather than direct conversion. The current route model has history and comparisons, while Stitch does not.
* The current sidebar shell may need substantial redesign work if the desired final navigation is top-nav driven.
* A Tailwind decision still remains. The team must either add Tailwind properly to the build or translate Stitch classes into local React styling.

Alignment with repo conventions:

* Strong alignment. This keeps the schema-first contract boundary, the current Vite React package, and the existing Firebase integration model.
* It also aligns with the present app structure, where each page is a thin composition layer over provider-backed data.

Impact on routing, data, auth, and contracts:

* Low routing risk because existing paths remain stable.
* Low auth risk because DashboardBrowserApplication and DashboardLoginState remain the gatekeepers.
* Low contract risk because loaders and gateway functions continue to request StationDirectoryResponse, EventHistoryResponse, AnalyticsSummary, and LiveStationStatus.
* Moderate design adaptation work because one Stitch screen may need to feed multiple routes.

Risks:

* Moderate implementation risk if the team tries to copy static HTML verbatim instead of converting it into reusable React components.
* Moderate design drift risk if there is no explicit mapping from Stitch screens to existing routes.
* Manageable styling risk if Tailwind is introduced without agreeing whether it becomes a repo convention or only a migration aid.

### 3. Embed Stitch pages as static prototypes beside the current app

Principles:

* Keep the current operator app intact and expose Stitch exports as adjacent static pages for demos, stakeholder review, or design validation.
* Do not immediately connect those pages to the real auth, routing, or backend boundaries.

Advantages:

* Lowest engineering risk in the short term.
* Useful for visual review and stakeholder sign-off before committing to component-level conversion.
* Preserves the working dashboard completely while the team decides on navigation, route mapping, and styling strategy.

Limitations:

* Does not replace the current UI in a product sense.
* Produces two parallel surfaces that will drift quickly.
* Does not solve auth, contract, or routing integration.
* Conflicts with the request to replace the current app UI rather than merely showcase prototypes.

Alignment with repo conventions:

* Partial alignment at best. It can live as documentation or preview assets, but not as the real operator experience.

Impact on routing, data, auth, and contracts:

* Minimal immediate impact, because the current app remains untouched.
* Minimal product value, because the new static pages do not exercise the real backend or operator workflows.

Risks:

* High product risk if stakeholders mistake static prototypes for implementation-ready UI.
* High maintenance risk because every later integration step becomes a second implementation effort.
* High scope drift risk because prototype nav and real nav can diverge unnoticed.

## Recommendation

Select alternative 2: keep the existing routes and data loaders, then replace page bodies incrementally.

Rationale:

* The current route map already aligns with the product spec better than the Stitch exports do. The spec requires live monitoring, event history, and comparisons, and those routes already exist in apps/web/src/app/router.tsx:15-171 while Stitch does not provide a full one-to-one screen set.
* The current provider shell encapsulates the hardest integration work: Firebase Auth state, operator session bootstrap, callable API construction, live Firestore subscriptions, and browser history behavior. Replacing that shell would create avoidable regression risk. See apps/web/src/app/providers.tsx:220-270 and apps/web/src/app/providers.tsx:314-415.
* The page modules are already thin. Most of the UI replacement can happen below the loader layer by rebuilding feature components and page markup while keeping the contracts and provider interfaces stable. See apps/web/src/pages/stations.tsx:14-33, apps/web/src/pages/event-history.tsx:14-44, apps/web/src/pages/analytics.tsx:14-46, apps/web/src/pages/comparisons.tsx:12-41, and apps/web/src/pages/live-monitoring.tsx:38-116.
* The backend and contract model is already coherent and guarded by operator auth. Preserving those seams is the safest way to avoid frontend-backend drift. See apps/web/src/lib/api/dashboard-api.ts:9-38, packages/contracts/src/index.ts:159-279, and services/backend-functions/src/functions/get-analytics-summary.ts:13-18.
* The Stitch exports are valuable as visual references, but they are not ready to drop in directly because they are static HTML, Tailwind CDN dependent, and route-incomplete. See spec/ui/devices/code.html:6-11, spec/ui/analytics/code.html:7-12, spec/ui/login/code.html:7-12, and apps/web/package.json:12-21.

Recommended implementation sequence:

1. Keep DashboardBrowserApplication, the existing route table, and the query helper layer unchanged initially.
2. Replace the signed-out DashboardLoginState with a React version of the Stitch login screen.
3. Replace the stations route body with a Stitch-inspired devices grid mapped onto StationDirectoryResponse.
4. Split the Stitch analytics concepts across analytics and comparisons rather than forcing both into one route.
5. Decide whether station detail and live monitoring remain separate routes or become a coordinated two-panel design using the current route pair.
6. Standardize the styling migration path before broad implementation. Either add Tailwind as a build dependency intentionally or translate Stitch tokens into local React CSS.

## Unresolved Decisions

* Decide whether a public landing page belongs inside apps/web or should live as a separate surface. The current package scope describes an operator dashboard, not a marketing site. See apps/web/README.md:5-19.
* Decide whether to keep the current split between station detail and live monitoring or merge them visually while preserving the two routes for deep linking.
* Decide whether to add a real settings route. Stitch shows Settings in nav, but the current route table and product spec do not make it part of the required operator scope.
* Decide whether Tailwind becomes an official build dependency for apps/web or whether the Stitch designs should be translated into the existing local styling approach.
* Decide how event history should be visually redesigned, because Stitch does not currently provide a dedicated history screen even though the product spec requires it.