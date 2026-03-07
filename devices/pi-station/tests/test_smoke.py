from binsight_station.classification import ClassificationResult
from binsight_station.esp_client import BackendIngressIdentity
from binsight_station.esp_client import EspClient
from binsight_station.esp_client import GuidanceCommand
from binsight_station.esp_client import MemoryEspTransport
from binsight_station.events import create_disposal_event
from binsight_station.lcd_client import LcdClient
from binsight_station.live_status import DeviceHealth, LiveStatusPublisher
from binsight_station.main import StationRuntime, load_runtime_settings
from binsight_station.publishers import PublicationAdapter
from binsight_station.rules import load_rules_preset
from binsight_station.session import SessionPhase, SessionStateMachine


class StubClassifier:
    def __init__(self, *results: ClassificationResult) -> None:
        self._results = list(results)
        self.calls = 0

    def classify(self, request: object) -> ClassificationResult:
        del request
        if self.calls >= len(self._results):
            raise AssertionError("classifier was called more times than expected")

        result = self._results[self.calls]
        self.calls += 1
        return result


class RecordingClassifier:
    def __init__(self, result: ClassificationResult) -> None:
        self.result = result
        self.last_request = None

    def classify(self, request: object) -> ClassificationResult:
        self.last_request = request
        return self.result


def test_runtime_starts_session_from_stable_esp_presence_frames() -> None:
    transport = MemoryEspTransport()
    runtime = StationRuntime(
        load_runtime_settings(),
        monotonic_clock=iter([0.0, 0.4, 0.5, 1.0]).__next__,
        esp_client=EspClient("serial://test", transport=transport),
        publication_client=PublicationAdapter("test-project"),
    )

    transport.queue_incoming(
        "health uptime_ms=42 sensor=1 indicator=1 active_zone=off",
        "presence present=1 zone=off stable=1 seq=1",
    )
    arming_snapshot, arming_status = runtime.start_session()
    transport.queue_incoming(
        "health uptime_ms=43 sensor=1 indicator=1 active_zone=off",
        "presence present=1 zone=off stable=1 seq=2",
    )
    snapshot, status = runtime.start_session()
    expected_zone = runtime.rules.zone_for_disposal_method(snapshot.correct_disposal_method)

    assert arming_snapshot.phase == SessionPhase.PRESENCE_ARMING
    assert arming_status.phase == "detecting-person"
    assert snapshot.phase == SessionPhase.WAITING_FOR_DISPOSAL
    assert status.payload_version == "device.v1"
    assert status.station_id == runtime.settings.station_id
    assert status.camera_feed_active is False
    assert status.current_hand_zone is None
    assert status.device_health.cloud_sync == "online"
    assert snapshot.correct_disposal_method in {"recycle", "compost", "garbage"}
    assert runtime.esp_client.last_command is not None
    assert runtime.esp_client.last_command == GuidanceCommand(indicator_zone=expected_zone)
    assert runtime.lcd_client.last_screen is not None
    assert runtime.lcd_client.last_screen.mode == "guidance"
    assert status.to_payload()["sessionState"] == "waiting-for-disposal"


def test_runtime_cancels_presence_arming_when_stable_presence_drops() -> None:
    transport = MemoryEspTransport()
    runtime = StationRuntime(
        load_runtime_settings(),
        monotonic_clock=iter([5.0, 5.2]).__next__,
        esp_client=EspClient("serial://test", transport=transport),
        publication_client=PublicationAdapter("test-project"),
    )
    runtime.classifier = RecordingClassifier(
        ClassificationResult(
            predicted_item="plastic-bottle",
            confidence=0.97,
            llm_fallback_used=False,
        )
    )

    transport.queue_incoming("presence present=1 zone=off stable=1 seq=1")
    arming_snapshot, arming_status = runtime.start_session(image_source="camera://arming")
    transport.queue_incoming("presence present=0 zone=off stable=0 seq=2")
    idle_snapshot, idle_status = runtime.start_session(image_source="camera://arming")

    assert arming_snapshot.phase == SessionPhase.PRESENCE_ARMING
    assert arming_status.phase == "detecting-person"
    assert idle_snapshot.phase == SessionPhase.IDLE
    assert idle_status.phase == "idle"
    assert runtime.classifier.last_request is None


def test_session_tracks_configured_timing_windows() -> None:
    session = SessionStateMachine()

    arming_snapshot = session.begin_presence_arming(10.0)
    assert arming_snapshot.phase == SessionPhase.PRESENCE_ARMING
    assert session.is_presence_confirmed(10.1) is False
    assert session.is_presence_confirmed(10.35) is True

    session.begin_identification(10.35)
    session.set_guidance("plastic-bottle", "recycle", 0.97, False, 11.0)
    session.begin_waiting_for_disposal(11.0)

    assert session.is_disposal_wait_expired(22.9) is False
    assert session.is_disposal_wait_expired(23.0) is True

    session.begin_resetting(23.0)
    assert session.is_reset_ready(24.4) is False
    assert session.is_reset_ready(24.5) is True


def test_session_records_drop_on_hand_disappearance() -> None:
    session = SessionStateMachine()
    session.begin_presence_arming(0.0)
    session.begin_identification(0.35)
    session.set_guidance("plastic-bottle", "recycle", 0.97, False, 0.5)
    session.begin_waiting_for_disposal(0.5)

    session.track_hand(zone="left", hand_present=True, now_monotonic=1.0)
    snapshot = session.track_hand(zone="left", hand_present=False, now_monotonic=1.1)

    assert snapshot.phase == SessionPhase.EMIT_RESULT
    assert snapshot.actual_disposal_zone == "left"

    result_snapshot = session.record_result(True)

    assert result_snapshot.total_attempts == 1
    assert result_snapshot.total_correct_sorts == 1


def test_runtime_preserves_original_guidance_for_successful_drop() -> None:
    transport = MemoryEspTransport()
    runtime = StationRuntime(
        load_runtime_settings(),
        monotonic_clock=iter([0.0, 0.4, 0.5, 1.0, 1.1, 1.2]).__next__,
        esp_client=EspClient("serial://test", transport=transport),
        publication_client=PublicationAdapter("test-project"),
    )
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="plastic-bottle",
            confidence=0.97,
            llm_fallback_used=False,
        )
    )

    transport.queue_incoming("presence present=1 zone=off stable=1 seq=1")
    runtime.start_session(image_source="camera://first")
    transport.queue_incoming("presence present=1 zone=off stable=1 seq=2")
    snapshot, _ = runtime.start_session(image_source="camera://first")
    drop_snapshot, event = runtime.observe_disposal(
        zone="left",
        classification_image_source="camera://should-not-be-used",
    )

    assert runtime.classifier.calls == 1
    assert snapshot.predicted_item == "plastic-bottle"
    assert snapshot.correct_disposal_method == "recycle"
    assert drop_snapshot.actual_disposal_zone == "left"
    assert drop_snapshot.phase == SessionPhase.EMIT_RESULT
    assert drop_snapshot.total_attempts == 1
    assert drop_snapshot.total_correct_sorts == 1
    assert event is not None
    assert event.payload_version == "device.v1"
    assert event.predicted_item == "plastic-bottle"
    assert event.actual_disposal_zone == "left"
    assert event.success is True
    assert event.attempt_result == "success"


def test_event_creation_marks_failed_drop_when_zone_maps_to_wrong_method() -> None:
    preset = load_rules_preset("demo-canada-ottawa", "1.0.0")
    session = SessionStateMachine()
    session.begin_presence_arming(0.0)
    session.begin_identification(0.35)
    session.set_guidance("plastic-bottle", "recycle", 0.97, False, 0.5)
    session.begin_waiting_for_disposal(0.5)
    session.track_hand(zone="middle", hand_present=True, now_monotonic=1.0)
    snapshot = session.track_hand(zone="middle", hand_present=False, now_monotonic=1.1)

    event = create_disposal_event("demo-station-001", snapshot, preset)
    result_snapshot = session.record_result(event.success)

    assert event.actual_disposal_zone == "middle"
    assert event.correct_disposal_method == "recycle"
    assert event.success is False


def test_backend_ingress_identity_builds_expected_headers() -> None:
    identity = BackendIngressIdentity(
        device_id="pi-001",
        station_id="demo-station-001",
        shared_secret="demo-secret",
    )

    headers = identity.build_headers("2026-03-07T12:00:00Z")

    assert headers["x-binsight-device-id"] == "pi-001"
    assert headers["x-binsight-station-id"] == "demo-station-001"
    assert headers["x-binsight-timestamp"] == "2026-03-07T12:00:00Z"
    assert headers["x-binsight-signature"] == "binsight-v1:pi-001:demo-station-001:2026-03-07T12:00:00Z:demo-secret"
