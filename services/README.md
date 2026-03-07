---
title: Services Boundary
description: Ownership notes for cloud backend services in the Binsight repository
---

## Purpose

This folder contains cloud backend services.

For Binsight, this area is reserved for Firebase Cloud Functions and related backend code that validate station events, serve dashboard APIs, and compute analytics views without owning the live station loop.

## Ownership Boundary

* Put cloud-hosted backend services here
* Keep local station decision logic out of this folder
* Reference canonical shared contracts instead of redefining backend-only copies