from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .esp_client import BackendIngressIdentity
from .events import DisposalEvent
from .live_status import LiveStatus


class PublicationError(RuntimeError):
    pass


class AuthenticatedHttpPublisher:
    def __init__(
        self,
        *,
        identity: BackendIngressIdentity,
        functions_base_url: str,
        timeout_seconds: float = 5.0,
        opener: Callable[..., object] | None = None,
    ) -> None:
        self._identity = identity
        self._functions_base_url = functions_base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds
        self._opener = opener or urlopen

    def publish(self, function_name: str, payload: dict[str, object]) -> None:
        timestamp = datetime.now(tz=timezone.utc).isoformat()
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            **self._identity.build_headers(timestamp),
        }
        request = Request(
            url=f"{self._functions_base_url}/{function_name}",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with self._opener(request, timeout=self._timeout_seconds) as response:
                response.read()
        except HTTPError as error:
            raise OSError(
                f"backend {function_name} failed with status {error.code}"
            ) from error
        except URLError as error:
            raise OSError(
                f"backend {function_name} failed: {error.reason}"
            ) from error


def build_functions_base_url(project_id: str, region: str, override: str | None = None) -> str:
    if override and override.strip():
        return override.strip().rstrip("/")
    return f"https://{region}-{project_id}.cloudfunctions.net"


class PublicationAdapter:
    """Thin publisher seam for live status and disposal events."""

    def __init__(
        self,
        project_id: str,
        disposal_event_sink: Callable[[dict[str, object]], None] | None = None,
        live_status_sink: Callable[[dict[str, object]], None] | None = None,
    ) -> None:
        self.project_id = project_id
        self._disposal_event_sink = disposal_event_sink or _noop_sink
        self._live_status_sink = live_status_sink or _noop_sink
        self.published_events: list[dict[str, object]] = []
        self.published_live_statuses: list[dict[str, object]] = []
        self._cloud_sync_status = "online"

    @classmethod
    def for_authenticated_http(
        cls,
        *,
        project_id: str,
        device_id: str,
        station_id: str,
        shared_secret: str,
        functions_region: str = "us-central1",
        functions_base_url: str | None = None,
        timeout_seconds: float = 5.0,
        opener: Callable[..., object] | None = None,
    ) -> PublicationAdapter:
        publisher = AuthenticatedHttpPublisher(
            identity=BackendIngressIdentity(
                device_id=device_id,
                station_id=station_id,
                shared_secret=shared_secret,
            ),
            functions_base_url=build_functions_base_url(
                project_id,
                functions_region,
                functions_base_url,
            ),
            timeout_seconds=timeout_seconds,
            opener=opener,
        )

        return cls(
            project_id=project_id,
            disposal_event_sink=lambda payload: publisher.publish("ingestEvent", payload),
            live_status_sink=lambda payload: publisher.publish("ingestLiveStatus", payload),
        )

    @property
    def cloud_sync_status(self) -> str:
        return self._cloud_sync_status

    def publish_disposal_event(self, event: DisposalEvent) -> dict[str, object]:
        payload = event.to_ingress_payload()
        self._publish(payload, self._disposal_event_sink, self.published_events, "disposal event")
        return payload

    def publish_live_status(self, status: LiveStatus) -> dict[str, object]:
        payload = status.to_ingress_payload()
        self._publish(payload, self._live_status_sink, self.published_live_statuses, "live status")
        return payload

    def _publish(
        self,
        payload: dict[str, object],
        sink: Callable[[dict[str, object]], None],
        history: list[dict[str, object]],
        label: str,
    ) -> None:
        try:
            sink(payload)
        except Exception as error:
            self._cloud_sync_status = "degraded"
            raise PublicationError(f"failed to publish {label}") from error
        self._cloud_sync_status = "online"
        history.append(payload)


def _noop_sink(payload: dict[str, object]) -> None:
    del payload