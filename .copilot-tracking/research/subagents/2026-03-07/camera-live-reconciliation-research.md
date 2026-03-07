---
title: Camera Live Reconciliation Research
description: Repository research on live camera support, camera publication paths, Pi operator preview options, and real-time behavior of the live monitoring page.
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - camera
  - live monitoring
  - raspberry pi
  - firestore
  - research
estimated_reading_time: 10
---

## Task Research: Camera Live Reconciliation

Investigate the current implementation and affected files for four topics:

* Website live camera feed support and where it is surfaced
* Any Pi-to-backend or Pi-to-web camera feed publication path
* Developer-only local camera preview options on the Pi that would work over a Windows SSH session
* The live monitoring page's real-time subscription behavior

## Task Implementation Requests

* Read the current repository state only.
* Reconcile current implementation behavior against the source-of-truth spec.
* Record exact affected file paths.
* Recommend one implementation direction.
* Record unresolved questions that need product or engineering decisions.

## Scope and Success Criteria

* Scope: Repository research in `/home/handwash/Projects/hackcanada` plus limited external camera-tooling research where the repository has no implemented preview workflow.
* Assumptions:
  * `/home/handwash/Projects/hackcanada/spec/binsight-spec.md` is authoritative.
  * Absence from discovered code is treated as not currently implemented.
  * Backend seams and contracts count as partial implementation, not end-to-end completion.
* Success Criteria:
  * Each of the four requested topics is answered with evidence.
  * Exact affected file paths are recorded.
  * The implementation gap between spec intent and current code is explicit.

## Research Executed

### File Analysis

* Web live-monitoring route, layout, page loader, and live panel rendering
* Web Firestore live-status and live-monitoring gateway code
* Pi station runtime, live-status model, publication seam, README, and package manifest
* Backend ingest handlers, Firestore repository behavior, storage helpers, and shared contracts
* Source-of-truth spec and existing repository research conventions

### Code Search Results

* Camera frame support exists in backend and dashboard-facing contracts.
* A dedicated backend `ingest-camera-frame` handler exists.
* The Pi runtime does not contain a caller for camera-frame ingestion.
* The web live page renders a camera panel but does not keep a long-lived subscription active after first load.

### External Research

The Raspberry Pi camera documentation confirms the following points that matter for a Windows-over-SSH developer preview:

* Standard `rpicam` preview rendering does not support X forwarding by default.
* `qt-preview` can support X forwarding, but it is explicitly heavier.
* `rpicam-vid` supports TCP, UDP, RTSP, and MPEG-TS style network streaming suitable for a remote laptop viewer.
* Raspberry Pi documentation recommends libav-backed transport streams for better downstream player compatibility.

External reference used:

* <https://www.raspberrypi.com/documentation/computers/camera_software.html>

### Project Conventions

* Standards referenced: source-of-truth.instructions.md, markdown.instructions.md, writing-style.instructions.md
* Spec rule applied: the spec says camera preview is developer-only and opens on the operator laptop when Pi code is run over SSH.

## Key Findings

### 1. Website live camera feed support exists and is surfaced in multiple places

The website already contains an operator-facing live camera frame concept, not merely a placeholder field in shared contracts.

Affected file paths:

* `/home/handwash/Projects/hackcanada/apps/web/src/app/router.tsx`
* `/home/handwash/Projects/hackcanada/apps/web/src/app/layout.tsx`
* `/home/handwash/Projects/hackcanada/apps/web/src/pages/station-detail.tsx`
* `/home/handwash/Projects/hackcanada/apps/web/src/pages/live-monitoring.tsx`
* `/home/handwash/Projects/hackcanada/apps/web/src/features/live/live-station-panel.tsx`
* `/home/handwash/Projects/hackcanada/apps/web/src/lib/firebase/live-monitoring.ts`
* `/home/handwash/Projects/hackcanada/apps/web/src/lib/firebase/live-status.ts`

Observed behavior:

* The route `/stations/:stationId/live` is defined as a first-class dashboard page in `/home/handwash/Projects/hackcanada/apps/web/src/app/router.tsx`.
* The route is marked `showInNavigation: true` in `/home/handwash/Projects/hackcanada/apps/web/src/app/router.tsx`, and `/home/handwash/Projects/hackcanada/apps/web/src/app/layout.tsx` renders `route.path` directly into the sidebar. That means the generic sidebar includes a parameterized live link rather than a station-resolved link.
* The station-detail page exposes a station-specific entry point through the `Open live monitoring` link in `/home/handwash/Projects/hackcanada/apps/web/src/pages/station-detail.tsx`.
* The live page loads a `snapshot` and passes it to the live panel in `/home/handwash/Projects/hackcanada/apps/web/src/pages/live-monitoring.tsx`.
* The live panel renders both spec-aligned live fields and a camera frame card in `/home/handwash/Projects/hackcanada/apps/web/src/features/live/live-station-panel.tsx`:
  * session state
  * detected item
  * disposal decision
  * latest event
  * current camera frame image or feed-status placeholder
* The camera image is derived from `status.cameraFeed.storageObjectPath` through a `CameraFrameResolver` in `/home/handwash/Projects/hackcanada/apps/web/src/lib/firebase/live-monitoring.ts`.
* Live-status access is intended to be operator-restricted by claim checks in `/home/handwash/Projects/hackcanada/apps/web/src/lib/firebase/live-status.ts`.

Reconciliation to the spec:

* This is broader than the spec. The spec's live monitoring page requires device status, session state, detected item, disposal decision, and latest event.
* The spec also says camera preview is developer-only and opens on the operator laptop over SSH, not that it is a normal dashboard feature.
* Current website code therefore already exposes a product-facing camera concept that the spec does not clearly authorize.

### 2. A backend camera publication path exists, but the Pi runtime does not currently drive it

There is a clear intended backend path for latest-frame publication, but no end-to-end Pi implementation reaches it.

Affected file paths:

* `/home/handwash/Projects/hackcanada/services/backend-functions/src/functions/ingest-camera-frame.ts`
* `/home/handwash/Projects/hackcanada/services/backend-functions/src/functions/ingest-live-status.ts`
* `/home/handwash/Projects/hackcanada/services/backend-functions/src/runtime/firebase-runtime.ts`
* `/home/handwash/Projects/hackcanada/services/backend-functions/src/storage/latest-frame-storage.ts`
* `/home/handwash/Projects/hackcanada/services/backend-functions/src/storage/firebase-storage.ts`
* `/home/handwash/Projects/hackcanada/services/backend-functions/src/firestore/repositories/types.ts`
* `/home/handwash/Projects/hackcanada/services/backend-functions/src/firestore/repositories/firestore.ts`
* `/home/handwash/Projects/hackcanada/packages/contracts/src/index.ts`
* `/home/handwash/Projects/hackcanada/packages/contracts/schemas/domain/live-station-status.schema.json`
* `/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/main.py`
* `/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/live_status.py`
* `/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/publishers.py`
* `/home/handwash/Projects/hackcanada/devices/pi-station/README.md`
* `/home/handwash/Projects/hackcanada/devices/pi-station/pyproject.toml`

Observed intended backend path:

* `/home/handwash/Projects/hackcanada/services/backend-functions/src/functions/ingest-camera-frame.ts` accepts `station_id`, `captured_at`, `frame_data_base64`, and optional camera-feed flags.
* That handler stores the latest frame and patches the live-status document with camera metadata.
* `/home/handwash/Projects/hackcanada/services/backend-functions/src/storage/latest-frame-storage.ts` defines the latest-frame object path as `stations/{stationId}/camera/latest.jpg`.
* `/home/handwash/Projects/hackcanada/services/backend-functions/src/firestore/repositories/firestore.ts` merges camera-feed metadata into the station live-status document through `patchCameraFeed`.
* `/home/handwash/Projects/hackcanada/packages/contracts/src/index.ts` and `/home/handwash/Projects/hackcanada/packages/contracts/schemas/domain/live-station-status.schema.json` both model `cameraFeed` and `cameraFeedActive` as part of canonical live status.

Observed Pi-side reality:

* `/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/main.py` uses `image_source="camera://placeholder"` and never captures a real frame.
* `/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/live_status.py` supports an optional `camera_feed` object in `LiveStatusPublisher.build_status`, but the runtime never passes one.
* `/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/main.py` publishes live status through `_publish_runtime_status`, but only with state-machine data and device health.
* `/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/publishers.py` is still a thin no-op seam with in-memory history. It does not perform authenticated HTTP calls to backend ingestion endpoints.
* `/home/handwash/Projects/hackcanada/devices/pi-station/README.md` explicitly says hardware integration, Firebase credentials, and model execution remain follow-on work.
* `/home/handwash/Projects/hackcanada/devices/pi-station/pyproject.toml` has no camera runtime dependency such as Picamera2, OpenCV, or a streaming helper.

Conclusion:

* There is currently no implemented Pi-to-backend camera publication path.
* There is currently no implemented Pi-to-web direct publication path.
* The only coherent architecture present in code is the intended path:
  * Pi captures frame
  * Pi posts frame to backend `ingestCameraFrame`
  * Backend stores latest frame and patches Firestore live status
  * Web resolves storage object path and renders image
* That path is only partially implemented today because the Pi side is missing.

### 3. No repository-implemented Pi preview workflow exists, but there are viable developer-only options for Windows SSH

The repository does not currently implement a local preview workflow on the Pi. The spec requires a developer-only preview that opens on the operator laptop over SSH, so this area is still open design work.

Affected file paths:

* `/home/handwash/Projects/hackcanada/spec/binsight-spec.md`
* `/home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/main.py`
* `/home/handwash/Projects/hackcanada/devices/pi-station/README.md`
* `/home/handwash/Projects/hackcanada/devices/pi-station/pyproject.toml`

Repository evidence:

* The only repository statement about operator preview is in `/home/handwash/Projects/hackcanada/spec/binsight-spec.md`: camera preview is developer-only and opens on the operator laptop when Pi code is run over SSH.
* There is no camera preview code in the Pi runtime.
* There is no Pi README guidance for preview.
* There are no declared Python dependencies that suggest a current preview implementation.

Viable preview options that fit a Windows SSH workflow:

* Preferred option: Pi-hosted TCP or MPEG-TS stream with local Windows viewer.
  * Use `rpicam-vid` on the Pi with `-n` and libav-backed MPEG-TS or TCP streaming.
  * Connect from the Windows laptop with VLC or ffplay, optionally using SSH port forwarding.
  * This is headless-friendly and does not depend on X forwarding.
* Secondary option: Pi-hosted local browser stream via MediaMTX or go2rtc.
  * This gives a browser-friendly developer preview and can still be reached over forwarded ports from Windows.
  * It is operationally heavier than a raw viewer path.
* Tertiary option: Qt preview with X forwarding.
  * Raspberry Pi documentation says `qt-preview` supports X forwarding.
  * It is explicitly heavier and is the least attractive fit for a headless station workflow.

Why the preferred option fits the current repository best:

* It matches the spec's developer-only wording.
* It keeps preview out of the product dashboard.
* It does not require the Pi runtime to expose a public web server just to help developers.
* It can coexist with a separate backend latest-frame uploader used only for operator diagnostics if the product later decides to keep dashboard camera support.

### 4. The live monitoring page is not currently real-time after initial load

The live monitoring code contains subscription primitives, but the page itself behaves like a one-shot snapshot render.

Affected file paths:

* `/home/handwash/Projects/hackcanada/apps/web/src/pages/live-monitoring.tsx`
* `/home/handwash/Projects/hackcanada/apps/web/src/features/live/live-station-panel.tsx`
* `/home/handwash/Projects/hackcanada/apps/web/src/lib/firebase/live-monitoring.ts`
* `/home/handwash/Projects/hackcanada/apps/web/src/lib/firebase/live-status.ts`
* `/home/handwash/Projects/hackcanada/apps/web/src/app/providers.tsx`
* `/home/handwash/Projects/hackcanada/apps/web/src/index.ts`

Observed behavior:

* `/home/handwash/Projects/hackcanada/apps/web/src/pages/live-monitoring.tsx` loads one initial snapshot during page load.
* `/home/handwash/Projects/hackcanada/apps/web/src/lib/firebase/live-monitoring.ts` implements two distinct behaviors:
  * `loadInitialSnapshot`, which subscribes temporarily until the first document value or timeout, then unsubscribes
  * `subscribeToStation`, which would support a long-lived real-time stream
* The page and panel only consume the preloaded `snapshot`. They do not call `subscribeToStation`.
* `/home/handwash/Projects/hackcanada/apps/web/src/app/providers.tsx` renders the dashboard in an application-style render function and does not establish client-side reactive state for the live page.
* A repository search across `apps/web/src` did not find `useEffect`, `useState`, `hydrate`, or any equivalent client-side lifecycle that would keep the live page listening after initial render.

Practical implication:

* The current live page is not a persistent real-time monitor.
* It presents one Firestore-derived snapshot captured at render time.
* Any subsequent station state or camera frame updates require a re-render or page reload to appear.

## Recommended Implementation Direction

The cleanest direction is to pick one of two product positions and then implement the stack consistently.

Recommended position:

* Treat the spec as authoritative and keep camera preview developer-only.
* Keep the website live-monitoring page focused on spec-required operational state: device health, session state, detected item, disposal decision, and latest event.
* Implement a separate Pi-side developer preview workflow over SSH, with the simplest option being `rpicam-vid` network streaming to a Windows viewer.
* Still implement Pi-to-backend latest-frame publication only if the team explicitly decides that operator-facing dashboard camera frames are desirable enough to amend the spec.

Concrete implementation sequence if the team follows the spec literally:

1. Build the Pi-side developer preview as a non-product debug path.
2. Keep live monitoring real-time by wiring the page to `subscribeToStation` in the web layer.
3. Leave dashboard camera rendering out of the operator product unless the spec is updated.

Concrete implementation sequence if the team decides to keep dashboard camera support:

1. Add a real Pi camera capture service and authenticated backend publisher in the Pi runtime.
2. Send latest-frame uploads to `ingestCameraFrame` and keep `cameraFeed` metadata updated in live status.
3. Make the live page truly real-time by subscribing after initial load.
4. Update the spec to explicitly allow operator-facing dashboard camera frames instead of developer-only preview.

Why this direction is recommended:

* It resolves the biggest current contradiction: the spec says developer-only preview, while the website already exposes a product-facing camera frame.
* It avoids building two overlapping camera experiences without a product decision.
* It uses the strongest existing architectural seam in the repository: Firestore live status for operator data, Pi-local tooling for device-side operations.

## Unresolved Questions

* Should dashboard camera frames remain in scope, or should camera preview stay strictly developer-only as the spec currently states?
* If dashboard camera support stays, is one latest still frame enough, or does the team want an actual motion stream?
* If developer preview is the only intended camera surface, should the existing website camera card be removed or hidden behind an operator-debug feature flag?
* For Windows SSH usage, is manual opening of VLC or a browser acceptable, or does “opens on the operator laptop” imply an automated launcher workflow?
* Should the real-time live page use direct Firestore subscriptions in the browser, or should the team move live reads behind backend APIs for consistency with the rest of the dashboard?
* Is the parameterized `Live view` sidebar link intended to stay visible globally, or should live navigation only be reachable from a station-resolved detail page?

## Final Assessment

Research status: Complete.

The repository currently contains a partial camera-live architecture, not an end-to-end implementation. The web app already renders an operator-facing latest-frame card and the backend already supports authenticated latest-frame ingestion and Firestore metadata updates. The Pi runtime, however, does not capture frames, does not publish camera data, and does not yet perform authenticated backend writes. Separately, the live monitoring page is only initial-snapshot based and is not truly real-time after load. The main design decision still unresolved is whether camera visibility belongs in the product dashboard at all, because that conflicts with the current source-of-truth spec.