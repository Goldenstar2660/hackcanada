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

Phase 1 creates the repository foundation only. Runtime-specific setup arrives in later phases.

If `just` is installed, list the available root tasks with:

```bash
just --list
```

## Current Status

This repository now includes the Phase 2 TypeScript workspace shell for the dashboard, backend functions, and shared packages. Raspberry Pi and firmware projects remain intentionally outside the workspace and will be bootstrapped in later implementation phases.