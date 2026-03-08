---
title: BinSight Spec Requirements Research
description: Authoritative requirements extracted from the BinSight product spec for runtime behavior, perception, gating, demo behavior, seeded data, and explicit constraints
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - spec
  - requirements
  - runtime behavior
  - demo constraints
estimated_reading_time: 6
---

## Research scope

This document extracts the authoritative required behavior from [spec/binsight-spec.md](../../../../spec/binsight-spec.md).

Research topics:

* Runtime behavior and session flow
* Perception and detection model requirements
* Gating logic and confidence fallback behavior
* Demo behavior and disposal assumptions
* Item handling and configurable business rules
* Power and person-detection assumptions
* Seeded and fake data expectations
* Explicit non-goals and constraints

## Status

Complete.

## Findings

### Runtime behavior and session flow

The product-level runtime promise is fixed by the spec: the station must identify an item before disposal, guide the user to the right bin, detect where the item was actually dropped, and report sorting quality plus station insights. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L3-L7).

The required session flow is explicit and ordered:

1. The station starts in low-power mode. A session begins only after an ultrasonic sensor detects a nearby person. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L20-L23).
2. During identification, the camera captures the item in hand, the system classifies the item type, then maps that item to a disposal method using the active local rules preset. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L25-L30).
3. During guidance, the corresponding recycle, compost, or garbage LED turns on, the LCD shows the item and disposal method, and the session waits for disposal. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L32-L35).
4. During disposal detection, the system continuously tracks hand zone and hand presence. A drop event occurs when a hand that was present disappears. The actual disposal zone is the last tracked hand zone before disappearance. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L37-L41).
5. Correctness is determined by comparing the classified disposal method against the detected drop zone. Match means success. Mismatch means failure. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L43-L47).

### Perception and detection model requirements

The spec requires two perception outputs during a session:

* Item classification from the camera image of the item in hand. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L25-L30).
* Hand-zone tracking plus hand-presence tracking for disposal detection. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L37-L41).

The item-classification path has a required fallback gate:

* The primary model produces a confidence value.
* If confidence is below a configurable threshold, the image is sent to an LLM fallback classifier.
* The final required output remains item type plus correct disposal method.

See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L25-L30) and [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L122-L128).

The technical notes constrain implementation:

* The Raspberry Pi runs offline on-device inference.
* The LLM is fallback only, not the default path.

See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L147-L149).

The spec does not require production-grade physical verification. Actual-bin detection is explicitly approximate and demo-grade, and drop detection is inferred rather than physically verified. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L130-L134) and [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L136-L140).

### Gating logic and correctness logic

The authoritative gates and state transitions are:

* Person-presence gate: no session starts until the ultrasonic sensor detects a nearby person. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L20-L23).
* Confidence gate: low-confidence item predictions must escalate to LLM fallback using a configurable threshold. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L25-L30) and [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L122-L128).
* Drop-event gate: disposal is recognized only when hand presence changes from present to absent. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L37-L41).
* Success gate: success is true only when classified disposal method equals detected drop zone. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L43-L47).

Each completed disposal attempt must emit an event with a fixed minimum payload:

* `station id`
* `timestamp`
* `predicted item`
* `correct disposal method`
* `actual disposal zone`
* `success / failure`
* `model confidence`
* `whether LLM fallback was used`

See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L49-L58).

### Demo behavior and item handling

The demo scope is deliberately constrained:

* One tabletop station
* One camera view
* Exactly three disposal zones: left, middle, right
* Those three zones represent recycle, compost, and garbage
* Poster LEDs provide disposal guidance
* LCD provides live feedback and a station counter
* The dashboard shows station insights

See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L9-L16).

The spec makes several demo-grade assumptions that directly affect runtime behavior:

* Disposal zones are visual placeholders, not physical bins.
* Drop detection is inferred from hand disappearance.
* Actual-bin detection is approximate and demo-grade.

See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L130-L133).

Item handling is rules-driven rather than hard-coded:

* The supported item set is configurable.
* Item-to-disposal mapping is configurable.
* The active local rules preset determines disposal mapping.
* The item set may expand later without changing the core business flow.

See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L25-L30), [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L122-L128), and [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L130-L134).

### Power and person-detection assumptions

The explicit power and presence assumptions are narrow:

* The station waits in low-power mode before a session starts.
* Nearby-person detection is performed by the ultrasonic sensor.

See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L20-L23) and [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L142-L145).

The spec does not define any required wake timeout, sleep re-entry timeout, debounce rules, multi-person behavior, or person-tracking beyond the initial ultrasonic trigger.

### Dashboard, live monitoring, and seeded data expectations

The station counter and tracked metrics are explicit requirements, not optional analytics:

* The LCD station counter shows cumulative station activity.
* Default LCD content includes the correct bin to use during an ongoing session and total correct sorts.

See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L60-L65).

The dashboard must directly track and display these metrics:

* Total attempts
* Total correct sorts
* First-try correct rate
* Participation or compliance score
* Top contamination items
* Worst times of day
* Bin purity by hour or day
* Floor or building leaderboard

See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L67-L85).

The dashboard must also support historical comparison and analysis by station, floor, building, location, time range, signage variant, and layout variant. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L96-L105).

The live monitoring page must show device status, current session state, current detected item, current disposal decision, and the latest event in real time. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L107-L112).

The seeded or fake-data expectations are explicit for presentation behavior:

* Historical disposal events must be seedable across multiple stations, floors, and time periods.
* Known environmental changes such as signage updates, campaign dates, and layout variants must be seedable.
* Seeded data must visibly show before-and-after compliance changes over time.
* Seeded data must show confusion-item and contamination-item trends improving after interventions.
* Seeded data must represent different performance levels by location, time of day, and station.
* Seeded records must be marked as demo data for presentation and filtering.

See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L114-L120).

### Explicit constraints and non-goals

The spec explicitly excludes several behaviors from v1:

* Production-grade physical bin verification
* Fully automatic bin opening
* Multi-camera verification
* Full national rule coverage at launch

See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L136-L140).

The technical deployment constraints are also explicit:

* Two hardware units are part of the architecture: ESP8266 for poster LEDs and ultrasonic sensing, and Raspberry Pi 5 for camera and LCD.
* ESP8266 and Pi communicate over Wi-Fi.
* Pi sends event and live-status data to Firebase.
* Camera preview is developer-only and appears on the operator laptop when Pi code runs over SSH.

See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L142-L154).

## Ambiguities

The spec is authoritative on flow and scope, but several implementation-critical details are intentionally unspecified:

* No session-end behavior is defined. The spec says when a session starts and how disposal is detected, but it does not define timeout, cancellation, reset, or re-arming behavior after disposal.
* No hand-tracking method is specified. The spec requires continuous hand-zone and hand-presence tracking, but it does not define the model, sensor source, sampling rate, or smoothing rules.
* No confidence semantics are defined. The low-confidence threshold is configurable, but the spec does not define the score range, calibration expectations, or whether primary and fallback confidence are comparable.
* No conflict-resolution rule is defined for uncertain zone tracking. The spec says the actual zone is the most recent tracked hand zone before disappearance, but it does not specify behavior when the zone is unknown, flickering, or absent near drop time.
* No supported-item baseline is listed. The item set is configurable, but the spec does not state the initial required items for the demo.
* No explicit seeded live-data requirement exists. The spec clearly requires seeded historical demo data, but it does not say whether live monitoring should support synthetic or replayed live sessions.
* No power-management details are defined. Low-power mode is required, but wake latency, hardware sleep mode, and return-to-idle rules are unspecified.
* No station-counter reset semantics are defined. The spec says the LCD shows cumulative activity and total correct sorts, but it does not define reset scope, persistence, or boot behavior.

## Key takeaways

The spec defines a strict demo runtime loop: presence trigger, item classification, rules-based disposal guidance, hand-disappearance drop inference, correctness evaluation, and event emission. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L20-L58).

The perception system is hybrid by requirement: on-device Pi inference is primary, and an LLM is only a low-confidence fallback behind a configurable threshold. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L25-L30), [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L122-L128), and [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L147-L149).

Actual disposal verification is intentionally demo-grade. The station does not need physical bin verification or multi-camera certainty in v1. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L130-L140).

Seeded demo data is not incidental. It must support presentation-ready historical analysis, visible intervention effects, and filtering of demo records. See [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L114-L120).

## Recommended next research

* Trace the implemented runtime state machine in the Pi station code and compare each transition against [spec/binsight-spec.md](../../../../spec/binsight-spec.md#L20-L58).
* Identify the current item-classification and hand-tracking pipelines in the Pi code to see how the unspecified perception details were concretized.
* Verify where the configurable rules preset, item mapping, zone mapping, and low-confidence threshold are stored and loaded at runtime.
* Inspect how event payloads, live status payloads, and demo-data markers are represented in shared contracts and Firebase schemas.
* Review the dashboard and backend code to confirm that every required tracked metric and comparison capability exists or is stubbed consistently with the spec.
* Check whether the current demo uses seeded historical data only, replayed live data, or both, since the spec only explicitly mandates seeded historical records.