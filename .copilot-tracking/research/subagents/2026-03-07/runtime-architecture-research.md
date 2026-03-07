---
title: Runtime Architecture Research
description: Research findings on the best runtime architecture for the Binsight Raspberry Pi station process
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - binsight
  - runtime architecture
  - finite state machine
  - raspberry pi
  - debounce
estimated_reading_time: 8
---

## Research Scope

Status: Complete

Topics under review:

* Best-fit runtime shape for the Pi station: finite state machine, procedural loop, or asynchronous event pipeline
* Lifecycle modeling from idle through disposal event emission and reset
* Confidence-threshold fallback, hand-zone/drop detection, and session timeout mechanisms
* Trade-offs across viable alternatives
* Repository and external evidence supporting the recommendation

## Verified Repository Findings

The spec requires a reactive, session-oriented control loop rather than a one-shot batch flow.

* The source of truth defines low-power idle, ultrasonic-triggered session start, camera identification, low-confidence fallback, disposal waiting, drop detection by hand disappearance, and per-attempt event creation [spec/binsight-spec.md:21](../../../../spec/binsight-spec.md#L21) [spec/binsight-spec.md:22](../../../../spec/binsight-spec.md#L22) [spec/binsight-spec.md:26](../../../../spec/binsight-spec.md#L26) [spec/binsight-spec.md:27](../../../../spec/binsight-spec.md#L27) [spec/binsight-spec.md:29](../../../../spec/binsight-spec.md#L29) [spec/binsight-spec.md:35](../../../../spec/binsight-spec.md#L35) [spec/binsight-spec.md:38](../../../../spec/binsight-spec.md#L38) [spec/binsight-spec.md:39](../../../../spec/binsight-spec.md#L39) [spec/binsight-spec.md:40](../../../../spec/binsight-spec.md#L40) [spec/binsight-spec.md:41](../../../../spec/binsight-spec.md#L41) [spec/binsight-spec.md:50](../../../../spec/binsight-spec.md#L50)
* The spec also fixes an edge-first classification posture: on-device inference on the Pi, with LLM fallback only [spec/binsight-spec.md:140](../../../../spec/binsight-spec.md#L140) [spec/binsight-spec.md:141](../../../../spec/binsight-spec.md#L141)

The current Pi runtime already leans toward an explicit state model.

* The Pi README says the Pi owns the live control loop and should keep Firebase and ESP interactions behind seams [devices/pi-station/README.md:10](../../../../devices/pi-station/README.md#L10) [devices/pi-station/README.md:15](../../../../devices/pi-station/README.md#L15) [devices/pi-station/README.md:16](../../../../devices/pi-station/README.md#L16) [devices/pi-station/README.md:59](../../../../devices/pi-station/README.md#L59)
* The current session module already models explicit phases: `IDLE`, `DETECTING`, `WAITING_FOR_DISPOSAL`, and `COMPLETE` [devices/pi-station/src/binsight_station/session.py:7](../../../../devices/pi-station/src/binsight_station/session.py#L7) [devices/pi-station/src/binsight_station/session.py:8](../../../../devices/pi-station/src/binsight_station/session.py#L8) [devices/pi-station/src/binsight_station/session.py:9](../../../../devices/pi-station/src/binsight_station/session.py#L9) [devices/pi-station/src/binsight_station/session.py:11](../../../../devices/pi-station/src/binsight_station/session.py#L11) [devices/pi-station/src/binsight_station/session.py:12](../../../../devices/pi-station/src/binsight_station/session.py#L12)
* The current drop-detection rule already follows the spec’s core heuristic: when the previous snapshot had `hand_present=True` and the next sample is absent, the runtime records the latest hand zone as the actual disposal zone [devices/pi-station/src/binsight_station/session.py:56](../../../../devices/pi-station/src/binsight_station/session.py#L56) [devices/pi-station/src/binsight_station/session.py:58](../../../../devices/pi-station/src/binsight_station/session.py#L58)
* The runtime orchestrator is synchronous and imperative today: it begins detection, calls classification, sends ESP guidance, then simulates disposal observation and event creation [devices/pi-station/src/binsight_station/main.py:43](../../../../devices/pi-station/src/binsight_station/main.py#L43) [devices/pi-station/src/binsight_station/main.py:44](../../../../devices/pi-station/src/binsight_station/main.py#L44) [devices/pi-station/src/binsight_station/main.py:48](../../../../devices/pi-station/src/binsight_station/main.py#L48) [devices/pi-station/src/binsight_station/main.py:49](../../../../devices/pi-station/src/binsight_station/main.py#L49) [devices/pi-station/src/binsight_station/main.py:50](../../../../devices/pi-station/src/binsight_station/main.py#L50) [devices/pi-station/src/binsight_station/main.py:63](../../../../devices/pi-station/src/binsight_station/main.py#L63) [devices/pi-station/src/binsight_station/main.py:71](../../../../devices/pi-station/src/binsight_station/main.py#L71) [devices/pi-station/src/binsight_station/main.py:77](../../../../devices/pi-station/src/binsight_station/main.py#L77) [devices/pi-station/src/binsight_station/main.py:78](../../../../devices/pi-station/src/binsight_station/main.py#L78) [devices/pi-station/src/binsight_station/main.py:81](../../../../devices/pi-station/src/binsight_station/main.py#L81)
* The classification path already exposes the configurable low-confidence threshold and fallback switch [devices/pi-station/src/binsight_station/main.py:20](../../../../devices/pi-station/src/binsight_station/main.py#L20) [devices/pi-station/src/binsight_station/main.py:32](../../../../devices/pi-station/src/binsight_station/main.py#L32) [devices/pi-station/src/binsight_station/main.py:53](../../../../devices/pi-station/src/binsight_station/main.py#L53) [devices/pi-station/src/binsight_station/classification.py:20](../../../../devices/pi-station/src/binsight_station/classification.py#L20) [devices/pi-station/src/binsight_station/classification.py:25](../../../../devices/pi-station/src/binsight_station/classification.py#L25) [devices/pi-station/src/binsight_station/classification.py:27](../../../../devices/pi-station/src/binsight_station/classification.py#L27)
* Event creation already matches the spec’s required payload fields and derives success by comparing the classified disposal method with the method mapped from the actual zone [devices/pi-station/src/binsight_station/events.py:11](../../../../devices/pi-station/src/binsight_station/events.py#L11) [devices/pi-station/src/binsight_station/events.py:12](../../../../devices/pi-station/src/binsight_station/events.py#L12) [devices/pi-station/src/binsight_station/events.py:13](../../../../devices/pi-station/src/binsight_station/events.py#L13) [devices/pi-station/src/binsight_station/events.py:14](../../../../devices/pi-station/src/binsight_station/events.py#L14) [devices/pi-station/src/binsight_station/events.py:15](../../../../devices/pi-station/src/binsight_station/events.py#L15) [devices/pi-station/src/binsight_station/events.py:16](../../../../devices/pi-station/src/binsight_station/events.py#L16) [devices/pi-station/src/binsight_station/events.py:17](../../../../devices/pi-station/src/binsight_station/events.py#L17) [devices/pi-station/src/binsight_station/events.py:18](../../../../devices/pi-station/src/binsight_station/events.py#L18) [devices/pi-station/src/binsight_station/events.py:19](../../../../devices/pi-station/src/binsight_station/events.py#L19) [devices/pi-station/src/binsight_station/events.py:35](../../../../devices/pi-station/src/binsight_station/events.py#L35) [devices/pi-station/src/binsight_station/events.py:45](../../../../devices/pi-station/src/binsight_station/events.py#L45)
* Rule mapping is explicit and local, which supports a stateful runtime that can resolve guidance immediately after classification [devices/pi-station/src/binsight_station/rules.py:7](../../../../devices/pi-station/src/binsight_station/rules.py#L7) [devices/pi-station/src/binsight_station/rules.py:12](../../../../devices/pi-station/src/binsight_station/rules.py#L12) [devices/pi-station/src/binsight_station/rules.py:15](../../../../devices/pi-station/src/binsight_station/rules.py#L15) [devices/pi-station/src/binsight_station/rules.py:28](../../../../devices/pi-station/src/binsight_station/rules.py#L28) [devices/pi-station/src/binsight_station/rules.py:29](../../../../devices/pi-station/src/binsight_station/rules.py#L29) [devices/pi-station/src/binsight_station/rules.py:30](../../../../devices/pi-station/src/binsight_station/rules.py#L30) [devices/pi-station/src/binsight_station/rules.py:31](../../../../devices/pi-station/src/binsight_station/rules.py#L31)
* Live status is already a projection of session phase plus current item and disposal method, which fits a state-machine core [devices/pi-station/src/binsight_station/live_status.py:9](../../../../devices/pi-station/src/binsight_station/live_status.py#L9) [devices/pi-station/src/binsight_station/live_status.py:11](../../../../devices/pi-station/src/binsight_station/live_status.py#L11) [devices/pi-station/src/binsight_station/live_status.py:12](../../../../devices/pi-station/src/binsight_station/live_status.py#L12) [devices/pi-station/src/binsight_station/live_status.py:13](../../../../devices/pi-station/src/binsight_station/live_status.py#L13) [devices/pi-station/src/binsight_station/live_status.py:19](../../../../devices/pi-station/src/binsight_station/live_status.py#L19) [devices/pi-station/src/binsight_station/live_status.py:22](../../../../devices/pi-station/src/binsight_station/live_status.py#L22)
* The test suite already encodes stateful expectations: start moves to `WAITING_FOR_DISPOSAL`, hand disappearance records a drop, original guidance is preserved through disposal, and wrong-zone drops produce `success=False` [devices/pi-station/tests/test_smoke.py:23](../../../../devices/pi-station/tests/test_smoke.py#L23) [devices/pi-station/tests/test_smoke.py:28](../../../../devices/pi-station/tests/test_smoke.py#L28) [devices/pi-station/tests/test_smoke.py:33](../../../../devices/pi-station/tests/test_smoke.py#L33) [devices/pi-station/tests/test_smoke.py:42](../../../../devices/pi-station/tests/test_smoke.py#L42) [devices/pi-station/tests/test_smoke.py:45](../../../../devices/pi-station/tests/test_smoke.py#L45) [devices/pi-station/tests/test_smoke.py:61](../../../../devices/pi-station/tests/test_smoke.py#L61) [devices/pi-station/tests/test_smoke.py:71](../../../../devices/pi-station/tests/test_smoke.py#L71) [devices/pi-station/tests/test_smoke.py:83](../../../../devices/pi-station/tests/test_smoke.py#L83)
* The current Python package is intentionally small and not organized around an async framework yet [devices/pi-station/pyproject.toml:6](../../../../devices/pi-station/pyproject.toml#L6) [devices/pi-station/pyproject.toml:7](../../../../devices/pi-station/pyproject.toml#L7) [devices/pi-station/pyproject.toml:8](../../../../devices/pi-station/pyproject.toml#L8) [devices/pi-station/pyproject.toml:16](../../../../devices/pi-station/pyproject.toml#L16) [devices/pi-station/pyproject.toml:17](../../../../devices/pi-station/pyproject.toml#L17)

## External Technical References

The external guidance below supports the runtime recommendation.

* Barr Group argues that reactive systems should make state explicit because event handling depends on both the event and the current context. It also notes that state-machine implementations need an execution context plus event dispatching, and for non-trivial cases, event queueing and timing services. That maps directly to Binsight’s context-dependent disposal flow and timeout needs. Source: [Barr Group, State Machines for Event-Driven Systems](https://barrgroup.com/blog/state-machines-event-driven-systems)
* The Python documentation says `asyncio` is for concurrent I/O and high-level structured network code. It also documents structured task groups, cancellation, and `asyncio.timeout()` and `wait_for()` for bounded waits. This supports using async only at I/O seams if needed, not as the primary domain model for the station’s business logic. Sources: [Python docs, asyncio](https://docs.python.org/3/library/asyncio.html) and [Python docs, Coroutines and Tasks](https://docs.python.org/3/library/asyncio-task.html)
* Jack Ganssle’s debounce measurements show that real-world physical signals are noisy and variable, and he explicitly warns against simplistic sampling assumptions. That supports adding stability windows around presence and drop detection rather than reacting to a single sample transition. Source: [Jack Ganssle, A Guide to Debouncing](https://www.ganssle.com/debouncing.htm)
* Adafruit’s debouncer guidance makes the same practical point for embedded Python systems: physical devices bounce, code can see the false transitions, and the safer abstraction is debounced press and release events instead of raw instantaneous state changes. Source: [Adafruit, Python Debouncer Library for Buttons and Sensors](https://learn.adafruit.com/debouncer-library-python-circuitpython-buttons-sensors)

## Question 1

The best fit is an explicit finite state machine as the core runtime, driven by typed events and timers, with thin adapter code around sensors, camera inference, ESP communication, LCD updates, and cloud publishing.

Why this fits the spec and repo:

* The spec is explicitly phase-based and context-sensitive. The meaning of a sensor update depends on whether the station is idle, identifying, or waiting for disposal [spec/binsight-spec.md:21](../../../../spec/binsight-spec.md#L21) [spec/binsight-spec.md:29](../../../../spec/binsight-spec.md#L29) [spec/binsight-spec.md:35](../../../../spec/binsight-spec.md#L35) [spec/binsight-spec.md:40](../../../../spec/binsight-spec.md#L40)
* The current code already has a state machine object and tests that rely on phase transitions and stateful drop detection [devices/pi-station/src/binsight_station/session.py:7](../../../../devices/pi-station/src/binsight_station/session.py#L7) [devices/pi-station/src/binsight_station/session.py:35](../../../../devices/pi-station/src/binsight_station/session.py#L35) [devices/pi-station/src/binsight_station/session.py:39](../../../../devices/pi-station/src/binsight_station/session.py#L39) [devices/pi-station/src/binsight_station/session.py:56](../../../../devices/pi-station/src/binsight_station/session.py#L56) [devices/pi-station/tests/test_smoke.py:33](../../../../devices/pi-station/tests/test_smoke.py#L33)
* The Pi README places ownership of the live control loop on the Pi itself and wants hardware and cloud interactions kept behind seams, which matches an FSM core with adapters [devices/pi-station/README.md:10](../../../../devices/pi-station/README.md#L10) [devices/pi-station/README.md:15](../../../../devices/pi-station/README.md#L15) [devices/pi-station/README.md:16](../../../../devices/pi-station/README.md#L16)

The best interpretation is not a monolithic `while True` loop and not a full async event pipeline. It is a hybrid architecture: explicit FSM for domain behavior, plus event-driven adapters at the edges.

## Question 2

The lifecycle should be modeled as the following state sequence.

| State | Entry condition | Main work | Exit condition |
| --- | --- | --- | --- |
| `IDLE` | Boot complete or reset complete | Low-power wait, clear guidance, publish idle live status | Stable presence detected |
| `PRESENCE_ARMING` | Presence signal begins | Debounce presence sensor and optionally warm camera | Presence confirmed or canceled |
| `IDENTIFYING` | Presence confirmed | Capture image, run local classifier, evaluate threshold, invoke fallback if required, resolve rules | Classification result resolved |
| `GUIDING` | Classification resolved | Send LED and LCD guidance and publish live status | Guidance command acknowledged or immediately after command dispatch |
| `WAITING_FOR_DISPOSAL` | Guidance active | Track debounced hand presence and latest stable zone | Stable hand disappearance after prior stable presence, or inactivity timeout |
| `EMIT_RESULT` | Disposal zone inferred | Create disposal event, update counters, publish latest event and live status | Event publication attempt finishes |
| `RESETTING` | Event emitted or timeout or abort | Clear session fields, turn off guidance, short cooldown | Cooldown expires |
| `IDLE` | Reset complete | Ready for next user | Stable presence detected |

Notes on fit with the current repo:

* The current implementation already contains the beginnings of this lifecycle, but `DETECTING` is too coarse and `WAITING_FOR_DISPOSAL` currently compresses guidance activation and disposal tracking into one step [devices/pi-station/src/binsight_station/session.py:9](../../../../devices/pi-station/src/binsight_station/session.py#L9) [devices/pi-station/src/binsight_station/session.py:11](../../../../devices/pi-station/src/binsight_station/session.py#L11)
* The spec’s flow from presence to identification to guidance to disposal to event emission maps directly onto these states [spec/binsight-spec.md:21](../../../../spec/binsight-spec.md#L21) [spec/binsight-spec.md:26](../../../../spec/binsight-spec.md#L26) [spec/binsight-spec.md:35](../../../../spec/binsight-spec.md#L35) [spec/binsight-spec.md:38](../../../../spec/binsight-spec.md#L38) [spec/binsight-spec.md:50](../../../../spec/binsight-spec.md#L50)

## Question 3

The advisable mechanisms are below.

### Confidence threshold fallback

Use a staged classifier policy.

* Run local inference first because the spec requires on-device inference and says LLM is fallback only [spec/binsight-spec.md:140](../../../../spec/binsight-spec.md#L140) [spec/binsight-spec.md:141](../../../../spec/binsight-spec.md#L141)
* Keep the low-confidence threshold configurable, as the spec and current code already do [spec/binsight-spec.md:29](../../../../spec/binsight-spec.md#L29) [devices/pi-station/src/binsight_station/main.py:32](../../../../devices/pi-station/src/binsight_station/main.py#L32) [devices/pi-station/src/binsight_station/classification.py:25](../../../../devices/pi-station/src/binsight_station/classification.py#L25)
* Preserve `llm_fallback_used` in the session and event, which already exists and is part of the required payload [devices/pi-station/src/binsight_station/session.py:18](../../../../devices/pi-station/src/binsight_station/session.py#L18) [devices/pi-station/src/binsight_station/events.py:19](../../../../devices/pi-station/src/binsight_station/events.py#L19)
* Treat fallback as part of the `IDENTIFYING` state, not as a parallel background pipeline, because the station needs one authoritative classification result before guidance

### Hand-zone and drop detection

Use debounced events, not raw samples.

* Maintain `latest_stable_zone`, not only the last instantaneous zone sample
* Maintain stable-presence and stable-absence windows before changing `hand_present`
* Only declare a drop if the runtime previously had stable hand presence and now has stable absence, then assign the most recent stable zone before disappearance
* Keep this logic inside `WAITING_FOR_DISPOSAL` so zone updates cannot leak into unrelated states

This is consistent with the spec’s hand-disappearance rule [spec/binsight-spec.md:38](../../../../spec/binsight-spec.md#L38) [spec/binsight-spec.md:39](../../../../spec/binsight-spec.md#L39) [spec/binsight-spec.md:40](../../../../spec/binsight-spec.md#L40) [spec/binsight-spec.md:41](../../../../spec/binsight-spec.md#L41) and with external debounce guidance that warns against naive single-sample interpretation.

### Session timeout handling

Use explicit per-state timers.

* `PRESENCE_ARMING` timeout: abort if the person does not remain present long enough to confirm a session
* `IDENTIFYING` timeout: fail fast if capture or fallback stalls, then reset cleanly
* `WAITING_FOR_DISPOSAL` timeout: if the user leaves without a stable drop, clear the session and return to idle without emitting a disposal attempt event
* `RESETTING` cooldown timer: prevent immediate retrigger from residual motion

The timeout mechanism belongs to the runtime core even if the implementation later uses `asyncio.timeout()` or a scheduler at the adapter layer. Barr Group explicitly calls out timing services as part of non-trivial state-machine systems, and Python documents `asyncio.timeout()` and `wait_for()` as structured ways to bound waits when async I/O is introduced.

## Question 4

The viable alternatives and their trade-offs are below.

| Alternative | Strengths | Weaknesses | Fit for Binsight |
| --- | --- | --- | --- |
| Procedural loop | Smallest implementation surface, easy to bootstrap | Context gets spread across flags and conditionals, timeouts are ad hoc, disposal logic becomes fragile as sensors and cloud seams grow | Weak |
| Explicit finite state machine | Matches spec phases, keeps context explicit, easy to test, natural place for timers and event payloads | Requires careful state and event design, can become noisy if transitions are not kept disciplined | Strong |
| Full asynchronous event pipeline | Good for multiple concurrent I/O sources, structured cancellation, future-friendly for richer integrations | Adds task lifecycle complexity, current repo has no async stack yet, classifier work may be CPU-bound rather than I/O-bound | Moderate only if I/O concurrency grows significantly |

Two observations matter most.

* Barr Group’s critique of event-action code maps directly to the risk of encoding session context through scattered booleans and procedural branches. Binsight has exactly the kind of context-sensitive behavior where that approach becomes brittle.
* Python’s own guidance frames `asyncio` as a good fit for concurrent I/O. Binsight certainly has I/O seams, but the business problem itself is not concurrent I/O orchestration. It is stateful interpretation of user and sensor behavior over time. That argues for FSM-first, async-second.

## Question 5

The recommendation is supported by the following evidence set.

| Claim | Repository evidence | External support |
| --- | --- | --- |
| The runtime is reactive and context-sensitive | [spec/binsight-spec.md:21](../../../../spec/binsight-spec.md#L21) [spec/binsight-spec.md:29](../../../../spec/binsight-spec.md#L29) [spec/binsight-spec.md:35](../../../../spec/binsight-spec.md#L35) [spec/binsight-spec.md:40](../../../../spec/binsight-spec.md#L40) [devices/pi-station/src/binsight_station/session.py:56](../../../../devices/pi-station/src/binsight_station/session.py#L56) | [Barr Group](https://barrgroup.com/blog/state-machines-event-driven-systems) |
| The repo already points toward an FSM core | [devices/pi-station/src/binsight_station/session.py:7](../../../../devices/pi-station/src/binsight_station/session.py#L7) [devices/pi-station/src/binsight_station/main.py:43](../../../../devices/pi-station/src/binsight_station/main.py#L43) [devices/pi-station/tests/test_smoke.py:28](../../../../devices/pi-station/tests/test_smoke.py#L28) | [Barr Group](https://barrgroup.com/blog/state-machines-event-driven-systems) |
| Local-first classification with fallback is required | [spec/binsight-spec.md:29](../../../../spec/binsight-spec.md#L29) [spec/binsight-spec.md:140](../../../../spec/binsight-spec.md#L140) [spec/binsight-spec.md:141](../../../../spec/binsight-spec.md#L141) [devices/pi-station/src/binsight_station/classification.py:25](../../../../devices/pi-station/src/binsight_station/classification.py#L25) | Repository evidence is primary here |
| Drop detection should be debounced rather than instantaneous | [spec/binsight-spec.md:38](../../../../spec/binsight-spec.md#L38) [spec/binsight-spec.md:40](../../../../spec/binsight-spec.md#L40) [devices/pi-station/src/binsight_station/session.py:58](../../../../devices/pi-station/src/binsight_station/session.py#L58) | [Jack Ganssle](https://www.ganssle.com/debouncing.htm) [Adafruit](https://learn.adafruit.com/debouncer-library-python-circuitpython-buttons-sensors) |
| Async tools are useful mainly at the edges | [devices/pi-station/pyproject.toml:7](../../../../devices/pi-station/pyproject.toml#L7) [devices/pi-station/README.md:15](../../../../devices/pi-station/README.md#L15) [devices/pi-station/README.md:16](../../../../devices/pi-station/README.md#L16) | [Python docs, asyncio](https://docs.python.org/3/library/asyncio.html) [Python docs, Coroutines and Tasks](https://docs.python.org/3/library/asyncio-task.html) |

## Recommended Approach

Use an explicit finite state machine as the Binsight station runtime core, with typed events, per-state timers, and thin hardware and cloud adapters around it.

This is the best fit because it matches the spec’s phase-based behavior, aligns with the repository’s existing `SessionStateMachine` direction, preserves clear ownership of the live control loop on the Pi, and gives the project a disciplined place to handle fallback classification, drop inference, live status, event emission, and reset behavior. A purely procedural loop will become brittle as hardware integration arrives. A full asynchronous event pipeline would add concurrency machinery before the project has enough concurrent I/O to justify it. The right shape for this project is FSM-first, with event-driven or async adapters only where actual I/O integration requires them.

## Recommended Next Research

* Define the concrete event set for the FSM, including presence-confirmed, classification-ready, fallback-failed, hand-zone-updated, drop-confirmed, timeout, and publish-result-complete
* Measure real sensor jitter on the chosen ultrasonic and hand-zone detection pipeline to tune stability windows empirically
* Decide whether cloud publishing should be synchronous with local retries, buffered, or delegated to a separate local queue
* Decide whether the camera and fallback path justify `asyncio` adapters or whether a threaded blocking adapter is simpler

## Clarifying Questions

None at this stage. The source-of-truth spec and current repository provide enough evidence to make the architecture recommendation.