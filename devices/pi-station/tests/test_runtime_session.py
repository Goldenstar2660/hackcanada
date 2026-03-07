from __future__ import annotations

from collections.abc import Iterator

from binbuddy_station.classification import ClassificationResult
from binbuddy_station.esp_client import EspClient, MemoryEspTransport
from binbuddy_station.main import StationRuntime, load_runtime_settings
from binbuddy_station.session import SessionPhase, SessionStateMachine


class StubClassifier:
    def __init__(self, *results: ClassificationResult) -> None:
        self._results = iter(results)
        self.calls = 0

    def classify(self, request: object) -> ClassificationResult:
        del request
        self.calls += 1
        return next(self._results)


def _sequence_clock(*values: float) -> Iterator[float]:
    return iter(values)


def _build_runtime(
    *clock_values: float,
    transport: MemoryEspTransport | None = None,
) -> StationRuntime:
    clock = _sequence_clock(*clock_values)
    resolved_transport = transport or MemoryEspTransport()
    return StationRuntime(
        load_runtime_settings(),
        monotonic_clock=lambda: next(clock),
        esp_client=EspClient("serial://test", transport=resolved_transport),
    )


def _queue_stable_presence(transport: MemoryEspTransport, sequence: int) -> None:
    transport.queue_incoming(
        f"presence present=1 zone=off stable=1 seq={sequence}",
    )


def test_session_timeout_flow_resets_without_incrementing_counters() -> None:
    session = SessionStateMachine()

    session.begin_presence_arming(10.0)
    assert session.is_presence_confirmed(10.2) is False
    assert session.is_presence_confirmed(10.35) is True

    session.begin_identification(10.35)
    session.set_guidance("plastic-bottle", "recycle", 0.97, False, 10.5)
    waiting_snapshot = session.begin_waiting_for_disposal(10.5)

    assert waiting_snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert session.is_disposal_wait_expired(22.49) is False
    assert session.is_disposal_wait_expired(22.5) is True

    resetting_snapshot = session.begin_resetting(22.5)
    assert resetting_snapshot.phase is SessionPhase.RESETTING
    assert resetting_snapshot.total_attempts == 0
    assert resetting_snapshot.total_correct_sorts == 0
    assert session.is_reset_ready(23.99) is False
    assert session.is_reset_ready(24.0) is True

    idle_snapshot = session.complete_reset(24.0)

    assert idle_snapshot.phase is SessionPhase.IDLE
    assert idle_snapshot.total_attempts == 0
    assert idle_snapshot.total_correct_sorts == 0
    assert idle_snapshot.latest_result_success is None


def test_runtime_successful_disposal_preserves_station_counters_after_reset() -> None:
    transport = MemoryEspTransport()
    runtime = _build_runtime(0.0, 0.4, 0.5, 1.0, 1.1, 1.2, 2.8, 4.4, transport=transport)
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="plastic-bottle",
            confidence=0.97,
            llm_fallback_used=False,
        )
    )

    _queue_stable_presence(transport, 1)
    arming_snapshot, arming_status = runtime.start_session(image_source="camera://success")
    _queue_stable_presence(transport, 2)
    waiting_snapshot, waiting_status = runtime.start_session(image_source="camera://success")
    result_snapshot, event = runtime.observe_disposal(zone="left")
    resetting_snapshot = runtime.begin_reset()
    idle_snapshot = runtime.complete_reset()

    assert arming_snapshot.phase is SessionPhase.PRESENCE_ARMING
    assert arming_status.to_payload()["sessionState"] == "detecting-person"
    assert waiting_snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert waiting_status.to_payload()["sessionState"] == "waiting-for-disposal"
    assert event is not None
    assert event.success is True
    assert result_snapshot.phase is SessionPhase.EMIT_RESULT
    assert result_snapshot.total_attempts == 1
    assert result_snapshot.total_correct_sorts == 1
    assert runtime.lcd_client.screen_history[-2].mode == "result"
    assert runtime.lcd_client.screen_history[-2].line_two.strip() == "OK 1/1"
    assert resetting_snapshot.phase is SessionPhase.RESETTING
    assert idle_snapshot.phase is SessionPhase.IDLE
    assert idle_snapshot.total_attempts == 1
    assert idle_snapshot.total_correct_sorts == 1
    assert runtime.lcd_client.last_screen is not None
    assert runtime.lcd_client.last_screen.mode == "standby"
    assert runtime.lcd_client.last_screen.line_two.strip() == "OK 1/1"


def test_runtime_incorrect_disposal_keeps_failed_attempt_in_station_counter() -> None:
    transport = MemoryEspTransport()
    runtime = _build_runtime(5.0, 5.4, 5.5, 6.0, 6.1, 6.2, 7.8, 9.4, transport=transport)
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="banana-peel",
            confidence=0.94,
            llm_fallback_used=False,
        )
    )

    _queue_stable_presence(transport, 1)
    runtime.start_session(image_source="camera://failure")
    _queue_stable_presence(transport, 2)
    runtime.start_session(image_source="camera://failure")
    result_snapshot, event = runtime.observe_disposal(zone="right")
    runtime.begin_reset()
    idle_snapshot = runtime.complete_reset()

    assert event is not None
    assert event.success is False
    assert event.attempt_result == "failure"
    assert result_snapshot.total_attempts == 1
    assert result_snapshot.total_correct_sorts == 0
    assert runtime.lcd_client.screen_history[-2].line_one.strip() == "Try again"
    assert idle_snapshot.total_attempts == 1
    assert idle_snapshot.total_correct_sorts == 0
    assert runtime.lcd_client.last_screen is not None
    assert runtime.lcd_client.last_screen.line_two.strip() == "OK 0/1"


def test_runtime_fallback_classification_flow_marks_event_and_live_status() -> None:
    transport = MemoryEspTransport()
    runtime = _build_runtime(9.0, 9.4, 9.5, 10.0, 10.1, 10.2, transport=transport)
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="banana-peel",
            confidence=0.61,
            llm_fallback_used=True,
        )
    )

    _queue_stable_presence(transport, 1)
    arming_snapshot, arming_status = runtime.start_session(image_source="camera://fallback")
    _queue_stable_presence(transport, 2)
    waiting_snapshot, waiting_status = runtime.start_session(image_source="camera://fallback")
    result_snapshot, event = runtime.observe_disposal(zone="middle")

    assert arming_snapshot.phase is SessionPhase.PRESENCE_ARMING
    assert arming_status.to_payload()["sessionState"] == "detecting-person"
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


def test_runtime_waits_for_stable_esp_presence_before_identification() -> None:
    transport = MemoryEspTransport()
    runtime = _build_runtime(20.0, 20.2, 20.35, 20.5, 21.0, transport=transport)
    runtime.classifier = StubClassifier(
        ClassificationResult(
            predicted_item="plastic-bottle",
            confidence=0.97,
            llm_fallback_used=False,
        )
    )

    _queue_stable_presence(transport, 1)
    arming_snapshot, arming_status = runtime.start_session(image_source="camera://presence-gate")
    _queue_stable_presence(transport, 2)
    waiting_snapshot, waiting_status = runtime.start_session(image_source="camera://presence-gate")

    assert arming_snapshot.phase is SessionPhase.PRESENCE_ARMING
    assert arming_status.to_payload()["sessionState"] == "detecting-person"
    assert runtime.classifier.calls == 0

    _queue_stable_presence(transport, 3)
    waiting_snapshot, waiting_status = runtime.start_session(image_source="camera://presence-gate")

    assert runtime.classifier.calls == 1
    assert waiting_snapshot.phase is SessionPhase.WAITING_FOR_DISPOSAL
    assert waiting_status.to_payload()["sessionState"] == "waiting-for-disposal"
    assert waiting_snapshot.predicted_item == "plastic-bottle"