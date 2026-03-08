from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
from threading import Lock, Thread
from urllib.parse import urlparse

from .camera_capture import CapturedImageSource, ImageSourceProvider


DEFAULT_CAMERA_PREVIEW_HOST = "127.0.0.1"
DEFAULT_CAMERA_PREVIEW_PORT = 8765
DEFAULT_CAMERA_PREVIEW_FRAME_PATH = "/frame.jpg"
DEFAULT_CAMERA_PREVIEW_STATUS_PATH = "/status.json"


@dataclass(slots=True, frozen=True)
class PreviewFrameSnapshot:
    frame_bytes: bytes | None
    content_type: str | None
    updated_at: str | None


class PreviewFrameStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._frame_bytes: bytes | None = None
        self._content_type: str | None = None
        self._updated_at: str | None = None

    def publish_frame(self, frame_bytes: bytes, *, content_type: str = "image/jpeg") -> None:
        updated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        with self._lock:
            self._frame_bytes = frame_bytes
            self._content_type = content_type
            self._updated_at = updated_at

    def publish_file(self, path: Path) -> None:
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        self.publish_frame(path.read_bytes(), content_type=content_type)

    def snapshot(self) -> PreviewFrameSnapshot:
        with self._lock:
            return PreviewFrameSnapshot(
                frame_bytes=self._frame_bytes,
                content_type=self._content_type,
                updated_at=self._updated_at,
            )

    def status_payload(self) -> dict[str, object]:
        snapshot = self.snapshot()
        return {
            "hasFrame": snapshot.frame_bytes is not None,
            "contentType": snapshot.content_type,
            "updatedAt": snapshot.updated_at,
        }


class _PreviewHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def _build_index_html() -> bytes:
    return f"""<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>Binsight Station Camera Preview</title>
    <style>
      :root {{
        color-scheme: dark;
        font-family: Arial, Helvetica, sans-serif;
      }}
      body {{
        margin: 0;
        background: #111827;
        color: #f3f4f6;
      }}
      main {{
        max-width: 980px;
        margin: 0 auto;
        padding: 20px;
      }}
      h1 {{
        margin: 0 0 8px;
        font-size: 1.5rem;
      }}
      p {{
        margin: 0 0 12px;
        color: #d1d5db;
      }}
      .status {{
        margin-bottom: 16px;
        font-size: 0.95rem;
      }}
      .frame-wrap {{
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 360px;
        border: 1px solid #374151;
        border-radius: 12px;
        background: #030712;
        overflow: hidden;
      }}
      img {{
        display: block;
        max-width: 100%;
        max-height: 78vh;
        object-fit: contain;
      }}
      .hint {{
        margin-top: 12px;
        color: #9ca3af;
        font-size: 0.9rem;
      }}
    </style>
  </head>
  <body>
    <main>
      <h1>Binsight Station Camera Preview</h1>
      <p>This page shows the latest frame captured by <code>binsight-station</code>.</p>
      <div class=\"status\" id=\"status\">Waiting for first frame...</div>
      <div class=\"frame-wrap\">
        <img id=\"preview\" alt=\"Latest Raspberry Pi camera frame\" hidden />
      </div>
      <div class=\"hint\">This preview refreshes automatically. Because the runtime currently captures still frames, the preview updates as new frames are processed instead of playing as smooth video.</div>
    </main>
    <script>
      const statusEl = document.getElementById('status');
      const previewEl = document.getElementById('preview');
      const framePath = '{DEFAULT_CAMERA_PREVIEW_FRAME_PATH}';
      const statusPath = '{DEFAULT_CAMERA_PREVIEW_STATUS_PATH}';

      async function refreshPreview() {{
        try {{
          const statusResponse = await fetch(`${{statusPath}}?t=${{Date.now()}}`, {{ cache: 'no-store' }});
          const status = await statusResponse.json();
          if (!status.hasFrame) {{
            previewEl.hidden = true;
            statusEl.textContent = 'Waiting for first frame...';
            return;
          }}

          previewEl.hidden = false;
          previewEl.src = `${{framePath}}?t=${{Date.now()}}`;
          statusEl.textContent = status.updatedAt
            ? `Last updated: ${{status.updatedAt}}`
            : 'Frame available';
        }} catch (_error) {{
          previewEl.hidden = true;
          statusEl.textContent = 'Preview temporarily unavailable.';
        }}
      }}

      refreshPreview();
      window.setInterval(refreshPreview, 400);
    </script>
  </body>
</html>
""".encode("utf-8")


def _build_request_handler(frame_store: PreviewFrameStore) -> type[BaseHTTPRequestHandler]:
    class PreviewRequestHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            if parsed.path in {"/", "/index.html"}:
                self._send_response(_build_index_html(), content_type="text/html; charset=utf-8")
                return

            if parsed.path == DEFAULT_CAMERA_PREVIEW_FRAME_PATH:
                snapshot = frame_store.snapshot()
                if snapshot.frame_bytes is None:
                    self._send_response(
                        b"No preview frame has been captured yet.",
                        content_type="text/plain; charset=utf-8",
                        status=HTTPStatus.NOT_FOUND,
                    )
                    return

                self._send_response(
                    snapshot.frame_bytes,
                    content_type=snapshot.content_type or "application/octet-stream",
                )
                return

            if parsed.path == DEFAULT_CAMERA_PREVIEW_STATUS_PATH:
                payload = json.dumps(frame_store.status_payload()).encode("utf-8")
                self._send_response(payload, content_type="application/json; charset=utf-8")
                return

            self._send_response(
                b"Not found",
                content_type="text/plain; charset=utf-8",
                status=HTTPStatus.NOT_FOUND,
            )

        def log_message(self, format: str, *args: object) -> None:  # noqa: A003
            del format, args
            return None

        def _send_response(
            self,
            payload: bytes,
            *,
            content_type: str,
            status: HTTPStatus = HTTPStatus.OK,
        ) -> None:
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.end_headers()
            self.wfile.write(payload)

    return PreviewRequestHandler


class CameraPreviewServer:
    def __init__(
        self,
        *,
        host: str = DEFAULT_CAMERA_PREVIEW_HOST,
        port: int = DEFAULT_CAMERA_PREVIEW_PORT,
        frame_store: PreviewFrameStore | None = None,
    ) -> None:
        self._host = host
        self._port = port
        self._frame_store = frame_store or PreviewFrameStore()
        self._server: _PreviewHTTPServer | None = None
        self._thread: Thread | None = None

    @property
    def frame_store(self) -> PreviewFrameStore:
        return self._frame_store

    @property
    def port(self) -> int:
        if self._server is None:
            return self._port
        return int(self._server.server_address[1])

    @property
    def url(self) -> str:
        return f"http://{self._host}:{self.port}/"

    def start(self) -> None:
        if self._server is not None:
            return

        server = _PreviewHTTPServer((self._host, self._port), _build_request_handler(self._frame_store))
        thread = Thread(target=server.serve_forever, name="binsight-camera-preview", daemon=True)
        thread.start()
        self._server = server
        self._thread = thread

    def close(self) -> None:
        server = self._server
        thread = self._thread
        if server is None:
            return

        self._server = None
        self._thread = None
        server.shutdown()
        server.server_close()
        if thread is not None:
            thread.join(timeout=2.0)


class PreviewingImageSourceProvider:
    def __init__(self, wrapped: ImageSourceProvider, frame_store: PreviewFrameStore) -> None:
        self._wrapped = wrapped
        self._frame_store = frame_store

    def capture_image_source(self) -> CapturedImageSource:
        captured = self._wrapped.capture_image_source()
        self._publish_preview_frame(captured)
        return captured

    def _publish_preview_frame(self, captured: CapturedImageSource) -> None:
        path = _resolve_captured_image_path(captured)
        if path is None or not path.exists():
            return

        try:
            self._frame_store.publish_file(path)
        except OSError:
            return


def _resolve_captured_image_path(captured: CapturedImageSource) -> Path | None:
    if captured.temporary_file_path is not None:
        return captured.temporary_file_path

    image_source = captured.image_source
    if image_source.startswith("file://"):
        return Path(image_source.removeprefix("file://"))
    if "://" in image_source:
        return None
    return Path(image_source)