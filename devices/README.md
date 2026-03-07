---
title: Devices Boundary
description: Ownership notes for device runtime projects in the Binsight repository
---

## Purpose

This folder contains device runtime projects.

For Binsight, the Raspberry Pi station runtime belongs here because it owns camera capture, item classification, local rules application, disposal-session state, and translation between the ESP8266 protocol and cloud-facing contracts.

## Ownership Boundary

* Put Raspberry Pi runtime code here
* Keep cloud backend code out of this folder
* Treat the Pi as the live control loop owner and anti-corruption layer