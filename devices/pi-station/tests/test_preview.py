from __future__ import annotations

import json
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import urlopen

from binsight_station.camera_capture import CapturedImageSource
from binsight_station.preview import CameraPreviewServer, PreviewFrameStore, PreviewingImageSourceProvider


class StaticCapturedImageProvider:
    def __init__(self, path: Path) -> None:
        self._path = path

    def capture_image_source(self) -> CapturedImageSource:
        return CapturedImageSource(image_source=str(self._path), temporary_file_path=self._path)


def test_preview_server_serves_html_status_and_latest_frame() -> None:
    frame_store = PreviewFrameStore()
    preview_server = CameraPreviewServer(port=0, frame_store=frame_store)
    preview_server.start()
    try:
        with urlopen(preview_server.url) as response:
            html = response.read().decode("utf-8")
        assert "Binsight Station Camera Preview" in html

        frame_store.publish_frame(b"test-frame", content_type="image/jpeg")

        with urlopen(f"{preview_server.url}status.json") as response:
            payload = json.loads(response.read().decode("utf-8"))
        assert payload["hasFrame"] is True
        assert payload["contentType"] == "image/jpeg"
        assert payload["updatedAt"] is not None

        with urlopen(f"{preview_server.url}frame.jpg") as response:
            frame = response.read()
            content_type = response.headers.get_content_type()
        assert frame == b"test-frame"
        assert content_type == "image/jpeg"
    finally:
        preview_server.close()


def test_previewing_image_source_provider_publishes_the_captured_frame() -> None:
    with TemporaryDirectory() as temp_dir:
        image_path = Path(temp_dir) / "frame.jpg"
        image_path.write_bytes(b"preview-bytes")

        frame_store = PreviewFrameStore()
        provider = PreviewingImageSourceProvider(StaticCapturedImageProvider(image_path), frame_store)

        captured = provider.capture_image_source()
        snapshot = frame_store.snapshot()

        assert captured.image_source == str(image_path)
        assert snapshot.frame_bytes == b"preview-bytes"
        assert snapshot.content_type == "image/jpeg"
        assert snapshot.updated_at is not None