from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from time import monotonic
from typing import Callable

from dotenv import load_dotenv

from .classification import ClassificationPipeline, ClassificationRequest
from .esp_client import EspClient, GuidanceCommand
from .events import DisposalEvent, create_disposal_event
from .lcd_client import LcdClient
from .live_status import DeviceHealth, LiveStatus, LiveStatusPublisher
from .publishers import PublicationAdapter, PublicationError
from .rules import RulesPreset, load_rules_preset
from .session import SessionPhase, SessionSnapshot, SessionStateMachine, SessionTimingConfig


@dataclass(slots=True)
class RuntimeSettings:
    station_id: str
    rules_preset_id: str
    rules_preset_version: str
    esp_endpoint: str
    firebase_project_id: str
    presence_debounce_seconds: float
    disposal_timeout_seconds: float
    reset_cooldown_seconds: float


def load_runtime_settings() -> RuntimeSettings:
    project_root = Path(__file__).resolve().parents[2]
    load_dotenv(project_root / ".env")

    return RuntimeSettings(
        station_id=os.getenv("STATION_ID", "demo-station-001"),
        rules_preset_id=os.getenv("RULES_PRESET_ID", "demo-canada-ottawa"),
        rules_preset_version=os.getenv("RULES_PRESET_VERSION", "1.0.0"),
        esp_endpoint=os.getenv("ESP_ENDPOINT", "http://192.168.4.1"),
        firebase_project_id=os.getenv("FIREBASE_PROJECT_ID", "binbuddy-demo"),
        presence_debounce_seconds=float(os.getenv("PRESENCE_DEBOUNCE_SECONDS", "0.35")),
        disposal_timeout_seconds=float(os.getenv("DISPOSAL_TIMEOUT_SECONDS", "12.0")),
        reset_cooldown_seconds=float(os.getenv("RESET_COOLDOWN_SECONDS", "1.5")),
    )


class StationRuntime:
    def __init__(
        self,
        settings: RuntimeSettings,
        monotonic_clock: Callable[[], float] | None = None,
        esp_client: EspClient | None = None,
        lcd_client: LcdClient | None = None,
        publication_client: PublicationAdapter | None = None,
    ) -> None:
        self.settings = settings
        self.rules: RulesPreset = load_rules_preset(
            settings.rules_preset_id,
            settings.rules_preset_version,
        )
        self.session = SessionStateMachine(
            SessionTimingConfig(
                presence_debounce_seconds=settings.presence_debounce_seconds,
                disposal_timeout_seconds=settings.disposal_timeout_seconds,
                reset_cooldown_seconds=settings.reset_cooldown_seconds,
            )
        )
        self.classifier = ClassificationPipeline()
        self.esp_client = esp_client or EspClient(settings.esp_endpoint)
        self.lcd_client = lcd_client or LcdClient()
        self.live_status_publisher = LiveStatusPublisher()
        self.publication_client = publication_client or PublicationAdapter(settings.firebase_project_id)
        self._monotonic_clock = monotonic if monotonic_clock is None else monotonic_clock
        self.last_event: DisposalEvent | None = None
        self.last_live_status: LiveStatus | None = None
        self.lcd_client.render_standby(
            total_attempts=self.session.snapshot.total_attempts,
            total_correct_sorts=self.session.snapshot.total_correct_sorts,
        )

    def _now(self) -> float:
        return self._monotonic_clock()

    def _device_health(self) -> DeviceHealth:
        return DeviceHealth(
            pi="online",
            esp8266=self.esp_client.device_health_status,
            cloud_sync=self.publication_client.cloud_sync_status,
        )

    def _poll_esp(self) -> bool:
        previous_presence_count = self.esp_client.presence_frame_count
        self.esp_client.poll()
        return self.esp_client.presence_frame_count > previous_presence_count

    def _advance_session_entry(self, image_source: str, observed_presence_frame: bool) -> SessionSnapshot:
        snapshot = self.session.snapshot

        if snapshot.phase is SessionPhase.IDLE:
            if not observed_presence_frame or not self.esp_client.has_stable_presence:
                return snapshot
            return self.session.begin_presence_arming(self._now())

        if snapshot.phase is not SessionPhase.PRESENCE_ARMING:
            return snapshot

        now = self._now()
        if not self.esp_client.has_stable_presence:
            return self.session.cancel_presence_arming(now)
        if not observed_presence_frame or not self.session.is_presence_confirmed(now):
            return snapshot

        self.session.begin_identification(now)
        classification = self.classifier.classify(
            ClassificationRequest(
                image_source=image_source,
                confidence_threshold=self.rules.low_confidence_threshold,
            )
        )
        disposal_method = self.rules.disposal_method_for_item(classification.predicted_item)
        guidance_snapshot = self.session.set_guidance(
            classification.predicted_item,
            disposal_method,
            classification.confidence,
            classification.llm_fallback_used,
            self._now(),
        )
        self._send_guidance(guidance_snapshot)
        self.lcd_client.render_guidance(
            predicted_item=classification.predicted_item,
            disposal_method=disposal_method,
            total_attempts=guidance_snapshot.total_attempts,
            total_correct_sorts=guidance_snapshot.total_correct_sorts,
        )
        return self.session.begin_waiting_for_disposal(self._now())

    def _publish_runtime_status(
        self,
        snapshot: SessionSnapshot,
        *,
        latest_event: DisposalEvent | None = None,
        session_state_override: str | None = None,
    ) -> LiveStatus:
        status = self.live_status_publisher.build_status(
            self.settings.station_id,
            snapshot,
            latest_event=latest_event,
            device_health=self._device_health(),
            session_state_override=session_state_override,
        )
        try:
            self.publication_client.publish_live_status(status)
        except PublicationError:
            self.lcd_client.render_error("Offline publish")
            status = self.live_status_publisher.build_status(
                self.settings.station_id,
                snapshot,
                latest_event=latest_event,
                device_health=self._device_health(),
                session_state_override="error",
            )
        self.last_live_status = status
        return status

    def start_session(self, image_source: str = "camera://placeholder") -> tuple[SessionSnapshot, LiveStatus]:
        self.esp_client.request_health()
        observed_presence_frame = self._poll_esp()
        snapshot = self._advance_session_entry(image_source, observed_presence_frame)
        return snapshot, self._publish_runtime_status(snapshot, latest_event=self.last_event)

    def _send_guidance(self, snapshot: SessionSnapshot) -> None:
        if snapshot.phase is not SessionPhase.GUIDING:
            raise ValueError("guidance output requires the guidance state")
        if snapshot.correct_disposal_method is None or snapshot.predicted_item is None:
            raise ValueError("guidance output requires a resolved item and disposal method")

        self.esp_client.send_guidance(
            GuidanceCommand(
                indicator_zone=self.rules.zone_for_disposal_method(snapshot.correct_disposal_method),
            )
        )

    def sync_from_esp(self) -> LiveStatus:
        self._poll_esp()
        return self._publish_runtime_status(self.session.snapshot, latest_event=self.last_event)

    def observe_hand(self, zone: str | None, hand_present: bool) -> SessionSnapshot:
        return self.session.track_hand(zone=zone, hand_present=hand_present, now_monotonic=self._now())

    def emit_result(self) -> DisposalEvent | None:
        snapshot = self.session.snapshot
        if snapshot.phase is not SessionPhase.EMIT_RESULT or snapshot.actual_disposal_zone is None:
            return None

        event = create_disposal_event(self.settings.station_id, snapshot, self.rules)
        result_snapshot = self.session.record_result(event.success)
        self.last_event = event
        self.lcd_client.render_result(
            success=event.success,
            total_attempts=result_snapshot.total_attempts,
            total_correct_sorts=result_snapshot.total_correct_sorts,
        )
        try:
            self.publication_client.publish_disposal_event(event)
        except PublicationError:
            self._publish_runtime_status(result_snapshot, latest_event=event, session_state_override="error")
            return event

        self._publish_runtime_status(result_snapshot, latest_event=event)
        return event

    def begin_reset(self) -> SessionSnapshot:
        self.esp_client.clear_guidance()
        snapshot = self.session.begin_resetting(self._now())
        self._publish_runtime_status(snapshot, latest_event=self.last_event)
        return snapshot

    def complete_reset(self) -> SessionSnapshot:
        snapshot = self.session.complete_reset(self._now())
        self.lcd_client.render_standby(snapshot.total_attempts, snapshot.total_correct_sorts)
        self._publish_runtime_status(snapshot, latest_event=self.last_event)
        return snapshot

    def observe_disposal(
        self,
        zone: str,
        classification_image_source: str = "camera://placeholder",
    ) -> tuple[SessionSnapshot, DisposalEvent | None]:
        del classification_image_source
        self.observe_hand(zone=zone, hand_present=True)
        snapshot = self.observe_hand(zone=zone, hand_present=False)
        event = self.emit_result()
        if event is None:
            return snapshot, None

        return self.session.snapshot, event


def main() -> int:
    runtime = StationRuntime(load_runtime_settings())
    snapshot, status = runtime.start_session()
    print(
        f"station={status.station_id} phase={status.phase} item={snapshot.predicted_item} "
        f"disposal={snapshot.correct_disposal_method}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
