---
title: BinBuddy Backend Functions
description: Ownership and bootstrap notes for the Firebase backend workspace package
---

## Purpose

This package owns the TypeScript backend surface that will host Firebase Cloud Functions and backend-facing workflows for BinBuddy. It remains separate from the Raspberry Pi runtime so the live control loop stays local to the station.

## Scope

* Event ingestion and validation entry points
* Live status handling for dashboard consumers
* Analytics aggregation and read-model support
* Consumption of shared contracts and rules assets

## Bootstrap Status

This package is currently a minimal TypeScript shell. Firebase runtime wiring, emulator support, and HTTP surface definitions are deferred to later phases.

## Development

Install workspace dependencies from the repository root, then run the package watch script if you need local TypeScript compilation:

```bash
pnpm --filter @binbuddy/backend-functions run dev
```