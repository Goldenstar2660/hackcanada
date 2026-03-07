from __future__ import annotations

from collections.abc import Callable

from .events import DisposalEvent
from .live_status import LiveStatus


class PublicationError(RuntimeError):
    pass


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

    @property
    def cloud_sync_status(self) -> str:
        return self._cloud_sync_status

    def publish_disposal_event(self, event: DisposalEvent) -> dict[str, object]:
        payload = event.to_payload()
        self._publish(payload, self._disposal_event_sink, self.published_events, "disposal event")
        return payload

    def publish_live_status(self, status: LiveStatus) -> dict[str, object]:
        payload = status.to_payload()
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