"""CLI entry point for config-driven training photo capture.

Usage:
    uv run binsight-training-capture

Controls:
    Captures automatically at the configured interval
    Press Ctrl+C to quit
"""

from __future__ import annotations

import json
import logging
from io import BytesIO
import shutil
import subprocess
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Protocol

from PIL import Image

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_CONFIG_PATH = _PROJECT_ROOT / "config" / "training_capture.json"
_DEFAULT_CONFIG = {
    "outputDir": "training_data",
    "label": "engaged",
    "intervalSeconds": 0.5,
    "width": 640,
    "height": 480,
    "imageFormat": "jpg",
    "jpegQuality": 95,
    "maxPhotosPerRun": 0,
    "flip180": True,
    "swapRedBlue": False,
}


@dataclass(slots=True)
class CaptureTimings:
    capture_seconds: float
    save_seconds: float


class CameraBackend(Protocol):
    description: str

    def start(self) -> None: ...

    def capture_image(self, file_path: Path, *, cfg: dict[str, Any]) -> CaptureTimings: ...

    def stop(self) -> None: ...


class PiCameraCapture:
    """High-level wrapper around Raspberry Pi camera backends."""

    def __init__(self, *, width: int, height: int, interval_seconds: float) -> None:
        self.width = width
        self.height = height
        self.interval_seconds = interval_seconds
        self._backend: CameraBackend | None = None
        self.description = "uninitialized"

    def start(self, *, cfg: dict[str, Any]) -> None:
        backends: list[CameraBackend] = [
            PersistentMjpegCameraBackend(
                width=self.width,
                height=self.height,
                interval_seconds=self.interval_seconds,
                rotation_degrees=180 if cfg["flip180"] else 0,
            ),
            StillImageCliCameraBackend(width=self.width, height=self.height),
        ]

        errors: list[str] = []
        for backend in backends:
            try:
                backend.start()
                self._backend = backend
                self.description = backend.description
                if isinstance(backend, StillImageCliCameraBackend) and self.interval_seconds <= 0.25:
                    logger.warning(
                        "Falling back to one-shot still captures. Requested %.3fs cadence will likely "
                        "not be achievable without a persistent camera backend.",
                        self.interval_seconds,
                    )
                return
            except Exception as exc:
                errors.append(f"{backend.description}: {exc}")

        raise RuntimeError(
            "Unable to start any supported camera backend. "
            + " | ".join(errors)
        )

    def capture_image(self, file_path: Path, *, cfg: dict[str, Any]) -> CaptureTimings:
        if self._backend is None:
            raise RuntimeError("Camera has not been started")

        return self._backend.capture_image(file_path, cfg=cfg)

    def stop(self) -> None:
        if self._backend is None:
            return

        self._backend.stop()
        self._backend = None
        self.description = "stopped"


class StillImageCliCameraBackend:
    """One subprocess per frame. Reliable, but not suitable for high-rate capture."""

    description = "rpicam-still/libcamera-still (one-shot subprocess per photo)"

    def __init__(self, *, width: int, height: int) -> None:
        self.width = width
        self.height = height
        self._camera_command: str | None = None

    def start(self) -> None:
        self._camera_command = _detect_still_camera_command()

    def capture_image(self, file_path: Path, *, cfg: dict[str, Any]) -> CaptureTimings:
        if self._camera_command is None:
            raise RuntimeError("Camera has not been started")

        rotation = 180 if cfg["flip180"] else 0
        fmt = cfg["imageFormat"]
        command = [
            self._camera_command,
            "--immediate",
            "--nopreview",
            "--output",
            str(file_path),
            "--width",
            str(self.width),
            "--height",
            str(self.height),
            "--encoding",
            fmt,
            "--rotation",
            str(rotation),
            "--timeout",
            "1ms",
        ]

        if fmt in {"jpg", "jpeg"}:
            command.extend(["--quality", str(cfg["jpegQuality"])])

        started_at = time.monotonic()
        completed = subprocess.run(command, capture_output=True, text=True)
        capture_seconds = time.monotonic() - started_at
        if completed.returncode != 0:
            stderr = completed.stderr.strip() or completed.stdout.strip()
            raise RuntimeError(stderr or f"{self._camera_command} failed")

        return CaptureTimings(capture_seconds=capture_seconds, save_seconds=0.0)

    def stop(self) -> None:
        self._camera_command = None


class PersistentMjpegCameraBackend:
    """Long-lived MJPEG stream backend for interval-accurate capture."""

    description = "rpicam-vid/libcamera-vid MJPEG stream (persistent process)"

    def __init__(
        self,
        *,
        width: int,
        height: int,
        interval_seconds: float,
        rotation_degrees: int,
    ) -> None:
        self.width = width
        self.height = height
        self.interval_seconds = interval_seconds
        self.rotation_degrees = rotation_degrees
        self._video_command: str | None = None
        self._process: subprocess.Popen[bytes] | None = None
        self._buffer = bytearray()

    def start(self) -> None:
        self._video_command = _detect_video_camera_command()
        framerate = min(90.0, max(1.0, 1.0 / self.interval_seconds))
        command = [
            self._video_command,
            "--nopreview",
            "--codec",
            "mjpeg",
            "--output",
            "-",
            "--width",
            str(self.width),
            "--height",
            str(self.height),
            "--rotation",
            str(self.rotation_degrees),
            "--framerate",
            f"{framerate:.3f}",
            "--timeout",
            "0",
        ]
        self._process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        if self._process.stdout is None:
            raise RuntimeError(f"{self._video_command} did not provide a stdout stream")

    def capture_image(self, file_path: Path, *, cfg: dict[str, Any]) -> CaptureTimings:
        capture_started_at = time.monotonic()
        frame_bytes = self._read_next_jpeg_frame()
        capture_seconds = time.monotonic() - capture_started_at

        save_started_at = time.monotonic()
        _save_frame_bytes(frame_bytes, file_path, cfg=cfg)
        save_seconds = time.monotonic() - save_started_at

        return CaptureTimings(capture_seconds=capture_seconds, save_seconds=save_seconds)

    def _read_next_jpeg_frame(self) -> bytes:
        process = self._require_process()
        if process.stdout is None:
            raise RuntimeError("Camera stream stdout is unavailable")

        start_marker = b"\xff\xd8"
        end_marker = b"\xff\xd9"

        while True:
            start_index = self._buffer.find(start_marker)
            if start_index != -1:
                if start_index > 0:
                    del self._buffer[:start_index]
                    start_index = 0

                end_index = self._buffer.find(end_marker, start_index + len(start_marker))
                if end_index != -1:
                    frame_end = end_index + len(end_marker)
                    frame_bytes = bytes(self._buffer[:frame_end])
                    del self._buffer[:frame_end]
                    return frame_bytes

            chunk = process.stdout.read(64 * 1024)
            if not chunk:
                stderr = b""
                if process.stderr is not None:
                    stderr = process.stderr.read()
                message = stderr.decode("utf-8", errors="replace").strip()
                raise RuntimeError(message or f"{self._video_command} stopped producing MJPEG frames")

            self._buffer.extend(chunk)
            if len(self._buffer) > 16 * 1024 * 1024:
                self._buffer = self._buffer[-4 * 1024 * 1024 :]

    def _require_process(self) -> subprocess.Popen[bytes]:
        if self._process is None:
            raise RuntimeError("Camera stream has not been started")

        return self._process

    def stop(self) -> None:
        if self._process is None:
            return

        if self._process.poll() is None:
            self._process.terminate()
            try:
                self._process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self._process.kill()
                self._process.wait(timeout=3)

        if self._process.stdout is not None:
            self._process.stdout.close()
        if self._process.stderr is not None:
            self._process.stderr.close()
        self._process = None
        self._buffer.clear()


def _detect_still_camera_command() -> str:
    for candidate in ("rpicam-still", "libcamera-still"):
        resolved = shutil.which(candidate)
        if resolved:
            return resolved

    raise RuntimeError(
        "No Raspberry Pi still-image camera command was found. Install or enable "
        "'rpicam-still' (or 'libcamera-still') on the Raspberry Pi first."
    )


def _detect_video_camera_command() -> str:
    for candidate in ("rpicam-vid", "libcamera-vid"):
        resolved = shutil.which(candidate)
        if resolved:
            return resolved

    raise RuntimeError(
        "No Raspberry Pi video camera command was found. Install or enable "
        "'rpicam-vid' (or 'libcamera-vid') for high-rate interval capture."
    )


def _save_frame_bytes(frame_bytes: bytes, file_path: Path, *, cfg: dict[str, Any]) -> None:
    fmt = str(cfg["imageFormat"]).lower()
    swap_rb = bool(cfg["swapRedBlue"])

    if fmt in {"jpg", "jpeg"} and not swap_rb:
        file_path.write_bytes(frame_bytes)
        return

    with Image.open(BytesIO(frame_bytes)) as source_image:
        image = source_image.convert("RGB")

    if swap_rb:
        red, green, blue = image.split()
        image = Image.merge("RGB", (blue, green, red))

    save_kwargs: dict[str, Any] = {}
    if fmt in {"jpg", "jpeg"}:
        save_kwargs["quality"] = cfg["jpegQuality"]
        image.save(file_path, format="JPEG", **save_kwargs)
        return

    image.save(file_path)


def _load_config(path: Path = _CONFIG_PATH) -> dict[str, Any]:
    if not path.exists():
        logger.warning("Config %s not found, using defaults", path)
        return dict(_DEFAULT_CONFIG)

    with open(path, "r", encoding="utf-8") as f:
        user_cfg = json.load(f)

    cfg = dict(_DEFAULT_CONFIG)
    cfg.update(user_cfg)

    cfg["outputDir"] = str(cfg.get("outputDir", "training_data")).strip() or "training_data"
    cfg["intervalSeconds"] = max(0.05, float(cfg["intervalSeconds"]))
    cfg["width"] = max(64, int(cfg["width"]))
    cfg["height"] = max(64, int(cfg["height"]))
    cfg["jpegQuality"] = max(1, min(100, int(cfg["jpegQuality"])))
    cfg["label"] = str(cfg["label"]).strip() or "engaged"
    cfg["imageFormat"] = str(cfg["imageFormat"]).lower().strip() or "jpg"
    cfg["maxPhotosPerRun"] = max(0, int(cfg.get("maxPhotosPerRun", 0)))
    cfg["flip180"] = bool(cfg.get("flip180", True))
    cfg["swapRedBlue"] = bool(cfg.get("swapRedBlue", False))

    return cfg


def _capture_loop(
    camera: PiCameraCapture,
    out_dir: Path,
    cfg: dict[str, Any],
) -> int:
    fmt = cfg["imageFormat"]
    interval = cfg["intervalSeconds"]
    max_photos = cfg["maxPhotosPerRun"]

    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"[CAPTURE] Saving to: {out_dir}")
    print(f"[CAPTURE] Backend: {camera.description}")

    photo_count = 0
    report_started_at = time.monotonic()
    report_capture_seconds = 0.0
    report_save_seconds = 0.0
    report_photo_count = 0
    missed_schedule_count = 0
    next_capture_at = time.monotonic()

    while True:
        now = time.monotonic()
        sleep_seconds = next_capture_at - now
        if sleep_seconds > 0:
            time.sleep(sleep_seconds)

        loop_started_at = time.monotonic()
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        file_path = out_dir / f"{cfg['label']}_{ts}.{fmt}"

        try:
            timings = camera.capture_image(file_path, cfg=cfg)
        except Exception as exc:  # pragma: no cover - hardware interaction
            logger.exception("Capture/save error")
            print(f"[ERROR] Capture/save failed: {exc}")
            return photo_count

        photo_count += 1
        report_photo_count += 1
        report_capture_seconds += timings.capture_seconds
        report_save_seconds += timings.save_seconds

        finished_at = time.monotonic()
        behind_schedule_seconds = max(0.0, finished_at - next_capture_at - interval)
        if behind_schedule_seconds > 0:
            missed_schedule_count += 1

        if max_photos > 0 and photo_count >= max_photos:
            print(f"[INFO] Reached maxPhotosPerRun limit ({max_photos}). Exiting...")
            break

        if finished_at - report_started_at >= 1.0:
            report_window_seconds = finished_at - report_started_at
            effective_rate = report_photo_count / report_window_seconds if report_window_seconds > 0 else 0.0
            avg_capture_ms = (report_capture_seconds / report_photo_count) * 1000 if report_photo_count else 0.0
            avg_save_ms = (report_save_seconds / report_photo_count) * 1000 if report_photo_count else 0.0
            loop_ms = (finished_at - loop_started_at) * 1000
            print(
                "[STATE] "
                f"photos={photo_count} "
                f"effective_rate={effective_rate:.2f}/s "
                f"avg_capture={avg_capture_ms:.1f}ms "
                f"avg_save={avg_save_ms:.1f}ms "
                f"last_loop={loop_ms:.1f}ms "
                f"missed_intervals={missed_schedule_count} "
                f"last_file={file_path.name}"
            )
            report_started_at = finished_at
            report_capture_seconds = 0.0
            report_save_seconds = 0.0
            report_photo_count = 0

        next_capture_at += interval
        if next_capture_at < finished_at:
            skipped_intervals = int((finished_at - next_capture_at) // interval) + 1
            next_capture_at += skipped_intervals * interval

    return photo_count


def main() -> int:
    base_dir = _PROJECT_ROOT

    print("=" * 64)
    print("  Binsight Training Photo Capture")
    print("=" * 64)
    print("  Command: uv run binsight-training-capture")
    print(f"  Config: {_CONFIG_PATH}")
    print("  Control: Capturing automatically at interval, Ctrl+C to quit")
    print("  Preferred backend: rpicam-vid/libcamera-vid MJPEG stream")
    print("  Fallback backend: rpicam-still/libcamera-still (slower)")
    print("=" * 64)

    cfg = _load_config()
    output_root = base_dir / cfg["outputDir"]
    output_dir = output_root / cfg["label"]
    output_dir.mkdir(parents=True, exist_ok=True)

    print("[CONFIG] Loaded:")
    print(f"  Label: {cfg['label']}")
    print(f"  Output: {output_dir}")
    print(f"  Resolution: {cfg['width']}x{cfg['height']}")
    print(f"  Interval: {cfg['intervalSeconds']}s")
    print(f"  maxPhotosPerRun: {cfg['maxPhotosPerRun']}")
    print(f"  Format: {cfg['imageFormat']} | jpegQuality: {cfg['jpegQuality']}")
    print(f"  flip180: {cfg['flip180']} | swapRedBlue: {cfg['swapRedBlue']}")
    print("=" * 64)

    camera = PiCameraCapture(
        width=cfg["width"],
        height=cfg["height"],
        interval_seconds=cfg["intervalSeconds"],
    )
    try:
        camera.start(cfg=cfg)
        photos_captured = _capture_loop(camera, output_dir, cfg)
        print(f"[STATE] Total photos captured: {photos_captured}")

    except (KeyboardInterrupt, EOFError):
        print("\n[INFO] Exiting...")
    finally:
        camera.stop()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())