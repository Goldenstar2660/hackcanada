---
title: Analytics Package
description: Ownership notes for shared analytics definitions and metric semantics
---

## Purpose

This package holds shared analytics definitions that keep dashboard reporting and backend materialization logic aligned.

## Scope

Analytics assets in this package define shared metric semantics, query vocabulary, and read-model expectations. They do not define Firestore collections or rollup implementation details.

## Ownership Boundary

* Keep metric formulas aligned to the product spec
* Reserve HTTP transport descriptions for backend OpenAPI files
* Keep analytics definitions data-first so multiple surfaces can consume them consistently