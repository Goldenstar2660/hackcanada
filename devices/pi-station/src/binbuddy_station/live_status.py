from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from .events import DisposalEvent
from .session import SessionPhase
from .session import SessionSnapshot


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
    station_id: str
    timestamp: str
    session_state: str
    camera_feed_active: bool
    current_detected_item: str | None
    current_disposal_method: str | None
    current_hand_zone: str | None
    device_health: DeviceHealth
    latest_event: LatestEventSummary | None = None

    @property
    def phase(self) -> str:
        return self.session_state

    @property
    def predicted_item(self) -> str | None:
        return self.current_detected_item

    @property
    def disposal_method(self) -> str | None:
        return self.current_disposal_method

    def to_payload(self) -> dict[str, object]:
        return {
            "stationId": self.station_id,
            "timestamp": self.timestamp,
            "sessionState": self.session_state,
            "cameraFeedActive": self.camera_feed_active,
            "currentDetectedItem": self.current_detected_item,
            "currentDisposalMethod": self.current_disposal_method,
            "currentHandZone": self.current_hand_zone,
            "deviceHealth": self.device_health.to_payload(),
            "latestEvent": None if self.latest_event is None else self.latest_event.to_payload(),
        }


class LiveStatusPublisher:
    """Publishes station state to a cloud-facing seam without binding to Firebase yet."""

    def build_status(
        self,
        station_id: str,
        snapshot: SessionSnapshot,
        latest_event: DisposalEvent | None = None,
        device_health: DeviceHealth | None = None,
        session_state_override: str | None = None,
    ) -> LiveStatus:
        resolved_device_health = device_health or DeviceHealth()
        return LiveStatus(
            station_id=station_id,
            timestamp=datetime.now(tz=timezone.utc).isoformat(),
            session_state=session_state_override or _session_state_for_phase(snapshot.phase),
            camera_feed_active=_is_camera_feed_active(snapshot.phase),
            current_detected_item=snapshot.predicted_item,
            current_disposal_method=snapshot.correct_disposal_method,
            current_hand_zone=snapshot.latest_hand_zone,
            device_health=resolved_device_health,
            latest_event=None if latest_event is None else LatestEventSummary(
                timestamp=latest_event.timestamp,
                predicted_item=latest_event.predicted_item,
                correct_disposal_method=latest_event.correct_disposal_method,
                actual_disposal_zone=latest_event.actual_disposal_zone,
                attempt_result=latest_event.attempt_result,
            ),
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
