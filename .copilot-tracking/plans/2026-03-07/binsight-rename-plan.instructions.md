---
applyTo: '.copilot-tracking/changes/2026-03-07/binsight-rename-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: BinBuddy to Binsight Rename

## Overview

Rename the product from BinBuddy to Binsight across active repository surfaces, including docs, package metadata, runtime identifiers, protocol headers, environment variables, Firebase-related defaults, and source-of-truth paths.

## Objectives

### User Requirements

* Rename the product from BinBuddy to Binsight across the repository.
* Update docs and external configuration names, including Firebase-related identifiers.

### Derived Objectives

* Rename the spec and Python module paths so active instructions and imports match the new name.
* Update TypeScript package scopes and aliases so workspace resolution remains coherent.
* Update protocol headers, signature prefixes, and environment keys together so device publication remains aligned end to end.
* Remove old-name references from active tracking artifacts to keep future searches clean.

## Context Summary

### Project Files

* spec/binsight-spec.md
* .github/instructions/source-of-truth.instructions.md
* package.json
* tsconfig.base.json
* apps/web/package.json
* services/backend-functions/package.json
* devices/pi-station/pyproject.toml
* devices/pi-station/src/binsight_station/
* firmware/esp8266-controller/include/protocol.h
* firmware/esp8266-controller/src/protocol.cpp
* firmware/esp8266-controller/src/main.cpp

### References

* .copilot-tracking/research/2026-03-07/binsight-rename-research.md
* spec/binsight-spec.md
* .github/instructions/source-of-truth.instructions.md

## Implementation Checklist

### [x] Implementation Phase 1: Rename Active Paths and Source-of-Truth References

<!-- parallelizable: false -->

* [x] Step 1.1: Rename the spec path and Python module path.
* [x] Step 1.2: Update instructions, docs, and imports to the new paths.

### [x] Implementation Phase 2: Rename Product Identifiers and Config Names

<!-- parallelizable: true -->

* [x] Step 2.1: Update TypeScript package scopes, aliases, and imports.
* [x] Step 2.2: Update Python package names, console scripts, imports, and env keys.
* [x] Step 2.3: Update firmware namespaces, macros, and runtime log strings.
* [x] Step 2.4: Update backend and Pi protocol headers, signature prefix, and Firebase-related defaults.

### [x] Implementation Phase 3: Validate and Clean Residual References

<!-- parallelizable: false -->

* [x] Step 3.1: Refresh lock or generated metadata affected by renamed package scopes.
* [x] Step 3.2: Search for residual old-name references and fix remaining active files.
* [x] Step 3.3: Run validation commands.