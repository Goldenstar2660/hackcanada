---
title: Phase 4 Validation for Project Foundation Repo Structure
description: RPI validation report for Phase 4 firmware scaffolding against the plan, changes log, research, and repository state
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: reference
keywords:
  - rpi validation
  - phase 4
  - firmware
  - platformio
estimated_reading_time: 4
---

## Validation Summary

* Status: Partial
* Phase: 4, Bootstrap the ESP8266 firmware project
* Coverage assessment: Step 4.1 and Step 4.3 are implemented, but Step 4.2 is only partially implemented in the current repository state
* Finding counts: Critical 0, Major 1, Minor 1
* Verdict: The repository still contains the expected isolated PlatformIO scaffold and documented build validation, but the planned placeholder protocol seam is no longer the active runtime path. The active firmware behavior now exposes an HTTP and JSON interface that the Pi adapts back into the placeholder frame model.

## Phase Requirements And Comparison

### Step 4.1: Initialize the PlatformIO firmware layout

The plan requires a dedicated embedded project with firmware-only concerns, an isolated toolchain, and a structure that is clearly separate from the TypeScript workspace and Pi runtime.

Evidence:

* The phase detail requires `platformio.ini`, firmware README, `src/main.cpp`, `include/README.md`, and `test/README.md`, and defines success as an independent embedded toolchain and build root: /home/handwash/Projects/hackcanada/.copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md:190-203
* The changes log records the required firmware scaffold files as added: /home/handwash/Projects/hackcanada/.copilot-tracking/changes/2026-03-07/project-foundation-repo-structure-changes.md:64-70
* The PlatformIO project definition exists as a dedicated ESP8266 environment: /home/handwash/Projects/hackcanada/firmware/esp8266-controller/platformio.ini:1-8
* The firmware README still documents the firmware-only ownership boundary and separation from dashboard, backend, and disposal-event concerns: /home/handwash/Projects/hackcanada/firmware/esp8266-controller/README.md:6-17
* The header and test README files keep the boundary local to the embedded project: /home/handwash/Projects/hackcanada/firmware/esp8266-controller/include/README.md:6-11 and /home/handwash/Projects/hackcanada/firmware/esp8266-controller/test/README.md:6-11

Assessment: Implemented as planned.

### Step 4.2: Create a narrow local protocol boundary for Pi communication

The plan requires local command and telemetry placeholders that remain Pi-facing and avoid reuse of cloud-facing contracts.

Evidence:

* The phase detail requires placeholder protocol files and says `src/main.cpp` should wire protocol integration points while preserving DR-02 for later protocol design: /home/handwash/Projects/hackcanada/.copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md:213-227
* Research says the firmware should use a small manual local wire contract that the Pi translates, not a cloud-shaped contract set: /home/handwash/Projects/hackcanada/.copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md:136-140 and /home/handwash/Projects/hackcanada/.copilot-tracking/research/2026-03-07/project-foundation-repo-structure-research.md:221-225
* The planning log explicitly defers detailed Pi-to-ESP protocol design as DR-02 beyond placeholder boundary files: /home/handwash/Projects/hackcanada/.copilot-tracking/plans/logs/2026-03-07/project-foundation-repo-structure-log.md:27-30
* The protocol header and implementation still define a narrow frame-based local seam with `health?`, `indicator:<zone>`, health telemetry, presence telemetry, and acknowledgements: /home/handwash/Projects/hackcanada/firmware/esp8266-controller/include/protocol.h:16-47 and /home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/protocol.cpp:57-109
* Those helpers are not used by the active firmware entrypoint. The only matches for `decodeControllerCommand`, `encodeHealthTelemetry`, `encodePresenceTelemetry`, and `encodeIndicatorAcknowledgement` are their declarations and definitions inside the protocol files themselves, with no call sites elsewhere under `firmware/esp8266-controller`.
* The active firmware entrypoint instead exposes a concrete HTTP server, builds JSON responses, parses JSON request bodies, and handles `/health`, `/signal`, and `/reset` endpoints directly: /home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp:2-3, :31, :104-127, :130-225, :240-293
* The Pi now compensates for that drift with an HTTP transport adapter that translates runtime frames such as `health?` and `indicator:<zone>` into HTTP and JSON calls and then maps the JSON payloads back into frame strings: /home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/esp_client.py:59-147 and :183-211
* The source-of-truth spec still allows Pi-to-ESP communication over Wi-Fi and keeps cloud publishing on the Pi side, so the current implementation remains product-compatible even though it no longer matches the planned placeholder boundary shape: /home/handwash/Projects/hackcanada/spec/binsight-spec.md:134-145

Assessment: Partially implemented. The local boundary is still narrow and Pi-translated, but the current repository has moved beyond the planned placeholder seam and no longer wires the placeholder protocol helpers into the active firmware runtime.

### Step 4.3: Validate firmware scaffolding

The plan requires a firmware build through `pio run` to confirm the PlatformIO scaffold initializes correctly.

Evidence:

* The phase detail defines validation as compiling the firmware target with `pio run`: /home/handwash/Projects/hackcanada/.copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md:236-241
* The changes log records the environment-specific deviation that `pio` was not on PATH and that validation continued with a workspace-local PlatformIO executable: /home/handwash/Projects/hackcanada/.copilot-tracking/changes/2026-03-07/project-foundation-repo-structure-changes.md:116-117
* The planning log records the same deviation and treats it as preserving the intended validation outcome: /home/handwash/Projects/hackcanada/.copilot-tracking/plans/logs/2026-03-07/project-foundation-repo-structure-log.md:39-42
* Repository state includes generated PlatformIO build output, including the checksum artifact under the firmware build tree: /home/handwash/Projects/hackcanada/firmware/esp8266-controller/.pio/build/project.checksum:1

Assessment: Implemented as planned, with a documented environment deviation that does not change the phase outcome.

## Findings

### Critical

None.

### Major

* Step 4.2 is only partially implemented because the planned placeholder protocol seam is no longer the active firmware path.
  * Why it matters: The plan explicitly deferred detailed Pi-to-ESP protocol design under DR-02 and expected `src/main.cpp` to wire the placeholder seam. The current firmware instead implements a concrete HTTP and JSON surface, while the placeholder helpers in `include/protocol.h` and `src/protocol.cpp` remain unused. That increases drift between the plan, the changes log, and the active code path.
  * Evidence: /home/handwash/Projects/hackcanada/.copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md:213-227, /home/handwash/Projects/hackcanada/.copilot-tracking/plans/logs/2026-03-07/project-foundation-repo-structure-log.md:27-30, /home/handwash/Projects/hackcanada/.copilot-tracking/changes/2026-03-07/project-foundation-repo-structure-changes.md:67-69, /home/handwash/Projects/hackcanada/firmware/esp8266-controller/include/protocol.h:16-47, /home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/protocol.cpp:57-109, /home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp:2-3, :31, :104-127, :130-225, :240-293, /home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/esp_client.py:59-147 and :183-211

### Minor

* The firmware README still describes `src/main.cpp` as wiring the protocol seam into a minimal controller loop, which no longer matches the current HTTP and JSON implementation.
  * Why it matters: The documentation now obscures the actual phase 4 drift and makes the firmware boundary harder to review accurately.
  * Evidence: /home/handwash/Projects/hackcanada/firmware/esp8266-controller/README.md:36-42 and /home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp:2-3, :104-127, :240-293

## Coverage Assessment

Phase 4 coverage is partial.

* All files named in Step 4.1 and Step 4.2 exist in the repository, and the embedded project remains isolated from the TypeScript workspace.
* The active Pi-to-ESP boundary is still local-facing and does not import cloud contract types into the firmware surface.
* Step 4.2 is only partially covered because the placeholder protocol files exist, but the active runtime path is a separate HTTP and JSON implementation rather than the planned wired placeholder seam.
* The generated build checksum at `/home/handwash/Projects/hackcanada/firmware/esp8266-controller/.pio/build/project.checksum` confirms validation output exists for Step 4.3.

## Deviations And Notes

The firmware validation command was executed through a workspace-local PlatformIO installation instead of a globally available `pio` binary. This deviation is explicitly documented and does not conflict with the phase intent because the required build validation still completed successfully.

The more important current-state deviation is architectural: the repository has introduced a concrete HTTP and JSON transport for the ESP8266 boundary even though the phase 4 plan and planning log kept detailed protocol design deferred behind placeholder files.

Evidence:

* /home/handwash/Projects/hackcanada/.copilot-tracking/changes/2026-03-07/project-foundation-repo-structure-changes.md:116-117
* /home/handwash/Projects/hackcanada/.copilot-tracking/plans/logs/2026-03-07/project-foundation-repo-structure-log.md:39-42
* /home/handwash/Projects/hackcanada/.copilot-tracking/details/2026-03-07/project-foundation-repo-structure-details.md:213-227
* /home/handwash/Projects/hackcanada/firmware/esp8266-controller/src/main.cpp:2-3, :104-127, :240-293
* /home/handwash/Projects/hackcanada/devices/pi-station/src/binsight_station/esp_client.py:59-147

## Clarifying Questions

None.