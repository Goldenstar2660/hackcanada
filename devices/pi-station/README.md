---
title: Raspberry Pi Station Runtime
description: Setup and ownership notes for the BinBuddy Raspberry Pi live control loop runtime
---

## Purpose

This project contains the Raspberry Pi runtime for the BinBuddy demo station.

The Pi owns the live control loop described in the spec: session start, item classification, local rules evaluation, disposal guidance, disposal detection, event creation, and translation between a narrow ESP-facing protocol and cloud-facing payloads.

## Boundary

* Keep this project independent from the TypeScript workspace
* Keep Firebase publishing behind explicit module seams
* Keep the ESP protocol narrow and local to the Pi runtime
* Do not move live disposal logic into the dashboard or backend

## Layout

```text
devices/pi-station/
├── pyproject.toml
├── src/binbuddy_station/
│   ├── main.py
│   ├── session.py
│   ├── classification.py
│   ├── rules.py
│   ├── esp_client.py
│   ├── live_status.py
│   └── events.py
└── tests/
```

## Local setup

Install dependencies with `uv`:

```bash
uv sync
```

Run the smoke tests:

```bash
uv run pytest
```

Run the placeholder station entry point:

```bash
uv run binbuddy-station
```

## Environment

Copy `.env.example` to `.env` and adjust values for your station environment.

The current scaffold only loads configuration and wires module seams. Hardware integration, Firebase credentials, model execution, and the Pi-to-ESP wire format remain follow-on work.
