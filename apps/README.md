---
title: Apps Boundary
description: Ownership notes for application surfaces in the BinBuddy repository
---

## Purpose

This folder contains user-facing application surfaces.

For the current BinBuddy scope, `apps/` is reserved for the dashboard website and any future operator-facing web surfaces that present live station status, historical disposal data, and analytics.

## Ownership Boundary

* Put browser-based UI code here
* Keep live station control logic out of this folder
* Consume shared contracts and analytics definitions instead of redefining them locally