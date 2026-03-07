---
title: Firmware Headers
description: Ownership notes for header files in the Binsight ESP8266 controller project
---

## Purpose

This folder contains firmware-local headers for the ESP8266 controller.

## Boundary

* Keep declarations focused on embedded behavior and Pi-facing protocol seams
* Do not mirror shared cloud contracts here
* Prefer small, explicit types that the Raspberry Pi can translate at the boundary
