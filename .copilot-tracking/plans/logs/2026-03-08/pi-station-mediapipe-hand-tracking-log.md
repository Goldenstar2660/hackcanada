<!-- markdownlint-disable-file -->
---
title: Pi Station MediaPipe Hand Tracking Planning Log
description: Planning decisions and discrepancy tracking for the Pi-station MediaPipe migration
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: reference
keywords:
  - planning log
  - mediapipe
  - pi station
estimated_reading_time: 4
---

## Discrepancy log

### Unaddressed research items

* None after validation.

### Plan deviations from research

* None after validation.

## Implementation paths considered

Selected approach:

* Integrate MediaPipe Hands through the existing image-source seam and remove ESP presence from runtime disposal logic.

Rationale:

* It satisfies the user request directly.
* It aligns with the product spec by keeping disposal logic on the Pi.
* It minimizes scope by preserving session logic, live-demo flow, and ESP guidance behavior.

Alternatives considered:

* Keep ESP for presence and use MediaPipe only for zone selection.
  Rejected because it preserves the coupling the user asked to remove.
* Replace the current camera seam with a full streaming-camera pipeline in the same task.
  Rejected because it adds broader performance and device-integration work beyond the minimal architecture change needed.

## Suggested follow-on work

* Measure hand-tracking cadence and CPU usage on the target Pi 5.
* Consider replacing still-image capture with a streaming frame provider if runtime responsiveness needs improvement.
* Add a Pi hardware smoke test for MediaPipe installation and live frame processing.