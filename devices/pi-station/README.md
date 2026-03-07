---
title: Raspberry Pi Station Runtime
description: Setup and ownership notes for the Binsight Raspberry Pi live control loop runtime
---

## Purpose

This project contains the Raspberry Pi runtime for the Binsight demo station.

The Pi owns the live control loop described in the spec: session start, item classification, local rules evaluation, disposal guidance, disposal detection, event creation, and translation between a narrow ESP-facing protocol and cloud-facing payloads.

## Firebase rehearsal runbook

Use `../../docs/firebase-rehearsal-runbook.md` for the exact setup, deploy, seed, and startup sequence. This README keeps the Pi-specific runtime and contract notes.

## Boundary

* Keep this project independent from the TypeScript workspace
* Keep Firebase publishing behind explicit module seams
* Keep the ESP protocol narrow and local to the Pi runtime
* Do not move live disposal logic into the dashboard or backend

## Device-to-cloud contract

The Pi remains the live control-loop owner. It emits a device-optimized ingress shape and the backend is responsible for normalizing that ingress payload into the canonical TypeScript contracts before persistence.

The current device ingress contract boundary is:

* Event payloads stay in snake_case and carry `payload_version=device.v1`
* Live-status payloads stay in snake_case and carry `payload_version=device.v1`
* Backend normalization maps device `success: bool` into canonical `attemptResult`
* Backend normalization maps device `phase` values into canonical dashboard `sessionState`
* The Pi may send partial live-status fields, but it should prefer the full ingress shape documented in `packages/contracts/src/index.ts`

This keeps the Pi runtime independent from the TypeScript workspace while still giving backend and dashboard owners one explicit normalization boundary.

## Device authentication

Before field testing, the Pi-to-backend publisher must attach the same device authentication headers the backend ingress functions validate:

* `x-binsight-device-id`
* `x-binsight-station-id`
* `x-binsight-timestamp`
* `x-binsight-signature`

The signature format is `binsight-v1:{device_id}:{station_id}:{timestamp}:{shared_secret}`. The placeholder helper for these headers lives in `src/binsight_station/esp_client.py` until a dedicated cloud publisher module exists.

> [!IMPORTANT]
> The Pi should keep owning classification, guidance, and disposal detection. Cloud authentication and payload normalization are transport concerns only.

## Layout

```text
devices/pi-station/
├── pyproject.toml
├── src/binsight_station/
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

For the training photo capture tool on a Raspberry Pi, this is the one command to run:

```bash
uv run binsight-training-capture
```

Its config file lives at:

```text
devices/pi-station/config/training_capture.json
```

Captured images are written under `devices/pi-station/training_data/<label>/` by default.

Run the smoke tests:

```bash
uv run pytest
```

Run the placeholder station entry point:

```bash
uv run binsight-station
```

## Training photo capture for AI datasets

Use this exact command from `devices/pi-station/`:

```bash
uv run binsight-training-capture
```

Config path:

```text
devices/pi-station/config/training_capture.json
```

How it works:

* Press `Enter` once to start capturing images
* Press `Enter` again to stop the current run
* Press `Ctrl+C` to quit
* The config is reloaded every time you start a run

Default output layout:

```text
devices/pi-station/training_data/<label>/<label>_YYYYMMDD_HHMMSS_microseconds.jpg
```

Important config fields:

* `label`: class name for the images, such as `engaged`, `paper`, or `plastic`
* `outputDir`: base folder for saved images
* `intervalSeconds`: time between photos
* `width` / `height`: capture resolution
* `imageFormat`: output format, typically `jpg` or `png`
* `jpegQuality`: JPEG quality when saving `.jpg`
* `maxPhotosPerRun`: `0` means unlimited until you stop manually
* `flip180`: rotate the saved image 180 degrees if your camera is mounted upside down
* `swapRedBlue`: retained for compatibility with the original script, but ignored by the current CLI-camera implementation

This implementation uses the Raspberry Pi camera CLI (`rpicam-still`, or `libcamera-still` on older images), so it does **not** require installing `picamera2` or Pillow through `uv` just to run the capture command.

If the Pi camera CLI is unavailable or the camera is not enabled, the command exits with a clear error message so you can fix the Pi camera setup first.

## Phase 5 startup sequence

For the rehearsal, copy `devices/pi-station/.env.example` to `.env`, keep the station and device credentials aligned with the backend configuration, run `uv run pytest`, then run `uv run binsight-station`.

On the current Phase 5 entrypoint, the runtime loads the station configuration, polls the ESP health endpoint once, attempts to publish the current live status, prints a one-line station summary, and exits.

The validated local startup output on 2026-03-07 was:

```text
station=demo-station-001 phase=idle item=None disposal=None
```

Keep `STATION_ID`, `BINSIGHT_DEVICE_ID`, and `BINSIGHT_DEVICE_SHARED_SECRET` aligned with the backend `BINSIGHT_DEVICE_CREDENTIALS_JSON` entry for the same station before attempting a live Firebase rehearsal.

## Minimum environment

Copy `.env.example` to `.env` and adjust values for your station environment.

The minimum Phase 1 configuration set is:

* `STATION_ID`: Station document identifier used in local runtime state and device ingress payloads
* `RULES_PRESET_ID`: Active rules preset id, currently `demo-canada-ottawa`
* `RULES_PRESET_VERSION`: Active rules preset version, currently `1.0.0`
* `ESP_ENDPOINT`: ESP8266 base URL on the shared network, for example `http://192.168.4.1`
* `FIREBASE_PROJECT_ID`: Firebase project id for the demo environment
* `BINSIGHT_DEVICE_ID`: Device id that will be used for authenticated backend publication
* `BINSIGHT_DEVICE_SHARED_SECRET`: Shared secret paired with the device id for backend ingress
* `PRESENCE_DEBOUNCE_SECONDS`: Stable presence window before identification starts
* `DISPOSAL_TIMEOUT_SECONDS`: Wait window for disposal before the runtime resets
* `RESET_COOLDOWN_SECONDS`: Cooldown window before the station returns to idle after reset

Phase 1 keeps the Pi runtime on its local seams, but these values are the minimum environment story for this cycle and match the device-auth boundary the backend already validates.

The Pi-to-ESP transport is fixed to local HTTP plus JSON over Wi-Fi. Set `ESP_ENDPOINT` to the ESP8266 base URL on the shared network.

The Pi runtime uses this device contract:

* `GET /health` polls authoritative sensor, indicator, uptime, and presence state
* `POST /signal` sends guidance commands as JSON, typically `{ "indicatorZone": "left" }`
* `POST /reset` clears active guidance on the controller

Failure policy:

* A failed Pi-to-ESP HTTP call marks ESP health as degraded or offline in live status
* Transport failures do not abort the current Pi runtime session or reset station counters
* Health polling is authoritative for recovery. Once `GET /health` succeeds again, the ESP health view recovers automatically

## Validation

Use these commands for the Phase 1 validation gate:

```bash
uv run pytest
uv run binsight-station
```

From the workspace root, `just validate` should also pass the Pi validation step once the workspace dependencies are installed.

> [!WARNING]
> The local Phase 5 startup command was validated on 2026-03-07, but a real cloud rehearsal was not. The workspace did not include a provisioned `devices/pi-station/.env`, reachable Firebase credentials, or a seeded backend project, so live cloud publication remains blocked until those values are supplied.

Hardware integration, cloud publication, and model execution beyond the current seams remain follow-on work.
