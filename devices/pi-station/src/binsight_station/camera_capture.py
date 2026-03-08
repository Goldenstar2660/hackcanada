from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import shutil
import subprocess
import tempfile
from typing import Callable, Protocol


class CameraCaptureError(RuntimeError):
    pass


@dataclass(slots=True, frozen=True)
class CameraCaptureSettings:
    width: int
    height: int
    image_format: str = "jpg"
    rotation_degrees: int = 0
    timeout_milliseconds: int = 1


@dataclass(slots=True)
class CapturedImageSource:
    image_source: str
    temporary_file_path: Path | None = None

    def cleanup(self) -> None:
        if self.temporary_file_path is None:
            return
        self.temporary_file_path.unlink(missing_ok=True)


class ImageSourceProvider(Protocol):
    def capture_image_source(self) -> CapturedImageSource: ...


class PiCameraImageSourceProvider:
    def __init__(
        self,
        settings: CameraCaptureSettings,
        *,
        command_resolver: Callable[[], str] | None = None,
    ) -> None:
        self._settings = settings
        self._command_resolver = _detect_camera_command if command_resolver is None else command_resolver

    def capture_image_source(self) -> CapturedImageSource:
        camera_command = self._command_resolver()
        suffix = f".{self._settings.image_format}"
        with tempfile.NamedTemporaryFile(prefix="binsight-frame-", suffix=suffix, delete=False) as handle:
            output_path = Path(handle.name)

        command = [
            camera_command,
            "--immediate",
            "--nopreview",
            "--output",
            str(output_path),
            "--width",
            str(self._settings.width),
            "--height",
            str(self._settings.height),
            "--encoding",
            self._settings.image_format,
            "--rotation",
            str(self._settings.rotation_degrees),
            "--timeout",
            f"{self._settings.timeout_milliseconds}ms",
        ]
        completed = subprocess.run(command, capture_output=True, text=True)
        if completed.returncode != 0:
            output_path.unlink(missing_ok=True)
            stderr = completed.stderr.strip() or completed.stdout.strip()
            raise CameraCaptureError(stderr or f"{camera_command} failed to capture an image")

        return CapturedImageSource(
            image_source=str(output_path),
            temporary_file_path=output_path,
        )


def _detect_camera_command() -> str:
    for candidate in ("rpicam-still", "libcamera-still"):
        resolved = shutil.which(candidate)
        if resolved:
            return resolved

    raise CameraCaptureError(
        "No Raspberry Pi still-image camera command was found. Install or enable "
        "'rpicam-still' (or 'libcamera-still') on the Raspberry Pi first."
    )