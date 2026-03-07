---
title: Infrastructure Boundary
description: Ownership notes for infrastructure assets in the BinBuddy repository
---

## Purpose

This folder contains infrastructure-facing assets.

For BinBuddy, this area is reserved for Firebase configuration, Firestore rules, indexes, emulator wiring, and other deployment-time infrastructure artifacts.

## Ownership Boundary

* Put Firebase and deployment configuration here
* Keep infrastructure concerns separate from application and device source code
* Defer collection and rollup design details until the dedicated follow-on phase