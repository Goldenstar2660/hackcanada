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
from binsight_station.main import StationRuntime, load_runtime_settings
from binsight_station.publishers import PublicationAdapter
from binsight_station.session import SessionPhase, SessionStateMachine


class StubClassifier:
    def __init__(self, *results: ClassificationResult) -> None:
        self._results = iter(results)
        self.calls = 0

    def classify(self, request: object) -> ClassificationResult:
        del request
        self.calls += 1
        return next(self._results)


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


def _sequence_clock(*values: float) -> Iterator[float]:
    return iter(values)


def _build_runtime(
    *clock_values: float,
    transport: MemoryEspTransport | None = None,
    image_source: str = "demo://plastic-bottle",
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
    session.set_guidance("plastic-bottle", "recycle", 0.97, False, 10.1)
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
            predicted_item="plastic-bottle",
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
    assert runtime.lcd_client.screen_history[-4].line_one.strip() == "plastic bottle"
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
            predicted_item="banana-peel",
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
            predicted_item="banana-peel",
            confidence=0.61,
            llm_fallback_used=True,
        )
    )

    waiting_snapshot, waiting_status = runtime.start_session(image_source="camera://fallback")
    result_snapshot, event = runtime.observe_disposal(zone="middle")

    assert waiting_snapshot.predicted_item == "banana-peel"
    assert waiting_snapshot.correct_disposal_method == "compost"
    assert waiting_status.to_payload()["currentDetectedItem"] == "banana-peel"
    assert event is not None
    assert event.success is True
    assert event.llm_fallback_used is True
    assert event.model_confidence == 0.61
    assert result_snapshot.total_attempts == 1
    assert result_snapshot.total_correct_sorts == 1
    assert runtime.last_live_status is not None
    assert runtime.last_live_status.to_payload()["latestEvent"] == {
        "timestamp": event.timestamp,
        "predictedItem": "banana-peel",
        "correctDisposalMethod": "compost",
        "actualDisposalZone": "middle",
        "attemptResult": "success",
    }


def test_runtime_does_not_wait_for_stable_esp_presence_before_identification() -> None:
    transport = MemoryEspTransport()
    runtime = _build_runtime(20.0, 20.1, 20.2, transport=transport)
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="plastic-bottle",
            confidence=0.97,
            llm_fallback_used=False,
        )
    )

    waiting_snapshot, waiting_status = runtime.start_session(image_source="camera://presence-gate")

    assert runtime.classifier.calls == 1
    assert waiting_snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert waiting_status.to_payload()["sessionState"] == "waiting-for-disposal"
    assert waiting_snapshot.predicted_item == "plastic-bottle"


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
            predicted_item="plastic-bottle",
            confidence=0.97,
            llm_fallback_used=False,
        )
    )

    waiting_snapshot, waiting_status = runtime.start_session(image_source="demo://plastic-bottle")

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
    clock = iter([40.0, 40.2, 40.4, 40.6, 40.8, 41.0]).__next__
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
            predicted_item="banana-peel",
            confidence=0.97,
            llm_fallback_used=False,
        )
    )

    waiting_snapshot, _ = runtime.start_session(image_source="demo://banana-peel")
    assert waiting_snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert provider.calls == 0

    tracked_status = runtime.sync_from_esp()

    assert provider.calls == 1
    assert tracked_status.to_payload()["currentHandZone"] == "middle"

    interim_status = runtime.sync_from_esp()
    result_status = runtime.sync_from_esp()

    assert interim_status.to_payload()["currentHandZone"] == "middle"
    assert provider.calls == 3
    assert detector.calls == 3
    assert runtime.last_event is not None
    assert runtime.last_event.actual_disposal_zone == "middle"
    assert runtime.last_event.success is True
    assert result_status.to_payload()["latestEvent"]["actualDisposalZone"] == "middle"
    runtime.close()
    assert detector.closed is True