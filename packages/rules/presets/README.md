---
title: Rules Presets
description: Versioning guidance for shared Binsight rules preset data
---

## Purpose

This directory stores versioned rules presets that drive disposal guidance on the Raspberry Pi station runtime.

## Versioning

Use semantic versions for preset artifacts. A preset should change version when any supported item list, item-to-disposal mapping, zone mapping, or low-confidence threshold changes.

## Expected Contents

* Region-specific preset data files
* Validation fixtures that exercise supported item coverage
* Release notes when disposal guidance changes materially

## Ownership Boundary

* Keep presets data-first and language-neutral
* Align preset fields to the canonical rules preset schema
* Avoid embedding Firestore collection assumptions in preset files