---
title: Analytics Metrics
description: Source-of-truth placeholder for Binsight metric formulas and rollup semantics
---

## Purpose

This directory is reserved for source-of-truth metric definitions used by backend summaries and dashboard labels.

## Initial Metrics

The current demo scope tracks these metrics from the product spec:

* total attempts
* total correct sorts
* first-try correct rate
* participation or compliance score
* top contamination items
* worst times of day
* bin purity by hour or day
* floor and building leaderboard views

## Ownership Boundary

* Keep formulas and labels stable across dashboard and backend code
* Defer Firestore rollup design until the dedicated data-model phase
* Document derived metric assumptions before implementation adds aggregation logic