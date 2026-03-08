from __future__ import annotations

from collections.abc import Iterator

from binsight_station.classification import ClassificationResult
from binsight_station.camera_capture import CapturedImageSource
from binsight_station.esp_client import EspClient, MemoryEspTransport
from binsight_station.hand_tracking import (
    DeterministicHandTracker,
    HandLandmarkObservation,
    MediaPipeHandsTracker,
)
from binsight_station.main import (
    StationRuntime,
    _format_status_line,
    _run_runtime_loop_iteration,
    load_runtime_settings,
)
from binsight_station.publishers import PublicationAdapter
from binsight_station.session import SessionPhase, SessionStateMachine


class StubClassifier:
    def __init__(self, *results: ClassificationResult) -> None:
        self._results = list(results)
        self.calls = 0

    def classify(self, request: object) -> ClassificationResult:
        del request
        if not self._results:
            raise AssertionError("stub classifier requires at least one result")
        self.calls += 1
        if self.calls <= len(self._results):
            return self._results[self.calls - 1]
        return self._results[-1]


class StaticImageSourceProvider:
    def __init__(self, image_source: str) -> None:
        self.image_source = image_source
        self.calls = 0

    def capture_image_source(self) -> CapturedImageSource:
        self.calls += 1
        return CapturedImageSource(self.image_source)


class SequencedHandDetector:
    def __init__(self, *observations: HandLandmarkObservation) -> None:
        self._observations = iter(observations)
        self.calls = 0
        self.closed = False

    def detect(self, image_source: str) -> HandLandmarkObservation:
        del image_source
        self.calls += 1
        return next(self._observations)

    def close(self) -> None:
        self.closed = True


class NoopHandTrackingInput:
    def observe(self, *, snapshot: object) -> None:
        del snapshot
        return None

    def close(self) -> None:
        return None


def _sequence_clock(*values: float) -> Iterator[float]:
    return iter(values)


def _build_runtime(
    *clock_values: float,
    transport: MemoryEspTransport | None = None,
    image_source: str = "demo://aluminum-can",
) -> StationRuntime:
    clock = _sequence_clock(*clock_values)
    resolved_transport = transport or MemoryEspTransport()
    return StationRuntime(
        load_runtime_settings(),
        monotonic_clock=lambda: next(clock),
        esp_client=EspClient("serial://test", transport=resolved_transport),
        publication_client=PublicationAdapter("test-project"),
        image_source_provider=StaticImageSourceProvider(image_source),
    )


def test_session_timeout_flow_resets_without_incrementing_counters() -> None:
    session = SessionStateMachine()

    session.begin_identification(10.0)
    session.set_guidance("aluminum-can", "recycle", 0.97, False, 10.1)
    waiting_snapshot = session.begin_waiting_for_disposal(10.2)

    assert waiting_snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert session.is_disposal_wait_expired(22.19) is False
    assert session.is_disposal_wait_expired(22.2) is True

    resetting_snapshot = session.begin_resetting(22.2)
    assert resetting_snapshot.phase is SessionPhase.RESETTING
    assert resetting_snapshot.total_attempts == 0
    assert resetting_snapshot.total_correct_sorts == 0
    assert session.is_reset_ready(23.69) is False
    assert session.is_reset_ready(23.7) is True

    idle_snapshot = session.complete_reset(23.7)

    assert idle_snapshot.phase is SessionPhase.IDLE
    assert idle_snapshot.total_attempts == 0
    assert idle_snapshot.total_correct_sorts == 0
    assert idle_snapshot.latest_result_success is None


def test_runtime_successful_disposal_preserves_station_counters_after_reset() -> None:
    transport = MemoryEspTransport()
    runtime = _build_runtime(0.0, 0.1, 0.2, 1.0, 1.1, 2.8, 4.4, transport=transport)
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="aluminum-can",
            confidence=0.97,
            llm_fallback_used=False,
        )
    )

    waiting_snapshot, waiting_status = runtime.start_session(image_source="camera://success")
    result_snapshot, event = runtime.observe_disposal(zone="left")
    resetting_snapshot = runtime.begin_reset()
    idle_snapshot = runtime.complete_reset()

    assert waiting_snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert waiting_status.to_payload()["sessionState"] == "waiting-for-disposal"
    assert event is not None
    assert event.success is True
    assert result_snapshot.phase is SessionPhase.EMIT_RESULT
    assert result_snapshot.total_attempts == 1
    assert result_snapshot.total_correct_sorts == 1
    assert runtime.lcd_client.screen_history[-4].mode == "guidance"
    assert runtime.lcd_client.screen_history[-4].line_one.strip() == "aluminum can"
    assert runtime.lcd_client.screen_history[-4].line_two.strip() == "Use recycle"
    assert runtime.lcd_client.screen_history[-3].mode == "result"
    assert runtime.lcd_client.screen_history[-3].line_two.strip() == "C:1 A:1"
    assert resetting_snapshot.phase is SessionPhase.RESETTING
    assert idle_snapshot.phase is SessionPhase.IDLE
    assert idle_snapshot.total_attempts == 1
    assert idle_snapshot.total_correct_sorts == 1
    assert runtime.lcd_client.last_screen is not None
    assert runtime.lcd_client.last_screen.mode == "standby"
    assert runtime.lcd_client.last_screen.line_two.strip() == "C:1 A:1"
    assert runtime.lcd_client.screen_history[-2].mode == "reset"
    assert runtime.lcd_client.screen_history[-2].line_two.strip() == "C:1 A:1"


def test_runtime_incorrect_disposal_keeps_failed_attempt_in_station_counter() -> None:
    transport = MemoryEspTransport()
    runtime = _build_runtime(5.0, 5.1, 5.2, 6.0, 6.1, 7.8, 9.4, transport=transport)
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="pickled-radish",
            confidence=0.94,
            llm_fallback_used=False,
        )
    )

    runtime.start_session(image_source="camera://failure")
    result_snapshot, event = runtime.observe_disposal(zone="right")
    runtime.begin_reset()
    idle_snapshot = runtime.complete_reset()

    assert event is not None
    assert event.success is False
    assert event.attempt_result == "failure"
    assert result_snapshot.total_attempts == 1
    assert result_snapshot.total_correct_sorts == 0
    assert runtime.lcd_client.screen_history[-3].line_one.strip() == "Try again"
    assert idle_snapshot.total_attempts == 1
    assert idle_snapshot.total_correct_sorts == 0
    assert runtime.lcd_client.last_screen is not None
    assert runtime.lcd_client.last_screen.line_two.strip() == "C:0 A:1"


def test_runtime_fallback_classification_flow_marks_event_and_live_status() -> None:
    transport = MemoryEspTransport()
    runtime = _build_runtime(9.0, 9.1, 9.2, 10.0, 10.1, transport=transport)
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="pickled-radish",
            confidence=0.61,
            llm_fallback_used=True,
        )
    )

    waiting_snapshot, waiting_status = runtime.start_session(image_source="camera://fallback")
    result_snapshot, event = runtime.observe_disposal(zone="middle")

    assert waiting_snapshot.predicted_item == "pickled-radish"
    assert waiting_snapshot.correct_disposal_method == "compost"
    assert waiting_status.to_payload()["currentDetectedItem"] == "pickled-radish"
    assert event is not None
    assert event.success is True
    assert event.llm_fallback_used is True
    assert event.model_confidence == 0.61
    assert result_snapshot.total_attempts == 1
    assert result_snapshot.total_correct_sorts == 1
    assert runtime.last_live_status is not None
    assert runtime.last_live_status.to_payload()["latestEvent"] == {
        "timestamp": event.timestamp,
        "predictedItem": "pickled-radish",
        "correctDisposalMethod": "compost",
        "actualDisposalZone": "middle",
        "attemptResult": "success",
    }


def test_runtime_stays_idle_when_classifier_returns_none() -> None:
    transport = MemoryEspTransport()
    runtime = _build_runtime(12.0, 12.1, transport=transport)
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="none",
            confidence=0.0,
            llm_fallback_used=True,
        )
    )

    snapshot, status = runtime.start_session(image_source="camera://uncertain")

    assert snapshot.phase is SessionPhase.IDLE
    assert snapshot.predicted_item is None
    assert status.to_payload()["sessionState"] == "idle"
    assert status.to_payload()["currentDetectedItem"] is None
    assert runtime.esp_client.last_command is None
    assert runtime.lcd_client.last_screen is not None
    assert runtime.lcd_client.last_screen.mode == "standby"


def test_runtime_refreshes_guidance_while_waiting_for_disposal() -> None:
    transport = MemoryEspTransport()
    runtime = _build_runtime(50.0, 50.1, 50.2, 50.3, 50.4, transport=transport)
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="aluminum-can",
            confidence=0.97,
            llm_fallback_used=False,
        ),
        ClassificationResult(
            predicted_item="pickled-radish",
            confidence=0.98,
            llm_fallback_used=False,
        ),
    )
    runtime.hand_tracking_input = NoopHandTrackingInput()

    waiting_snapshot, _ = runtime.start_session(image_source="camera://first")
    refreshed_status = runtime.sync_from_esp()

    assert waiting_snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert runtime.session.snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert runtime.session.snapshot.predicted_item == "pickled-radish"
    assert runtime.session.snapshot.correct_disposal_method == "compost"
    assert refreshed_status.to_payload()["currentDetectedItem"] == "pickled-radish"
    assert transport.sent_frames.count("indicator:left") == 1
    assert transport.sent_frames.count("indicator:middle") == 1


def test_runtime_does_not_wait_for_stable_esp_presence_before_identification() -> None:
    transport = MemoryEspTransport()
    runtime = _build_runtime(20.0, 20.1, 20.2, transport=transport)
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="aluminum-can",
            confidence=0.97,
            llm_fallback_used=False,
        )
    )

    waiting_snapshot, waiting_status = runtime.start_session(image_source="camera://presence-gate")

    assert runtime.classifier.calls == 1
    assert waiting_snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert waiting_status.to_payload()["sessionState"] == "waiting-for-disposal"
    assert waiting_snapshot.predicted_item == "aluminum-can"


def test_runtime_uses_deterministic_hand_tracking_without_camera_feed() -> None:
    transport = MemoryEspTransport()
    clock = iter([30.0, 30.4, 30.5, 30.9, 31.2, 31.6, 31.9]).__next__
    runtime = StationRuntime(
        load_runtime_settings(),
        monotonic_clock=clock,
        esp_client=EspClient("serial://test", transport=transport),
        hand_tracking_input=DeterministicHandTracker(("right",)),
    )
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="aluminum-can",
            confidence=0.97,
            llm_fallback_used=False,
        )
    )

    waiting_snapshot, waiting_status = runtime.start_session(image_source="demo://aluminum-can")

    assert waiting_snapshot.hand_present is False
    assert waiting_snapshot.latest_hand_zone is None
    assert waiting_snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert waiting_status is not None

    tracked_status = runtime.sync_from_esp()

    assert waiting_status.to_payload()["cameraFeedActive"] is False
    assert tracked_status.to_payload()["currentHandZone"] == "right"

    result_status = runtime.sync_from_esp()

    assert runtime.last_event is not None
    assert runtime.last_event.actual_disposal_zone == "right"
    assert runtime.last_event.success is False
    assert result_status.to_payload()["cameraFeedActive"] is False
    assert result_status.to_payload()["latestEvent"]["actualDisposalZone"] == "right"


def test_runtime_uses_mediapipe_hand_tracking_without_esp_presence_frames() -> None:
    transport = MemoryEspTransport()
    provider = StaticImageSourceProvider("camera://hand-zone")
    detector = SequencedHandDetector(
        HandLandmarkObservation(hand_present=True, zone="middle", normalized_x=0.5),
        HandLandmarkObservation(hand_present=False),
        HandLandmarkObservation(hand_present=False),
    )
    clock = iter([40.0, 40.2, 40.4, 40.6, 40.8, 41.0, 41.2, 41.4, 41.6]).__next__
    runtime = StationRuntime(
        load_runtime_settings(),
        monotonic_clock=clock,
        esp_client=EspClient("serial://test", transport=transport),
        publication_client=PublicationAdapter("test-project"),
        image_source_provider=provider,
        hand_tracking_input=MediaPipeHandsTracker(
            image_source_provider=provider,
            detector=detector,
        ),
    )
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="pickled-radish",
            confidence=0.97,
            llm_fallback_used=False,
        )
    )

    waiting_snapshot, _ = runtime.start_session(image_source="demo://pickled-radish")
    assert waiting_snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert provider.calls == 0

    tracked_status = runtime.sync_from_esp()

    assert provider.calls == 2
    assert tracked_status.to_payload()["currentHandZone"] == "middle"

    interim_status = runtime.sync_from_esp()
    result_status = runtime.sync_from_esp()

    assert interim_status.to_payload()["currentHandZone"] == "middle"
    assert provider.calls == 6
    assert detector.calls == 3
    assert runtime.last_event is not None
    assert runtime.last_event.actual_disposal_zone == "middle"
    assert runtime.last_event.success is True
    assert result_status.to_payload()["latestEvent"]["actualDisposalZone"] == "middle"
    runtime.close()
    assert detector.closed is True


def test_format_status_line_keeps_runtime_heartbeat_compact() -> None:
    snapshot = SessionStateMachine().snapshot

    line = _format_status_line(snapshot)

    assert "[station] idle" in line
    assert "item=-" in line
    assert "tgt=-" in line
    assert "over=-" in line
    assert "hands=0" in line


def test_format_status_line_includes_model_outputs_and_confidence() -> None:
    session = SessionStateMachine()
    session.begin_identification(0.0)
    session.set_guidance("aluminum-can", "recycle", 0.97, False, 0.1)
    session.begin_waiting_for_disposal(0.2)
    snapshot = session.track_hand(
        zone="left",
        hand_present=True,
        hand_count=1,
        hand_confidence=0.88,
        now_monotonic=0.3,
    )

    line = _format_status_line(snapshot)

    assert "item=aluminum-can@0.97" in line
    assert "tgt=recycle" in line
    assert "over=left@0.88" in line
    assert "hands=1" in line


def test_runtime_loop_iteration_starts_session_from_idle() -> None:
    runtime = _build_runtime(0.0, 0.1, 0.2)

    snapshot = _run_runtime_loop_iteration(runtime)

    assert snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert snapshot.predicted_item == "aluminum-can"


def test_runtime_loop_iteration_resets_after_disposal_timeout() -> None:
    transport = MemoryEspTransport()
    clock = iter([0.0, 0.1, 0.2, 20.0, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6]).__next__
    runtime = StationRuntime(
        load_runtime_settings(),
        monotonic_clock=clock,
        esp_client=EspClient("serial://test", transport=transport),
        publication_client=PublicationAdapter("test-project"),
        image_source_provider=StaticImageSourceProvider("demo://aluminum-can"),
        hand_tracking_input=NoopHandTrackingInput(),
    )

    _run_runtime_loop_iteration(runtime)
    snapshot = _run_runtime_loop_iteration(runtime)

    assert snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert snapshot.predicted_item == "aluminum-can"
    assert "indicator:off" not in transport.sent_frames


def test_runtime_loop_iteration_restarts_immediately_after_result_without_clearing_guidance() -> None:
    transport = MemoryEspTransport()
    runtime = _build_runtime(
        0.0,
        0.1,
        0.2,
        1.0,
        1.1,
        1.2,
        1.3,
        1.4,
        1.5,
        1.6,
        1.7,
        transport=transport,
    )
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="aluminum-can",
            confidence=0.97,
            llm_fallback_used=False,
        ),
        ClassificationResult(
            predicted_item="pickled-radish",
            confidence=0.98,
            llm_fallback_used=False,
        ),
    )

    _run_runtime_loop_iteration(runtime)
    runtime.observe_disposal(zone="left")

    snapshot = _run_runtime_loop_iteration(runtime)

    assert snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert snapshot.predicted_item == "pickled-radish"
    assert "indicator:off" not in transport.sent_frames
    assert transport.sent_frames.count("indicator:left") == 1
    assert transport.sent_frames.count("indicator:middle") == 1