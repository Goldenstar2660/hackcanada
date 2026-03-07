---
title: Rules Fixtures
description: Sample fixture guidance for rules preset validation and demos
---

## Purpose

This directory is reserved for sample fixtures that exercise rules presets during tests, demos, and schema validation.

## Recommended Fixture Shape

Fixtures should cover at least these scenarios:

* Supported items that map cleanly to recycle, compost, and garbage
* Edge cases near the low-confidence threshold
* Zone mappings that match the active station layout

## Ownership Boundary

* Keep fixtures small and deterministic
* Use them to validate shared preset semantics, not backend persistence details
* Mirror canonical schema field names where possible