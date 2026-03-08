from __future__ import annotations

from collections import deque
from collections.abc import Sequence
import os
from dataclasses import dataclass
from pathlib import Path
from time import monotonic
from typing import Callable, Protocol

from dotenv import load_dotenv

from .camera_capture import CameraCaptureSettings, CapturedImageSource, ImageSourceProvider, PiCameraImageSourceProvider
from .classification import ClassificationPipeline, ClassificationRequest
from .esp_client import EspClient, GuidanceCommand
from .events import DisposalEvent, create_disposal_event
from .lcd_client import LcdClient
from .live_status import DeviceHealth, LiveStatus, LiveStatusPublisher
from .publishers import PublicationAdapter, PublicationError
from .rules import RulesPreset, load_rules_preset
from .session import SessionPhase, SessionSnapshot, SessionStateMachine, SessionTimingConfig


DEFAULT_DEMO_CLASSIFICATION_SOURCE = "demo://plastic-bottle"


@dataclass(slots=True, frozen=True)
class HandTrackingObservation:
    zone: str | None
    hand_present: bool


class HandTrackingInput(Protocol):
    def observe(self, *, hand_present: bool, snapshot: SessionSnapshot) -> HandTrackingObservation | None: ...


class DeterministicHandTracker:
    def __init__(self, zones: Sequence[str] = ("left",)) -> None:
        resolved_zones = tuple(zone.strip().lower() for zone in zones if zone.strip())
        if not resolved_zones:
            raise ValueError("deterministic hand tracker requires at least one zone")
        for zone in resolved_zones:
            if zone not in {"left", "middle", "right"}:
                raise ValueError(f"unsupported deterministic hand-tracking zone: {zone}")

        self._zones = deque(resolved_zones)
        self._active_zone: str | None = None

    def observe(self, *, hand_present: bool, snapshot: SessionSnapshot) -> HandTrackingObservation | None:
        del snapshot

        if hand_present:
            if self._active_zone is None:
                self._active_zone = self._zones[0]
                if len(self._zones) > 1:
                    self._zones.rotate(-1)
            return HandTrackingObservation(zone=self._active_zone, hand_present=True)

        if self._active_zone is None:
            return None

        self._active_zone = None
        return HandTrackingObservation(zone=None, hand_present=False)


@dataclass(slots=True)
class RuntimeSettings:
    station_id: str
    rules_preset_id: str
    rules_preset_version: str
    item_classifier_model_dir: Path
    esp_endpoint: str
    firebase_project_id: str
    firebase_functions_region: str
    firebase_functions_base_url: str | None
    binsight_device_id: str | None
    binsight_device_shared_secret: str | None
    publication_timeout_seconds: float
    disposal_timeout_seconds: float
    reset_cooldown_seconds: float
    camera_capture_width: int = 640
    camera_capture_height: int = 480
    camera_capture_format: str = "jpg"
    camera_capture_rotation_degrees: int = 180


def load_runtime_settings() -> RuntimeSettings:
    project_root = Path(__file__).resolve().parents[2]
    load_dotenv(project_root / ".env")
    firebase_project_id = os.getenv("FIREBASE_PROJECT_ID") or os.getenv("BINSIGHT_FIREBASE_PROJECT_ID") or "binsight-demo"
    model_dir = os.getenv("ITEM_CLASSIFIER_MODEL_DIR")
    resolved_model_dir = Path(model_dir) if model_dir else project_root / "models" / "item_classifier"
    if not resolved_model_dir.is_absolute():
        resolved_model_dir = project_root / resolved_model_dir

    return RuntimeSettings(
        station_id=os.getenv("STATION_ID", "demo-station-001"),
        rules_preset_id=os.getenv("RULES_PRESET_ID", "demo-canada-ottawa"),
        rules_preset_version=os.getenv("RULES_PRESET_VERSION", "1.0.0"),
        item_classifier_model_dir=resolved_model_dir.resolve(),
        esp_endpoint=os.getenv("ESP_ENDPOINT", "http://192.168.4.1"),
        firebase_project_id=firebase_project_id,
        firebase_functions_region=os.getenv("FIREBASE_FUNCTIONS_REGION", "us-central1"),
        firebase_functions_base_url=_optional_env("FIREBASE_FUNCTIONS_BASE_URL"),
        binsight_device_id=_optional_env("BINSIGHT_DEVICE_ID"),
        binsight_device_shared_secret=_optional_env("BINSIGHT_DEVICE_SHARED_SECRET"),
        publication_timeout_seconds=float(os.getenv("BINSIGHT_PUBLICATION_TIMEOUT_SECONDS", "5.0")),
        disposal_timeout_seconds=float(os.getenv("DISPOSAL_TIMEOUT_SECONDS", "12.0")),
        reset_cooldown_seconds=float(os.getenv("RESET_COOLDOWN_SECONDS", "1.5")),
        camera_capture_width=int(os.getenv("CAMERA_CAPTURE_WIDTH", "640")),
        camera_capture_height=int(os.getenv("CAMERA_CAPTURE_HEIGHT", "480")),
        camera_capture_format=os.getenv("CAMERA_CAPTURE_FORMAT", "jpg").strip().lower() or "jpg",
        camera_capture_rotation_degrees=int(os.getenv("CAMERA_CAPTURE_ROTATION_DEGREES", "180")),
    )


def _optional_env(name: str) -> str | None:
    value = os.getenv(name)
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _normalize_demo_predicted_item(predicted_item: str) -> str:
    normalized = predicted_item.strip().replace("_", "-").replace(" ", "-").lower()
    if not normalized:
        raise ValueError("predicted_item is required")
    return normalized


def create_publication_adapter(settings: RuntimeSettings) -> PublicationAdapter:
    if not settings.binsight_device_id or not settings.binsight_device_shared_secret:
        return PublicationAdapter(settings.firebase_project_id)

    return PublicationAdapter.for_authenticated_http(
        project_id=settings.firebase_project_id,
        device_id=settings.binsight_device_id,
        station_id=settings.station_id,
        shared_secret=settings.binsight_device_shared_secret,
        functions_region=settings.firebase_functions_region,
        functions_base_url=settings.firebase_functions_base_url,
        timeout_seconds=settings.publication_timeout_seconds,
    )


class StationRuntime:
    def __init__(
        self,
        settings: RuntimeSettings,
        monotonic_clock: Callable[[], float] | None = None,
        esp_client: EspClient | None = None,
        lcd_client: LcdClient | None = None,
        publication_client: PublicationAdapter | None = None,
        hand_tracking_input: HandTrackingInput | None = None,
        image_source_provider: ImageSourceProvider | None = None,
        classifier: ClassificationPipeline | None = None,
    ) -> None:
        self.settings = settings
        self.rules: RulesPreset = load_rules_preset(
            settings.rules_preset_id,
            settings.rules_preset_version,
        )
        self.session = SessionStateMachine(
            SessionTimingConfig(
                disposal_timeout_seconds=settings.disposal_timeout_seconds,
                reset_cooldown_seconds=settings.reset_cooldown_seconds,
            )
        )
        self.classifier = classifier or ClassificationPipeline(model_dir=settings.item_classifier_model_dir)
        self.esp_client = esp_client or EspClient(settings.esp_endpoint)
        self.lcd_client = lcd_client or LcdClient()
        self.live_status_publisher = LiveStatusPublisher()
        self.publication_client = publication_client or create_publication_adapter(settings)
        self.hand_tracking_input = hand_tracking_input or DeterministicHandTracker()
        self.image_source_provider = image_source_provider or PiCameraImageSourceProvider(
            CameraCaptureSettings(
                width=settings.camera_capture_width,
                height=settings.camera_capture_height,
                image_format=settings.camera_capture_format,
                rotation_degrees=settings.camera_capture_rotation_degrees,
            )
        )
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

    def _advance_session_entry(self, image_source: str | None) -> SessionSnapshot:
        snapshot = self.session.snapshot

        if snapshot.phase is not SessionPhase.IDLE:
            return snapshot

        captured_image: CapturedImageSource | None = None
        classification_source = image_source
        if classification_source is None:
            captured_image = self.image_source_provider.capture_image_source()
            classification_source = captured_image.image_source

        self.session.begin_identification(self._now())
        try:
            classification = self.classifier.classify(
                ClassificationRequest(
                    image_source=classification_source,
                    confidence_threshold=self.rules.low_confidence_threshold,
                )
            )
        finally:
            if captured_image is not None:
                captured_image.cleanup()

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

    def _consume_hand_tracking(
        self,
        observed_presence_frame: bool,
        *,
        tracking_active_before_poll: bool,
    ) -> tuple[SessionSnapshot, bool]:
        snapshot = self.session.snapshot
        if (
            not tracking_active_before_poll
            or snapshot.phase is not SessionPhase.WAITING_FOR_DISPOSAL
            or not observed_presence_frame
        ):
            return snapshot, False

        observation = self.hand_tracking_input.observe(
            hand_present=self.esp_client.last_presence.hand_present,
            snapshot=snapshot,
        )
        if observation is None:
            return snapshot, False

        updated_snapshot = self.observe_hand(
            zone=observation.zone,
            hand_present=observation.hand_present,
        )
        if updated_snapshot.phase is not SessionPhase.EMIT_RESULT:
            return updated_snapshot, False

        self.emit_result()
        return self.session.snapshot, True

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
            status = self.live_status_publisher.build_status(
                self.settings.station_id,
                snapshot,
                latest_event=latest_event,
                device_health=self._device_health(),
                session_state_override=session_state_override,
            )
        self.last_live_status = status
        return status

    def start_session(self, image_source: str | None = None) -> tuple[SessionSnapshot, LiveStatus]:
        tracking_active_before_poll = self.session.snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
        self.esp_client.request_health()
        observed_presence_frame = self._poll_esp()
        snapshot = self._advance_session_entry(image_source)
        snapshot, emitted_result = self._consume_hand_tracking(
            observed_presence_frame,
            tracking_active_before_poll=tracking_active_before_poll,
        )
        if emitted_result and self.last_live_status is not None:
            return snapshot, self.last_live_status
        return snapshot, self._publish_runtime_status(snapshot, latest_event=self.last_event)

    def start_demo_session(
        self,
        predicted_item: str,
        *,
        model_confidence: float = 0.97,
        llm_fallback_used: bool = False,
    ) -> tuple[SessionSnapshot, LiveStatus]:
        snapshot = self.session.snapshot
        if snapshot.phase is not SessionPhase.IDLE:
            raise ValueError("demo session requires the station to be idle")

        normalized_item = _normalize_demo_predicted_item(predicted_item)
        disposal_method = self.rules.disposal_method_for_item(normalized_item)

        self.esp_client.request_health()
        self._poll_esp()

        self.session.begin_identification(self._now())
        guidance_snapshot = self.session.set_guidance(
            normalized_item,
            disposal_method,
            model_confidence,
            llm_fallback_used,
            self._now(),
        )
        self._send_guidance(guidance_snapshot)
        self.lcd_client.render_guidance(
            predicted_item=normalized_item,
            disposal_method=disposal_method,
            total_attempts=guidance_snapshot.total_attempts,
            total_correct_sorts=guidance_snapshot.total_correct_sorts,
        )
        waiting_snapshot = self.session.begin_waiting_for_disposal(self._now())
        return waiting_snapshot, self._publish_runtime_status(waiting_snapshot, latest_event=self.last_event)

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
        tracking_active_before_poll = self.session.snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
        self.esp_client.request_health()
        observed_presence_frame = self._poll_esp()
        snapshot, emitted_result = self._consume_hand_tracking(
            observed_presence_frame,
            tracking_active_before_poll=tracking_active_before_poll,
        )
        if emitted_result and self.last_live_status is not None:
            return self.last_live_status
        return self._publish_runtime_status(snapshot, latest_event=self.last_event)

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
            self._publish_runtime_status(result_snapshot, latest_event=event)
            return event

        self._publish_runtime_status(result_snapshot, latest_event=event)
        return event

    def begin_reset(self) -> SessionSnapshot:
        self.esp_client.clear_guidance()
        snapshot = self.session.begin_resetting(self._now())
        self.lcd_client.render_reset(snapshot.total_attempts, snapshot.total_correct_sorts)
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
        classification_image_source: str | None = None,
    ) -> tuple[SessionSnapshot, DisposalEvent | None]:
        del classification_image_source
        self.observe_hand(zone=zone, hand_present=True)
        snapshot = self.observe_hand(zone=zone, hand_present=False)
        event = self.emit_result()
        if event is None:
            return snapshot, None

        return self.session.snapshot, event

    def close(self) -> None:
        self.lcd_client.close()


def main() -> int:
    runtime = StationRuntime(load_runtime_settings())
    try:
        snapshot, status = runtime.start_session()
        print(
            f"station={status.station_id} phase={status.phase} item={snapshot.predicted_item} "
            f"disposal={snapshot.correct_disposal_method}"
        )
        return 0
    finally:
        runtime.close()


if __name__ == "__main__":
    raise SystemExit(main())
