from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from .events import DisposalEvent
from .session import SessionPhase
from .session import SessionSnapshot


DEVICE_PAYLOAD_VERSION = "device.v1"


@dataclass(slots=True)
class DeviceHealth:
    pi: str = "online"
    esp8266: str = "online"
    cloud_sync: str = "online"

    def to_ingress_payload(self) -> dict[str, str]:
        return {
            "pi": self.pi,
            "esp8266": self.esp8266,
            "cloudSync": self.cloud_sync,
        }


@dataclass(slots=True)
class LatestEventSummary:
    timestamp: str
    predicted_item: str
    correct_disposal_method: str
    actual_disposal_zone: str
    success: bool

    def to_ingress_payload(self) -> dict[str, object]:
        return {
            "timestamp": self.timestamp,
            "predicted_item": self.predicted_item,
            "correct_disposal_method": self.correct_disposal_method,
            "actual_disposal_zone": self.actual_disposal_zone,
            "success": self.success,
        }


@dataclass(slots=True)
class CameraFeed:
    status: str | None = None
    storage_object_path: str | None = None
    content_type: str | None = None
    last_updated_at: str | None = None

    def to_ingress_payload(self) -> dict[str, object]:
        payload: dict[str, object] = {}
        if self.status is not None:
            payload["status"] = self.status
        if self.storage_object_path is not None:
            payload["storage_object_path"] = self.storage_object_path
        if self.content_type is not None:
            payload["content_type"] = self.content_type
        if self.last_updated_at is not None:
            payload["last_updated_at"] = self.last_updated_at
        return payload


@dataclass(slots=True)
class DeviceHealth:
    pi: str = "online"
    esp8266: str = "degraded"
    cloud_sync: str = "degraded"

    def to_payload(self) -> dict[str, str]:
        return {
            "pi": self.pi,
            "esp8266": self.esp8266,
            "cloudSync": self.cloud_sync,
        }


@dataclass(slots=True)
class LatestEventSummary:
    timestamp: str
    predicted_item: str
    correct_disposal_method: str
    actual_disposal_zone: str
    attempt_result: str

    def to_payload(self) -> dict[str, str]:
        return {
            "timestamp": self.timestamp,
            "predictedItem": self.predicted_item,
            "correctDisposalMethod": self.correct_disposal_method,
            "actualDisposalZone": self.actual_disposal_zone,
            "attemptResult": self.attempt_result,
        }


@dataclass(slots=True)
class LiveStatus:
    payload_version: str
    station_id: str
    phase: str
    predicted_item: str | None
    disposal_method: str | None
    timestamp: str
    current_hand_zone: str | None
    camera_feed_active: bool
    device_health: DeviceHealth
    latest_event: LatestEventSummary | None = None
    camera_feed: CameraFeed | None = None

    def to_ingress_payload(self) -> dict[str, object]:
        payload: dict[str, object] = {
            "payload_version": self.payload_version,
            "station_id": self.station_id,
            "phase": self.phase,
            "predicted_item": self.predicted_item,
            "disposal_method": self.disposal_method,
            "timestamp": self.timestamp,
            "current_hand_zone": self.current_hand_zone,
            "camera_feed_active": self.camera_feed_active,
            "device_health": self.device_health.to_ingress_payload(),
        }
        if self.latest_event is not None:
            payload["latest_event"] = self.latest_event.to_ingress_payload()
        if self.camera_feed is not None:
            payload["camera_feed"] = self.camera_feed.to_ingress_payload()
        return payload


class LiveStatusPublisher:
    """Publishes station state to a cloud-facing seam without binding to Firebase yet."""

    def build_status(
        self,
        station_id: str,
        snapshot: SessionSnapshot,
        latest_event: LatestEventSummary | None = None,
        camera_feed: CameraFeed | None = None,
    ) -> LiveStatus:
        return LiveStatus(
            payload_version=DEVICE_PAYLOAD_VERSION,
            station_id=station_id,
            phase=snapshot.phase.value,
            predicted_item=snapshot.predicted_item,
            disposal_method=snapshot.correct_disposal_method,
            timestamp=datetime.now(tz=timezone.utc).isoformat(),
            current_hand_zone=snapshot.latest_hand_zone,
            camera_feed_active=snapshot.phase.value != "idle",
            device_health=DeviceHealth(),
            latest_event=latest_event,
            camera_feed=camera_feed,
        )


def _session_state_for_phase(phase: SessionPhase) -> str:
    phase_mapping = {
        SessionPhase.IDLE: "idle",
        SessionPhase.PRESENCE_ARMING: "detecting-person",
        SessionPhase.IDENTIFYING: "identifying-item",
        SessionPhase.GUIDING: "guiding-user",
        SessionPhase.WAITING_FOR_DISPOSAL: "waiting-for-disposal",
        SessionPhase.EMIT_RESULT: "syncing",
        SessionPhase.RESETTING: "syncing",
    }
    return phase_mapping.get(phase, "error")


def _is_camera_feed_active(phase: SessionPhase) -> bool:
    return phase in {
        SessionPhase.IDENTIFYING,
        SessionPhase.GUIDING,
        SessionPhase.WAITING_FOR_DISPOSAL,
        SessionPhase.EMIT_RESULT,
        SessionPhase.RESETTING,
    }
