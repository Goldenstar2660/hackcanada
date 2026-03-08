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
uv venv --python 3.11 .venv
source /home/handwash/Projects/hackcanada/devices/pi-station/.venv/bin/activate
uv sync
```

Use a project-local Python `3.11` or `3.12` environment for this repo.

Important setup notes:

* do **not** use Python `3.13` for `devices/pi-station`; the current `mediapipe` and `tflite-runtime` wheels used here are limited to Python `3.11`/`3.12`
* if you already have another workspace virtualenv active, deactivate it first so `uv` does not target the wrong environment
* this project intentionally pins `numpy<2` because the current prebuilt Raspberry Pi `tflite-runtime` path used by this repo is not compatible with NumPy `2.x`

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

Run the live station runtime:

```bash
uv run binsight-station
```

`binsight-station` is the long-running live runtime entrypoint. It stays up until `Ctrl+C` and prints a compact newline status log about every 0.5 seconds.

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
uv run binsight-realtime-sim --item aluminum-can --disposal-zone left --output-json simulation-result.json
```

Use `--no-reset` if you want the run to stop right after the disposal event is published instead of waiting for the runtime to return to `idle`.

This harness is meant for **local component/integration rehearsal**. It does not require Firebase deployment or real ESP hardware, but it does use real wall-clock timing and real localhost HTTP requests so the device seams are exercised end-to-end.

## Live demo command with fake model detection

If your goal is to **fake only the ML/CV detection** while still using the **real ESP**, the **real backend**, and the **real dashboard**, use:

```bash
uv run binsight-live-demo --item aluminum-can
```

This command:

* loads the real Pi `.env` configuration
* sends the real guidance command to the configured `ESP_ENDPOINT`
* publishes real live-status and disposal-event payloads through the configured backend ingress path
* lets the web dashboard update from the real project data source
* fakes the item detection, then runs a more believable disposal flow:
  * LED guidance turns on
  * a simulated hand enters the chosen zone
  * the hand remains there briefly
  * the hand disappears
  * the runtime records the last hand zone as the actual disposal zone

Useful examples:

```bash
uv run binsight-live-demo --item aluminum-can --zone left
uv run binsight-live-demo --item pickled-radish --zone middle --guidance-hold-seconds 3 --hand-seconds 1.5
uv run binsight-live-demo --item aluminum-can --no-reset
```

The current detectable item set is intentionally limited to:

* `aluminum-can`
* `granola-bar`
* `pickled-radish`

`--guidance-hold-seconds` controls how long the LED stays on before the simulated hand enters the drop zone.

`--hand-seconds` controls how long the simulated hand remains in that zone before disappearing. The disappearance is what triggers the drop event in the demo flow.

## Chained live demo sequence

To run a believable multi-step sequence such as **recycle correct -> garbage wrong -> compost correct**, use:

```bash
uv run binsight-live-sequence --steps "aluminum-can:left,granola-bar:left,pickled-radish:middle"
```

This executes each step in order using the same station runtime, so counters accumulate naturally across the sequence.

Step format:

* `item:zone` = force a specific actual disposal zone
* `item` = use the correct zone automatically for that item

Examples:

```bash
uv run binsight-live-sequence --steps "aluminum-can,granola-bar:left,pickled-radish"
uv run binsight-live-sequence --steps "aluminum-can:left,granola-bar:left,pickled-radish:middle" --guidance-hold-seconds 2 --hand-seconds 1 --inter-step-seconds 1
```

Recommended prerequisites before running it:

* `devices/pi-station/.env` points to the real ESP and the real backend project
* the ESP is flashed, powered, and reachable at `ESP_ENDPOINT`
* backend Functions are deployed for the configured Firebase project
* the web app is running against the same Firebase project so you can watch the update live
* `BINSIGHT_DEVICE_ID` and `BINSIGHT_DEVICE_SHARED_SECRET` are set so the backend accepts the device publication

This is the command to use when you want to say: **“pretend the model just detected an item, and now drive the real system.”**

## Model asset layout

The Pi runtime now uses these model directories by default:

* `devices/pi-station/models/item_classification/` for item identification

You can override item-identification assets with `ITEM_CLASSIFIER_MODEL_DIR` in `devices/pi-station/.env`.

Hand presence and hand-zone tracking now come from MediaPipe Hands through the Pi camera. ESP remains responsible for LED guidance, acknowledgements, reset, and health status only. The current integration uses the existing still-image capture seam rather than a streaming camera pipeline, which keeps the runtime change small but is not yet the most performance-optimized option.

Install notes:

* local Windows development uses the regular `mediapipe` dependency path
* Raspberry Pi 5 on Linux `aarch64` is pinned to `mediapipe==0.10.14` in this repo because newer upstream wheels are not consistently published for that platform

The item-classification directory can now be either a strict manifest-based bundle or a lighter checked-in bundle. The runtime looks for these model filenames in order: `model.tflite`, `model_unquant.tflite`, `model_quant.tflite`.

Supported item-classification layout:

```text
devices/pi-station/models/item_classification/
├── model.tflite | model_unquant.tflite | model_quant.tflite
├── labels.txt
├── aliases.json              # optional when labels need remapping
└── manifest.json             # optional when defaults are sufficient
```

Asset responsibilities:

* `model.tflite | model_unquant.tflite | model_quant.tflite`: TensorFlow Lite image classifier
* `labels.txt`: ordered output labels matching the model outputs
* `aliases.json`: optional mapping from model labels to rules-preset item ids such as `aluminum-can`
* `manifest.json`: optional preprocessing and runtime metadata such as layout, normalization, resize method, and thread count

If `manifest.json` is omitted, the runtime uses defaults: RGB input, bilinear resize, automatic input-layout detection, automatic output-activation handling, and `numThreads=4`.

The checked-in `item_classification` model needs label remapping because its raw labels do not match the demo rules preset item ids directly. That mapping lives in `devices/pi-station/models/item_classification/aliases.json`.

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

On the current Phase 5 entrypoint, the runtime stays alive as the real station process. It continuously cycles through idle -> identification -> guidance -> waiting-for-disposal -> result -> reset until you stop it with `Ctrl+C`.

The terminal status log is intentionally short so it fits on one line in a small terminal, for example:

```text
[station] wait   item=aluminum-can@0.97  tgt=recycle   over=left@0.88 hands=1
```

Keep `STATION_ID`, `BINSIGHT_DEVICE_ID`, and `BINSIGHT_DEVICE_SHARED_SECRET` aligned with the backend `BINSIGHT_DEVICE_CREDENTIALS_JSON` entry for the same station before attempting a live Firebase rehearsal.

## Minimum environment

Copy `.env.example` to `.env` and adjust values for your station environment.

The minimum Phase 1 configuration set is:

* `STATION_ID`: Station document identifier used in local runtime state and device ingress payloads
* `RULES_PRESET_ID`: Active rules preset id, currently `demo-canada-ottawa`
* `RULES_PRESET_VERSION`: Active rules preset version, currently `1.0.0`
* `ITEM_CLASSIFIER_MODEL_DIR`: item-classification model asset directory, relative to `devices/pi-station/` by default
* `HAND_ABSENCE_FRAME_THRESHOLD`: number of consecutive no-hand detections required before a drop is emitted
* `HAND_MIN_DETECTION_CONFIDENCE`: MediaPipe hand-detection confidence threshold
* `HAND_MIN_TRACKING_CONFIDENCE`: MediaPipe tracking confidence threshold
* `HAND_MAX_NUM_HANDS`: maximum hands to track, default `1` for the demo station
* `ESP_ENDPOINT`: ESP8266 base URL on the shared network, for example `http://192.168.4.1`
* `FIREBASE_PROJECT_ID` or `BINSIGHT_FIREBASE_PROJECT_ID`: Firebase project id for the demo environment. The runtime prefers `FIREBASE_PROJECT_ID` when both are set, but it accepts the non-reserved `BINSIGHT_FIREBASE_PROJECT_ID` fallback for repo-local config.
* `BINSIGHT_DEVICE_ID`: Device id that will be used for authenticated backend publication
* `BINSIGHT_DEVICE_SHARED_SECRET`: Shared secret paired with the device id for backend ingress
* `DISPOSAL_TIMEOUT_SECONDS`: Wait window for disposal before the runtime resets
* `RESET_COOLDOWN_SECONDS`: Cooldown window before the station returns to idle after reset
* `CAMERA_CAPTURE_WIDTH`: captured image width for item identification and MediaPipe hand tracking
* `CAMERA_CAPTURE_HEIGHT`: captured image height for item identification and MediaPipe hand tracking
* `CAMERA_CAPTURE_FORMAT`: image format passed to the Pi camera CLI, typically `jpg`
* `CAMERA_CAPTURE_ROTATION_DEGREES`: rotation applied during capture, usually `180` for the current mounted camera orientation

Phase 1 keeps the Pi runtime on its local seams, but these values are the minimum environment story for this cycle and match the device-auth boundary the backend already validates.

TensorFlow Lite runtime notes:

* The Pi package now depends on `numpy`, `Pillow`, and `tflite-runtime` for supported Linux Python versions.
* The runtime prefers `tflite_runtime.interpreter` and falls back to `tensorflow.lite.Interpreter` when TensorFlow is already available.
* The supported Python range for this project is currently `3.11` to `3.12`.
* The repo pins `numpy<2` because the currently used prebuilt `tflite-runtime` wheel path can fail at runtime with NumPy `2.x` on Raspberry Pi Linux.

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
