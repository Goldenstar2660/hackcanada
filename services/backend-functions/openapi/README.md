---
title: Backend OpenAPI Boundary
description: Ownership notes for HTTP API descriptions under the backend functions surface
---

## Purpose

This directory is reserved for HTTP API descriptions exposed by the backend functions surface.

## Boundary Rules

OpenAPI artifacts in this directory describe transport-level HTTP contracts only. Canonical domain contracts remain in `packages/contracts/schemas` as JSON Schema 2020-12 documents.

## Expected Usage

* Reference canonical contract fields instead of redefining domain semantics here
* Document callable or HTTP endpoints that the dashboard or operators consume
* Keep Firestore persistence details out of OpenAPI descriptions