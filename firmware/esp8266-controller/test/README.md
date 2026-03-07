---
title: Firmware Tests
description: Notes for PlatformIO-native tests in the Binsight ESP8266 controller project
---

## Purpose

This folder is reserved for firmware tests that run inside the ESP8266 controller project.

## Boundary

* Keep tests focused on embedded behavior and local protocol handling
* Do not treat this folder as the place for dashboard, backend, or Raspberry Pi integration tests
* Add test fixtures only when firmware behavior becomes concrete enough to validate
