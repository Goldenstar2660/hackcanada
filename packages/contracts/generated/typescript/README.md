---
title: Generated TypeScript Contracts
description: Generated artifact boundary for TypeScript types derived from canonical JSON Schemas
---

## Purpose

This directory is reserved for generated TypeScript declarations derived from the canonical JSON Schemas in `packages/contracts/schemas`.

## Usage

Run the shared tooling hook from the workspace root when schema changes need fresh TypeScript declarations.

```bash
corepack pnpm --filter @binsight/tooling run contracts:types:generate
```

The generator mirrors the schema folder layout under this directory.

## Ownership Boundary

* Treat JSON Schema as the canonical source of truth
* Do not hand-edit generated declaration files
* Reserve OpenAPI descriptions for HTTP APIs under the backend surface