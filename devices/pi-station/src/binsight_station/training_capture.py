u"""CLI entry point for config-driven training photo capture.

Usage:
    uv run binsight-training-capture

Controls:
    Press Enter to start capture
    Press Enter again to stop capture
    Press Ctrl+C to quit
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime
from pathlib import Path
from time import sleep
from typing import Any

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


class PiCameraCapture:
    """Small Picamera2 wrapper that matches the original script flow."""

    def __init__(self, *, width: int, height: int) -> None:
        self.width = width
        self.height = height
        self._camera: Any | None = None

    def start(self) -> None:
        try:
            from picamera2 import Picamera2  # type: ignore[import-not-found]
        except ImportError as exc:  # pragma: no cover - depends on Pi environment
            raise RuntimeError(
                "Picamera2 is not installed. Run 'uv sync' on the Raspberry Pi and ensure "
                "libcamera/picamera2 are available."
            ) from exc

        self._camera = Picamera2()
        preview_config = self._camera.create_preview_configuration(
            main={"size": (self.width, self.height), "format": "RGB888"}
        )
        self._camera.configure(preview_config)
        self._camera.start()
        sleep(0.2)

    def capture_frame(self) -> Any:
        if self._camera is None:
            raise RuntimeError("Camera has not been started")
        return self._camera.capture_array()

    def stop(self) -> None:
        if self._camera is None:
            return
        try:
            self._camera.stop()
        finally:
            close = getattr(self._camera, "close", None)
            if callable(close):
                close()
            self._camera = None


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


def _swap_red_blue(image: Image.Image) -> Image.Image:
    red, green, blue = image.split()
    return Image.merge("RGB", (blue, green, red))


def _capture_loop(
    camera: PiCameraCapture,
    out_dir: Path,
    cfg: dict[str, Any],
    stop_event: threading.Event,
) -> int:
    interval = cfg["intervalSeconds"]
    fmt = cfg["imageFormat"]
    quality = cfg["jpegQuality"]
    max_photos = cfg["maxPhotosPerRun"]
    flip180 = cfg["flip180"]
    swap_rb = cfg["swapRedBlue"]

    count = 0
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"[CAPTURE] Saving to: {out_dir}")

    while not stop_event.is_set():
        try:
            frame = camera.capture_frame()
            image = Image.fromarray(frame).convert("RGB")

            if swap_rb:
                image = _swap_red_blue(image)

            if flip180:
                image = image.transpose(Image.Transpose.ROTATE_180)

            ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            file_path = out_dir / f"{cfg['label']}_{ts}.{fmt}"

            save_kwargs: dict[str, Any] = {}
            if fmt in {"jpg", "jpeg"}:
                save_kwargs["quality"] = quality
            image.save(file_path, **save_kwargs)

            count += 1
            print(f"[CAPTURE] #{count}: {file_path.name}")
        except Exception as exc:  # pragma: no cover - hardware interaction
            logger.exception("Capture/save error")
            print(f"[ERROR] Capture/save failed: {exc}")
            stop_event.set()
            break

        if max_photos > 0 and count >= max_photos:
            print(f"[CAPTURE] Reached maxPhotosPerRun={max_photos}; auto-stopping.")
            stop_event.set()
            break

        stop_event.wait(timeout=interval)

    return count


def main() -> int:
    base_dir = _PROJECT_ROOT

    print("=" * 64)
    print("  Binsight Training Photo Capture")
    print("=" * 64)
    print("  Command: uv run binsight-training-capture")
    print(f"  Config: {_CONFIG_PATH}")
    print("  Config is reloaded each time you press Enter to START")
    print("  Control: Press Enter to START, Enter again to STOP, Ctrl+C to quit")
    print("=" * 64)

    running = False
    stop_event = threading.Event()
    capture_thread: threading.Thread | None = None
    camera: PiCameraCapture | None = None
    cfg: dict[str, Any] = {}
    output_dir: Path | None = None
    run_photo_count = 0

    def _run_capture() -> None:
        nonlocal run_photo_count
        assert camera is not None
        assert output_dir is not None
        run_photo_count = _capture_loop(camera, output_dir, cfg, stop_event)

    try:
        while True:
            input()
            if not running:
                cfg = _load_config()
                output_root = base_dir / cfg["outputDir"]
                output_dir = output_root / cfg["label"]
                output_dir.mkdir(parents=True, exist_ok=True)

                print("[CONFIG] Loaded:")
                print(f"  Label: {cfg['label']}")
                print(f"  Output: {output_dir}")
                print(f"  Resolution: {cfg['width']}x{cfg['height']}")
                print(f"  Interval: {cfg['intervalSeconds']}s")
                print(f"  Format: {cfg['imageFormat']} | jpegQuality: {cfg['jpegQuality']}")
                print(f"  flip180: {cfg['flip180']} | swapRedBlue: {cfg['swapRedBlue']}")

                camera = PiCameraCapture(width=cfg["width"], height=cfg["height"])
                camera.start()

                stop_event.clear()
                run_photo_count = 0
                capture_thread = threading.Thread(target=_run_capture, daemon=True)
                capture_thread.start()
                running = True
                print("[STATE] Capture started.")
            else:
                stop_event.set()
                if capture_thread is not None:
                    capture_thread.join(timeout=5)
                if camera is not None:
                    camera.stop()
                    camera = None
                running = False
                print(f"[STATE] Capture stopped. Photos this run: {run_photo_count}")
                print("[STATE] Press Enter to start again, or Ctrl+C to quit.")

    except KeyboardInterrupt:
        print("\n[INFO] Exiting...")
    finally:
        if running:
            stop_event.set()
            if capture_thread is not None:
                capture_thread.join(timeout=5)
        if camera is not None:
            camera.stop()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())