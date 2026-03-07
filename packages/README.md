---
title: Packages Boundary
description: Ownership notes for shared packages and data-first contracts in the Binsight repository
---

## Purpose

This folder contains shared packages and versioned assets.

For Binsight, this boundary is reserved for canonical contracts, rules presets, analytics definitions, and supporting tooling that can be shared across the dashboard and backend while remaining consumable by the Raspberry Pi runtime.

## Ownership Boundary

* Put shared schemas, rules assets, analytics definitions, and tooling here
* Prefer data-first sharing over cross-runtime business logic libraries
* Keep firmware DTOs intentionally narrower than cloud-facing contracts