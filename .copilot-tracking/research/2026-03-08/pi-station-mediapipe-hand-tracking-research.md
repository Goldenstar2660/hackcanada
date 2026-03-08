<!-- markdownlint-disable-file -->
---
title: Pi Station MediaPipe Hand Tracking Research
description: Consolidated research for replacing Pi-station ESP-gated hand detection with MediaPipe Hands
author: GitHub Copilot
ms.date: 2026-03-08
ms.topic: reference
keywords:
  - mediapipe
  - raspberry pi
  - esp8266
  - hand tracking
  - binsight
estimated_reading_time: 7
---

## Scope

This research covers the Pi-station runtime change requested in this session:

* replace ESP-gated hand presence detection with MediaPipe Hands
* remove ESP presence telemetry from disposal detection logic
* keep ESP limited to LED guidance, reset, and health status
* update dependencies, tests, and Pi runtime documentation accordingly

## Source of truth alignment

The project spec at `spec/binsight-spec.md` defines disposal detection this way:

* the station continuously tracks hand zone: left, middle, right
* the station continuously checks whether a hand is present
* a drop event occurs when a hand was present and then disappears
* the actual disposal zone is the most recent tracked hand zone before disappearance

This requested change aligns with the spec because the spec does not require ESP ownership of hand presence. It requires reliable hand presence plus zone tracking inside the Pi-owned control loop.

## Current implementation summary

The current runtime is split correctly at the session layer but incorrectly at the sensor layer.

* `devices/pi-station/src/binsight_station/session.py` already owns the correct business rule. `track_hand()` only emits a result on a present-to-absent transition and uses the last known hand zone.
* `devices/pi-station/src/binsight_station/main.py` defines a hand-tracking abstraction, but `_consume_hand_tracking()` still feeds it `self.esp_client.last_presence.hand_present`.
* `CameraBackedHandTracker` uses the camera only to classify the hand zone while ESP remains the authoritative presence source.
* `DeterministicHandTracker` and the realtime simulation reflect the same contract, with ESP presence acting as the trigger.
* `devices/pi-station/src/binsight_station/live_demo.py` already demonstrates that the session logic itself does not need ESP presence because it drives hand presence directly through `track_hand_and_publish()`.

## Recommended architecture

The cleanest implementation is:

* keep `session.py` unchanged as the business-logic source of truth
* keep `esp_client.py` for guidance, reset, acknowledgements, and health
* replace the existing hand-tracking contract with a camera-owned observation provider that determines both `hand_present` and `zone`
* update the runtime so hand tracking is polled whenever the station is in `WAITING_FOR_DISPOSAL`, regardless of whether any ESP presence frame arrived
* keep the existing manual hand-tracking entry points used by the live demo and direct tests

## MediaPipe recommendation

Use upstream `mediapipe` rather than another TFLite model for hand presence.

Rationale:

* it directly matches the user request to use MediaPipe Hands
* it provides both hand presence and landmark geometry in one runtime path
* the landmarks provide enough information to derive the disposal zone from image-space x position without a separate zone-classification model
* it removes the need to combine two different camera inference paths for the same hand-tracking behavior

## Packaging findings

MediaPipe is feasible in the current Windows development environment using Python 3.11.

For Raspberry Pi 5, upstream packaging is the main delivery risk:

* latest `mediapipe` wheels are straightforward on Windows
* recent PyPI releases do not consistently ship Linux `aarch64` wheels
* `mediapipe==0.10.14` is the newest verified release from this research that still shipped Linux `aarch64` wheels
* if that version is insufficient on the target Pi, the fallback plan is an official source-built ARM wheel rather than an unofficial package

## Practical implementation choice for this repo

A full streaming-camera refactor would be larger than necessary for this task. The minimal viable change is:

* keep the existing `ImageSourceProvider` seam
* let the MediaPipe tracker capture still images through the existing provider during disposal tracking
* run MediaPipe over those frames to determine presence and zone
* debounce disappearance across a small number of absent frames to avoid false drop events

This is not the final performance-optimal design, but it is a direct, testable way to remove ESP dependence from disposal detection without expanding scope beyond the current repo architecture.

## Risks

* repeated still-image capture is less efficient than a streaming camera path
* a single missed detection can create false drops without disappearance debouncing
* zone mapping depends on stable camera framing and currently uses coarse left, middle, right bands
* Pi deployment may require a specific MediaPipe pin on Linux `aarch64`

## Test impact

Tests should change in these ways:

* preserve the existing session-state tests because they already encode correct business logic
* rewrite runtime tests so disposal tracking no longer depends on queued ESP presence frames
* keep coverage proving ESP still receives guidance and reset commands
* add unit coverage for MediaPipe tracker behavior using fake detector results, including stable presence, sustained absence, and zone updates

## Selected approach

Implement a new MediaPipe-backed hand tracker that owns both presence and zone from camera frames, wire the runtime to poll it during `WAITING_FOR_DISPOSAL`, pin MediaPipe for Linux `aarch64` compatibility, and update tests and docs to reflect that ESP no longer participates in disposal detection.