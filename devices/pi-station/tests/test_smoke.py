from binbuddy_station.classification import ClassificationResult
from binbuddy_station.esp_client import EspClient, GuidanceCommand, MemoryEspTransport
from binbuddy_station.events import create_disposal_event
from binbuddy_station.lcd_client import LcdClient
from binbuddy_station.live_status import DeviceHealth, LiveStatusPublisher
from binbuddy_station.main import StationRuntime, load_runtime_settings
from binbuddy_station.publishers import PublicationAdapter
from binbuddy_station.rules import load_rules_preset
from binbuddy_station.session import SessionPhase, SessionStateMachine


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


def test_runtime_loads_settings_and_starts_session() -> None:
    runtime = StationRuntime(load_runtime_settings())

    snapshot, status = runtime.start_session()
    expected_zone = runtime.rules.zone_for_disposal_method(snapshot.correct_disposal_method)

    assert snapshot.phase == SessionPhase.WAITING_FOR_DISPOSAL
    assert status.station_id == runtime.settings.station_id
    assert status.phase == "waiting-for-disposal"
    assert snapshot.correct_disposal_method in {"recycle", "compost", "garbage"}
    assert runtime.esp_client.last_command is not None
    assert runtime.esp_client.last_command == GuidanceCommand(indicator_zone=expected_zone)
    assert runtime.lcd_client.last_screen is not None
    assert runtime.lcd_client.last_screen.mode == "guidance"
    assert status.to_payload()["sessionState"] == "waiting-for-disposal"


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
    runtime = StationRuntime(load_runtime_settings())
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="plastic-bottle",
            confidence=0.97,
            llm_fallback_used=False,
        )
    )

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
    assert event.to_payload()["attemptResult"] == "failure"
    assert result_snapshot.total_attempts == 1
    assert result_snapshot.total_correct_sorts == 0


def test_live_status_maps_runtime_state_to_contract_payload() -> None:
    session = SessionStateMachine()
    session.begin_presence_arming(1.0)
    publisher = LiveStatusPublisher()

    status = publisher.build_status(
        "demo-station-001",
        session.snapshot,
        device_health=DeviceHealth(pi="online", esp8266="online", cloud_sync="degraded"),
    )

    payload = status.to_payload()

    assert payload["sessionState"] == "detecting-person"
    assert payload["cameraFeedActive"] is False
    assert payload["deviceHealth"] == {
        "pi": "online",
        "esp8266": "online",
        "cloudSync": "degraded",
    }
    assert payload["latestEvent"] is None


def test_live_status_includes_latest_event_summary() -> None:
    preset = load_rules_preset("demo-canada-ottawa", "1.0.0")
    session = SessionStateMachine()
    session.begin_presence_arming(0.0)
    session.begin_identification(0.35)
    session.set_guidance("plastic-bottle", "recycle", 0.97, False, 0.5)
    session.begin_waiting_for_disposal(0.5)
    session.track_hand(zone="left", hand_present=True, now_monotonic=1.0)
    snapshot = session.track_hand(zone="left", hand_present=False, now_monotonic=1.1)
    event = create_disposal_event("demo-station-001", snapshot, preset)

    status = LiveStatusPublisher().build_status("demo-station-001", snapshot, latest_event=event)

    assert status.to_payload()["latestEvent"] == {
        "timestamp": event.timestamp,
        "predictedItem": "plastic-bottle",
        "correctDisposalMethod": "recycle",
        "actualDisposalZone": "left",
        "attemptResult": "success",
    }


def test_rules_loader_reads_checked_in_preset_document() -> None:
    preset = load_rules_preset("demo-canada-ottawa", "1.0.0")

    assert preset.preset_id == "demo-canada-ottawa"
    assert preset.version == "1.0.0"
    assert preset.jurisdiction.city == "Ottawa"
    assert preset.disposal_method_for_item("banana-peel") == "compost"
    assert preset.disposal_method_for_zone("right") == "garbage"
    assert preset.low_confidence_threshold == 0.65


def test_runtime_uses_rules_preset_threshold_for_classification() -> None:
    runtime = StationRuntime(load_runtime_settings())
    classifier = RecordingClassifier(
        ClassificationResult(
            predicted_item="unknown-item",
            confidence=0.92,
            llm_fallback_used=False,
        )
    )
    runtime.classifier = classifier

    runtime.start_session(image_source="camera://threshold-check")

    assert classifier.last_request is not None
    assert classifier.last_request.confidence_threshold == runtime.rules.low_confidence_threshold
    assert classifier.last_request.confidence_threshold == 0.65


def test_esp_client_tracks_presence_health_and_acknowledgements() -> None:
    transport = MemoryEspTransport(
        [
            "health uptime_ms=42 sensor=1 indicator=1 active_zone=off",
            "presence present=1 zone=middle stable=1 seq=7",
            "ack indicator:middle",
        ]
    )
    client = EspClient("serial://test", transport=transport)

    client.request_health()
    client.send_guidance(GuidanceCommand(indicator_zone="middle"))
    client.poll()

    assert transport.sent_frames == ["health?", "indicator:middle"]
    assert client.device_health_status == "online"
    assert client.has_stable_presence is True
    assert client.last_presence.hand_zone == "middle"
    assert client.last_health is not None
    assert client.last_health.uptime_ms == 42
    assert client.acknowledgements[-1].value == "middle"


def test_runtime_syncs_esp_health_into_live_status() -> None:
    transport = MemoryEspTransport(
        [
            "health uptime_ms=100 sensor=1 indicator=1 active_zone=off",
            "presence present=1 zone=left stable=1 seq=3",
        ]
    )
    runtime = StationRuntime(
        load_runtime_settings(),
        esp_client=EspClient("serial://test", transport=transport),
        publication_client=PublicationAdapter("binbuddy-demo"),
    )

    status = runtime.sync_from_esp()

    assert runtime.esp_client.has_stable_presence is True
    assert status.to_payload()["deviceHealth"] == {
        "pi": "online",
        "esp8266": "online",
        "cloudSync": "online",
    }


def test_runtime_surfaces_live_status_publish_failures_without_crashing() -> None:
    runtime = StationRuntime(
        load_runtime_settings(),
        lcd_client=LcdClient(),
        publication_client=PublicationAdapter(
            "binbuddy-demo",
            live_status_sink=lambda payload: (_ for _ in ()).throw(RuntimeError(payload["stationId"])),
        ),
    )
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="plastic-bottle",
            confidence=0.97,
            llm_fallback_used=False,
        )
    )

    _, status = runtime.start_session(image_source="camera://publish-failure")

    assert status.phase == "error"
    assert runtime.publication_client.cloud_sync_status == "degraded"
    assert runtime.lcd_client.last_screen is not None
    assert runtime.lcd_client.last_screen.mode == "error"
