---
title: Scripts Boundary
description: Ownership notes for repository automation scripts in the BinBuddy repository
---

## Purpose

This folder contains repository automation helpers.

Use this area for scripts that support multiple surfaces, such as validation helpers, code generation wrappers, local environment automation, and release support tasks.

## Ownership Boundary

* Put cross-surface automation here
* Keep one-off runtime entry points inside the owning surface when practical
* Prefer small, composable scripts that can be called from the root task runner