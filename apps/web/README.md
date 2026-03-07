---
title: BinBuddy Web Surface
description: Ownership and bootstrap notes for the dashboard website workspace package
---

## Purpose

This package owns the dashboard and live monitoring web surface for BinBuddy. It stays inside the TypeScript workspace because it shares contracts and analytics definitions with the backend and shared packages.

## Scope

* Station insights views
* Live monitoring UI
* Station and location filtering workflows
* Consumption of shared contracts and analytics definitions

## Bootstrap Status

This is a minimal TypeScript package shell. Framework selection, routing, and UI implementation are intentionally deferred to later phases.

## Development

Install workspace dependencies from the repository root, then run the package script when you need a TypeScript watch loop:

```bash
pnpm --filter @binbuddy/web run dev
```