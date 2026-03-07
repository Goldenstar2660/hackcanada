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

## Network Transport

The controller now runs in standard Wi-Fi station mode and exposes a local HTTP server on port 80.

Supported endpoints:

* `GET /health` returns JSON health and presence telemetry
* `POST /signal` accepts JSON guidance commands
* `POST /reset` clears active guidance

The firmware accepts either a direct zone payload such as `{ "indicatorZone": "left" }` or a simple step payload such as `{ "step": 3, "state": "CURRENT" }` for compatibility with local-network callers.

Failure policy:

* If Wi-Fi drops, the controller stays in station mode and retries `WiFi.begin(...)` in the background
* The last indicator state stays applied until a new command or reset arrives
* The Pi should treat HTTP failures as degraded device health, not as a fatal session error

## Project Layout

* `platformio.ini` defines the PlatformIO environment
* `include/protocol.h` declares the local command and telemetry seam
* `src/protocol.cpp` contains placeholder encode and decode helpers
* `src/main.cpp` runs the local HTTP controller loop, samples the ultrasonic sensor, exposes JSON health and guidance endpoints, and keeps the Pi-to-ESP boundary local-facing
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

To override the default Wi-Fi credentials at build time, add `-D BINBUDDY_WIFI_SSID=\"your-ssid\"` and `-D BINBUDDY_WIFI_PASS=\"your-password\"` to `build_flags` in `platformio.ini`.

