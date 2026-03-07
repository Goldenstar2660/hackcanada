---
title: Firmware Boundary
description: Ownership notes for embedded firmware projects in the BinBuddy repository
---

## Purpose

This folder contains embedded firmware projects.

For BinBuddy, the ESP8266 controller belongs here because it owns ultrasonic sensing, LED control, acknowledgements, and health telemetry for the station hardware.

## Ownership Boundary

* Put PlatformIO-native firmware projects here
* Keep firmware protocols narrow and Pi-facing
* Do not couple firmware directly to dashboard or Firestore document models