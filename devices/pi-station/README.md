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

## LCD wiring

The Pi runtime now includes a real 16x2 HD44780-compatible LCD driver over Raspberry Pi BCM GPIO in 4-bit mode.

Default wiring:

* `rs=25`
* `e=24`
* `data=23,17,18,22`

When GPIO access is unavailable, such as local desktop tests, the LCD client falls back to in-memory rendering so the runtime and test suite still work off-device.

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

## Real-time component simulation

To exercise the Pi runtime against a **fake ESP HTTP controller** and a **fake backend ingress server** in actual wall-clock time, run:

```bash
uv run binsight-realtime-sim
```

This local harness simulates a live detection flow and verifies that:

* the Pi runtime polls the ESP `/health` endpoint in real time
* the Pi runtime sends guidance to the ESP `/signal` endpoint
* the simulated ESP records the active indicator zone it received
* the Pi runtime publishes live-status and disposal-event payloads to backend ingress endpoints
* the simulated backend stores those payloads in memory and returns write acknowledgements

Useful options:

```bash
uv run binsight-realtime-sim --item plastic-bottle --disposal-zone left --output-json simulation-result.json
```

Use `--no-reset` if you want the run to stop right after the disposal event is published instead of waiting for the runtime to return to `idle`.

This harness is meant for **local component/integration rehearsal**. It does not require Firebase deployment or real ESP hardware, but it does use real wall-clock timing and real localhost HTTP requests so the device seams are exercised end-to-end.

## Live demo command with fake model detection

If your goal is to **fake only the ML/CV detection** while still using the **real ESP**, the **real backend**, and the **real dashboard**, use:

```bash
uv run binsight-live-demo --item plastic-bottle
```

This command:

* loads the real Pi `.env` configuration
* sends the real guidance command to the configured `ESP_ENDPOINT`
* publishes real live-status and disposal-event payloads through the configured backend ingress path
* lets the web dashboard update from the real project data source
* only fakes the step that says “the model detected this item”

Useful examples:

```bash
uv run binsight-live-demo --item plastic-bottle --zone left
uv run binsight-live-demo --item banana-peel --zone middle --guidance-hold-seconds 8
uv run binsight-live-demo --item plastic-bottle --no-reset
```

Recommended prerequisites before running it:

* `devices/pi-station/.env` points to the real ESP and the real backend project
* the ESP is flashed, powered, and reachable at `ESP_ENDPOINT`
* backend Functions are deployed for the configured Firebase project
* the web app is running against the same Firebase project so you can watch the update live
* `BINSIGHT_DEVICE_ID` and `BINSIGHT_DEVICE_SHARED_SECRET` are set so the backend accepts the device publication

This is the command to use when you want to say: **“pretend the model just detected an item, and now drive the real system.”**
## Model asset layout

The Pi runtime now expects the item-classifier assets in `devices/pi-station/models/item_classifier/` by default. You can override that location with `ITEM_CLASSIFIER_MODEL_DIR` in `devices/pi-station/.env`.

Place these files in that directory before running the live station with real inference:

```text
devices/pi-station/models/item_classifier/
├── model.tflite
├── manifest.json
├── labels.txt
└── aliases.json
```

Asset responsibilities:

* `model.tflite`: quantized TensorFlow Lite classifier
* `manifest.json`: preprocessing and runtime metadata such as layout, normalization, resize method, and thread count
* `labels.txt`: ordered output labels matching the model outputs
* `aliases.json`: optional mapping from model labels to rules-preset item ids such as `plastic-bottle`

The runtime inspects TensorFlow Lite tensor metadata at startup, then combines it with `manifest.json` so compatible model swaps do not require code changes.

Example manifest:

```json
{
	"labelsFile": "labels.txt",
	"aliasesFile": "aliases.json",
	"inputLayout": "auto",
	"colorSpace": "RGB",
	"resizeMethod": "bilinear",
	"normalizeMean": [127.5],
	"normalizeStd": [127.5],
	"outputActivation": "auto",
	"numThreads": 4
}
```

If your model labels already match the rules preset item ids after normalization, you can omit `aliases.json` by setting `"aliasesFile": ""` in the manifest.

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

* The tool captures images automatically at `intervalSeconds`
* Press `Ctrl+C` to quit
* It prints periodic timing stats so you can see effective photos/sec and whether the requested cadence is being missed

Default output layout:

```text
devices/pi-station/training_data/<label>/<label>_YYYYMMDD_HHMMSS_microseconds.jpg
```

Important config fields:

* `label`: class name for the images, such as `engaged`, `paper`, or `plastic`
* `outputDir`: base folder for saved images
* `intervalSeconds`: requested capture cadence in seconds, such as `0.1` for 10 captures/sec
* `width` / `height`: capture resolution
* `imageFormat`: output format, typically `jpg` or `png`
* `jpegQuality`: JPEG quality when saving `.jpg`
* `maxPhotosPerRun`: optional automatic stop after N saved images; `0` means unlimited
* `flip180`: rotate the saved image 180 degrees if your camera is mounted upside down
* `swapRedBlue`: swap red/blue channels before saving when needed for compatibility with older data-collection workflows

This implementation now prefers a **persistent MJPEG camera stream** using Raspberry Pi camera CLI video tools (`rpicam-vid`, or `libcamera-vid` on older images) so it can get much closer to high-rate intervals like `0.1s`. It falls back to one-shot still captures with `rpicam-still` / `libcamera-still` only when the persistent backend is unavailable.

If the tool falls back to one-shot still capture mode, very short intervals may not be achievable because each photo has to pay process startup and teardown cost. The runtime logs a warning when that slower fallback is being used.

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
* `ITEM_CLASSIFIER_MODEL_DIR`: model asset directory, relative to `devices/pi-station/` by default
* `ESP_ENDPOINT`: ESP8266 base URL on the shared network, for example `http://192.168.4.1`
* `FIREBASE_PROJECT_ID` or `BINSIGHT_FIREBASE_PROJECT_ID`: Firebase project id for the demo environment. The runtime prefers `FIREBASE_PROJECT_ID` when both are set, but it accepts the non-reserved `BINSIGHT_FIREBASE_PROJECT_ID` fallback for repo-local config.
* `BINSIGHT_DEVICE_ID`: Device id that will be used for authenticated backend publication
* `BINSIGHT_DEVICE_SHARED_SECRET`: Shared secret paired with the device id for backend ingress
* `PRESENCE_DEBOUNCE_SECONDS`: Stable presence window before identification starts
* `DISPOSAL_TIMEOUT_SECONDS`: Wait window for disposal before the runtime resets
* `RESET_COOLDOWN_SECONDS`: Cooldown window before the station returns to idle after reset
* `CAMERA_CAPTURE_WIDTH`: captured image width for item identification
* `CAMERA_CAPTURE_HEIGHT`: captured image height for item identification
* `CAMERA_CAPTURE_FORMAT`: image format passed to the Pi camera CLI, typically `jpg`
* `CAMERA_CAPTURE_ROTATION_DEGREES`: rotation applied during capture, usually `180` for the current mounted camera orientation

Phase 1 keeps the Pi runtime on its local seams, but these values are the minimum environment story for this cycle and match the device-auth boundary the backend already validates.

TensorFlow Lite runtime notes:

* The Pi package now depends on `numpy`, `Pillow`, and `tflite-runtime` for supported Linux Python versions.
* The runtime prefers `tflite_runtime.interpreter` and falls back to `tensorflow.lite.Interpreter` when TensorFlow is already available.
* The current development environment in this repository uses Python 3.13. TensorFlow Lite wheels may lag new Python releases, so Pi deployments should stay on a supported Python version when provisioning the runtime.

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
> The local Phase 5 startup command was validated on 2026-03-07, but a real cloud rehearsal was not. The repo now accepts `BINSIGHT_FIREBASE_PROJECT_ID` in `devices/pi-station/.env`, yet live cloud publication still depends on reachable Firebase credentials and a seeded backend project.

Hardware integration, cloud publication, and model execution beyond the current seams remain follow-on work.
