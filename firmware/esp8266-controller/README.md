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

Run the firmware build from this directory:

```bash
pio run
```

If your board is connected and PlatformIO is installed, you can upload later with the standard PlatformIO upload workflow for the selected environment.
