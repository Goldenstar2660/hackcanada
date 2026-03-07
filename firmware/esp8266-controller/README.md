---
title: ESP8266 Controller Firmware
description: PlatformIO firmware scaffold for the BinBuddy ESP8266 controller
---

## Purpose

This project contains the embedded firmware for the BinBuddy ESP8266 controller.

The controller owns ultrasonic sensing, LED output, acknowledgements, and health telemetry. It does not own dashboard contracts, Firebase payloads, or disposal event creation.

## Boundary

* Keep the firmware build isolated from the TypeScript workspace and the Raspberry Pi Python runtime
* Keep the Pi-to-firmware protocol narrow and local-facing
* Let the Raspberry Pi translate between firmware messages and cloud-facing contracts

## Project Layout

* `platformio.ini` defines the PlatformIO environment
* `include/protocol.h` declares the local command and telemetry seam
* `src/protocol.cpp` contains placeholder encode and decode helpers
* `src/main.cpp` wires the protocol seam into a minimal controller loop
* `test/` is reserved for firmware-native tests when behavior expands

## Flashing And Validation

The supported repository-level validation path is `just validate` from the workspace root. That recipe prefers the workspace-local PlatformIO binary at `.venv/bin/pio` and falls back to a global `pio` installation when needed.

To run the firmware build directly from this directory, use one of these commands:

```bash
../../.venv/bin/pio run
```

```bash
pio run
```

Use the workspace-local command when the repository virtual environment provides PlatformIO. Use the global command only if PlatformIO is installed on your system PATH.

If your board is connected, you can upload later with the standard PlatformIO upload workflow for the selected environment.

