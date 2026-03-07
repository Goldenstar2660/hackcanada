---
title: BinBuddy
description: Surface-first repository overview and setup entry point for the BinBuddy smart waste-sorting station project
---

## Overview

BinBuddy is a smart waste-sorting station for shared spaces. The repository is organized around product surfaces instead of a single language workspace so the Raspberry Pi runtime, ESP8266 firmware, dashboard, backend, and shared assets can evolve without collapsing their toolchains into one stack.

The product specification in `spec/binbuddy-spec.md` is the source of truth for scope, business logic, and technical boundaries.

## Repository Layout

* `apps/` contains user-facing application surfaces, starting with the dashboard website
* `devices/` contains station runtime code owned by the Raspberry Pi
* `firmware/` contains embedded code for the ESP8266 controller
* `services/` contains cloud backend services
* `packages/` contains shared contracts, rules assets, analytics definitions, and tooling
* `infra/` contains Firebase and deployment-facing infrastructure assets
* `docs/` contains architecture, operations, and decision records
* `scripts/` contains cross-surface automation helpers
* `spec/` contains the product specification and supporting source-of-truth material

## Working Agreement

* Keep the repository surface-first
* Treat the Raspberry Pi as the owner of the live control loop and the translator between firmware and cloud-facing contracts
* Keep firmware, Python, and TypeScript toolchains isolated unless a shared boundary is explicitly data-first
* Prefer shared schemas and versioned assets over shared cross-runtime business logic

## Getting Started

The repository already includes the current scaffold for every planned surface:

* `apps/web` for the dashboard shell
* `services/backend-functions` for the Firebase backend shell
* `devices/pi-station` for the Raspberry Pi runtime scaffold
* `firmware/esp8266-controller` for the ESP8266 firmware scaffold
* `packages/contracts`, `packages/rules`, `packages/analytics`, and `packages/tooling` for shared schemas and assets
* `infra/firebase` for Firebase configuration, rules, and indexes

If `just` is installed, list the available root tasks with:

```bash
just --list
```

Run the supported root validation workflow with:

```bash
just validate
```

That recipe executes the Phase 6 command set from the repository root:

```bash
corepack pnpm lint
corepack pnpm build
corepack pnpm test
cd devices/pi-station && uv run pytest
cd firmware/esp8266-controller && ../../.venv/bin/pio run
```

If the workspace-local PlatformIO binary is not present at `.venv/bin/pio`, the firmware step falls back to a globally installed `pio` executable.

## Current Status

This repository now includes the TypeScript workspace scaffold, the Raspberry Pi runtime scaffold, the ESP8266 PlatformIO scaffold, schema-first shared contracts, rules and analytics placeholders, and the Firebase infrastructure boundary. The repository is still in foundation mode, so many modules remain placeholders, but the surface boundaries and validation entry points are in place.
