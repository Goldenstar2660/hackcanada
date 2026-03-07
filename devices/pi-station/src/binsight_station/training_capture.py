u"""CLI entry point for config-driven training photo capture.

Usage:
    uv run binsight-training-capture

Controls:
    Press Enter to capture one photo
    Press Ctrl+C to quit
"""

from __future__ import annotations

import json
import logging
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any

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
    """Small wrapper around Raspberry Pi camera CLI tools."""

    def __init__(self, *, width: int, height: int) -> None:
        self.width = width
        self.height = height
        self._camera_command: str | None = None

    def start(self) -> None:
        self._camera_command = _detect_camera_command()

    def capture_image(self, file_path: Path, *, cfg: dict[str, Any]) -> None:
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

        completed = subprocess.run(command, capture_output=True, text=True)
        if completed.returncode != 0:
            stderr = completed.stderr.strip() or completed.stdout.strip()
            raise RuntimeError(stderr or f"{self._camera_command} failed")

    def stop(self) -> None:
        self._camera_command = None


def _detect_camera_command() -> str:
    for candidate in ("rpicam-still", "libcamera-still"):
        resolved = shutil.which(candidate)
        if resolved:
            return resolved

    raise RuntimeError(
        "No Raspberry Pi still-image camera command was found. Install or enable "
        "'rpicam-still' (or 'libcamera-still') on the Raspberry Pi first."
    )


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
    swap_rb = cfg["swapRedBlue"]

    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"[CAPTURE] Saving to: {out_dir}")

    try:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        file_path = out_dir / f"{cfg['label']}_{ts}.{fmt}"
        if swap_rb:
            logger.warning(
                "swapRedBlue=true is not supported by rpicam-still/libcamera-still; ignoring setting"
            )

        camera.capture_image(file_path, cfg=cfg)
        print(f"[CAPTURE] Saved: {file_path.name}")
        return 1
    except Exception as exc:  # pragma: no cover - hardware interaction
        logger.exception("Capture/save error")
        print(f"[ERROR] Capture/save failed: {exc}")
        return 0


def main() -> int:
    base_dir = _PROJECT_ROOT

    print("=" * 64)
    print("  Binsight Training Photo Capture")
    print("=" * 64)
    print("  Command: uv run binsight-training-capture")
    print(f"  Config: {_CONFIG_PATH}")
    print("  Config is reloaded each time you press Enter to CAPTURE")
    print("  Control: Press Enter to capture one photo, Ctrl+C to quit")
    print("  Camera backend: rpicam-still/libcamera-still")
    print("=" * 64)

    try:
        while True:
            input()
            cfg = _load_config()
            output_root = base_dir / cfg["outputDir"]
            output_dir = output_root / cfg["label"]
            output_dir.mkdir(parents=True, exist_ok=True)

            print("[CONFIG] Loaded:")
            print(f"  Label: {cfg['label']}")
            print(f"  Output: {output_dir}")
            print(f"  Resolution: {cfg['width']}x{cfg['height']}")
            print(f"  Interval: {cfg['intervalSeconds']}s (ignored in manual mode)")
            print(f"  maxPhotosPerRun: {cfg['maxPhotosPerRun']} (ignored in manual mode)")
            print(f"  Format: {cfg['imageFormat']} | jpegQuality: {cfg['jpegQuality']}")
            print(f"  flip180: {cfg['flip180']} | swapRedBlue: {cfg['swapRedBlue']}")

            camera = PiCameraCapture(width=cfg["width"], height=cfg["height"])
            try:
                camera.start()
                captured = _capture_loop(camera, output_dir, cfg)
            finally:
                camera.stop()

            print(f"[STATE] Photos captured this keypress: {captured}")
            print("[STATE] Press Enter to capture another photo, or Ctrl+C to quit.")

    except (KeyboardInterrupt, EOFError):
        print("\n[INFO] Exiting...")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())